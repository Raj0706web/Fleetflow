const mongoose = require("mongoose");

const coordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const routeStopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ["stop"], default: "stop" },
    coordinates: { type: coordinatesSchema, required: true },
  },
  { _id: false },
);

const routeSchema = new mongoose.Schema(
  {
    routeNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    origin: { type: String, required: true, trim: true },
    originCoordinates: { type: coordinatesSchema, required: true },
    destination: { type: String, required: true, trim: true },
    destinationCoordinates: { type: coordinatesSchema, required: true },
    stops: { type: [routeStopSchema], default: [] },
    vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    estimatedHours: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["planned", "active", "completed", "cancelled"],
      default: "planned",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Route", routeSchema);
