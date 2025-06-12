// ci-cd-auth/controllers/videoController.js
const Video = require("../models/video");
const Quiz  = require("../models/Quiz");
const QuizSubmission = require("../models/QuizSubmission");
const Progress       = require("../models/Progress");
const VideoProgress  = require("../models/VideoProgress");
const fs     = require("fs");
const path   = require("path");

/**
 * POST /video/upload
 * ───────────────────────────────────
 * Upload a new video (lecturer/admin only).
 * Expects multipart/form-data with:
 *   - title      (string)
 *   - section    (number ≥ 1)
 *   - video file (field name = "video")
 */
exports.uploadVideo = async (req, res) => {
  const { title, section } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send("No video file uploaded.");
  }
  if (!title || !section) {
    return res.status(400).send("Title and section are required.");
  }

  const parsedSection = parseInt(section, 10);
  if (isNaN(parsedSection) || parsedSection < 1 || parsedSection > 4) {
    return res.status(400).send("Section must be an integer from 1 to 4.");
  }

  const video = new Video({
    title:    title.trim(),
    filename: file.filename,
    section:  parsedSection,
  });

  try {
    await video.save();
    // Redirect back to the courses page
    return res.redirect("/video/courses");
  } catch (err) {
    console.error("Error saving new video:", err);
    return res.status(500).send("Failed to save video.");
  }
};

/**
 * GET /video/all
 * ───────────────────────────────────
 * Return a JSON array of ALL videos, sorted by (section ASC, uploadDate ASC).
 */
exports.getAllVideos = async (req, res) => {
  try {
    // Sort by section first, then uploadDate
    const videos = await Video.find().sort({ section: 1, uploadDate: 1 });
    return res.json(videos);
  } catch (error) {
    console.error("Error retrieving videos:", error);
    return res.status(500).json({ message: "Error retrieving videos" });
  }
};

/**
 * GET /video/courses
 * ───────────────────────────────────
 * Render the Courses page (EJS), passing a sorted array of all videos.
 * The EJS template will handle grouping by section and lock logic.
 */
exports.getCoursesPage = async (req, res) => {
  try {
    const videos = await Video.find().sort({ section: 1, uploadDate: 1 });
    const role = req.session.role || "Guest";
    return res.render("Courses/Courses", {
      role,
      videos,
    });
  } catch (error) {
    console.error("Failed to load courses page:", error);
    return res.status(500).send("Failed to load courses page.");
  }
};

/**
 * DELETE /video/:id
 * ───────────────────────────────────
 * Delete a video document and its file + associated quiz & progress.
 */
exports.deleteVideo = async (req, res) => {
  const { id } = req.params;
  try {
    // 1) Find the video document
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // 2) Delete the physical file:
    const filePath = path.join(__dirname, "..", "public", "uploads", video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 3) Delete any Quiz tied to this video (if your Quiz schema has a reference to Video)
    const quiz = await Quiz.findOneAndDelete({ video: id });
    if (quiz) {
      // a) Delete all QuizSubmissions for that quiz
      await QuizSubmission.deleteMany({ quiz: quiz._id });
      // b) Delete all Progress entries (quiz progress) for that quiz
      await Progress.deleteMany({ quiz: quiz._id });
    }

    // 4) Delete any VideoProgress entries (watched state) for this video
    await VideoProgress.deleteMany({ video: id });

    // 5) Finally remove the video document itself
    await video.deleteOne();

    return res.json({ message: "Video and associated quiz deleted" });
  } catch (err) {
    console.error("Error deleting video:", err);
    return res.status(500).json({ message: "Failed to delete video" });
  }
};
