const Video = require("../models/video");
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

// DELETE /api/videos/:id
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // ✅ מסלול לקובץ בתוך תיקיית public/uploads
    const filePath = path.join(__dirname, '..', 'public', 'uploads', video.filename);

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('File deletion failed:', err);
        return res.status(500).json({ message: 'Video deleted from DB, but failed to delete file' });
      }

      return res.json({ message: 'Video deleted successfully' });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting video' });
  }
};
