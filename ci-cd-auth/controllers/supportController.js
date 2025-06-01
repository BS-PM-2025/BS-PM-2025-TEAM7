const SupportTicket = require("../models/SupportTicket");
const User          = require("../models/user");

/**
 * 1) POST /api/support
 *    – Students submit a new ticket.
 *    Body: { subject, message }
 *    Requires: authenticateToken, authorizeRole("student")
 */
exports.createTicket = async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required." });
  }

  try {
    // Look up the logged‐in user:
    const userRecord = await User.findById(req.user.id);

    // Only allow if role is “student” OR “lecturer”
    if (
      !userRecord ||
      (userRecord.role !== "student" && userRecord.role !== "lecturer")
    ) {
      return res
        .status(403)
        .json({ message: "Only students or lecturers may create support tickets." });
    }

    // Create the ticket, storing whoever opened it (student OR lecturer) in studentId field
    const ticket = new SupportTicket({
      studentId: userRecord._id,
      subject,
      message
    });

    await ticket.save();
    return res.status(201).json({
      message: "Support ticket created.",
      ticket
    });
  } catch (err) {
    console.error("❌ Error in createTicket:", err);
    return res.status(500).json({ message: "Server error. Could not create ticket." });
  }
};
/**
 * 2) GET /api/support/me
 *    – Students fetch all of their own tickets.
 *    Requires: authenticateToken, authorizeRole("student")
 */
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ tickets });
  } catch (err) {
    console.error("❌ Error in getMyTickets:", err);
    return res.status(500).json({ message: "Server error. Could not fetch your tickets." });
  }
};

/**
 * 3) GET /api/support/all
 *    – Admins fetch ALL tickets (for triage).
 *    Requires: authenticateToken, authorizeRole("admin")
 */
exports.getAllTickets = async (req, res) => {
  try {
    // ─── Populate username, email, AND role ───────────────────────────────────
    const tickets = await SupportTicket.find()
      .populate("studentId", "username email role")   // ← add "role" here
      .sort({ createdAt: -1 })
      .lean();

    // Transform each ticket into a minimal object:
    const formatted = tickets.map(t => ({
      subject: t.subject,
      message: t.message,
      createdAt: t.createdAt,
      studentName: t.studentId?.username || t.studentId?.email || "Unknown",
      role:        t.studentId?.role     || "Unknown"           // ← include role
    }));

    return res.json({ support: formatted });
  } catch (err) {
    console.error("❌ Error in getAllTickets:", err);
    return res.status(500).json({ message: "Server error. Could not fetch tickets." });
  }
};