// controllers/authController.js
const User   = require("../models/user");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../models/email");


const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/* small helper ---------------------------------------------------------- */
const clean = str => (typeof str === "string" ? str.trim() : str);

/* ────────────────────────────── SIGN-UP ──────────────────────────────── */
exports.signup = async (req, res) => {
  let { username, email, password, confirmPassword, role } = req.body;
  username = clean(username);
  email    = clean(email);

  if (!username || !email || !password || !confirmPassword || !role)
    return res.status(400).json({ message: "All fields are required." });

  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match." });

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing)
    return res.status(400).json({ message: "User already exists." });

  const newUser = new User({ username, email, password, role });
  await newUser.save();
  res.status(201).json({ message: "User registered successfully." });
};

/* ─────────────────────────────── LOGIN ───────────────────────────────── */
exports.login = async (req, res) => {
  const { username, password } = req.body;          // “username” can be email, too

  /* dev / demo back-door ------------------------------------------------- */
  if (username === "admin" && password === "123") {
    const realAdmin = await User.findOne({ role: "admin" }).select("_id");
    const adminId   = realAdmin ? realAdmin._id : "000000000000000000000000";

    const token = jwt.sign(
      { id: adminId, username: "admin", email: "admin@system", role: "admin" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.status(200).json({ token });
  }
  /* --------------------------------------------------------------------- */

  // allow login with username **or** email
   const user = await User.findOne({
    $or: [{ username }, { email: username }]
  }).select("+approved");       
  if (!user) return res.status(404).json({ message: "User not found." });
   /* 🔒 Block lecturers until an admin checks “Approved” */
  if (user.role === "lecturer" && !user.approved) {
    return res
      .status(403)
      .json({ message: "Account pending admin approval." });
 }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.status(200).json({ token });
};

/* ────────────────────────────── LOGOUT ───────────────────────────────── */
exports.logout = (_req, res) => res.status(200).json({ message: "Logged out" });

/* ────────────────────────── UPDATE PROFILE ───────────────────────────── */
exports.updateProfile = async (req, res) => {
  try {
    const userId          = req.user.id;
    let { username, email } = req.body;
    username = clean(username);
    email    = clean(email);

    if (!username || !email)
      return res.status(400).json({ message: "Username and email are required." });

    const duplicate = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: userId }
    });
    if (duplicate)
      return res.status(400).json({ message: "Username or email already in use." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.username = username;
    user.email    = email;
    await user.save();

    res.json({ username: user.username, email: user.email });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* ───────────────────────── FORGOT PASSWORD ───────────────────────────── */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      message: "Email is required."
    });
  }

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase()
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: "If an account with that email exists, a password reset link has been sent."
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set expiry (1 hour)
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    await user.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

    // Email content
    const message = `
      <h2>Password Reset Request</h2>
      <p>You have requested a password reset for your account.</p>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail(
      user.email,
      'Password Reset Request',
      `Please click the following link to reset your password: ${resetUrl}`,
      message
    );

    return res.json({ 
      message: "If an account with that email exists, a password reset link has been sent."
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ 
      message: "An error occurred while processing your request."
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token. Please request a new password reset link." 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    return res.json({ 
      message: "Password has been reset successfully. You can now login with your new password." 
    });
    
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ 
      message: "An error occurred while resetting your password. Please try again." 
    });
  }
};