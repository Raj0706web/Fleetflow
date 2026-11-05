const mongoose = require("mongoose");

const fuelLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, enum: ["litres", "kWh"], required: true },
    cost: { type: Number, required: true, min: 0 },
    odometerKm: { type: Number, required: true, min: 0 },
    previousOdometerKm: { type: Number, required: true, min: 0 },
    station: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

fuelLogSchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model("FuelLog", fuelLogSchema);
