const express = require("express");
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Route = require("../models/Route");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Delivery = require("../models/Delivery");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const managerAccess = [requireAuth, requireRole("Fleet / Operations Manager")];
const tripReadAccess = [requireAuth, requireRole("Administrator", "Fleet / Operations Manager")];
const tripStatusAccess = [
  requireAuth,
  requireRole("Fleet / Operations Manager", "Driver"),
];

async function populateTrip(trip) {
  return trip.populate([
    { path: "route", select: "routeNumber origin originCoordinates destination destinationCoordinates stops estimatedHours" },
    { path: "driver", select: "name phone availability" },
    { path: "vehicle", select: "registrationNumber type status capacity" },
    { path: "deliveries", select: "reference pickup destination status weightKg" },
    { path: "deliveryUpdates.delivery", select: "reference" },
  ]);
}

// GET /api/trips/my/history — completed and cancelled trips for this driver.
router.get(
  "/my/history",
  requireAuth,
  requireRole("Driver"),
  async (req, res) => {
    try {
      const driver = await Driver.findOne({
        user: req.user._id,
        isActive: true,
      });

      if (!driver) {
        return res.status(404).json({
          message: "No active driver record is linked to this account",
        });
      }

      const trips = await Trip.find({
        driver: driver._id,
        status: { $in: ["completed", "cancelled"] },
      })
        .populate("route", "routeNumber origin destination stops")
        .populate("vehicle", "registrationNumber type status capacity")
        .populate("deliveries", "reference pickup destination status weightKg")
        .populate("deliveryUpdates.delivery", "reference")
        .sort({ updatedAt: -1 });

      return res.json({ trips });
    } catch (error) {
      console.error("Could not fetch driver's trip history:", error.message);
      return res.status(500).json({ message: "Could not fetch trip history" });
    }
  },
);

// GET /api/trips/my — show the signed-in driver's active assignments.
router.get("/my", requireAuth, requireRole("Driver"), async (req, res) => {
  try {
    const driver = await Driver.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (!driver) {
      return res.status(404).json({
        message: "No active driver record is linked to this account",
      });
    }

    const trips = await Trip.find({
      driver: driver._id,
      status: { $in: ["assigned", "in-progress"] },
    })
      .populate("route", "routeNumber origin destination stops")
      .populate("vehicle", "registrationNumber type status capacity")
      .populate("deliveries", "reference pickup destination status weightKg")
      .populate("deliveryUpdates.delivery", "reference")
      .sort({ scheduledStart: 1 });

    return res.json({ trips });
  } catch (error) {
    console.error("Could not fetch driver's trips:", error.message);
    return res.status(500).json({
      message: "Could not fetch assigned trips",
    });
  }
});

// GET /api/trips — list trip assignments for the manager workspace.
router.get("/", ...tripReadAccess, async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("route", "routeNumber origin originCoordinates destination destinationCoordinates stops estimatedHours")
      .populate("driver", "name phone availability")
      .populate("vehicle", "registrationNumber type status capacity")
      .populate("deliveries", "reference pickup destination status weightKg")
      .populate("deliveryUpdates.delivery", "reference")
      .sort({ createdAt: -1 });

    return res.json({ trips });
  } catch (error) {
    console.error("Could not fetch trips:", error.message);
    return res.status(500).json({ message: "Could not fetch trips" });
  }
});

// POST /api/trips/:id/location — record the latest location and notify authorized viewers.
router.post("/:id/location", ...tripStatusAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, source = "device" } = req.body;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid trip record" });
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Enter valid latitude and longitude coordinates" });
    }
    if (!["device", "manual", "simulator"].includes(source)) {
      return res.status(400).json({ message: "Choose a valid location source" });
    }

    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status !== "in-progress") {
      return res.status(409).json({ message: "Location can only be reported for an in-progress trip" });
    }
    if (req.user.role === "Driver") {
      const driver = await Driver.findOne({ user: req.user._id, isActive: true }).select("_id");
      if (!driver || !trip.driver.equals(driver._id)) {
        return res.status(403).json({ message: "You can only report location for your own trip" });
      }
    }

    const now = new Date();
    if (trip.lastLocation && now - trip.lastLocation.recordedAt < 1000) {
      return res.status(429).json({ message: "Please wait before sending another location update" });
    }
    trip.lastLocation = { lat, lng, source, recordedAt: now };
    await trip.save();
    await populateTrip(trip);

    const payload = { tripId: String(trip._id), location: trip.lastLocation, trip };
    req.app.get("io")?.to(`trip:${trip._id}`).emit("trip:locationUpdated", payload);
    return res.json({ trip, location: trip.lastLocation });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not update trip location:", error.message);
    return res.status(500).json({ message: "Could not update trip location" });
  }
});

