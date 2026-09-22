# Mittal Sweets — weather-priced storefront

A customer-facing shopfront for a sweet, snack and drink chain with seven
branches across five timezones. Rates move through the day with the weather at
each branch, and the site shows a shopper what is cheaper right now and until
when.

Built for the bootcamp's "pick one feature" brief — the weather option, using
[Open-Meteo](https://open-meteo.com/), which needs no API key.

## Why the weather sets the price

A halwai already knows what spoils in heat. What nobody can work out standing
behind the counter is the number: *given what is on the shelf, how much margin
there is, and how many hours the forecast leaves, how big a discount is still
worth giving?*

Past a certain point a markdown costs more than the loss it prevents. You hold
`Q`, expect to sell `S` before it turns, so `Q − S` is binned. Marking the whole
lot down to `(1 − d)` beats that only while

```
Q · R · (1 − d)  ≥  S · R        →     d  ≤  1 − S/Q
```

and separately you must not sell under cost, `d ≤ 1 − C/R`. The tighter bound
wins. That is the ceiling every offer on the site sits under — arithmetic, with
nothing estimated.

`S` comes from the forecast. Shelf life is simulated hour by hour rather than
from a single temperature: a hot, humid hour spends more than one hour of an
item's budget, following the Q10 rule that microbial growth roughly doubles per
8–10°C. Humidity carries an extra penalty, heaviest on fried items, where
crispness goes before safety does.

Weather also moves demand, and the two have to interact. A hot drink on a 4°C
Toronto morning sells *faster*, so it is less at risk; the cold coffee beside it
barely moves and is far more at risk. Without that coupling the advice comes out
backwards — which it did, on the first run.

## The same engine, two audiences

| Route | For | Shows |
|---|---|---|
| `GET /api/offers` | customers | today's offers at every store |
| `GET /api/offers?store=dubai` | customers | one store, its rates and its forecast |
| `GET /api/advice` | the shop | every branch ranked by money at risk |
| `GET /api/advice?branch=dubai` | the shop | one branch, item by item, with discount ceilings |
| `GET /api/branches` | either | where the shops are |

`/api/advice` is the internal view and says the quiet part out loud: what is
about to turn and how much money is sitting in it. `/api/offers` is the same
numbers with that reasoning removed. A shopper is told the price and the
deadline — both true, both useful — and never that an item is near the end of
its window. Add `&stock=rasgulla:8,lassi:60` to `/api/advice` to test a what-if.

## Running it

```bash
node dev.js      # http://localhost:3000
```

No key, no `.env`, no `npm install` — `fetch` is built into Node and Open-Meteo
is unkeyed. `dev.js` mimics Vercel's file-based routing so the whole thing runs
locally; it is not used in production.

## What this does not claim

The demand side is a stated assumption, not a finding. Before writing it I
joined the shop's own sales history to real archived weather for those dates:
after cleaning, 67 bills survived, split 44 hot-and-humid / 13 rainy / 10 mild.
Dropping the single largest bill from each bucket moved one tier's revenue share
from 51% to 42%, and another from 11% to 2% — one order swings the answer by
half. The data also stops in September, so it says nothing about winter, when
jalebi and gajak matter most.

So the spoilage side is grounded in food physics and the discount ceiling is
pure arithmetic, but "hot drinks sell worse at 40°C" is a reasonable prior that
this shop's data is too thin to confirm. Logging weather alongside daily sales
would settle it.
