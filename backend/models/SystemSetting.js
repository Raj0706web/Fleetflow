const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global", immutable: true },
    allowClientRegistration: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
