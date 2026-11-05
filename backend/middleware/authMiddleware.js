const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const token = req.cookies?.fleetflow_token;

  if (!token) {
    return res.status(401).json({ message: "Please log in" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Account is unavailable" });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Please log in again" });
    }

    console.error("Authentication check failed:", error.message);
    return res.status(500).json({ message: "Could not verify login" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don’t have permission" });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };