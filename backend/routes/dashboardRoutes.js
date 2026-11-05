const express = require("express");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const Delivery = require("../models/Delivery");
const FuelLog = require("../models/FuelLog");

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole("Administrator", "Fleet / Operations Manager"),
  async (req, res) => {
    try {
      const now = new Date();
      const range = req.query.range || "30";
      const allowedRanges = new Set(["7", "30", "90", "all"]);
      if (!allowedRanges.has(range)) {
        return res
          .status(400)
          .json({ message: "Choose a valid dashboard date range" });
      }
      const rangeStart =
        range === "all"
          ? null
          : new Date(now.getTime() - Number(range) * 24 * 60 * 60 * 1000);
      const deliveryDateFilter = rangeStart
        ? { createdAt: { $gte: rangeStart } }
        : {};
      const deliveryStatus = req.query.status || "all";
      const allowedDeliveryStatuses = new Set([
        "all",
        "Planned",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Failed",
        "Cancelled",
      ]);

      if (!allowedDeliveryStatuses.has(deliveryStatus)) {
        return res
          .status(400)
          .json({ message: "Choose a valid delivery status" });
      }
      const recentDeliveryFilter = {
        ...deliveryDateFilter,
        ...(deliveryStatus === "all" ? {} : { status: deliveryStatus }),
      };
      const fuelDateFilter = rangeStart ? { date: { $gte: rangeStart } } : {};

      const [
        totalVehicles,
        availableVehicles,
        operationalVehicles,
        activeTrips,
        activeVehicleIds,
        totalDeliveries,
        completedDeliveries,
        failedDeliveries,
        delayedDeliveries,
        fuelTotals,
        vehicleStatuses,
        deliveryStatusCounts,
        completedTrips,
        recentDeliveries,
      ] = await Promise.all([
        Vehicle.countDocuments(),
        Vehicle.countDocuments({ status: "available" }),
        Vehicle.countDocuments({ status: { $ne: "inactive" } }),
        Trip.countDocuments({ status: { $in: ["assigned", "in-progress"] } }),
        Trip.distinct("vehicle", {
          status: { $in: ["assigned", "in-progress"] },
        }),
        Delivery.countDocuments(deliveryDateFilter),
        Delivery.countDocuments({ ...deliveryDateFilter, status: "Delivered" }),
        Delivery.countDocuments({ ...deliveryDateFilter, status: "Failed" }),
        Delivery.countDocuments({
          ...deliveryDateFilter,
          deliveryWindowEnd: { $lt: now },
          status: { $nin: ["Delivered", "Failed", "Cancelled"] },
        }),
        FuelLog.aggregate([
          { $match: fuelDateFilter },
          { $group: { _id: null, totalSpend: { $sum: "$cost" } } },
        ]),
        Vehicle.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Delivery.aggregate([
          { $match: deliveryDateFilter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Trip.find({
          status: "completed",
          ...(rangeStart ? { updatedAt: { $gte: rangeStart } } : {}),
        })
          .select("statusHistory scheduledStart updatedAt")
          .lean(),
        Delivery.find(recentDeliveryFilter)
          .sort({ updatedAt: -1 })
          .limit(8)
          .select(
            "reference status recipientName pickup destination weightKg deliveryWindowEnd updatedAt",
          )
          .lean(),
      ]);

      const completedDurations = completedTrips
        .map((trip) => {
          const completedAt =
            [...(trip.statusHistory || [])]
              .reverse()
              .find((entry) => entry.status === "completed")?.updatedAt ||
            trip.updatedAt;
          const startedAt =
            trip.statusHistory?.find((entry) => entry.status === "in-progress")
              ?.updatedAt || trip.scheduledStart;
          return (
            (new Date(completedAt) - new Date(startedAt)) / (60 * 60 * 1000)
          );
        })
        .filter((hours) => Number.isFinite(hours) && hours >= 0);
      const closedDeliveries = completedDeliveries + failedDeliveries;

      res.json({
        summary: {
          totalVehicles,
          availableVehicles,
          activeTrips,
          totalDeliveries,
          completedDeliveries,
          delayedDeliveries,
          fuelSpend: fuelTotals[0]?.totalSpend || 0,
          completionRate: closedDeliveries
            ? Math.round((completedDeliveries / closedDeliveries) * 100)
            : 0,
          utilizationRate: operationalVehicles
            ? Math.round((activeVehicleIds.length / operationalVehicles) * 100)
            : 0,
          averageDeliveryHours: completedDurations.length
            ? Math.round(
                (completedDurations.reduce((sum, hours) => sum + hours, 0) /
                  completedDurations.length) *
                  10,
              ) / 10
            : null,
          range,
        },
        vehicleStatuses: vehicleStatuses.map(({ _id, count }) => ({
          status: _id,
          count,
        })),
        deliveryStatusCounts: deliveryStatusCounts.map(({ _id, count }) => ({
          status: _id,
          count,
        })),
        recentDeliveries,
      });
    } catch (error) {
      console.error("Could not load dashboard summary:", error.message);
      res.status(500).json({ message: "Could not load dashboard summary" });
    }
  },
);

module.exports = router;
