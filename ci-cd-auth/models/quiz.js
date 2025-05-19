// models/quiz.js
const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const questionSchema = new mongoose.Schema({
  prompt:  { type: String, required: true },
  options: { type: [optionSchema], validate: v => v.length >= 2 }
});

const quizSchema = new mongoose.Schema({
  video:     { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true, unique: true },
  questions: { type: [questionSchema],  default: [] }
});

module.exports = mongoose.model("Quiz", quizSchema);