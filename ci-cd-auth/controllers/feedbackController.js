// controllers/feedbackController.js
const Feedback = require("../models/FeedBack");
const User     = require("../models/user");

/* ========== 1) Students → Submit general or course feedback ========== */
exports.submitFeedback = async (req, res) => {
  // UI POSTs { comment, rating, [courseId], [courseTitle] }
  const text = req.body.comment;
  const num  = Number(req.body.rating);

  if (!text || isNaN(num) || num < 1 || num > 5) {
    return res.status(400).json({
      message: "comment (string) and rating (1–5) required."
    });
  }

  try {
    const fb = new Feedback({
      studentId:   req.user.id,
      lecturerId:  null,                   // student‐only feedback
      username:    req.user.username,
      role:        req.user.role,
      comment:     text,
      rating:      num,
      courseId:    req.body.courseId   || null,
      courseTitle: req.body.courseTitle|| null
    });
    await fb.save();
    return res.status(201).json({ message: "Feedback submitted!", feedback: fb });
  } catch (err) {
    console.error("❌ save feedback:", err);
    return res.status(500).json({ message: "Failed to save feedback." });
  }
};

/* ========== 2) Lecturers → Submit feedback to a specific student ========== */
exports.submitFeedbackToStudent = async (req, res) => {
  // UI POSTs { message, rating } to /api/feedback/student/:id
  const text = req.body.message;
  const num  = Number(req.body.rating);

  if (!text || isNaN(num) || num < 1 || num > 5) {
    return res.status(400).json({
      message: "message (string) and rating (1–5) required."
    });
  }

  try {
    // Verify that :id is an actual student
    const student = await User.findById(req.params.id);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found." });
    }

    const fb = new Feedback({
      studentId:  student.id,
      lecturerId: req.user.id,
      username:   req.user.username,
      role:       req.user.role,  // “lecturer”
      comment:    text,
      rating:     num
    });
    await fb.save();
    return res.status(201).json({ message: "Feedback submitted!", feedback: fb });
  } catch (err) {
    console.error("❌ lecturer submit:", err);
    return res.status(500).json({ message: "Failed to submit feedback." });
  }
};


/* ========== 3) Anyone logged in → View homepage/community feedback ========== */
exports.getAllFeedback = async (_req, res) => {
  try {
    // Only return feedbacks that were created by **students**, i.e. lecturerId === null
    const list = await Feedback.find({ lecturerId: null })
                               .sort({ createdAt: -1 })
                               .lean();
    return res.json({ feedback: list });
  } catch (err) {
    console.error("❌ getAllFeedback:", err);
    return res.status(500).json({ message: "Failed to fetch feedback." });
  }
};


/* ========== 4) View feedback for a specific course ========== */
exports.getCourseFeedback = async (req, res) => {
  try {
    const list = await Feedback.find({
      courseId: req.params.courseId,
      lecturerId: null       // only student‐submitted, for that course
    })
    .sort({ createdAt: -1 })
    .lean();

    return res.json({ feedback: list });
  } catch (err) {
    console.error("❌ getCourseFeedback:", err);
    return res.status(500).json({ message: "Failed to fetch course feedback." });
  }
};


/* ========== 5) Students → View feedback *about themselves* ========== */
exports.getMyFeedback = async (req, res) => {
  try {
    // Only lecturer→student feedback (lecturerId != null) for the current student
    const list = await Feedback.find({
      studentId:   req.user.id,
      lecturerId: { $ne: null }
    })
    .populate("lecturerId", "username")
    .sort({ createdAt: -1 })
    .lean();

    return res.json({ feedback: list });
  } catch (err) {
    console.error("❌ getMyFeedback:", err);
    return res.status(500).json({ message: "Failed to fetch your feedback." });
  }
};


/* ========== 6) Lecturers → Edit their own feedback ========== */
exports.updateFeedback = async (req, res) => {
  // UI sends { message, rating } to PUT /api/feedback/:id
  const { message, rating } = req.body;
  const num = Number(rating);

  if (!message || isNaN(num) || num < 1 || num > 5) {
    return res.status(400).json({ message: "message (string) and rating (1–5) required." });
  }

  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: "Not found." });

    // Only the same lecturer who originally wrote it may update
    if (fb.lecturerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Cannot edit others’ feedback." });
    }

    fb.comment = message;
    fb.rating  = num;
    await fb.save();

    return res.json({ message: "Feedback updated.", feedback: fb });
  } catch (err) {
    console.error("❌ updateFeedback:", err);
    return res.status(500).json({ message: "Failed to update feedback." });
  }
};


/* ========== 7) Lecturers → Delete their own feedback ========== */
exports.deleteFeedback = async (req, res) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return res.status(404).json({ message: "Not found." });

    // Only the same lecturer may delete it
    if (fb.lecturerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Cannot delete others’ feedback." });
    }

    await fb.deleteOne();
    return res.json({ message: "Feedback deleted." });
  } catch (err) {
    console.error("❌ deleteFeedback:", err);
    return res.status(500).json({ message: "Failed to delete feedback." });
  }
};


/* ========== 8) Lecturers → View all feedback they've given to a specific student ========== */
exports.getFeedbackForStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Verify that :id is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found." });
    }

    // Only return feedbacks where lecturerId === current user
    const feedbacks = await Feedback.find({
      studentId:   studentId,
      lecturerId:  req.user.id
    })
    .sort({ createdAt: -1 })
    .lean();

    return res.json({ feedback: feedbacks });
  } catch (err) {
    console.error("❌ getFeedbackForStudent:", err);
    return res.status(500).json({ message: "Failed to fetch feedback." });
  }
};
