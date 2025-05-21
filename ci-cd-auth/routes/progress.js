const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progressController");

router.get("/:studentId", progressController.getStudentProgress);

module.exports = router;
