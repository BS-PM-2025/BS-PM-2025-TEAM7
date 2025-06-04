//models/Question.js
const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  text: String,
  isCorrect: Boolean
});

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  options: {
    type: [optionSchema],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ CORRECT EXPORT — this must be used!
module.exports = mongoose.model("Question", questionSchema);
