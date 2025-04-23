const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./models/user"); // Import the User model
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/ci_cd_learning", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Serve static files (like styles.css)
app.use(express.static(path.join(__dirname, "public")));

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Serve sign-up page (GET request)
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// Serve log-in page (GET request)
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Sign-up route for students and lecturers (POST request)
app.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword, role } = req.body;

  if (!username || !email || !password || !confirmPassword || !role) {
    return res.status(400).send("All fields are required.");
  }

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match.");
  }

  if (role !== "student" && role !== "lecturer") {
    return res.status(400).send("Role must be either 'student' or 'lecturer'.");
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).send("User with this email or username already exists.");
    }

    const newUser = new User({ username, email, password, role });
    await newUser.save();

    res.status(201).send("User created successfully!");
  } catch (error) {
    res.status(500).send("Error creating user: " + error.message);
  }
});

// ✅ Login route (POST)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).send("Invalid username or password.");
    }

    res.status(200).send(`Welcome, ${user.username}!`);
  } catch (error) {
    res.status(500).send("Login failed: " + error.message);
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`CI/CD Learning Platform running at http://localhost:${PORT}`);
});
