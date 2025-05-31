const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { login, signup, logout, forgotPassword, resetPassword } = authController;


router.post("/login", login);
router.post("/signup", signup);
router.post("/logout", logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;