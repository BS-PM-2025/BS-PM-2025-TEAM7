// routes/video.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const videoController = require("../controllers/videoController"); // ⬅️ תקני ויעבוד
const path = require("path"); // ✅ נדרש לפונקציית path.extname

// Store videos in /public/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
router.delete("/:id", videoController.deleteVideo); // ✅ ADD THIS
router.post("/upload", upload.single("video"), videoController.uploadVideo);
router.get("/all", videoController.getAllVideos);

module.exports = router;
