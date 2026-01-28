const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const AIR_QUALITY_ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const COUNTRY = "australia";
const ALLOWED_STATES = new Set(["NSW", "VIC", "ACT", "QLD", "TAS", "WA", "NT", "SA"]);

const setCorsHeaders = (res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
};

// Extract a readable error message from upstream responses.
const getUpstreamErrorMessage = async (response) => {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (payload && typeof payload.error === "string") {
        return payload.error;
      }
    }
    const text = await response.text();
    return text || "";
  } catch (error) {
    logger.warn("Failed to parse upstream error body", {error});
    return "";
  }
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

  return {value: items.join(",")};
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isIsoDateTime = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
const toUtcMidnight = (value) => {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
};
const toUtcDateTime = (value) => {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map((part) => Number.parseInt(part, 10));
  const [hour, minute] = timePart.split(":").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
};

const isWithinHistoryLimit = (date, maxDays) => {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const earliest = new Date(todayUtc);
  earliest.setUTCDate(todayUtc.getUTCDate() - maxDays);
  return date >= earliest;
};

const isWithinFutureLimit = (date, maxDays) => {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const latest = new Date(todayUtc);
  latest.setUTCDate(todayUtc.getUTCDate() + maxDays);
  return date <= latest;
};

const fetchLgaCoordinates = async (suburb, state) => {
  const query = `${suburb},${state.toLowerCase()},${COUNTRY}`;
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(query)}&format=jsonv2`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ito5002-air-quality/1.0",
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
 * Lookup air quality data for a given coordinate using Open-Meteo.
 * Query params:
 * - latitude: number (required)
 * - longitude: number (required)
 * - hourly: comma-separated list of variables (optional)
 * - current: comma-separated list of variables (optional)
 * - domains: string (optional)
 * - timeformat: string (optional)
 * - timezone: string (optional)
 * - past_days: integer 0-92 (optional)
 * - forecast_days: integer 0-7 (optional)
 * - forecast_hours: integer (>0) (optional)
 * - past_hours: integer (>0) (optional)
 * - start_date: string yyyy-mm-dd (optional)
 * - end_date: string yyyy-mm-dd (optional)
 * - start_hour: string yyyy-mm-ddThh:mm (optional)
 * - end_hour: string yyyy-mm-ddThh:mm (optional)
 * - cell_selection: string (optional)
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

  let latitudeValue = "";
  let longitudeValue = "";

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

  const hourlyRaw = typeof req.query.hourly === "string" ? req.query.hourly : "";
  const currentRaw = typeof req.query.current === "string" ? req.query.current : "";
  const domains = typeof req.query.domains === "string" ? req.query.domains.trim() : "";
  const timeformat = typeof req.query.timeformat === "string" ? req.query.timeformat.trim() : "";
  const timezone = typeof req.query.timezone === "string" ? req.query.timezone.trim() : "";
  const pastDaysRaw = typeof req.query.past_days === "string" ? req.query.past_days : "";
  const forecastDaysRaw = typeof req.query.forecast_days === "string" ? req.query.forecast_days : "";
  const forecastHoursRaw =
    typeof req.query.forecast_hours === "string" ? req.query.forecast_hours : "";
  const pastHoursRaw = typeof req.query.past_hours === "string" ? req.query.past_hours : "";
  const startDate = typeof req.query.start_date === "string" ? req.query.start_date : "";
  const endDate = typeof req.query.end_date === "string" ? req.query.end_date : "";
  const startHour = typeof req.query.start_hour === "string" ? req.query.start_hour : "";
  const endHour = typeof req.query.end_hour === "string" ? req.query.end_hour : "";
  const cellSelection =
    typeof req.query.cell_selection === "string" ? req.query.cell_selection.trim() : "";
  const apiKey = typeof req.query.apikey === "string" ? req.query.apikey.trim() : "";

  const hourly = hourlyRaw ? normalizeCsv(hourlyRaw) : "";
  const current = currentRaw ? normalizeCsv(currentRaw) : "";

  const pastDays = pastDaysRaw ? Number.parseInt(pastDaysRaw, 10) : null;
  const forecastDays = forecastDaysRaw ? Number.parseInt(forecastDaysRaw, 10) : null;
  const forecastHours = forecastHoursRaw ? Number.parseInt(forecastHoursRaw, 10) : null;
  const pastHours = pastHoursRaw ? Number.parseInt(pastHoursRaw, 10) : null;

  if (pastDays !== null && (Number.isNaN(pastDays) || pastDays < 0 || pastDays > 92)) {
    res.status(400).json({error: "past_days must be an integer between 0 and 92."});
    return;
  }

  if (forecastDays !== null && (Number.isNaN(forecastDays) || forecastDays < 0 || forecastDays > 7)) {
    res.status(400).json({error: "forecast_days must be an integer between 0 and 7."});
    return;
  }

  if (forecastHours !== null && (Number.isNaN(forecastHours) || forecastHours <= 0)) {
    res.status(400).json({error: "forecast_hours must be an integer greater than 0."});
    return;
  }

  if (pastHours !== null && (Number.isNaN(pastHours) || pastHours <= 0)) {
    res.status(400).json({error: "past_hours must be an integer greater than 0."});
    return;
  }

  if (startDate && !isIsoDate(startDate)) {
    res.status(400).json({error: "start_date must be in yyyy-mm-dd format."});
    return;
  }

  if (endDate && !isIsoDate(endDate)) {
    res.status(400).json({error: "end_date must be in yyyy-mm-dd format."});
    return;
  }

  if (startHour && !isIsoDateTime(startHour)) {
    res.status(400).json({error: "start_hour must be in yyyy-mm-ddThh:mm format."});
    return;
  }

  if (endHour && !isIsoDateTime(endHour)) {
    res.status(400).json({error: "end_hour must be in yyyy-mm-ddThh:mm format."});
    return;
  }

  if (startDate && endDate) {
    const startDateUtc = toUtcMidnight(startDate);
    const endDateUtc = toUtcMidnight(endDate);
    if (startDateUtc > endDateUtc) {
      res.status(400).json({error: "start_date must be before or equal to end_date."});
      return;
    }
  }

  if (startHour && endHour) {
    const startHourUtc = toUtcDateTime(startHour);
    const endHourUtc = toUtcDateTime(endHour);
    if (startHourUtc > endHourUtc) {
      res.status(400).json({error: "start_hour must be before or equal to end_hour."});
      return;
    }
  }

  if (startDate) {
    const startDateUtc = toUtcMidnight(startDate);
    if (!isWithinHistoryLimit(startDateUtc, 92)) {
      res.status(400).json({error: "start_date cannot be more than 92 days in the past."});
      return;
    }
    if (!isWithinFutureLimit(startDateUtc, 7)) {
      res.status(400).json({error: "start_date cannot be more than 7 days in the future."});
      return;
    }
  }

  if (endDate) {
    const endDateUtc = toUtcMidnight(endDate);
    if (!isWithinHistoryLimit(endDateUtc, 92)) {
      res.status(400).json({error: "end_date cannot be more than 92 days in the past."});
      return;
    }
    if (!isWithinFutureLimit(endDateUtc, 7)) {
      res.status(400).json({error: "end_date cannot be more than 7 days in the future."});
      return;
    }
  }

  if (startHour) {
    const startHourDate = toUtcMidnight(startHour.slice(0, 10));
    if (!isWithinHistoryLimit(startHourDate, 92)) {
      res.status(400).json({error: "start_hour cannot be more than 92 days in the past."});
      return;
    }
    if (!isWithinFutureLimit(startHourDate, 7)) {
      res.status(400).json({error: "start_hour cannot be more than 7 days in the future."});
      return;
    }
  }

  if (endHour) {
    const endHourDate = toUtcMidnight(endHour.slice(0, 10));
    if (!isWithinHistoryLimit(endHourDate, 92)) {
      res.status(400).json({error: "end_hour cannot be more than 92 days in the past."});
      return;
    }
    if (!isWithinFutureLimit(endHourDate, 7)) {
      res.status(400).json({error: "end_hour cannot be more than 7 days in the future."});
      return;
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: latitudeValue,
      longitude: longitudeValue,
    });

    if (hourly) {
      params.set("hourly", hourly);
    }

    if (current) {
      params.set("current", current);
    }

    if (domains) {
      params.set("domains", domains);
    }

    if (timeformat) {
      params.set("timeformat", timeformat);
    }

    if (timezone) {
      params.set("timezone", timezone);
    }

    if (pastDays !== null) {
      params.set("past_days", String(pastDays));
    }

    if (forecastDays !== null) {
      params.set("forecast_days", String(forecastDays));
    }

    if (forecastHours !== null) {
      params.set("forecast_hours", String(forecastHours));
    }

    if (pastHours !== null) {
      params.set("past_hours", String(pastHours));
    }

    if (startDate) {
      params.set("start_date", startDate);
    }

    if (endDate) {
      params.set("end_date", endDate);
    }

    if (startHour) {
      params.set("start_hour", startHour);
    }

    if (endHour) {
      params.set("end_hour", endHour);
    }

    if (cellSelection) {
      params.set("cell_selection", cellSelection);
    }

    if (apiKey) {
      params.set("apikey", apiKey);
    }

    const url = `${AIR_QUALITY_ENDPOINT}?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ito5002-air-quality/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const upstreamMessage = await getUpstreamErrorMessage(response);
      const isQuotaError =
        response.status === 429 || /quota/i.test(upstreamMessage || "");
      logger.error("Air quality request failed", {
        status: response.status,
        upstreamMessage,
      });
      if (isQuotaError) {
        res.status(429).json({
          error: "The data provider quota has been exceeded. Please try again later.",
        });
        return;
      }
      res.status(502).json({error: "Failed to fetch air quality data."});
      return;
    }

    const payload = await response.json();

    res.json({source: "open-meteo", data: payload});
  } catch (error) {
    logger.error("Air quality lookup failed", {error});
    res.status(500).json({error: "Unexpected error while looking up air quality."});
  }
});
