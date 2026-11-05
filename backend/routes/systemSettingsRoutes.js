const express = require("express");
const SystemSetting = require("../models/SystemSetting");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const adminOnly = [requireAuth, requireRole("Administrator")];

router.get("/public", async (_req, res) => {
  try {
    const settings = await SystemSetting.findOne({ key: "global" }).select("allowClientRegistration").lean();
    return res.json({ allowClientRegistration: settings?.allowClientRegistration !== false });
  } catch (error) {
    console.error("Could not load public registration settings:", error.message);
    return res.status(500).json({ message: "Could not load registration settings" });
  }
});

router.get("/system", ...adminOnly, async (req, res) => {
  try {
    const settings = await SystemSetting.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { key: "global" } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).select("allowClientRegistration updatedAt");
    return res.json({ settings });
  } catch (error) {
    console.error("Could not load system settings:", error.message);
    return res.status(500).json({ message: "Could not load system settings" });
  }
});

router.patch("/system", ...adminOnly, async (req, res) => {
  try {
    const { allowClientRegistration } = req.body;
    if (typeof allowClientRegistration !== "boolean") {
      return res.status(400).json({ message: "Choose whether client registration is enabled" });
    }

    const settings = await SystemSetting.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          allowClientRegistration,
          updatedBy: req.user._id,
        },
        $setOnInsert: { key: "global" },
      },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    ).select("allowClientRegistration updatedAt");

    return res.json({ message: "System settings saved", settings });
  } catch (error) {
    console.error("Could not save system settings:", error.message);
    return res.status(500).json({ message: "Could not save system settings" });
  }
});

module.exports = router;
