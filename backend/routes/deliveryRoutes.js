const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Delivery = require("../models/Delivery");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

// GET /api/deliveries
router.get("/", ...operationsAccess, async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (error) {
    console.error("Could not fetch deliveries:", error.message);
    res.status(500).json({ message: "Could not fetch deliveries" });
  }
});

// POST /api/deliveries
router.post("/", ...operationsAccess, async (req, res) => {
  try {
    const {
      pickup,
      destination,
      recipientName,
      recipientPhone,
      packageDescription,
      weightKg,
      priority,
      deliveryWindowStart,
      deliveryWindowEnd,
    } = req.body;

    const numericWeight = Number(weightKg);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return res.status(400).json({ message: "Package weight must be greater than zero kilograms" });
    }

    const delivery = await Delivery.create({
      pickup,
      destination,
      recipientName,
      recipientPhone,
      packageDescription,
      weightKg: numericWeight,
      priority,
      deliveryWindowStart,
      deliveryWindowEnd,
    });

    res.status(201).json(delivery);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Could not create a unique delivery reference. Please retry.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not create delivery:", error.message);
    res.status(500).json({ message: "Could not create delivery" });
  }
});

// PATCH /api/deliveries/:id/weight — preserve delivery status and update its measured cargo weight.
router.patch("/:id/weight", ...operationsAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid delivery record" });
    }
    const weightKg = Number(req.body.weightKg);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return res.status(400).json({ message: "Package weight must be greater than zero kilograms" });
    }
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });
    if (delivery.status !== "Planned") {
      return res.status(409).json({ message: "Only planned deliveries can have their package weight changed" });
    }
    delivery.weightKg = weightKg;
    await delivery.save();
    res.json(delivery);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not update delivery weight:", error.message);
    res.status(500).json({ message: "Could not update delivery weight" });
  }
});

// POST /api/drivers — managers create driver records linked to Driver accounts.
router.post(
  "/",
  requireAuth,
  requireRole("Fleet / Operations Manager"),
  async (req, res) => {
    try {
      const { userId, phone, licenseNumber, licenseExpiryDate } = req.body;

      if (
        !userId ||
        !phone?.trim() ||
        !licenseNumber?.trim() ||
        !licenseExpiryDate
      ) {
        return res.status(400).json({
          message: "Driver account, phone, licence number, and expiry date are required",
        });
      }

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Choose a valid Driver account",
        });
      }

      const expiryDate = new Date(licenseExpiryDate);
      if (Number.isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          message: "Enter a valid licence expiry date",
        });
      }

      const driverUser = await User.findOne({
        _id: userId,
        role: "Driver",
        isActive: true,
      });

      if (!driverUser) {
        return res.status(400).json({
          message: "Choose an active account with the Driver role",
        });
      }

      const existingDriver = await Driver.findOne({ user: driverUser._id });
      if (existingDriver) {
        return res.status(409).json({
          message: "This account already has a driver record",
        });
      }

      const driver = await Driver.create({
        user: driverUser._id,
        name: driverUser.name,
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseExpiryDate: expiryDate,
      });

      return res.status(201).json({ driver });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "This account or licence number is already in use",
        });
      }

      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
      }

      console.error("Could not create driver:", error.message);
      return res.status(500).json({
        message: "Could not create driver",
      });
    }
  },
);

// GET /api/drivers/available-accounts
router.get(
  "/available-accounts",
  requireAuth,
  requireRole("Fleet / Operations Manager"),
  async (req, res) => {
    try {
      const linkedUserIds = await Driver.distinct("user", {
        user: { $ne: null },
      });

      const accounts = await User.find({
        role: "Driver",
        isActive: true,
        _id: { $nin: linkedUserIds },
      })
        .select("name email")
        .sort({ name: 1 });

      return res.json({ accounts });
    } catch (error) {
      console.error("Could not fetch available Driver accounts:", error.message);
      return res.status(500).json({
        message: "Could not fetch available Driver accounts",
      });
    }
  },
);
// PATCH /api/drivers/:id — update a driver's operational details.
router.patch(
  "/:id",
  requireAuth,
  requireRole("Fleet / Operations Manager"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid driver record" });
      }

      const allowedFields = new Set([
        "phone",
        "licenseNumber",
        "licenseExpiryDate",
        "availability",
      ]);

      if (
        Object.keys(req.body).length === 0 ||
        Object.keys(req.body).some((field) => !allowedFields.has(field))
      ) {
        return res.status(400).json({
          message: "Update phone, licence details, or availability only",
        });
      }

      const driver = await Driver.findById(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver record not found" });
      }

      if ("phone" in req.body) {
        if (typeof req.body.phone !== "string" || !req.body.phone.trim()) {
          return res.status(400).json({ message: "Enter a valid phone number" });
        }
        driver.phone = req.body.phone.trim();
      }

      if ("licenseNumber" in req.body) {
        if (
          typeof req.body.licenseNumber !== "string" ||
          !req.body.licenseNumber.trim()
        ) {
          return res.status(400).json({ message: "Enter a valid licence number" });
        }
        driver.licenseNumber = req.body.licenseNumber.trim().toUpperCase();
      }

      if ("licenseExpiryDate" in req.body) {
        const expiryDate = new Date(req.body.licenseExpiryDate);
        if (Number.isNaN(expiryDate.getTime())) {
          return res.status(400).json({ message: "Enter a valid licence expiry date" });
        }
        driver.licenseExpiryDate = expiryDate;
      }

      if ("availability" in req.body) {
        const allowedAvailability = Driver.schema
          .path("availability")
          .enumValues;

        if (!allowedAvailability.includes(req.body.availability)) {
          return res.status(400).json({ message: "Choose a valid availability" });
        }
        driver.availability = req.body.availability;
      }

      await driver.save();
      await driver.populate("user", "name email isActive");

      return res.json({ driver });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "That licence number is already in use" });
      }
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
      }

      console.error("Could not update driver:", error.message);
      return res.status(500).json({ message: "Could not update driver" });
    }
  },
);

// PATCH /api/drivers/:id/deactivate — preserve the record and its history.
router.patch(
  "/:id/deactivate",
  requireAuth,
  requireRole("Fleet / Operations Manager"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid driver record" });
      }

      const driver = await Driver.findById(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver record not found" });
      }

      driver.isActive = false;
      driver.availability = "Unavailable";
      await driver.save();
      await driver.populate("user", "name email isActive");

      return res.json({ driver });
    } catch (error) {
      console.error("Could not deactivate driver:", error.message);
      return res.status(500).json({ message: "Could not deactivate driver" });
    }
  },
);
module.exports = router;
