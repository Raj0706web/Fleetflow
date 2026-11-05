const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const coordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
  },
  { _id: false },
);

const tripUpdateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed", "cancelled"],
      required: true,
    },
    note: { type: String, trim: true, default: "" },
    location: { type: coordinatesSchema, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const locationReportSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    source: { type: String, enum: ["device", "manual", "simulator"], default: "device" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deliveryUpdateSchema = new mongoose.Schema(
  {
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
    },
    status: {
      type: String,
      enum: ["Delivered", "Failed"],
      required: true,
    },
    note: { type: String, trim: true, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tripSchema = new mongoose.Schema(
  {
    tripNumber: {
      type: String,
      unique: true,
      default: () => `TRIP-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    loadWeightKg: { type: Number, min: 0, default: 0 },
    deliveries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Delivery",
      },
    ],
    scheduledStart: { type: Date, required: true },
    status: {
      type: String,
      enum: ["assigned", "in-progress", "completed", "cancelled"],
      default: "assigned",
    },
    statusHistory: { type: [tripUpdateSchema], default: [] },
    lastLocation: { type: locationReportSchema, default: null },
    deliveryUpdates: { type: [deliveryUpdateSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Trip", tripSchema);
