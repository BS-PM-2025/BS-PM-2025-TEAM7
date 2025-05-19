// controllers/quizController.js
const Quiz = require("../models/Quiz");

/* ───────────── GET /api/videos/:videoId/quiz ───────────── */
exports.getQuiz = async (req, res) => {
  const { videoId } = req.params;
  const quiz = await Quiz.findOne({ video: videoId });
  if (!quiz) return res.status(404).json({ message: "No quiz yet" });
  res.json(quiz);
};

/* ───────────── POST /api/videos/:videoId/quiz ─────────────
   Body: { questions:[{ prompt, options:[{text,isCorrect}] }] }   */
exports.saveQuiz = async (req, res) => {
  const { videoId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || !questions.length)
    return res.status(400).json({ message: "Quiz must contain questions" });

  // upsert (create if not exists, otherwise replace)
  const quiz = await Quiz.findOneAndUpdate(
    { video: videoId },
    { video: videoId, questions },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ message: "Quiz saved", quiz });
};

/* ───────────── POST /api/videos/:videoId/quiz/submit ─────────────
   Body: { answers:[{questionId, optionIndex}] }                */
exports.submitQuiz = async (req, res) => {
  const { videoId } = req.params;
  const { answers } = req.body;
  const quiz = await Quiz.findOne({ video: videoId });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  let correct = 0;
  quiz.questions.forEach(q => {
    const ans = answers.find(a => a.questionId == q._id);
    if (ans && q.options[ans.optionIndex]?.isCorrect) correct++;
  });
  const score = Math.round((correct / quiz.questions.length) * 100);
  res.json({ score });
};