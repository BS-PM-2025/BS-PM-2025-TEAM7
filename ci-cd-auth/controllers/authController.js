// controllers/authController.js
const User   = require("../models/user");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");


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
  const { email, username } = req.body;
  
  if (!email || !username) {
    return res.status(400).json({ 
      message: "Both email and username are required."
    });
  }

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ 
        message: "No account found with these credentials."
      });
    }

    return res.json({ 
      message: "User verified. You can now reset your password.",
      email: email
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ 
      message: "An error occurred while processing your request."
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (!email || !username || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const user = await User.findOne({
      email: email.toLowerCase(),
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    user.password = password; // ✅ No manual hash here
    await user.save();

    return res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "An error occurred while resetting your password." });
  }
};
