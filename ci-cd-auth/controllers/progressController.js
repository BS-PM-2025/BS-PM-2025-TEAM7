const Progress = require("../models/Progress");

exports.getStudentProgress = async (req, res) => {
  const { studentId } = req.params;

  const progressList = await Progress.find({ student: studentId }).populate("quiz", "video");

  res.json(progressList); // list of { quiz, percentage }
};
