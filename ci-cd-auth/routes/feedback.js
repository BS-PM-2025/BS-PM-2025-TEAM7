// routes/feedback.js
const express = require("express");
const router  = express.Router();
const {
  submitFeedback,
  submitFeedbackToStudent,
  getAllFeedback,
  getCourseFeedback,
  getFeedbackForStudent,
  getMyFeedback,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedbackController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// 1. Students submit general or course feedback (Home or Course page)
router.post(
  "/submit",
  authenticateToken,
  authorizeRole("student"),
  submitFeedback
);

// 2. Lecturers submit feedback to a specific student (Student Profile)
router.post(
  "/student/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  submitFeedbackToStudent
);

// 3. Anyone logged in views community/homepage feedback (students only)
router.get(
  "/",
  authenticateToken,
  getAllFeedback
);

// 4. View feedback for a specific course (students only)
router.get(
  "/course/:courseId",
  authenticateToken,
  getCourseFeedback
);

// 5. Students view feedback *about themselves* (lecturer → student only)
router.get(
  "/student/me",
  authenticateToken,
  authorizeRole("student"),
  getMyFeedback
);

// 6. Lecturers edit their own feedback (lecturer → student only)
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  updateFeedback
);

// 7. Lecturers delete their own feedback (lecturer → student only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  deleteFeedback
);

// 8. Lecturers view all feedback they’ve given to a particular student
router.get(
  "/student/:id",
  authenticateToken,
  authorizeRole("lecturer"),
  getFeedbackForStudent
);

module.exports = router;
