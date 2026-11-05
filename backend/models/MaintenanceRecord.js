const mongoose = require("mongoose");

const maintenanceRecordSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ["Routine Service", "Repair", "Inspection", "Tyres", "Other"],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    scheduledDate: { type: Date, required: true, index: true },
    completedDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled",
      index: true,
    },
    odometerKm: { type: Number, min: 0, default: null },
    cost: { type: Number, min: 0, default: null },
    serviceProvider: { type: String, trim: true, maxlength: 120, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

maintenanceRecordSchema.index({ vehicle: 1, scheduledDate: -1 });

module.exports = mongoose.model("MaintenanceRecord", maintenanceRecordSchema);
