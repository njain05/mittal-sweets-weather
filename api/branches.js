// GET /api/branches -> where the shops are. Static; no outside call.

import { BRANCHES } from "../lib/catalog.js";

export default function handler(req, res) {
  res.status(200).json(
    BRANCHES.map(({ slug, city, country, currency, lat, lon }) =>
      ({ slug, city, country, currency, lat, lon }))
  );
}
