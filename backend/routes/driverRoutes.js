const express = require("express");
const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/drivers/me — a driver can view only their own active record.
router.get(
  "/me",
  requireAuth,
  requireRole("Driver"),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({
        user: req.user._id,
        isActive: true,
      }).populate("assignedVehicle", "registrationNumber type status");

      if (!driver) {
        return res.status(404).json({
          message: "No active driver record is linked to your account",
        });
      }

      return res.json({ driver });
    } catch (error) {
      console.error("Could not fetch driver profile:", error.message);
      return res.status(500).json({
        message: "Could not fetch driver profile",
      });
    }
  },
);

// GET /api/drivers/available-accounts — managers select unlinked Driver accounts.
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

// GET /api/drivers — managers and administrators can view driver records.
router.get(
  "/",
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
  async (req, res) => {
    try {
      const drivers = await Driver.find()
        .populate("user", "name email isActive")
        .populate("assignedVehicle", "registrationNumber type status")
        .sort({ name: 1 });

      return res.json({ drivers });
    } catch (error) {
      console.error("Could not fetch drivers:", error.message);
      return res.status(500).json({
        message: "Could not fetch drivers",
      });
    }
  },
);

// POST /api/drivers — managers create records linked to active Driver accounts.
router.post(
  "/",
  requireAuth,
  requireRole("Fleet / Operations Manager"),
  async (req, res) => {
    try {
      const { userId, phone, licenseNumber, licenseExpiryDate } = req.body;

      if (
        !userId ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof licenseNumber !== "string" ||
        !licenseNumber.trim() ||
        !licenseExpiryDate
      ) {
        return res.status(400).json({
          message:
            "Driver account, phone, licence number, and expiry date are required",
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

      await driver.populate("user", "name email isActive");
      await driver.populate("assignedVehicle", "registrationNumber type status");

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

// PATCH /api/drivers/:id — managers update operational details.
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
      const body = req.body || {};
      const fields = Object.keys(body);

      if (
        fields.length === 0 ||
        fields.some((field) => !allowedFields.has(field))
      ) {
        return res.status(400).json({
          message: "Update phone, licence details, or availability only",
        });
      }

      const driver = await Driver.findById(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver record not found" });
      }

      if ("phone" in body) {
        if (typeof body.phone !== "string" || !body.phone.trim()) {
          return res.status(400).json({ message: "Enter a valid phone number" });
        }
        driver.phone = body.phone.trim();
      }

      if ("licenseNumber" in body) {
        if (
          typeof body.licenseNumber !== "string" ||
          !body.licenseNumber.trim()
        ) {
          return res.status(400).json({ message: "Enter a valid licence number" });
        }
        driver.licenseNumber = body.licenseNumber.trim().toUpperCase();
      }

      if ("licenseExpiryDate" in body) {
        const expiryDate = new Date(body.licenseExpiryDate);
        if (Number.isNaN(expiryDate.getTime())) {
          return res.status(400).json({
            message: "Enter a valid licence expiry date",
          });
        }
        driver.licenseExpiryDate = expiryDate;
      }

      if ("availability" in body) {
        const allowedAvailability =
          Driver.schema.path("availability").enumValues;

        if (!allowedAvailability.includes(body.availability)) {
          return res.status(400).json({
            message: "Choose a valid availability",
          });
        }
        driver.availability = body.availability;
      }

      await driver.save();
      await driver.populate("user", "name email isActive");
      await driver.populate("assignedVehicle", "registrationNumber type status");

      return res.json({ driver });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "That licence number is already in use",
        });
      }

      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
      }

      console.error("Could not update driver:", error.message);
      return res.status(500).json({
        message: "Could not update driver",
      });
    }
  },
);

// PATCH /api/drivers/:id/deactivate — preserve the record and history.
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
      await driver.populate("assignedVehicle", "registrationNumber type status");

      return res.json({ driver });
    } catch (error) {
      console.error("Could not deactivate driver:", error.message);
      return res.status(500).json({
        message: "Could not deactivate driver",
      });
    }
  },
);
// PATCH /api/drivers/:id/activate — managers reactivate an existing record.
router.patch(
  "/:id/activate",
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

      if (driver.isActive) {
        return res.status(409).json({
          message: "This driver record is already active",
        });
      }

      const linkedUser = await User.findById(driver.user).select(
        "role isActive",
      );

      if (
        !linkedUser ||
        !linkedUser.isActive ||
        linkedUser.role !== "Driver"
      ) {
        return res.status(409).json({
          message: "The linked account must be active and have the Driver role",
        });
      }

      driver.isActive = true;
      driver.availability = "Unavailable";
      await driver.save();
      await driver.populate("user", "name email isActive");
      await driver.populate(
        "assignedVehicle",
        "registrationNumber type status",
      );

      return res.json({ driver });
    } catch (error) {
      console.error("Could not reactivate driver:", error.message);
      return res.status(500).json({
        message: "Could not reactivate driver",
      });
    }
  },
);

module.exports = router;