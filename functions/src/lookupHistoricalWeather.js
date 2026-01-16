const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const COUNTRY = "australia";
const ALLOWED_STATES = new Set(["NSW", "VIC", "ACT", "QLD", "TAS", "WA", "NT", "SA"]);
const ALLOWED_TEMPERATURE_UNITS = new Set(["celsius", "fahrenheit"]);
const ALLOWED_WIND_SPEED_UNITS = new Set(["kmh", "ms", "mph", "kn"]);
const ALLOWED_PRECIPITATION_UNITS = new Set(["mm", "inch"]);
const ALLOWED_TIME_FORMATS = new Set(["iso8601", "unixtime"]);
const ALLOWED_CELL_SELECTIONS = new Set(["land", "sea", "nearest"]);

const setCorsHeaders = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
};

const parseNumber = (value) => {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCsv = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");

const fetchLgaCoordinates = async (suburb, state) => {
  const query = `${suburb},${state.toLowerCase()},${COUNTRY}`;
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(query)}&format=jsonv2`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ito5002-historical-weather/1.0",
      Accept: "application/json",
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error("Failed to fetch suburb coordinates.");
  }

  const payload = await response.json();
  const results = Array.isArray(payload)
    ? payload.filter((item) => item && item.type === "administrative")
    : [];
  const first = results[0];

  if (!first || first.lat === undefined || first.lon === undefined) {
    throw new Error("No LGA coordinate data found.");
  }

  return {lat: first.lat, lon: first.lon};
};

/**
 * Parse and validate a comma-separated coordinate list.
 */
const parseCoordinateList = (value, label, min, max) => {
  const items = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (!items.length) {
    return {error: `${label} is required.`};
  }

  for (const item of items) {
    const parsed = parseNumber(item);
    if (parsed === null) {
      return {error: `${label} must be numeric.`};
    }
    if (parsed < min || parsed > max) {
      return {error: `${label} out of range.`};
    }
  }

  return {value: items.join(","), items};
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const toUtcMidnight = (value) => {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Lookup historical weather data for a given coordinate using Open-Meteo archive API.
 * Query params:
 * - latitude: number or comma-separated list (required unless suburb/state provided)
 * - longitude: number or comma-separated list (required unless suburb/state provided)
 * - suburb: string (optional, requires state)
 * - state: enum of NSW, VIC, ACT, QLD, TAS, WA, NT, SA (optional)
 * - start_date: string yyyy-mm-dd (required)
 * - end_date: string yyyy-mm-dd (required)
 * - hourly: comma-separated list of variables (optional)
 * - daily: comma-separated list of variables (optional, requires timezone)
 * - elevation: number (optional)
 * - temperature_unit: celsius|fahrenheit (optional)
 * - wind_speed_unit: kmh|ms|mph|kn (optional)
 * - precipitation_unit: mm|inch (optional)
 * - timeformat: iso8601|unixtime (optional)
 * - timezone: string (optional, required if daily provided)
 * - cell_selection: land|sea|nearest (optional)
 * - apikey: string (optional)
 */
module.exports = onRequest(async (req, res) => {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed. Use GET."});
    return;
  }

  const suburb = typeof req.query.suburb === "string" ? req.query.suburb.trim() : "";
  const state = typeof req.query.state === "string" ? req.query.state.trim().toUpperCase() : "";
  const latitudeRaw = typeof req.query.latitude === "string" ? req.query.latitude : "";
  const longitudeRaw = typeof req.query.longitude === "string" ? req.query.longitude : "";
  const startDate = typeof req.query.start_date === "string" ? req.query.start_date : "";
  const endDate = typeof req.query.end_date === "string" ? req.query.end_date : "";
  const hourlyRaw = typeof req.query.hourly === "string" ? req.query.hourly : "";
  const dailyRaw = typeof req.query.daily === "string" ? req.query.daily : "";
  const elevationRaw = typeof req.query.elevation === "string" ? req.query.elevation : "";
  const temperatureUnit =
    typeof req.query.temperature_unit === "string" ? req.query.temperature_unit.trim() : "";
  const windSpeedUnit =
    typeof req.query.wind_speed_unit === "string" ? req.query.wind_speed_unit.trim() : "";
  const precipitationUnit =
    typeof req.query.precipitation_unit === "string" ? req.query.precipitation_unit.trim() : "";
  const timeformat = typeof req.query.timeformat === "string" ? req.query.timeformat.trim() : "";
  const timezone = typeof req.query.timezone === "string" ? req.query.timezone.trim() : "";
  const cellSelection =
    typeof req.query.cell_selection === "string" ? req.query.cell_selection.trim() : "";
  const apiKey = typeof req.query.apikey === "string" ? req.query.apikey.trim() : "";

  let latitudeValue = "";
  let longitudeValue = "";

  if (!startDate || !endDate) {
    res.status(400).json({error: "start_date and end_date are required."});
    return;
  }

  if (!isIsoDate(startDate)) {
    res.status(400).json({error: "start_date must be in yyyy-mm-dd format."});
    return;
  }

  if (!isIsoDate(endDate)) {
    res.status(400).json({error: "end_date must be in yyyy-mm-dd format."});
    return;
  }

  const startDateUtc = toUtcMidnight(startDate);
  const endDateUtc = toUtcMidnight(endDate);
  if (startDateUtc > endDateUtc) {
    res.status(400).json({error: "start_date must be before or equal to end_date."});
    return;
  }

  if (latitudeRaw || longitudeRaw) {
    const latitudeList = parseCoordinateList(latitudeRaw, "latitude", -90, 90);
    if (latitudeList.error) {
      res.status(400).json({error: latitudeList.error});
      return;
    }

    const longitudeList = parseCoordinateList(longitudeRaw, "longitude", -180, 180);
    if (longitudeList.error) {
      res.status(400).json({error: longitudeList.error});
      return;
    }

    if (latitudeList.items.length !== longitudeList.items.length) {
      res.status(400).json({error: "latitude and longitude counts must match."});
      return;
    }

    latitudeValue = latitudeList.value;
    longitudeValue = longitudeList.value;
  } else if (suburb && state) {
    if (!ALLOWED_STATES.has(state)) {
      res.status(400).json({
        error: "state must be one of NSW, VIC, ACT, QLD, TAS, WA, NT, SA.",
      });
      return;
    }

    try {
      const coords = await fetchLgaCoordinates(suburb, state);
      latitudeValue = String(coords.lat);
      longitudeValue = String(coords.lon);
    } catch (error) {
      logger.error("Suburb LGA lookup failed", {error});
      res.status(404).json({error: "Unable to resolve suburb coordinates."});
      return;
    }
  } else {
    res.status(400).json({
      error: "Provide latitude/longitude or suburb/state parameters.",
    });
    return;
  }

  const hourly = hourlyRaw ? normalizeCsv(hourlyRaw) : "";
  const daily = dailyRaw ? normalizeCsv(dailyRaw) : "";

  if (daily && !timezone) {
    res.status(400).json({error: "timezone is required when requesting daily data."});
    return;
  }

  let elevationValue = "";
  if (elevationRaw) {
    const parsedElevation = parseNumber(elevationRaw);
    if (parsedElevation === null) {
      res.status(400).json({error: "elevation must be numeric."});
      return;
    }
    elevationValue = String(parsedElevation);
  }

  if (temperatureUnit && !ALLOWED_TEMPERATURE_UNITS.has(temperatureUnit)) {
    res.status(400).json({error: "temperature_unit must be celsius or fahrenheit."});
    return;
  }

  if (windSpeedUnit && !ALLOWED_WIND_SPEED_UNITS.has(windSpeedUnit)) {
    res.status(400).json({error: "wind_speed_unit must be kmh, ms, mph, or kn."});
    return;
  }

  if (precipitationUnit && !ALLOWED_PRECIPITATION_UNITS.has(precipitationUnit)) {
    res.status(400).json({error: "precipitation_unit must be mm or inch."});
    return;
  }

  if (timeformat && !ALLOWED_TIME_FORMATS.has(timeformat)) {
    res.status(400).json({error: "timeformat must be iso8601 or unixtime."});
    return;
  }

  if (cellSelection && !ALLOWED_CELL_SELECTIONS.has(cellSelection)) {
    res.status(400).json({error: "cell_selection must be land, sea, or nearest."});
    return;
  }

  try {
    const params = new URLSearchParams({
      latitude: latitudeValue,
      longitude: longitudeValue,
      start_date: startDate,
      end_date: endDate,
    });

    if (hourly) {
      params.set("hourly", hourly);
    }

    if (daily) {
      params.set("daily", daily);
    }

    if (elevationValue) {
      params.set("elevation", elevationValue);
    }

    if (temperatureUnit) {
      params.set("temperature_unit", temperatureUnit);
    }

    if (windSpeedUnit) {
      params.set("wind_speed_unit", windSpeedUnit);
    }

    if (precipitationUnit) {
      params.set("precipitation_unit", precipitationUnit);
    }

    if (timeformat) {
      params.set("timeformat", timeformat);
    }

    if (timezone) {
      params.set("timezone", timezone);
    }

    if (cellSelection) {
      params.set("cell_selection", cellSelection);
    }

    if (apiKey) {
      params.set("apikey", apiKey);
    }

    const url = `${ARCHIVE_ENDPOINT}?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ito5002-historical-weather/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Historical weather request failed", {status: response.status});
      res.status(502).json({error: "Failed to fetch historical weather data."});
      return;
    }

    const payload = await response.json();
    res.json({source: "open-meteo", data: payload});
  } catch (error) {
    logger.error("Historical weather lookup failed", {error});
    res.status(500).json({error: "Unexpected error while looking up historical weather."});
  }
});
