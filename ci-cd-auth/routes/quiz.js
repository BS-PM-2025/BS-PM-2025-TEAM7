// routes/quiz.js
const router = require("express").Router({ mergeParams: true });
const quizController = require("../controllers/quizController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

/* Anyone (student / lecturer / guest) can GET */
router.get("/", quizController.getQuiz);

/* Only lecturer can create / update */
router.post(
  "/",
  authenticateToken,
  authorizeRole("lecturer"),
  quizController.saveQuiz
);

/* Students submit answers */
router.post(
  "/submit",
  authenticateToken,
  authorizeRole("student"),
  quizController.submitQuiz
);

module.exports = router;