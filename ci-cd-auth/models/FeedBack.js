const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  username: String,
  comment: String,
  role: String,
  rating: Number,
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  courseTitle: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
