const express = require("express");
const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];
const viewAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

const managerAccess = [
  requireAuth,
  requireRole("Fleet / Operations Manager"),
];
// GET /api/vehicles
router.get("/", ...operationsAccess, async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch vehicles" });
  }
});

// POST /api/vehicles
router.post("/", ...operationsAccess, async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A vehicle with that registration number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Could not create vehicle" });
  }
});

// PATCH /api/vehicles/:id — managers update vehicle details and status.
router.patch("/:id", ...managerAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid vehicle record" });
    }

    const allowedFields = new Set([
      "registrationNumber",
      "type",
      "capacity",
      "fuelType",
      "odometerKm",
      "status",
    ]);

    const fields = Object.keys(req.body);
    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.has(field))
    ) {
      return res.status(400).json({
        message: "Update valid vehicle details only",
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if ("registrationNumber" in req.body) {
      if (
        typeof req.body.registrationNumber !== "string" ||
        !req.body.registrationNumber.trim()
      ) {
        return res.status(400).json({ message: "Enter a registration number" });
      }
      vehicle.registrationNumber = req.body.registrationNumber.trim().toUpperCase();
    }

    if ("type" in req.body) {
      if (typeof req.body.type !== "string" || !req.body.type.trim()) {
        return res.status(400).json({ message: "Enter a vehicle type" });
      }
      vehicle.type = req.body.type.trim();
    }

    if ("capacity" in req.body) {
      const capacity = Number(req.body.capacity);
      if (!Number.isFinite(capacity) || capacity < 0) {
        return res.status(400).json({ message: "Capacity must be zero or greater" });
      }
      vehicle.capacity = capacity;
    }

    if ("fuelType" in req.body) {
      const validFuelTypes = Vehicle.schema.path("fuelType").enumValues;
      if (!validFuelTypes.includes(req.body.fuelType)) {
        return res.status(400).json({ message: "Choose a valid fuel type" });
      }
      vehicle.fuelType = req.body.fuelType;
    }

    if ("odometerKm" in req.body) {
      const odometerKm = Number(req.body.odometerKm);
      if (!Number.isFinite(odometerKm) || odometerKm < 0) {
        return res.status(400).json({ message: "Odometer must be zero or greater" });
      }
      vehicle.odometerKm = odometerKm;
    }

    if ("status" in req.body) {
      const validStatuses = Vehicle.schema.path("status").enumValues;
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Choose a valid vehicle status" });
      }
      if (req.body.status === "available") {
        const activeMaintenance = await MaintenanceRecord.exists({
          vehicle: vehicle._id,
          status: "In Progress",
        });
        if (activeMaintenance) {
          return res.status(409).json({
            message: "Complete or cancel the active maintenance job before making this vehicle available",
          });
        }
      }
      vehicle.status = req.body.status;
    }

    await vehicle.save();
    return res.json({ vehicle });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A vehicle with that registration number already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not update vehicle:", error.message);
    return res.status(500).json({ message: "Could not update vehicle" });
  }
});

module.exports = router;
