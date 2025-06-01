const express = require("express");
const router  = express.Router();

const { authenticateToken, authorizeRole } = require("../middleware/auth");
const {
  createTicket,
  getMyTickets,
  getAllTickets
} = require("../controllers/supportController");

/**
 * 1) Students submit new support ticket:
 *    POST /api/support
 *    Headers: Authorization: Bearer <token>
 *    Body: { subject, message }
 *    Requires: role = "student"
 */
router.post(
   "/",
   authenticateToken,
   authorizeRole("student", "lecturer"),
   createTicket
 );
/**
 * 2) Students fetch all of their own tickets:
 *    GET /api/support/me
 *    Requires: role = "student"
 */
router.get(
  "/me",
  authenticateToken,
  authorizeRole("student"),
  getMyTickets
);
 router.post(
   "/",
   authenticateToken,
   authorizeRole("student", "lecturer"),
   createTicket
 );
/**
 * 3) Admins fetch ALL tickets:
 *    GET /api/support/all
 *    Requires: role = "admin"
 */
router.get(
  "/all",
  authenticateToken,
  authorizeRole("admin"),
  getAllTickets
);

module.exports = router;