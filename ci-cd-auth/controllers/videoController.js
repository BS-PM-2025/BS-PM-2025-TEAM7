const Video = require("../models/Video");
const Quiz = require("../models/Quiz");
const QuizSubmission = require("../models/QuizSubmission");
const Progress = require("../models/Progress");
const fs = require("fs");
const path = require("path");
// POST /video/upload
exports.uploadVideo = async (req, res) => {
  const { title } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send("No video file uploaded.");
  }

  const video = new Video({
    title,
    filename: file.filename,
    uploadDate: new Date(),
  });

  try {
    await video.save();
    res.redirect("/video/courses"); // ✅ Redirect to new page
  } catch (err) {
    res.status(500).send("Failed to save video.");
  }
};

// GET /video/all (JSON API)
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ uploadDate: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving videos" });
  }
};

// GET /video/courses (Render Courses Page)
exports.getCoursesPage = async (req, res) => {
  try {
    const videos = await Video.find().sort({ uploadDate: -1 });
    const role = req.session.role || "Guest";

    res.render("Courses/Courses", {
      role,
      videos,
    });
  } catch (error) {
    res.status(500).send("Failed to load courses page.");
  }
};

exports.deleteVideo = async (req, res) => {
  const { id } = req.params;

  try {
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // 🗑 Delete video file
    const filePath = path.join(__dirname, "..", "public", "uploads", video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 🧠 Delete associated quiz
    const quiz = await Quiz.findOneAndDelete({ video: id });

    if (quiz) {
      // 🧼 Delete submissions & progress for this quiz
      await QuizSubmission.deleteMany({ quiz: quiz._id });
      await Progress.deleteMany({ quiz: quiz._id });
    }

    // 🗑 Delete the video document
    await video.deleteOne();

    res.json({ message: "Video and associated quiz deleted" });
  } catch (err) {
    console.error("❌ Error deleting video:", err);
    res.status(500).json({ message: "Failed to delete video" });
  }
};