// ci-cd-auth/controllers/progressController.js

const Progress       = require("../models/Progress");        // Your old quiz‐progress model
const VideoProgress  = require("../models/VideoProgress");   // Newly created model
const Video          = require("../models/video");

/**
 * GET /progress/:studentId
 * ────────── Return quiz‐based progress for a student (unchanged).
 *    Response: an array of { quiz, percentage } documents.
 */
exports.getStudentProgress = async (req, res) => {
  const { studentId } = req.params;
  try {
    const progressList = await Progress
      .find({ student: studentId })
      .populate("quiz", "video");
    return res.json(progressList);
  } catch (err) {
    console.error("Error fetching student quiz progress:", err);
    return res.status(500).json({ message: "Error fetching progress." });
  }
};


/**
 * POST /progress/watch/:studentId/:videoId
 * ────────── Mark a specific video as “watched” for this student.
 *    Creates or updates a VideoProgress entry.
 */
exports.markVideoWatched = async (req, res) => {
  const { studentId, videoId } = req.params;
  try {
    const entry = await VideoProgress.findOneAndUpdate(
      { student: studentId, video: videoId },
      { watched: true },
      { upsert: true, new: true }
    );
    return res.json(entry);
  } catch (err) {
    console.error("Error marking video watched:", err);
    return res.status(500).json({ message: "Error marking video watched." });
  }
};


/**
 * GET /progress/completed/:studentId/:sectionId
 * ────────── Returns { completed: true/false } if the STUDENT has watched ALL videos in that SECTION.
 *    Logic:
 *      • Count how many videos exist for that section (Video model),
 *      • Count how many of those have VideoProgress.watched=true for this student,
 *      • If watchedCount ≥ totalVideosInSection → completed=true, else false.
 */
exports.hasCompletedSection = async (req, res) => {
  const { studentId, sectionId } = req.params;
  try {
    // 1) Find all videos in this numeric section (no course filter)
    const videosInSection = await Video.find({ section: parseInt(sectionId, 10) });
    const totalVideos = videosInSection.length;

    if (totalVideos === 0) {
      // If no videos exist in this section, we treat it as “already completed.”
      return res.json({ completed: true });
    }

    // 2) Count how many of those this student has watched
    const watchedCount = await VideoProgress.countDocuments({
      student: studentId,
      video:   { $in: videosInSection.map(v => v._id) },
      watched: true
    });

    const completed = (watchedCount >= totalVideos);
    return res.json({ completed });
  } catch (err) {
    console.error("Error in hasCompletedSection:", err);
    return res.status(500).json({ message: "Error checking section completion." });
  }
};