// POST /api/trips — assign a route, driver, vehicle, and optional deliveries.
router.post("/", ...managerAccess, async (req, res) => {
  try {
    const { routeId, driverId, vehicleId, scheduledStart } = req.body;
    const deliveryIds = req.body.deliveryIds ?? [];

    if (!routeId || !driverId || !vehicleId || !scheduledStart) {
      return res.status(400).json({
        message: "Route, driver, vehicle, and scheduled start are required",
      });
    }

    if (!Array.isArray(deliveryIds)) {
      return res.status(400).json({ message: "Deliveries must be a list" });
    }

    const ids = [routeId, driverId, vehicleId, ...deliveryIds];
    if (ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res
        .status(400)
        .json({ message: "One or more selected records are invalid" });
    }

    const startDate = new Date(scheduledStart);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ message: "Enter a valid scheduled start" });
    }

    const [route, driver, vehicle] = await Promise.all([
      Route.findById(routeId),
      Driver.findById(driverId).populate("user", "isActive"),
      Vehicle.findById(vehicleId),
    ]);

    if (!route) return res.status(404).json({ message: "Route not found" });
    if (!driver || !driver.isActive || !driver.user?.isActive) {
      return res
        .status(400)
        .json({ message: "Choose an active linked driver" });
    }
    if (driver.availability !== "Available") {
      return res
        .status(400)
        .json({ message: "The selected driver is not available" });
    }
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.status !== "available") {
      return res
        .status(400)
        .json({ message: "The selected vehicle is not available" });
    }
    if (["completed", "cancelled"].includes(route.status)) {
      return res
        .status(400)
        .json({ message: "Choose a route that is still active" });
    }

    const existingAssignment = await Trip.exists({
      status: { $in: ["assigned", "in-progress"] },
      $or: [{ driver: driverId }, { vehicle: vehicleId }],
    });

    if (existingAssignment) {
      return res.status(409).json({
        message: "The selected driver or vehicle already has an active trip",
      });
    }

    let loadWeightKg = 0;
    if (deliveryIds.length) {
      const deliveries = await Delivery.find({
        _id: { $in: deliveryIds },
      }).select("status weightKg");

      if (deliveries.length !== deliveryIds.length) {
        return res.status(400).json({
          message: "One or more deliveries were not found",
        });
      }

      if (deliveries.some((delivery) => delivery.status !== "Planned")) {
        return res.status(409).json({
          message: "Only planned deliveries can be assigned to a trip",
        });
      }

      if (deliveries.some((delivery) => !Number.isFinite(delivery.weightKg) || delivery.weightKg <= 0)) {
        return res.status(400).json({
          message: "Every delivery needs a package weight before it can be assigned to a vehicle",
        });
      }

      loadWeightKg = deliveries.reduce((total, delivery) => total + delivery.weightKg, 0);
      const maxLoadKg = vehicle.capacity * 1000;
      if (loadWeightKg > maxLoadKg) {
        return res.status(400).json({
          message: `Selected deliveries weigh ${loadWeightKg.toLocaleString()} kg, above the vehicle limit of ${maxLoadKg.toLocaleString()} kg`,
        });
      }

    }

    const trip = await Trip.create({
      route: routeId,
      driver: driverId,
      vehicle: vehicleId,
      deliveries: deliveryIds,
      loadWeightKg,
      scheduledStart: startDate,
      status: "assigned",
      statusHistory: [{ status: "assigned", note: "Trip assigned" }],
    });

    if (deliveryIds.length) {
      await Delivery.updateMany(
        { _id: { $in: deliveryIds }, status: "Planned" },
        { $set: { status: "Assigned" } },
      );
    }

    await populateTrip(trip);

    return res.status(201).json({ trip });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Could not create trip:", error.message);
    return res.status(500).json({ message: "Could not create trip" });
  }
});

