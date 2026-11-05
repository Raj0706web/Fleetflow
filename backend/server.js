require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server: SocketServer } = require("socket.io");
const User = require("./models/User");
const Driver = require("./models/Driver");
const Trip = require("./models/Trip");
const dashboardRoutes = require("./routes/dashboardRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");

const app = express();
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});
app.set("io", io);
const vehicleRoutes = require("./routes/vehicleRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const routeRoutes = require("./routes/routeRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const driverRoutes = require("./routes/driverRoutes");
const tripRoutes = require("./routes/tripRoutes");
const fuelLogRoutes = require("./routes/fuelLogRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/fuel-logs", fuelLogRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", systemSettingsRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

io.use(async (socket, next) => {
  try {
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie || "")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const separator = item.indexOf("=");
          return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
        }),
    );
    const token = cookies.fleetflow_token;
    if (!token) return next(new Error("Authentication required"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return next(new Error("Account unavailable"));
    socket.data.user = user;
    next();
  } catch {
    next(new Error("Authentication required"));
  }
});

io.on("connection", (socket) => {
  socket.on("trip:join", async ({ tripId } = {}, acknowledge = () => {}) => {
    try {
      if (!/^[a-f\d]{24}$/i.test(String(tripId || ""))) {
        return acknowledge({ ok: false, message: "Invalid trip" });
      }
      const trip = await Trip.findById(tripId).select("driver status");
      if (!trip || !["assigned", "in-progress"].includes(trip.status)) {
        return acknowledge({ ok: false, message: "Active trip not found" });
      }
      const user = socket.data.user;
      let allowed = user.role === "Fleet / Operations Manager" || user.role === "Administrator";
      if (user.role === "Driver") {
        const driver = await Driver.findOne({ user: user._id, isActive: true }).select("_id");
        allowed = Boolean(driver && trip.driver.equals(driver._id));
      }
      if (!allowed) return acknowledge({ ok: false, message: "You cannot view this trip" });
      await socket.join(`trip:${tripId}`);
      acknowledge({ ok: true });
    } catch {
      acknowledge({ ok: false, message: "Could not join trip updates" });
    }
  });

  socket.on("trip:leave", ({ tripId } = {}) => {
    if (/^[a-f\d]{24}$/i.test(String(tripId || ""))) socket.leave(`trip:${tripId}`);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
