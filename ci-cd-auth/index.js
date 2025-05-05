const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);

// Home route (optional)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views","HomePage", "home.html")); // רק אם יש לך views/home.html
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "HomePage", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "HomePage", "signup.html"));
});
app.get("/StudentProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Student", "studentProfile.html"));
});

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Admin", "adminDashboard.html"));
});

app.get("/LecturerProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Lecturer", "lecturerProfile.html"));
});

// MongoDB + Start Server
mongoose.connect("mongodb://127.0.0.1:27017/ci_cd_learning", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("✅ Connected to MongoDB");
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});
