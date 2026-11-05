const { requireAuth } = require("../middleware/authMiddleware");

const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const SystemSetting = require("../models/SystemSetting");
const router = express.Router();

function getLandingPath(role) {
  if (role === "Administrator") return "/admin";
  if (role === "Driver") return "/driver";
  if (role === "Viewer / Client") return "/client";
  return "/dashboard";
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Login is not configured on the server",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = require("jsonwebtoken").sign(
      {
        sub: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.cookie("fleetflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({
      message: "Login successful",
      redirectTo: getLandingPath(user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Could not log in" });
  }
});

// POST /api/auth/register — public sign-up is limited to client accounts.
router.post("/register", async (req, res) => {
  try {
    const adminExists = await User.exists({ role: "Administrator" });
    if (!adminExists) {
      return res.status(409).json({
        message: "Administrator setup must be completed before client registration",
      });
    }

    const systemSettings = await SystemSetting.findOne({ key: "global" }).select("allowClientRegistration");
    if (systemSettings?.allowClientRegistration === false) {
      return res.status(403).json({
        message: "Client self-registration is currently disabled. Contact your administrator.",
      });
    }

    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
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
      role: "Viewer / Client",
    });

    return res.status(201).json({
      message: "Client account created. You can now sign in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already in use" });
    }

    console.error("Client registration failed:", error.message);
    return res.status(500).json({ message: "Could not create client account" });
  }
});

// POST /api/auth/setup-admin
router.post("/setup-admin", async (req, res) => {
  try {
    const { setupKey, name, email, password } = req.body;

    if (
      !process.env.ADMIN_SETUP_KEY ||
      setupKey !== process.env.ADMIN_SETUP_KEY
    ) {
      return res.status(403).json({ message: "Invalid setup key" });
    }

    const adminExists = await User.exists({ role: "Administrator" });

    if (adminExists) {
      return res.status(409).json({
        message: "An administrator already exists",
      });
    }

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        message: "Password must be at least 12 characters",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "Administrator",
    });

    return res.status(201).json({
      message: "Administrator created",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already in use" });
    }

    console.error("Admin setup failed:", error.message);
    return res.status(500).json({ message: "Could not create administrator" });
  }
});
// GET /api/auth/setup-status
router.get("/setup-status", async (req, res) => {
  try {
    const adminExists = await User.exists({ role: "Administrator" });

    res.json({ needsSetup: !adminExists });
  } catch (error) {
    console.error("Could not check setup status:", error.message);
    res.status(500).json({ message: "Could not check setup status" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// PATCH /api/auth/me — users can update their own name and email, never their role.
router.patch("/me", requireAuth, async (req, res) => {
  const allowedFields = new Set(["name", "email"]);
  if (Object.keys(req.body).some((field) => !allowedFields.has(field))) {
    return res.status(400).json({ message: "Only your name and email can be changed here" });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }
  if (name.length > 100) {
    return res.status(400).json({ message: "Name must be 100 characters or fewer" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  try {
    req.user.name = name;
    req.user.email = email;
    await req.user.save();

    return res.json({
      message: "Profile updated",
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That email is already in use" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not update profile:", error.message);
    return res.status(500).json({ message: "Could not update profile" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("fleetflow_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({ message: "Logged out" });
});
module.exports = router;
