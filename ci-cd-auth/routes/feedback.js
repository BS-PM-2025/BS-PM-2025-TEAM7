// routes/feedback.js
const express = require("express");
const router = express.Router();
const {
  submitFeedback,
  getAllFeedback,
  getCourseFeedback,
  updateFeedback,
  deleteFeedback,
} = require("../controllers/feedbackController");

// Now import _both_ authenticateToken and authorizeRole
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth");

// 1. Anyone logged in can _view_ all feedback
router.get(
  "/",
  authenticateToken,
  getAllFeedback
);

// 2. Get feedback for a specific course
router.get(
  "/course/:courseId",
  authenticateToken,
  getCourseFeedback
);

// 3. Only **students** may submit new feedback
router.post(
  "/submit",
  authenticateToken,
  submitFeedback
);

// 4. Only **lecturers** may edit existing feedback
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  updateFeedback
);

// 5. Only **lecturers** may delete feedback
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  deleteFeedback
);

module.exports = router;
