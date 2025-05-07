const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const videoRoutes = require("./routes/video");
const userRoutes = require("./routes/user"); // ✅ Add route for users

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Ensure uploads folder exists
const uploadPath = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serves /public/uploads

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes); // ✅ Users API route

// ✅ Frontend HTML Pages
app.get("/", (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.sendFile(path.join(__dirname, "views", "HomePage", "home.html"));
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

app.get("/video/courses", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Courses", "courses.html"));
});

app.get("/users-table", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "Admin", "usersTable.html")); // ✅ View Users page
});

// ✅ Prevent caching for dynamic routes
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ✅ MongoDB Connection
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
