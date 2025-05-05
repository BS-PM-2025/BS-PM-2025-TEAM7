const Feedback = require("../models/FeedBack");

exports.submitFeedback = async (req, res) => {
    const { comment, rating } = req.body;
    if (!comment || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Valid comment and rating (1–5) required." });
    }
  
    try {
      const feedback = new Feedback({
        username: req.user.username,
        comment,
        rating
      });
      await feedback.save();
      res.status(201).json({ message: "Feedback submitted successfully." });
    } catch (err) {
      res.status(500).json({ message: "Failed to save feedback." });
    }
  };
  
  exports.getAllFeedback = async (req, res) => {
    try {
      const feedbackList = await Feedback.find().sort({ createdAt: -1 }).lean();
      res.status(200).json({ feedback: feedbackList });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch feedback." });
    }
  };