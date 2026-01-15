const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const {admin, db} = require("./firebase");

const ALLOWED_STATES = new Set(["NSW", "VIC", "ACT", "QLD", "TAS", "WA", "NT", "SA"]);
const COUNTRY = "australia";
const CACHE_COLLECTION = "suburbSearchCache";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const normalizeSuburb = (suburb) => suburb.trim().toLowerCase();

/**
 * Lookup LGA (administrative) results for an Australian suburb.
 * Query params:
 * - suburb: string (required)
 * - state: enum of NSW, VIC, ACT, QLD, TAS, WA, NT, SA (required)
 */
module.exports = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

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

  if (!suburb) {
    res.status(400).json({error: "suburb is required."});
    return;
  }

  if (!state || !ALLOWED_STATES.has(state)) {
    res.status(400).json({
      error: "state is required and must be one of NSW, VIC, ACT, QLD, TAS, WA, NT, SA.",
    });
    return;
  }

  // Cache by normalized suburb + state so repeated requests reuse results.
  const cacheKey = `${normalizeSuburb(suburb)}|${state}`;
  const cacheRef = db.collection(CACHE_COLLECTION).doc(cacheKey);

  try {
    const cachedSnap = await cacheRef.get();
    if (cachedSnap.exists) {
      const cachedData = cachedSnap.data();
      res.json({source: "cache", data: cachedData.results});
      return;
    }

    const query = `${suburb},${state.toLowerCase()},${COUNTRY}`;
    const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(query)}&format=jsonv2`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ito5002-suburb-lookup/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error("Nominatim request failed", {status: response.status});
      res.status(502).json({error: "Failed to fetch suburb data."});
      return;
    }

    const payload = await response.json();
    const results = Array.isArray(payload)
      ? payload.filter((item) => item && item.type === "administrative")
      : [];

    const formatted = results.map((item) => ({
      name: item.display_name || item.name || "",
      boundingBox: item.boundingbox || [],
      lat: item.lat || null,
      lon: item.lon || null,
    }));

    await cacheRef.set({
      suburb,
      state,
      country: COUNTRY,
      query,
      results: formatted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "nominatim",
    });

    res.json({source: "nominatim", data: formatted});
  } catch (error) {
    logger.error("Suburb lookup failed", {error});
    res.status(500).json({error: "Unexpected error while looking up suburb."});
  }
});
