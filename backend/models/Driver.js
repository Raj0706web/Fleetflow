const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      default: undefined,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    licenseExpiryDate: {
      type: Date,
      required: true,
    },
    availability: {
      type: String,
      enum: ["Available", "On Trip", "Unavailable"],
      default: "Available",
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Driver", driverSchema);