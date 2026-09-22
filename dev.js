// Local dev server. Mimics how Vercel routes /api/* to the files in api/,
// so you can test everything before deploying. Not used in production.
//
//   node dev.js   ->   http://localhost:3000

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const PORT = 3000;

// Load env vars by hand — Vercel does this for you in production.
// Checks .env.local first, then .env (TextEdit likes to drop the .local).
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  const text = await readFile(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function readBody(req) {
  return new Promise(resolve => {
    let raw = "";
    req.on("data", c => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(await readFile("index.html"));
  }

  if (url.pathname.startsWith("/api/")) {
    const file = `./api/${url.pathname.slice(5)}.js`;
    if (!existsSync(file)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: `No endpoint at ${url.pathname}` }));
    }

    // Give the handler the req/res shape Vercel provides.
    req.query = Object.fromEntries(url.searchParams);
    req.body = req.method === "POST" ? await readBody(req) : undefined;
    res.status = code => { res.statusCode = code; return res; };
    res.json = obj => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj, null, 2));
    };

    const { default: handler } = await import(file + `?t=${Date.now()}`);
    return handler(req, res);
  }

  res.writeHead(404).end("Not found");
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  console.log("Open-Meteo needs no key — nothing to configure.");
});
