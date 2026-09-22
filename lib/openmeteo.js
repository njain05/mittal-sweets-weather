// The only outside call this project makes. No key: Open-Meteo is unkeyed for
// non-commercial use, which is why it's the choice here.
//
// One request covers every branch — Open-Meteo accepts comma-joined coordinates
// and returns one object per location, each in its own local timezone.

const FORECAST = "https://api.open-meteo.com/v1/forecast";

export async function fetchForecast(branches, hoursAhead = 24) {
  const params = new URLSearchParams({
    latitude: branches.map(b => b.lat).join(","),
    longitude: branches.map(b => b.lon).join(","),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code",
    hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability",
    forecast_days: 2,
    timezone: "auto"
  });

  // Without a deadline a slow upstream hangs the whole function until the
  // platform kills it, and the page sits on its loading state with nothing to
  // show. Fail in eight seconds instead, with something the caller can report.
  let res;
  try {
    res = await fetch(`${FORECAST}?${params}`, {
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error("The weather service took too long to answer");
    }
    throw new Error("Could not reach the weather service");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Open-Meteo returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  // A single coordinate comes back as an object, several as an array.
  const list = Array.isArray(json) ? json : [json];

  return list.map((loc, i) => {
    const h = loc.hourly;
    const nowIso = loc.current.time;           // already local to this branch

    // Keep only the hours still ahead of us, then take the window we need.
    let start = h.time.findIndex(t => t >= nowIso);
    if (start < 0) start = 0;

    const hours = [];
    for (let k = start; k < Math.min(start + hoursAhead, h.time.length); k++) {
      hours.push({
        time: h.time[k],
        temp: h.temperature_2m[k],
        feels: h.apparent_temperature[k],
        humidity: h.relative_humidity_2m[k],
        rain_chance: h.precipitation_probability?.[k] ?? null
      });
    }

    return {
      branch: branches[i],
      timezone: loc.timezone,
      now: {
        time: nowIso,
        temp: loc.current.temperature_2m,
        feels: loc.current.apparent_temperature,
        humidity: loc.current.relative_humidity_2m,
        precipitation: loc.current.precipitation,
        code: loc.current.weather_code
      },
      hours
    };
  });
}
