const Quiz = require("../models/Quiz");
const QuizSubmission = require("../models/QuizSubmission");
const Progress = require("../models/Progress");

exports.getQuiz = async (req, res) => {
  const { videoId } = req.params;
  const quiz = await Quiz.findOne({ video: videoId });
  if (!quiz) return res.status(404).json({ message: "No quiz yet" });
  res.json(quiz);
};

exports.saveQuiz = async (req, res) => {
  const { videoId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: "Quiz must contain at least one question" });
  }

  const sanitizedQuestions = questions.map(q => ({
    prompt: q.prompt,
    options: q.options.map(opt => ({
      text: opt.text,
      isCorrect: !!opt.isCorrect
    }))
  }));

  const invalid = sanitizedQuestions.some(q =>
    !q.prompt || !q.options || q.options.length < 2 || q.options.filter(opt => opt.isCorrect).length !== 1
  );
  if (invalid) {
    return res.status(400).json({
      message: "Each question must have at least 2 options and exactly one correct answer."
    });
  }

  try {
    const quiz = await Quiz.findOneAndUpdate(
      { video: videoId },
      { video: videoId, questions: sanitizedQuestions },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ message: "Quiz saved", quiz });
  } catch (err) {
    console.error("❌ Error saving quiz:", err);
    res.status(500).json({ message: "Failed to save quiz" });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { answers } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const quiz = await Quiz.findOne({ video: videoId });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let correct = 0;
    const detailedResults = [];

    quiz.questions.forEach((question) => {
      const submitted = answers.find(ans => ans.questionId === String(question._id));
      const correctOption = question.options.find(opt => opt.isCorrect);
      const selectedOption = submitted ? question.options[submitted.optionIndex] : null;

      const isCorrect = selectedOption?.isCorrect === true;
      if (isCorrect) correct++;

      detailedResults.push({
        prompt: question.prompt,
        studentAnswer: selectedOption?.text || "Not answered",
        correctAnswer: correctOption?.text || "Unavailable",
        isCorrect
      });
    });

    const percentage = Math.round((correct / quiz.questions.length) * 100);

    // Save submission
    await QuizSubmission.create({
      student: studentId,
      quiz: quiz._id,
      answers,
    });

    // Save/update progress
    await Progress.findOneAndUpdate(
      { student: studentId, quiz: quiz._id },
      { percentage },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send detailed feedback to frontend
    res.json({
      message: "Quiz submitted",
      score: percentage,
      results: detailedResults
    });

  } catch (err) {
    console.error("❌ Submit quiz error:", err);
    res.status(500).json({ message: "Error submitting quiz" });
  }
 };
 
exports.getUserSubmissions = async (req, res) => {
  try {
    const studentId = req.user.id;

    const submissions = await QuizSubmission.find({ student: studentId }).populate({
      path: "quiz",
      populate: { path: "video", select: "title" } // רק אם video הוא ref למודל של וידאו
    });

    const response = submissions.map(sub => {
      const quiz = sub.quiz;
      if (!quiz || !quiz.questions) return null;

      const results = quiz.questions.map((q) => {
        const userAnswer = sub.answers.find(a => String(a.questionId) === String(q._id));
        const correctOption = q.options.find(opt => opt.isCorrect);
        const selectedOption = userAnswer ? q.options[userAnswer.optionIndex] : null;

        return {
          prompt: q.prompt,
          studentAnswer: selectedOption?.text || "Not answered",
          correctAnswer: correctOption?.text || "Unavailable",
          isCorrect: selectedOption?.isCorrect || false
        };
      });

      const correctCount = results.filter(r => r.isCorrect).length;
      const score = Math.round((correctCount / results.length) * 100);

      return {
        videoId: quiz.video?._id || quiz.video || "Unknown",
        videoTitle: quiz.video?.title || "Unknown",
        score,
        results
      };
    }).filter(Boolean); // להסיר null במקרה של שאלון שבור

    res.json(response);
  } catch (err) {
    console.error("❌ Failed to fetch user submissions:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

