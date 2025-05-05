const express = require("express");
const router = express.Router();
const { submitFeedback, getAllFeedback } = require("../controllers/feedbackController");
const authenticateToken = require("../middleware/auth"); // אם אתה מייצא ישירות

router.get("/", getAllFeedback);
router.post("/", authenticateToken, submitFeedback);

module.exports = router;
