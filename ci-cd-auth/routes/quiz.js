const express = require("express");
const router = express.Router({ mergeParams: true });

const quizController = require("../controllers/quizcontroller");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

/* ───────────── Anyone (student / lecturer / guest) can GET ───────────── */
router.get("/", quizController.getQuiz);

/* ───────────── Only lecturer can create / update ───────────── */
router.post(
  "/",
  authenticateToken,
  authorizeRole("lecturer"),
  quizController.saveQuiz
);

/* ───────────── Students submit answers ───────────── */
router.post(
  "/submit",
  authenticateToken,
  authorizeRole("student"),
  quizController.submitQuiz
);

/* ───────────── Students view their own submissions ───────────── */
router.get(
  "/submissions",
  authenticateToken,
  authorizeRole("student"),
  quizController.getUserSubmissions
);

module.exports = router;
