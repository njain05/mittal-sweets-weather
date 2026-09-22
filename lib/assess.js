// Shared reasoning, used by both the internal view (/api/advice) and the
// customer view (/api/offers). Keeping it here is what stops the two
// drifting apart: the offers a shopper sees are the same numbers the
// markdown desk computed.

// GET /api/advice                  -> every branch, ranked by money at risk
// GET /api/advice?branch=ludhiana  -> one branch, with its forecast curve
// GET /api/advice?branch=dubai&stock=rasgulla:8,lassi:60
//                                  -> override stock levels for a what-if
//
// The whole point: what to mark down, by how much, and by when — per branch,
// from that branch's own forecast in its own timezone.

import { CATALOG } from "./catalog.js";
import { safeHours, markdown, demandShift, describeCode, round } from "./model.js";

// "rasgulla:8,lassi:60" -> { rasgulla: 8, lassi: 60 }
export function parseStock(raw) {
  const out = {};
  for (const part of (raw || "").split(",")) {
    const [id, qty] = part.split(":");
    const n = Number(qty);
    if (id && Number.isFinite(n) && n >= 0) out[id.trim()] = n;
  }
  return out;
}

export function assess(site, stockOverride) {
  const { branch, hours, now } = site;
  const items = [];

  for (const item of CATALOG) {
    const stock = stockOverride[item.id] ?? item.stock;
    const life = safeHours(item.tier, hours);

    // How much you'd shift at full price before it goes off.
    //
    // Weather moves demand as well as shelf life, and the two must interact:
    // a hot drink on a 4°C morning sells FASTER, so it is less at risk, while
    // cold coffee that same morning barely moves and is far more at risk.
    // Feeding the shift in here is what stops the advice coming out backwards.
    const shift = demandShift(item.serve, now.feels);
    const demandMult = 1 + 0.6 * shift;          // ±60% at the extremes
    const window = Math.min(life.hours, hours.length);
    const expected = round(item.sellRate * branch.footfall * window * demandMult, 2);
    const money = markdown(item, stock, expected);

    // When the clock runs out, in this branch's local time.
    const deadline = life.capped ? null : (hours[life.hours - 1]?.time ?? null);

    items.push({
      id: item.id,
      name: item.name,
      category: item.cat,
      unit: item.unit,
      tier: item.tier,
      serve: item.serve,
      local_price: round(item.rate * branch.priceIndex, 2),
      stock,
      safe_hours: life.capped ? null : life.hours,
      safe_until: deadline,
      expected_sales: expected,
      ...money,
      at_risk_value: money ? round(money.at_risk_value * branch.priceIndex, 0) : 0,
      demand_shift: shift,
      demand_multiplier: round(demandMult, 2)
    });
  }

  // Only perishables with a real deadline can be "at risk".
  const atRisk = items.filter(i => i.safe_hours !== null && !i.clears);
  const valueAtRisk = round(atRisk.reduce((s, i) => s + i.at_risk_value, 0), 0);

  return {
    branch: {
      slug: branch.slug, city: branch.city, country: branch.country,
      currency: branch.currency, timezone: site.timezone
    },
    now: {
      local_time: now.time,
      temperature: now.temp,
      feels_like: now.feels,
      humidity: now.humidity,
      condition: describeCode(now.code)
    },
    at_risk_count: atRisk.length,
    value_at_risk: valueAtRisk,
    headline: headline(branch, atRisk, now),
    items
  };
}

export function headline(branch, atRisk, now) {
  if (!atRisk.length) {
    return `Nothing at risk in ${branch.city}. Everything clears inside its window.`;
  }
  const worst = atRisk.slice().sort((a, b) => b.at_risk_value - a.at_risk_value)[0];
  const by = worst.safe_until ? worst.safe_until.slice(11, 16) : "today";
  return `${branch.city}: feels like ${now.feels}°C. ` +
         `Mark ${worst.name} down up to ${worst.max_discount_pct}% by ${by}` +
         (atRisk.length > 1 ? `, and ${atRisk.length - 1} more need a look.` : ".");
}

