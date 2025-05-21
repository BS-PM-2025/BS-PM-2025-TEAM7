const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// ✅ SIGNUP (Hashing will be done in model's pre-save)
exports.signup = async (req, res) => {
  const { username, email, password, confirmPassword, role } = req.body;

  if (!username || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    return res.status(400).json({ message: "User already exists." });
  }

  // ⛔ DON'T hash manually — model will do it
  const newUser = new User({ username, email, password, role });
  await newUser.save();

  res.status(201).json({ message: "User registered successfully." });
};

// ✅ LOGIN
exports.login = async (req, res) => {
  const { username, password } = req.body;

  // 🔐 Hardcoded admin login (optional)
  if (username === "admin" && password === "123") {
    const token = jwt.sign({ username: "admin", role: "admin" }, JWT_SECRET, {
      expiresIn: "2h",
    });
    return res.status(200).json({ token });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Incorrect password." });
  }

  const token = jwt.sign(
  {
    id: user._id,
    username: user.username,
    email: user.email,      // ← שים לב לשורה הזו!
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);



  res.status(200).json({ token });
};

// ✅ LOGOUT
exports.logout = (req, res) => {
  res.status(200).json({ message: "Logged out" });
};
