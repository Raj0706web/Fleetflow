const express = require("express");
const Route = require("../models/Route");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

// GET /api/routes/geocode?q=...
// Search is explicitly triggered by the user (no keystroke autocomplete).
router.get("/geocode", ...operationsAccess, async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2 || query.length > 160) {
    return res.status(400).json({ message: "Enter a place name or address (2–160 characters)" });
  }

  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(503).json({ message: "Place search is not configured. Add MAPBOX_ACCESS_TOKEN to the backend .env file." });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      access_token: accessToken,
      country: "IN",
      limit: "5",
      autocomplete: "false",
      permanent: "true",
    });
    const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
    const data = await response.json();
    if (!response.ok) {
      console.error("Mapbox geocoding failed:", data.message || response.statusText);
      return res.status(response.status === 401 || response.status === 403 ? 502 : 503)
        .json({ message: "Place search is temporarily unavailable. Check the Mapbox token and account settings." });
    }

    const results = (data.features || []).flatMap((feature) => {
      const [lng, lat] = feature.geometry?.coordinates || [];
      const name = feature.properties?.full_address || feature.properties?.name || "";
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [{ name, coordinates: { lat, lng } }];
    });
    res.json({ results });
  } catch (error) {
    console.error("Could not search places:", error.message);
    res.status(503).json({ message: "Place search is temporarily unavailable" });
  }
});

// POST /api/routes/:id/vehicles — assign a vehicle to one route only.
router.post("/:id/vehicles", ...operationsAccess, async (req, res) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ message: "vehicleId is required" });
    await Route.updateMany({ vehicles: vehicleId }, { $pull: { vehicles: vehicleId } });
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { vehicles: vehicleId } },
      { returnDocument: "after", runValidators: true },
    ).populate("vehicles", "registrationNumber type capacity status");
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not assign vehicle to route:", error.message);
    res.status(500).json({ message: "Could not assign vehicle to route" });
  }
});

// GET /api/routes
router.get("/", ...operationsAccess, async (req, res) => {
  try {
    const routes = await Route.find()
      .populate("vehicles", "registrationNumber type capacity status")
      .sort({ createdAt: -1 });
    res.json(routes);
  } catch (error) {
    console.error("Could not fetch routes:", error.message);
    res.status(500).json({ message: "Could not fetch routes" });
  }
});

// POST /api/routes
router.post("/", ...operationsAccess, async (req, res) => {
  try {
    const route = await Route.create(req.body);
    await route.populate("vehicles", "registrationNumber type capacity status");
    res.status(201).json(route);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A route with that number already exists" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not create route:", error.message);
    res.status(500).json({ message: "Could not create route" });
  }
});

// PATCH /api/routes/:id — update route details, including saved map coordinates.
router.patch("/:id", ...operationsAccess, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    }).populate("vehicles", "registrationNumber type capacity status");
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not update route:", error.message);
    res.status(500).json({ message: "Could not update route" });
  }
});

module.exports = router;
