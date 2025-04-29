const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("./models/user");
const Course = require("./models/course");

const app = express();
const PORT = 3000;
const JWT_SECRET = "your_secret_key";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Static HTML routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});
app.get("/StudentProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "studentProfile.html"));
});
app.get("/LecturerProfile", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "lecturerProfile.html"));
});
app.get("/manageCourses", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "manageCourses.html"));
});
app.get("/courses", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "courses.html"));
});

// Signup
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

  const newUser = new User({ username, email, password, role });
  await newUser.save();

  res.redirect("/login");
});

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

// Get all courses (protected)
app.get("/manage-courses", authenticateToken, async (req, res) => {
  try {
    const courses = await Course.find().lean(); // lean() to return plain objects
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses." });
  }
});

app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  console.log("Deleting course:", courseId);
  try {
    const deleted = await Course.findByIdAndDelete(courseId);
    if (!deleted) {
      return res.status(404).send({ message: "Course not found" });
    }
    res.status(200).send({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).send({ message: "Error deleting course" });
  }
});




// Add a new course (protected)
app.post("/api/courses", authenticateToken, async (req, res) => {
  const { courseName, description, imageUrl } = req.body;

  console.log("Add course request body:", req.body);

  if (!courseName || !description || !imageUrl) {
    return res.status(400).json({ message: "Course title, description, and image URL are required." });
  }

  try {
    const course = new Course({ courseName, description, imageUrl }); // Correct field name for courseName
    await course.save();
    console.log("Course saved:", course);
    res.status(201).json({ message: "Course added successfully." });
  } catch (err) {
    console.error("Failed to save course:", err);
    res.status(500).json({ message: "Failed to add course." });
  }
});

// Login
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

// Logout (frontend should delete token)
app.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out" });
});

// DB Connection & Start Server
if (require.main === module) {
  mongoose.connect("mongodb://127.0.0.1:27017/ci_cd_learning", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
  
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
