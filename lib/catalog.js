// The shop: where it is, and what it sells.
//
// Two attributes drive everything downstream:
//   tier  — how the item spoils (governs shelf life, so governs markdown)
//   serve — hot / cold / ambient (governs weather-driven demand)

export const BRANCHES = [
  { slug: "ludhiana",  city: "Ludhiana",  country: "India",     lat: 30.912,  lon: 75.854,  currency: "₹",  priceIndex: 1.0,  footfall: 1.0 },
  { slug: "delhi",     city: "Delhi",     country: "India",     lat: 28.614,  lon: 77.209,  currency: "₹",  priceIndex: 1.2,  footfall: 1.6 },
  { slug: "dubai",     city: "Dubai",     country: "UAE",       lat: 25.276,  lon: 55.296,  currency: "AED", priceIndex: 0.18, footfall: 0.9 },
  { slug: "singapore", city: "Singapore", country: "Singapore", lat: 1.352,   lon: 103.820, currency: "S$", priceIndex: 0.06, footfall: 1.1 },
  { slug: "london",    city: "London",    country: "UK",        lat: 51.507,  lon: -0.128,  currency: "£",  priceIndex: 0.035, footfall: 0.8 },
  { slug: "toronto",   city: "Toronto",   country: "Canada",    lat: 43.653,  lon: -79.383, currency: "C$", priceIndex: 0.055, footfall: 0.7 },
  { slug: "melbourne", city: "Melbourne", country: "Australia", lat: -37.814, lon: 144.963, currency: "A$", priceIndex: 0.05, footfall: 0.6 }
];

// Hours an item stays saleable on the counter at 25°C and 50% humidity.
// Everything else is a penalty applied to these.
export const SHELF_BASE = {
  dairy_drink: 8,    // lassi, badam milk — milk, unsealed, worst case
  cream: 12,         // cream cake, rasmalai
  chhena: 24,        // rasgulla, gulab jamun — fresh paneer, high water
  fried: 10,         // samosa, jalebi — goes soft rather than unsafe
  khoya: 72,         // barfi — reduced milk, much drier
  dry: 168,          // ladoo, namkeen — a week, barely cares
  sealed: 8760       // bottled — effectively not a concern
};

// rate/cost are in rupees per unit; a branch's priceIndex converts to local money.
export const CATALOG = [
  // — mithai —
  { id: "rasgulla",   name: "Rasgulla",         cat: "Mithai",  tier: "chhena",      serve: "cold",    unit: "kg",    rate: 320, cost: 205, stock: 4,  sellRate: 0.45 },
  { id: "gulabjamun", name: "Gulab Jamun",      cat: "Mithai",  tier: "chhena",      serve: "ambient", unit: "kg",    rate: 300, cost: 190, stock: 5,  sellRate: 0.60 },
  { id: "creamcake",  name: "Fresh Cream Cake", cat: "Mithai",  tier: "cream",       serve: "cold",    unit: "kg",    rate: 600, cost: 400, stock: 3,  sellRate: 0.25 },
  { id: "barfi",      name: "Barfi",            cat: "Mithai",  tier: "khoya",       serve: "ambient", unit: "kg",    rate: 520, cost: 330, stock: 6,  sellRate: 0.50 },
  { id: "kajubarfi",  name: "Kaju Barfi",       cat: "Mithai",  tier: "khoya",       serve: "ambient", unit: "kg",    rate: 520, cost: 340, stock: 4,  sellRate: 0.35 },
  { id: "ladoo",      name: "Motichoor Ladoo",  cat: "Mithai",  tier: "dry",         serve: "ambient", unit: "kg",    rate: 360, cost: 215, stock: 8,  sellRate: 0.70 },

  // — snacks —
  { id: "samosa",     name: "Samosa",           cat: "Snacks",  tier: "fried",       serve: "hot",     unit: "pc",    rate: 20,  cost: 11,  stock: 60, sellRate: 9.0 },
  { id: "jalebi",     name: "Jalebi",           cat: "Snacks",  tier: "fried",       serve: "hot",     unit: "kg",    rate: 240, cost: 140, stock: 3,  sellRate: 0.40 },
  { id: "pakora",     name: "Bread Pakora",     cat: "Snacks",  tier: "fried",       serve: "hot",     unit: "pc",    rate: 20,  cost: 10,  stock: 40, sellRate: 5.0 },
  { id: "namkeen",    name: "Bikaneri Namkeen", cat: "Snacks",  tier: "dry",         serve: "ambient", unit: "kg",    rate: 280, cost: 170, stock: 7,  sellRate: 0.35 },

  // — drinks —
  { id: "lassi",      name: "Sweet Lassi",      cat: "Drinks",  tier: "dairy_drink", serve: "cold",    unit: "glass", rate: 60,  cost: 28,  stock: 45, sellRate: 6.0 },
  { id: "badammilk",  name: "Badam Milk",       cat: "Drinks",  tier: "dairy_drink", serve: "hot",     unit: "glass", rate: 70,  cost: 34,  stock: 30, sellRate: 3.0 },
  { id: "chai",       name: "Masala Chai",      cat: "Drinks",  tier: "sealed",      serve: "hot",     unit: "cup",   rate: 25,  cost: 8,   stock: 80, sellRate: 12.0 },
  { id: "coffee",     name: "Filter Coffee",    cat: "Drinks",  tier: "sealed",      serve: "hot",     unit: "cup",   rate: 40,  cost: 14,  stock: 50, sellRate: 5.0 },
  { id: "nimbupani",  name: "Nimbu Pani",       cat: "Drinks",  tier: "sealed",      serve: "cold",    unit: "glass", rate: 40,  cost: 12,  stock: 60, sellRate: 7.0 },
  { id: "coldcoffee", name: "Cold Coffee",      cat: "Drinks",  tier: "dairy_drink", serve: "cold",    unit: "glass", rate: 90,  cost: 40,  stock: 35, sellRate: 4.0 },
  { id: "soda",       name: "Bottled Soda",     cat: "Drinks",  tier: "sealed",      serve: "cold",    unit: "bottle",rate: 30,  cost: 18,  stock: 90, sellRate: 8.0 }
];

export const byId = id => CATALOG.find(i => i.id === id);
export const branchBySlug = slug => BRANCHES.find(b => b.slug === slug);
