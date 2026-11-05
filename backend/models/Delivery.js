const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const deliverySchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      default: () => `DEL-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
    pickup: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    packageDescription: {
      type: String,
      required: true,
      trim: true,
    },
    weightKg: {
      type: Number,
      min: 0.01,
      default: null,
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },
    deliveryWindowStart: {
      type: Date,
      required: true,
    },
    deliveryWindowEnd: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.deliveryWindowStart || value > this.deliveryWindowStart;
        },
        message: "Delivery window end must be after its start.",
      },
    },
    status: {
      type: String,
      enum: [
        "Planned",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Failed",
        "Cancelled",
      ],
      default: "Planned",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Delivery", deliverySchema);
