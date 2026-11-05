const express = require("express");
const mongoose = require("mongoose");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const Vehicle = require("../models/Vehicle");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

router.get("/", ...operationsAccess, async (_req, res) => {
  try {
    const records = await MaintenanceRecord.find()
      .populate("vehicle", "registrationNumber type status odometerKm")
      .sort({ scheduledDate: -1, createdAt: -1 })
      .limit(500);
    res.json(records);
  } catch (error) {
    console.error("Could not fetch maintenance records:", error.message);
    res.status(500).json({ message: "Could not fetch maintenance records" });
  }
});

router.post("/", ...operationsAccess, async (req, res) => {
  try {
    const {
      vehicleId,
      serviceType,
      description,
      scheduledDate,
      odometerKm,
      cost,
      serviceProvider,
      notes,
    } = req.body;
    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ message: "Choose a valid vehicle" });
    }
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const date = new Date(scheduledDate);
    if (!Number.isFinite(date.getTime())) {
      return res.status(400).json({ message: "Enter a valid scheduled date" });
    }
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Describe the maintenance work" });
    }
    const allowedTypes = MaintenanceRecord.schema.path("serviceType").enumValues;
    if (!allowedTypes.includes(serviceType)) {
      return res.status(400).json({ message: "Choose a valid service type" });
    }

    const numericOdometer = odometerKm === "" || odometerKm == null ? null : Number(odometerKm);
    const numericCost = cost === "" || cost == null ? null : Number(cost);
    if (numericOdometer !== null && (!Number.isFinite(numericOdometer) || numericOdometer < 0)) {
      return res.status(400).json({ message: "Odometer reading must be zero or greater" });
    }
    if (numericCost !== null && (!Number.isFinite(numericCost) || numericCost < 0)) {
      return res.status(400).json({ message: "Cost must be zero or greater" });
    }

    const record = await MaintenanceRecord.create({
      vehicle: vehicle._id,
      serviceType,
      description: description.trim(),
      scheduledDate: date,
      odometerKm: numericOdometer,
      cost: numericCost,
      serviceProvider: typeof serviceProvider === "string" ? serviceProvider.trim() : "",
      notes: typeof notes === "string" ? notes.trim() : "",
    });
    await record.populate("vehicle", "registrationNumber type status odometerKm");
    res.status(201).json(record);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not create maintenance record:", error.message);
    res.status(500).json({ message: "Could not create maintenance record" });
  }
});

router.patch("/:id/status", ...operationsAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid maintenance record" });
    }
    const record = await MaintenanceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Maintenance record not found" });

    const allowedTransitions = {
      Scheduled: ["In Progress", "Cancelled"],
      "In Progress": ["Completed", "Cancelled"],
      Completed: [],
      Cancelled: [],
    };
    const nextStatus = req.body.status;
    if (!allowedTransitions[record.status]?.includes(nextStatus)) {
      return res.status(400).json({ message: `Cannot change ${record.status} to ${nextStatus}` });
    }

    const vehicle = await Vehicle.findById(record.vehicle);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    if (nextStatus === "In Progress") {
      if (vehicle.status !== "available") {
        return res.status(409).json({ message: "Set the vehicle to Available before starting this service" });
      }
      const existingWork = await MaintenanceRecord.exists({
        _id: { $ne: record._id },
        vehicle: vehicle._id,
        status: "In Progress",
      });
      if (existingWork) {
        return res.status(409).json({ message: "Another maintenance job is already in progress for this vehicle" });
      }
      vehicle.status = "maintenance";
    } else if (record.status === "In Progress" && vehicle.status === "maintenance") {
      vehicle.status = "available";
    }

    record.status = nextStatus;
    if (nextStatus === "Completed") record.completedDate = new Date();
    await Promise.all([record.save(), vehicle.save()]);
    await record.populate("vehicle", "registrationNumber type status odometerKm");
    res.json(record);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not update maintenance status:", error.message);
    res.status(500).json({ message: "Could not update maintenance status" });
  }
});

module.exports = router;
