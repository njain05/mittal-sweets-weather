// GET /api/advice                  -> every branch, ranked by money at risk
// GET /api/advice?branch=ludhiana  -> one branch, with its forecast curve
// GET /api/advice?branch=dubai&stock=rasgulla:8,lassi:60  -> a what-if
//
// INTERNAL view. Says the quiet part out loud: what is about to spoil, how
// much money is sitting in it, and the discount ceiling. Not for shoppers —
// /api/offers is the customer-safe view of the same numbers.

import { BRANCHES, branchBySlug } from "../lib/catalog.js";
import { fetchForecast } from "../lib/openmeteo.js";
import { assess, parseStock } from "../lib/assess.js";

export default async function handler(req, res) {
  const slug = (req.query.branch || "").trim();
  const stockOverride = parseStock(req.query.stock);

  const wanted = slug ? [branchBySlug(slug)] : BRANCHES;
  if (slug && !wanted[0]) {
    return res.status(404).json({
      error: `No branch called "${slug}"`,
      branches: BRANCHES.map(b => b.slug)
    });
  }

  let sites;
  try {
    sites = await fetchForecast(wanted);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  // A what-if on stock must not be served from a shared cache.
  if (!Object.keys(stockOverride).length) {
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  }

  const results = sites.map(s => assess(s, stockOverride));

  if (slug) {
    // Single branch: send the curve too, so the page can draw it.
    return res.status(200).json({ ...results[0], hours: sites[0].hours });
  }

  // All branches: the branch needing attention first.
  results.sort((a, b) => b.value_at_risk - a.value_at_risk);
  res.status(200).json({
    generated_at: new Date().toISOString(),
    branches: results.map(({ items, ...rest }) => ({
      ...rest,
      // Just the actionable rows — the full list is on the branch endpoint.
      actions: items
        .filter(i => i.safe_hours !== null && !i.clears)
        .sort((a, b) => b.at_risk_value - a.at_risk_value)
        .map(i => ({
          name: i.name, unit: i.unit, stock: i.stock,
          at_risk_qty: i.at_risk_qty, at_risk_value: i.at_risk_value,
          max_discount_pct: i.max_discount_pct,
          binding_limit: i.binding_limit,
          safe_until: i.safe_until
        }))
    }))
  });
}
