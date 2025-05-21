const mongoose = require("mongoose");

const quizSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId },
      optionIndex: { type: Number },
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("QuizSubmission", quizSubmissionSchema);
