// controllers/videoController.js
const Video = require("../models/video");

exports.uploadVideo = async (req, res) => {
  const { title } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send("No video file uploaded.");
  }

  const video = new Video({
    title,
    filename: file.filename,
  });

  await video.save();
  res.redirect("/LecturerProfile");
};

exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ uploadDate: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving videos" });
  }
};
