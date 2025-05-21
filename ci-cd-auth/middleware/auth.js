const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/**
 * Middleware: Authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      const msg = err.name === "TokenExpiredError"
        ? "Token expired. Please log in again."
        : "Invalid token.";
      return res.status(403).json({ message: msg });
    }

    if (!user?.id) {
      return res.status(403).json({ message: "Invalid token payload (missing user ID)." });
    }

    req.user = user; // { id, role, username, ... }

    // Optional: debug log
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Authenticated:", req.user);
    }

    next();
  });
}

/**
 * Middleware: Authorize by role
 * Usage: authorizeRole("student") or authorizeRole("lecturer")
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role." });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
