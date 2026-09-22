// The actual reasoning. Two independent mechanisms, kept separate on purpose
// because one is physics and the other is an expectation.
//
//  1. SPOILAGE -> MARKDOWN.  How long an item survives the forecast, whether
//     stock will clear in that window, and the largest discount that still
//     beats binning the leftover. Arithmetic, no guessing.
//
//  2. SERVE TEMPERATURE -> DEMAND.  Hot drinks sell worse at 40°C. That is an
//     expectation, not a fact, and is reported separately and labelled as such.

import { SHELF_BASE } from "./catalog.js";

// How fast an hour eats an item's shelf life. 1.0 means an ideal hour.
// Microbial growth roughly doubles for every 8-10°C rise (the Q10 rule), so
// a hot hour costs more than one hour of shelf life.
export function stressFactor(tier, tempC, humidity) {
  if (tier === "sealed" || tier === "dry") return 1;

  let f = 1;
  if (tempC > 25) f *= Math.pow(2, (tempC - 25) / 9);
  if (tempC < 10) f *= 0.6;                         // cold slows everything down

  // Free surface water. Matters for anything moist, and ruins fried crispness.
  if (humidity > 60) {
    const excess = (humidity - 60) / 40;            // 0 at 60%, 1 at 100%
    f *= 1 + excess * (tier === "fried" ? 1.2 : 0.6);
  }
  return f;
}

// Walk the hourly forecast and spend the item's shelf-life budget as we go.
// Returns how many real hours it lasts from now.
export function safeHours(tier, hours) {
  let budget = SHELF_BASE[tier];
  if (budget >= 1000) return { hours: Infinity, capped: true };

  for (let i = 0; i < hours.length; i++) {
    budget -= stressFactor(tier, hours[i].temp, hours[i].humidity);
    if (budget <= 0) return { hours: i + 1, capped: false };
  }
  // Survived the whole forecast window — report the window, flagged.
  return { hours: hours.length, capped: true };
}

// The break-even discount.
//
// You hold Q. In the safe window you expect to sell S at full price, so (Q-S)
// gets binned. Marking the whole lot down to (1-d) beats that only while
//     Q·R·(1-d)  >=  S·R      ->      d  <=  1 - S/Q
// and separately you must not sell under cost:
//     d  <=  1 - C/R
// The tighter of the two is the answer. Past it, binning the leftover is cheaper
// than the discount you gave away on everything else.
export function markdown(item, stock, expectedSales) {
  if (stock <= 0) return null;

  const clears = expectedSales >= stock;
  const atRisk = Math.max(0, stock - expectedSales);

  const fromSpoilage = 1 - Math.min(1, expectedSales / stock);
  const fromMargin = 1 - item.cost / item.rate;
  const pct = Math.max(0, Math.min(fromSpoilage, fromMargin));

  return {
    clears,
    at_risk_qty: round(atRisk, 2),
    at_risk_value: round(atRisk * item.cost, 0),   // what you lose by binning it
    max_discount_pct: Math.round(pct * 100),
    binding_limit: fromMargin < fromSpoilage ? "margin" : "spoilage"
  };
}

// Weather-driven demand for hot vs cold things, on a -1..+1 scale.
// Driven by apparent temperature, because that is what a customer feels.
export function demandShift(serve, feelsLike) {
  if (serve === "ambient") return 0;
  // Neutral around 24°C, saturating by roughly ±14°C either side.
  const t = Math.max(-1, Math.min(1, (feelsLike - 24) / 14));
  return serve === "cold" ? round(t, 2) : round(-t, 2);
}

export const round = (n, dp) => {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

// WMO weather codes -> words. Open-Meteo returns the number, not a description.
export function describeCode(code) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Mainly clear";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}
