// Weermodule via Open-Meteo (gratis, geen API-key).
// Uitbreidingen later: KNMI-waarschuwingen, Buienradar-neerslag, luchtkwaliteit.

import { config } from "../shared/config";
import type { WeatherSnapshot } from "../shared/types";

// WMO weather interpretation codes → Nederlandse omschrijving
const WEER_CODES: Record<number, string> = {
  0: "Helder",
  1: "Overwegend helder",
  2: "Half bewolkt",
  3: "Bewolkt",
  45: "Mist",
  48: "Aanvriezende mist",
  51: "Lichte motregen",
  53: "Motregen",
  55: "Dichte motregen",
  61: "Lichte regen",
  63: "Regen",
  65: "Zware regen",
  66: "Aanvriezende regen",
  71: "Lichte sneeuw",
  73: "Sneeuw",
  75: "Zware sneeuw",
  77: "Sneeuwkorrels",
  80: "Lichte buien",
  81: "Buien",
  82: "Zware buien",
  85: "Sneeuwbuien",
  86: "Zware sneeuwbuien",
  95: "Onweer",
  96: "Onweer met hagel",
  99: "Zwaar onweer met hagel",
};

export function omschrijfWeerCode(code: number): string {
  return WEER_CODES[code] ?? `Weercode ${code}`;
}

export async function fetchWeather(
  lat = config.weather.lat,
  lon = config.weather.lon,
  plaats = config.weather.plaats,
): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max,precipitation_probability_max");
  url.searchParams.set("timezone", config.timezone);
  url.searchParams.set("forecast_days", "1");

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Open-Meteo: HTTP ${response.status}`);
  const data = (await response.json()) as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
    daily: {
      temperature_2m_min: number[];
      temperature_2m_max: number[];
      precipitation_probability_max: number[];
    };
  };

  return {
    plaats,
    temp_nu: Math.round(data.current.temperature_2m),
    temp_min: Math.round(data.daily.temperature_2m_min[0]),
    temp_max: Math.round(data.daily.temperature_2m_max[0]),
    neerslag_kans: data.daily.precipitation_probability_max[0] ?? 0,
    weer_code: data.current.weather_code,
    omschrijving: omschrijfWeerCode(data.current.weather_code),
    wind_kmh: Math.round(data.current.wind_speed_10m),
  };
}
