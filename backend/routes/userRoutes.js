const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Driver = require("../models/Driver");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const adminOnly = [requireAuth, requireRole("Administrator")];
const operationsAccess = [
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
];

// GET /api/users/me/preferences — current user's operations workspace preferences.
router.get("/me/preferences", ...operationsAccess, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("operationsPreferences");
    if (!user) return res.status(404).json({ message: "User account not found" });
    return res.json({ preferences: user.operationsPreferences });
  } catch (error) {
    console.error("Could not load operations preferences:", error.message);
    return res.status(500).json({ message: "Could not load operations preferences" });
  }
});

// PATCH /api/users/me/preferences — update current user's operations preferences.
router.patch("/me/preferences", ...operationsAccess, async (req, res) => {
  try {
    const { defaultReportRange, dashboardAutoRefresh } = req.body;
    const allowedRanges = ["7", "30", "90", "all"];
    if (
      !allowedRanges.includes(defaultReportRange) ||
      typeof dashboardAutoRefresh !== "boolean"
    ) {
      return res.status(400).json({ message: "Choose valid operations preferences" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "operationsPreferences.defaultReportRange": defaultReportRange,
          "operationsPreferences.dashboardAutoRefresh": dashboardAutoRefresh,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).select("operationsPreferences");
    if (!user) return res.status(404).json({ message: "User account not found" });
    return res.json({ message: "Operations preferences saved", preferences: user.operationsPreferences });
  } catch (error) {
    console.error("Could not save operations preferences:", error.message);
    return res.status(500).json({ message: "Could not save operations preferences" });
  }
});

// GET /api/users — list users
router.get("/", ...adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role isActive createdAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Could not fetch users:", error.message);
    res.status(500).json({ message: "Could not fetch users" });
  }
});

// POST /api/users — create a user
router.post("/", ...adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        message: "Password must be at least 12 characters",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
    });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already in use" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not create user:", error.message);
    res.status(500).json({ message: "Could not create user" });
  }
});

// PATCH /api/users/:id/role — administrators manage user roles.
router.patch("/:id/role", ...adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = User.schema.path("role").enumValues;
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Choose a valid account role" });
    }

    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: "User account not found" });
    }
    if (account.role === "Driver" && role !== "Driver") {
      const activeDriverRecord = await Driver.exists({
        user: account._id,
        isActive: true,
      });

      if (activeDriverRecord) {
        return res.status(409).json({
          message:
            "Deactivate this driver's operational record before changing their role",
        });
      }
    }
    if (account.role === "Administrator" && role !== "Administrator") {
      const anotherActiveAdmin = await User.exists({
        _id: { $ne: account._id },
        role: "Administrator",
        isActive: true,
      });
      if (!anotherActiveAdmin) {
        return res.status(409).json({
          message:
            "Create another active administrator before changing this role",
        });
      }
    }

    account.role = role;
    await account.save();

    return res.json({
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
        isActive: account.isActive,
      },
    });
  } catch (error) {
    if (error.name === "CastError" || error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not update user role:", error.message);
    return res.status(500).json({ message: "Could not update user role" });
  }
});

// PATCH /api/users/:id/password — administrators reset another user's password.
router.patch("/:id/password", ...adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({
        message: "Password must be at least 12 characters",
      });
    }

    const account = await User.findById(req.params.id).select("name email");
    if (!account) {
      return res.status(404).json({ message: "User account not found" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updateResult = await User.updateOne(
      { _id: account._id },
      { $set: { passwordHash } },
    );
    if (updateResult.matchedCount !== 1) {
      return res.status(404).json({ message: "User account not found" });
    }

    return res.json({ message: `Password reset for ${account.email}` });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid user account" });
    }

    console.error("Could not reset user password:", error.message);
    return res.status(500).json({ message: "Could not reset user password" });
  }
});

module.exports = router;