// PATCH /api/trips/:id/status — drivers update their own trip; managers can cancel.
router.patch("/:id/status", ...tripStatusAccess, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid trip record" });
    }

    const { status, note = "" } = req.body;
    if (!["in-progress", "completed", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Choose a valid next trip status" });
    }
    if (typeof note !== "string" || note.length > 240) {
      return res
        .status(400)
        .json({ message: "Trip note must be 240 characters or fewer" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    let driverRecord = null;
    if (req.user.role === "Driver") {
      driverRecord = await Driver.findOne({
        user: req.user._id,
        isActive: true,
      });
      if (!driverRecord || !trip.driver.equals(driverRecord._id)) {
        return res
          .status(403)
          .json({ message: "You can only update your own trips" });
      }
      if (status === "cancelled") {
        return res
          .status(403)
          .json({ message: "Only a manager can cancel a trip" });
      }
    } else {
      driverRecord = await Driver.findById(trip.driver);
      if (status !== "cancelled") {
        return res
          .status(403)
          .json({
            message: "Managers can cancel trips; drivers update trip progress",
          });
      }
    }

    const validTransitions = {
      assigned: ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
    };
    if (!validTransitions[trip.status]?.includes(status)) {
      return res.status(409).json({
        message: `A trip cannot move from ${trip.status} to ${status}`,
      });
    }

    const vehicle = await Vehicle.findById(trip.vehicle);
    if (!driverRecord || !driverRecord.isActive) {
      return res
        .status(409)
        .json({ message: "The assigned driver is unavailable" });
    }
    if (!vehicle) {
      return res
        .status(409)
        .json({ message: "The assigned vehicle no longer exists" });
    }

    if (status === "completed" && trip.deliveries.length) {
      const unresolvedDeliveries = await Delivery.countDocuments({
        _id: { $in: trip.deliveries },
        status: { $nin: ["Delivered", "Failed"] },
      });
      if (unresolvedDeliveries > 0) {
        return res.status(409).json({
          message: "Mark every trip delivery Delivered or Failed before completing the trip",
        });
      }
    }

    if (status === "in-progress") {
      if (
        driverRecord.availability !== "Available" ||
        vehicle.status !== "available"
      ) {
        return res
          .status(409)
          .json({
            message: "The assigned driver or vehicle is no longer available",
          });
      }
      driverRecord.availability = "On Trip";
      driverRecord.assignedVehicle = vehicle._id;
      vehicle.status = "in-service";
    } else if (["completed", "cancelled"].includes(status)) {
      if (driverRecord.assignedVehicle?.equals(vehicle._id)) {
        driverRecord.assignedVehicle = null;
      }
      if (driverRecord.availability === "On Trip") {
        driverRecord.availability = "Available";
      }
      if (vehicle.status === "in-service") {
        vehicle.status = "available";
      }
    }

    trip.status = status;
    trip.statusHistory.push({
      status,
      note: note.trim() || `Trip ${status.replace("-", " ")}`,
    });

    if (status === "in-progress") {
      await Delivery.updateMany(
        { _id: { $in: trip.deliveries }, status: "Assigned" },
        { $set: { status: "In Transit" } },
      );
    } else if (status === "cancelled") {
      await Delivery.updateMany(
        { _id: { $in: trip.deliveries }, status: { $in: ["Assigned", "In Transit"] } },
        { $set: { status: "Planned" } },
      );
    }

    await Promise.all([trip.save(), driverRecord.save(), vehicle.save()]);
    await populateTrip(trip);

    req.app.get("io")?.to(`trip:${trip._id}`).emit("trip:statusUpdated", {
      tripId: String(trip._id),
      trip,
      changedAt: new Date(),
    });

    return res.json({ trip });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Could not update trip status:", error.message);
    return res.status(500).json({ message: "Could not update trip status" });
  }
});

// PATCH /api/trips/:id/deliveries/:deliveryId/status — record a delivery outcome.
router.patch(
  "/:id/deliveries/:deliveryId/status",
  ...tripStatusAccess,
  async (req, res) => {
    try {
      const { id, deliveryId } = req.params;
      if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(deliveryId)) {
        return res.status(400).json({ message: "Invalid trip or delivery record" });
      }

      const { status, note = "" } = req.body;
      if (!["Delivered", "Failed"].includes(status)) {
        return res.status(400).json({ message: "Delivery outcome must be Delivered or Failed" });
      }
      if (typeof note !== "string" || note.length > 240) {
        return res.status(400).json({ message: "Delivery note must be 240 characters or fewer" });
      }

      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.status !== "in-progress") {
        return res.status(409).json({ message: "Start the trip before updating its deliveries" });
      }

      if (req.user.role === "Driver") {
        const driver = await Driver.findOne({ user: req.user._id, isActive: true });
        if (!driver || !trip.driver.equals(driver._id)) {
          return res.status(403).json({ message: "You can only update deliveries on your own trips" });
        }
      }

      if (!trip.deliveries.some((assignedId) => assignedId.equals(deliveryId))) {
        return res.status(404).json({ message: "This delivery is not assigned to the trip" });
      }

      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) return res.status(404).json({ message: "Delivery not found" });
      if (delivery.status !== "In Transit") {
        return res.status(409).json({ message: "Only in-transit deliveries can receive an outcome" });
      }

      delivery.status = status;
      trip.deliveryUpdates.push({
        delivery: delivery._id,
        status,
        note: note.trim(),
      });

      await Promise.all([delivery.save(), trip.save()]);
      await populateTrip(trip);
      req.app.get("io")?.to(`trip:${trip._id}`).emit("trip:statusUpdated", {
        tripId: String(trip._id),
        trip,
        changedAt: new Date(),
      });
      return res.json({ trip });
    } catch (error) {
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
      }
      console.error("Could not update trip delivery:", error.message);
      return res.status(500).json({ message: "Could not update delivery status" });
    }
  },
);

module.exports = router;
