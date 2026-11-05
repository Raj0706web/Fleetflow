const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    fuelType: {
      type: String,
      required: true,
      enum: ["Diesel", "Petrol", "CNG", "Electric", "Hybrid"],
    },
    odometerKm: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "in-service", "maintenance", "inactive"],
      default: "available",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Vehicle", vehicleSchema);