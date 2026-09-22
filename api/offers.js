// GET /api/offers                  -> today's offers at every store
// GET /api/offers?store=dubai      -> one store, with the day's temperature curve
//
// CUSTOMER view. Same engine as /api/advice, but it deliberately does NOT
// leak the shop's internal reasoning. A shopper is told the price and the
// deadline — both true, both useful. They are never told an item is close to
// the end of its window; that is the shop's problem, not a selling point.

import { BRANCHES, branchBySlug, CLOSE_HOUR } from "../lib/catalog.js";
import { fetchForecast } from "../lib/openmeteo.js";
import { assess } from "../lib/assess.js";
import { round } from "../lib/model.js";

// Shops post round numbers. Always round DOWN to a 5% step — rounding up would
// cross the ceiling the markdown maths just worked out.
const postable = pct => Math.floor(pct / 5) * 5;

// An item can turn at 4am, but nobody can come and buy it then. Show the
// last hour a shopper could actually walk in — today's closing time if the
// window runs past it. The markdown itself still stands: stock that dies
// overnight has to move before the doors shut.
function shownDeadline(safeUntilIso, nowIso) {
  if (!safeUntilIso) return { until: `${CLOSE_HOUR}:00`, at_close: true };

  const safeHM = safeUntilIso.slice(11, 16);
  const safeDay = safeUntilIso.slice(0, 10);
  const nowDay = nowIso.slice(0, 10);
  const closeHM = String(CLOSE_HOUR).padStart(2, "0") + ":00";

  // Past today's closing time, either by clock or by rolling into tomorrow.
  if (safeDay > nowDay || safeHM >= closeHM) {
    return { until: closeHM, at_close: true };
  }
  return { until: safeHM, at_close: false };
}

// Why this is on offer, said in a way that is true and sells.
// Never "about to spoil".
function pitch(item, feels) {
  if (item.serve === "cold" && feels >= 30) return "Made for this heat";
  if (item.serve === "hot" && feels <= 16) return "Warm you up";
  if (item.serve === "cold" && feels <= 14) return "End of day price";
  if (item.serve === "hot" && feels >= 34) return "End of day price";
  return "Fresh today";
}

// What to have right now, regardless of price. Purely about the weather.
function suggestion(city, feels, condition, items) {
  const wants = feels >= 30 ? "cold" : feels <= 16 ? "hot" : null;
  if (!wants) {
    return `${city} is a comfortable ${Math.round(feels)}°C. Good day for anything.`;
  }
  // Prefer a drink: "start with a rasgulla" is not what anyone says.
  const candidates = items.filter(i => i.serve === wants);
  const pick = candidates.find(i => i.category === "Drinks") || candidates[0];
  const lead = wants === "cold"
    ? `It feels like ${Math.round(feels)}°C in ${city}.`
    : `It's ${Math.round(feels)}°C in ${city}.`;
  return pick ? `${lead} Start with a ${pick.name.toLowerCase()}.` : lead;
}

function storefront(a, withCurve) {
  const { branch, now, items } = a;
  const cur = branch.currency;

  const offers = [];
  for (const i of items) {
    // Only discount what the engine says there is room to discount.
    if (i.safe_hours === null || i.clears) continue;
    const off = postable(i.max_discount_pct);
    if (off < 5) continue;

    offers.push({
      id: i.id,
      name: i.name,
      category: i.category,
      unit: i.unit,
      was: i.local_price,
      now: round(i.local_price * (1 - off / 100), 2),
      percent_off: off,
      ...shownDeadline(i.safe_until, now.local_time),
      pitch: pitch(i, now.feels_like)
    });
  }
  offers.sort((x, y) => y.percent_off - x.percent_off);

  const menu = items.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    price: i.local_price,
    serve: i.serve,
    // A nudge, not a discount: is this the right thing for today's weather?
    good_today: i.demand_shift >= 0.35
  }));

  const out = {
    store: {
      slug: branch.slug, city: branch.city, country: branch.country,
      currency: cur, timezone: branch.timezone
    },
    today: {
      local_time: now.local_time.slice(11, 16),
      temperature: now.temperature,
      feels_like: now.feels_like,
      humidity: now.humidity,
      condition: now.condition
    },
    suggestion: suggestion(branch.city, now.feels_like, now.condition, items),
    offer_count: offers.length,
    offers,
    menu
  };
  if (withCurve) out.hours = a.hours;
  return out;
}

export default async function handler(req, res) {
  const slug = (req.query.store || req.query.branch || "").trim();
  const wanted = slug ? [branchBySlug(slug)] : BRANCHES;

  if (slug && !wanted[0]) {
    return res.status(404).json({
      error: `No store in "${slug}"`,
      stores: BRANCHES.map(b => b.slug)
    });
  }

  let sites;
  try {
    sites = await fetchForecast(wanted);
  } catch (err) {
    return res.status(502).json({ error: "Could not reach the weather service" });
  }

  const shops = sites.map((s, idx) => {
    const a = assess(s, {});
    a.hours = s.hours;
    return storefront(a, Boolean(slug));
  });

  if (slug) return res.status(200).json(shops[0]);

  res.status(200).json({
    stores: shops.map(({ menu, hours, ...rest }) => rest)
  });
}
