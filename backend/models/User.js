const mongoose = require("mongoose");

const operationsPreferencesSchema = new mongoose.Schema(
  {
    defaultReportRange: {
      type: String,
      enum: ["7", "30", "90", "all"],
      default: "30",
    },
    dashboardAutoRefresh: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "Administrator",
        "Fleet / Operations Manager",
        "Driver",
        "Viewer / Client",
      ],
      default: "Viewer / Client",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    operationsPreferences: {
      type: operationsPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
