// controllers/videoController.js
const Video = require("../models/video");

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
