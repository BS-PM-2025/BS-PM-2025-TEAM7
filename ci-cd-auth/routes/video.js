// routes/video.js
const express = require("express");
const router  = express.Router();

const multer  = require("multer");
const path    = require("path");

const videoController = require("../controllers/videoController");
const quizRoutes      = require("./quiz");           // ✅ רואטר של חידונים

/* ───────────── Multer – אחסון קבצי וידאו ───────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, "public/uploads"),                      // public/uploads/<file>
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

/* ───────────── Video endpoints ───────────── */
router.post   ("/upload", upload.single("video"), videoController.uploadVideo);
router.get    ("/all",    videoController.getAllVideos);
router.delete ("/:id",    videoController.deleteVideo);

/* ───────────── Nested Quiz endpoints ─────────────
   כל בקשות ‎/api/videos/:videoId/quiz → יעברו ל-quizRoutes   */
router.use("/:videoId/quiz", quizRoutes);            // ✅ חיבור החידון

module.exports = router;