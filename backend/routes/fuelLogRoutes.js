const express = require("express");
const mongoose = require("mongoose");
const FuelLog = require("../models/FuelLog");
const Vehicle = require("../models/Vehicle");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

router.get("/", ...operationsAccess, async (req, res) => {
  try {
    const logs = await FuelLog.find()
      .populate("vehicle", "registrationNumber type fuelType")
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();
    res.json(logs.map((log) => {
      const distanceKm = log.odometerKm - log.previousOdometerKm;
      return {
        ...log,
        costPerKm: distanceKm > 0 ? log.cost / distanceKm : null,
      };
    }));
  } catch (error) {
    console.error("Could not fetch fuel logs:", error.message);
    res.status(500).json({ message: "Could not fetch fuel logs" });
  }
});

router.post("/", ...operationsAccess, async (req, res) => {
  try {
    const { vehicleId, date, quantity, cost, odometerKm, station } = req.body;
    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ message: "Choose a valid vehicle" });
    }
    const numericQuantity = Number(quantity);
    const numericCost = Number(cost);
    const numericOdometer = Number(odometerKm);
    const loggedAt = new Date(date);
    if (!Number.isFinite(loggedAt.getTime())) {
      return res.status(400).json({ message: "Enter a valid refuelling date" });
    }
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than zero" });
    }
    if (!Number.isFinite(numericCost) || numericCost < 0) {
      return res.status(400).json({ message: "Cost must be zero or greater" });
    }
    if (!Number.isFinite(numericOdometer) || numericOdometer < 0) {
      return res.status(400).json({ message: "Odometer reading must be zero or greater" });
    }
    if (typeof station !== "string" || !station.trim()) {
      return res.status(400).json({ message: "Enter the fuel station" });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (numericOdometer < vehicle.odometerKm) {
      return res.status(400).json({
        message: `Odometer reading cannot be below the vehicle's current ${vehicle.odometerKm.toLocaleString()} km reading`,
      });
    }

    const log = await FuelLog.create({
      vehicle: vehicle._id,
      date: loggedAt,
      quantity: numericQuantity,
      unit: vehicle.fuelType === "Electric" ? "kWh" : "litres",
      cost: numericCost,
      odometerKm: numericOdometer,
      previousOdometerKm: vehicle.odometerKm,
      station: station.trim(),
    });

    if (numericOdometer > vehicle.odometerKm) {
      vehicle.odometerKm = numericOdometer;
      await vehicle.save();
    }

    await log.populate("vehicle", "registrationNumber type fuelType");
    const distanceKm = log.odometerKm - log.previousOdometerKm;
    res.status(201).json({
      ...log.toObject(),
      costPerKm: distanceKm > 0 ? log.cost / distanceKm : null,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not create fuel log:", error.message);
    res.status(500).json({ message: "Could not create fuel log" });
  }
});

module.exports = router;
