// routes/user.js
const express = require("express");
const router  = express.Router();
const User    = require("../models/user");
const bcrypt  = require("bcrypt");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// GET /api/users/all?role=student|lecturer|admin
// — returns {_id, username, role} for all users, optionally filtered by role
router.get(
  "/all",
  authenticateToken,
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.role) filter.role = req.query.role;

      const users = await User.find(filter).select("_id username email role");
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

// PUT /api/users/edit/:id
// — update any user by ID (only admins or the user themself)
router.put(
  "/edit/:id",
  authenticateToken,
  async (req, res) => {
    const requester = req.user;              // from JWT middleware
    const targetId  = req.params.id;
    const { username, email, role, password } = req.body;

    // only admin or self
    if (requester.role !== "admin" && requester.id !== targetId) {
      return res.status(403).json({ message: "Forbidden: insufficient rights." });
    }

    try {
      const updateFields = {};
      if (username) updateFields.username = username;
      if (email)    updateFields.email    = email;
      // only admins can change roles
      if (role && requester.role === "admin") {
        updateFields.role = role;
      }
      if (password) {
        updateFields.password = await bcrypt.hash(password, 10);
      }
      if (requester.role === "admin") {
  if (typeof req.body.approved !== 'undefined') {
    updateFields.approved = req.body.approved;
  }
}

      const updated = await User.findByIdAndUpdate(
        targetId,
        updateFields,
        { new: true, select: "_id username email role" }
      );
      if (!updated) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({ message: "User updated successfully.", user: updated });
    } catch (err) {
      console.error("Update failed:", err);
      res.status(500).json({ message: "Update failed." });
    }
  }
);

// DELETE /api/users/delete/:id
// — delete a user (admins only)
router.delete(
  "/delete/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found." });
      }
      res.json({ message: "User deleted successfully." });
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).json({ message: "Failed to delete user." });
    }
  }
);

// PUT /api/users/updateProfile
// — allow the logged-in user to update their own username/email/password
router.put(
  "/updateProfile",
  authenticateToken,
  async (req, res) => {
    const userId = req.user.id;
    const { username, email, password } = req.body;

    if (!username || !email) {
      return res
        .status(400)
        .json({ message: "Username and email are required." });
    }

    try {
      const updateFields = { username, email };
      if (password) {
        updateFields.password = await bcrypt.hash(password, 10);
      }

      const updated = await User.findByIdAndUpdate(
        userId,
        updateFields,
        { new: true, select: "_id username email role" }
      );
      if (!updated) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({
        message: "Profile updated successfully.",
        user: updated
      });
    } catch (err) {
      console.error("Profile update failed:", err);
      res.status(500).json({ message: "Profile update failed." });
    }
  }
);

module.exports = router;
