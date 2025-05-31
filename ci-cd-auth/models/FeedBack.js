// models/FeedBack.js
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  // Always the student who is logged‐in (for home/community) 
  // or who receives feedback (when lecturer writes about a student)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Only set when a lecturer gives feedback to a student
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // Snapshot of who wrote the feedback
  username: { type: String, default: null },
  role:     { type: String, default: null, enum: ["student","lecturer","admin"] },

  // Unified “comment” field (UI reads from .comment)
  comment: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  // Optional course context (only for student→course feedback)
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "Video", default: null },
  courseTitle: { type: String, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
