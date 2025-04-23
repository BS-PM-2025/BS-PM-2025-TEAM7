const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/user");

const app = express();
const PORT = 3000;
const JWT_SECRET = "your_secret_key"; // Change this to a strong secret

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/ci_cd_learning", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes: HTML Pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});
app.get("/HomePage", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});
app.get("/StudentProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "studentProfile.html"));
});
app.get("/LecturerProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "lecturerProfile.html"));
});

// Sign-up Route
app.post("/signup", async (req, res) => {
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

  const newUser = new User({ username, email, password, role }); // 🔐 password will be hashed via .pre('save')
  await newUser.save();

  res.status(201).redirect("/login");
});

// Login Route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ message: "Username not found." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Incorrect password." });
  }

  const token = jwt.sign(
    { username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.status(200).json({ token });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
