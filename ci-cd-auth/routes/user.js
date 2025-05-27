const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { authenticateToken } = require("../middleware/auth"); // Your JWT auth middleware

// GET all users
router.get("/all", async (req, res) => {
  try {
    const users = await User.find({}, "-__v"); // remove version field
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// PUT (edit) user by ID (admin or self)
router.put("/edit/:id", async (req, res) => {
  const { username, email, role, password } = req.body;

  try {
    const updateFields = { username, email, role };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE user by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "✅ User deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "❌ Failed to delete user." });
  }
});

// NEW: PUT update profile of logged-in user
router.put("/updateProfile", authenticateToken, async (req, res) => {
  const userId = req.user.id; // from JWT middleware
  const { username, email, password } = req.body;

  try {
    const updateFields = { username, email };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, select: "username email role" } // select fields to return
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Profile updated successfully.",
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed." });
  }
});

module.exports = router;