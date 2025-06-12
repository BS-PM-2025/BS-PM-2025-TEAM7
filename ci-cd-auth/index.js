require('dotenv').config();
const express    = require("express");
const mongoose   = require("mongoose");
const path       = require("path");
const fs         = require("fs");
const bodyParser = require("body-parser");
const dotenv     = require("dotenv");
const { authenticateToken } = require("./middleware/auth"); 
dotenv.config();

const authRoutes     = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");
const videoRoutes    = require("./routes/video");
const userRoutes     = require("./routes/user");
const progressRoutes = require("./routes/progress");
const quizRoutes     = require("./routes/quiz");
const chatRoutes     = require("./routes/chat");
const githubRouter   = require('./routes/github');
const supportRoutes  = require("./routes/support");
const examRoutes     = require("./routes/exam");
const pdfRoutes      = require('./routes/pdfRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Add these two so the tests for /StudentProfile and /LecturerProfile never 404 ───
app.get('/StudentProfile', (req, res) => {
  return res.status(200).sendFile(path.join(__dirname, "views", "Student", "studentProfile.html"));
});
app.get('/LecturerProfile', (req, res) => {
  return res.status(200).sendFile(path.join(__dirname, "views", "Lecturer", "lecturerProfile.html"));
});
// ─────────────────────────────────────────────────────────────────────────────────────

// ---------- Ensure uploads folder exists ----------
const uploadPath = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ---------- Middleware ----------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve /public
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ---------- API Routes ----------
app.use("/api/auth",     authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/videos",   videoRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api",          quizRoutes);     // supports /api/submissions
app.use("/api/chat",     chatRoutes);
app.use("/api/github",   githubRouter); 
app.use("/api/support",  supportRoutes);
app.use("/api/pdfs",     pdfRoutes);
app.use("/api/exam",     examRoutes);

// ---------- Frontend Pages ----------
const frontendRoutes = {
  "/":                 "HomePage/home.html",
  "/login":            "HomePage/login.html",
  "/forgetpassword":   "HomePage/forgetpassword.html",
  "/student/github":   "Student/github.html",
  "/signup":           "HomePage/signup.html",
  "/about":            "HomePage/about.html",
  // note: these two are now effectively redundant, but kept for completeness
  "/StudentProfile":   "Student/studentProfile.html",
  "/admin-dashboard":  "Admin/adminDashboard.html",
  "/LecturerProfile":  "Lecturer/lecturerProfile.html",
  "/video/courses":    "Courses/courses.html",
  "/users-table":      "Admin/usersTable.html",
  "/chat":             "Chats/chat.html",
  "/exam":             "Student/exam.html",
  "/exam-management":  "Lecturer/exam-management.html",
  "/lecturers":        "Lecturer/lecturers.html",
  "/certificate":      "certificate.html"
};

Object.entries(frontendRoutes).forEach(([route, filePath]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, "views", filePath));
  });
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ---------- MongoDB Connection ----------
const DB_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ci_cd_learning";

mongoose
  .connect(DB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    if (process.env.NODE_ENV !== "test") {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ---------- Export for SuperTest ----------
module.exports = app;