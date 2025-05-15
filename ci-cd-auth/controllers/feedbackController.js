// controllers/feedbackController.js
const Feedback = require("../models/FeedBack");

exports.submitFeedback = async (req, res) => {
  // only students reach here (via authorizeRole below)
  const { comment, rating } = req.body;
  if (!comment || !rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Valid comment and rating (1–5) required." });
  }

  try {
    const feedback = new Feedback({
      username: req.user.username,
      role:     req.user.role, 
      comment,
      rating,
    });
    await feedback.save();
    res.status(201).json({ message: "Feedback submitted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to save feedback." });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const feedbackList = await Feedback.find()
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ feedback: feedbackList });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feedback." });
  }
};

exports.updateFeedback = async (req, res) => {
  // only lecturers reach here
  const { id } = req.params;
  const { comment, rating } = req.body;
  if (!comment || !rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Valid comment and rating (1–5) required." });
  }
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { comment, rating },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ message: "Not found." });
    res
      .status(200)
      .json({ message: "Feedback updated successfully.", feedback });
  } catch (err) {
    res.status(500).json({ message: "Failed to update feedback." });
  }
};

exports.deleteFeedback = async (req, res) => {
  // only lecturers reach here
  const { id } = req.params;
  try {
    const feedback = await Feedback.findByIdAndDelete(id);
    if (!feedback) return res.status(404).json({ message: "Not found." });
    res.status(200).json({ message: "Feedback deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete feedback." });
  }
};
