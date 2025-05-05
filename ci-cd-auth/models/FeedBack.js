const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  username: String,
  comment: String,
  rating: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
