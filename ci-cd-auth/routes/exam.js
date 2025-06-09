const mongoose = require("mongoose");
const express     = require("express");
const router      = express.Router();
const Question    = require("../models/Question");
const ExamAttempt = require("../models/ExamAttempt");
const Certificate = require("../models/Certificate");
const { authenticate } = require("../middleware/auth"); // or "../controllers/auth"
const path        = require("path");


// ====================== Student Exam Routes ======================

// GET  /api/exam?studentId=...
//   → Return all questions (with correct answers stripped out) plus attempt count
router.get("/", async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ message: "Missing studentId" });
    }

    // 1) Has the student already passed the exam?
    const passedAttempt = await ExamAttempt.findOne({
      student: studentId,
      passed: true
    });
    if (passedAttempt) {
      return res.status(400).json({
        message:
          "You have already passed this exam. View your certificate in the profile section."
      });
    }

    // 2) Has the student reached 3 total attempts?
    const attemptsCount = await ExamAttempt.countDocuments({ student: studentId });
    if (attemptsCount >= 3) {
      return res.status(400).json({
        message: "You have reached the maximum number of attempts (3) for this exam."
      });
    }

    // 3) Load ALL questions, but strip out each option's "isCorrect" flag
    //    (so the front end only sees question text + option text).
    const questions = await Question.find({}).select("-options.isCorrect");
    if (questions.length === 0) {
      return res.status(404).json({ message: "No questions available for the exam." });
    }

    // The next attempt number is (attemptsCount + 1)
    const attemptNumber   = attemptsCount + 1;
    const totalQuestions  = questions.length;

    // Return JSON: { questions: [...], attemptNumber, totalQuestions }
    return res.status(200).json({
      questions,
      attemptNumber,
      totalQuestions
    });
  } catch (err) {
    console.error("Error getting exam questions:", err);
    return res.status(500).json({ message: "Failed to retrieve exam questions" });
  }
});


router.post("/submit", async (req, res) => {
  try {
    const { userEmail, answers } = req.body;

    // Validate email
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      return res.status(400).json({ message: "Missing or invalid userEmail" });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "Invalid answers format" });
    }

    // Check max attempts by userEmail
    const attemptsCount = await ExamAttempt.countDocuments({ userEmail });
    if (attemptsCount >= 3) {
      return res.status(400).json({
        message: "You have reached the maximum number of attempts (3) for this exam."
      });
    }

    const attemptNumber = attemptsCount + 1;

    // Extract question IDs
    const questionIds = answers.map(a => a.question);
    const questions = await Question.find({ _id: { $in: questionIds } });

    if (questions.length !== answers.length) {
      return res.status(400).json({ message: "Some questions not found in submission." });
    }

    let correctAnswers = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const question = questions.find(q => q._id.toString() === answer.question);
      if (!question) {
        return res.status(400).json({ message: `Question with ID ${answer.question} not found` });
      }

      const selectedOptionIndex = Number(answer.selectedOption);
      if (
        Number.isNaN(selectedOptionIndex) ||
        selectedOptionIndex < 0 ||
        selectedOptionIndex >= question.options.length
      ) {
        return res.status(400).json({
          message: `Invalid option selected for question ${answer.question}`
        });
      }

      const selectedOption = question.options[selectedOptionIndex];
      if (selectedOption.isCorrect) {
        correctAnswers++;
      }

      gradedAnswers.push({
        question: question._id,
        selectedOption: selectedOptionIndex
      });
    }

    const totalQuestions = answers.length;
    const score = (correctAnswers / totalQuestions) * 100;
    const passed = score >= 80;

    const examAttempt = new ExamAttempt({
      userEmail,
      answers: gradedAnswers,
      score,
      passed,
      attemptNumber
    });

    await examAttempt.save();

    

    return res.status(200).json({
      score,
      passed,
      correctAnswers,
      totalQuestions,
      attemptNumber
    });
  } catch (err) {
    console.error("Error submitting exam:", err);
    return res.status(500).json({ message: "Failed to submit exam" });
  }
});





// GET  /api/exam/attempts?studentId=...
//    → Return a list of all attempts (most recent first) for this student
router.get("/attempts", async (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ message: "Missing studentId" });
    }

    const attempts = await ExamAttempt.find({ student: studentId })
      .sort({ completedAt: -1 });
    return res.status(200).json(attempts);
  } catch (err) {
    console.error("Error getting student attempts:", err);
    return res.status(500).json({ message: "Failed to retrieve exam attempts" });
  }
});


// ====================== Certificate Routes ======================

// POST /api/exam/certificate
// → Creates a certificate after a successful exam attempt
router.post("/certificate", async (req, res) => {
  try {
    const { userEmail, examAttemptId, score } = req.body;

    if (!userEmail || !examAttemptId || score === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const student = await User.findOne({ email: userEmail });
    if (!student) {
      return res.status(404).json({ message: "User not found with that email" });
    }

    const existing = await Certificate.findOne({
      student: student._id,
      examAttempt: examAttemptId
    });
    if (existing) {
      return res.status(409).json({ message: "Certificate already exists for this exam attempt" });
    }

    const certificate = new Certificate({
      student: student._id,
      examAttempt: examAttemptId,
      score
    });

    await certificate.save();

    return res.status(201).json({
      message: "Certificate created successfully",
      certificateId: certificate.certificateId
    });
  } catch (err) {
    console.error("Error creating certificate:", err);
    return res.status(500).json({ message: "Failed to create certificate" });
  }
});

// GET /api/exam/certificate?studentId=...
// → Return the most recent Certificate for a student
router.get("/certificate", async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid or missing studentId" });
    }

    const certificate = await Certificate.findOne({ student: studentId })
      .populate("student", "username email")
      .populate("examAttempt");

    if (!certificate) {
      return res.status(404).json({
        message: "No certificate found. You need to pass the exam first."
      });
    }

    return res.status(200).json(certificate);
  } catch (err) {
    console.error("Error getting certificate:", err);
    return res.status(500).json({ message: "Failed to retrieve certificate" });
  }
});

// GET /api/exam/certificates/:certificateId
// → Serve the certificate HTML page
router.get("/certificates/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate("student", "username email")
      .populate("examAttempt");

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    return res.sendFile(path.join(__dirname, "..", "views", "Certificate", "certificate.html"));
  } catch (err) {
    console.error("Error generating certificate HTML:", err);
    return res.status(500).json({ message: "Failed to generate certificate" });
  }
});

// GET /api/exam/certificates/:certificateId/data
// → Return the certificate JSON data
router.get("/certificates/:certificateId/data", async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate("student", "username email")
      .populate("examAttempt");

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    return res.status(200).json({
      certificateId: certificate.certificateId,
      studentName: certificate.student.username,
      score: certificate.score,
      issueDate: certificate.issueDate
    });
  } catch (err) {
    console.error("Error getting certificate data:", err);
    return res.status(500).json({ message: "Failed to retrieve certificate data" });
  }
});


// ====================== Question Management (Lecturer/Admin) ======================

// GET  /api/exam/questions
//    → Return all questions (used by lecturer’s “Exam Management” UI)
router.get("/questions", async (req, res) => {
  try {
    const questions = await Question.find({})
      .sort({ createdAt: -1 });
    return res.status(200).json(questions);
  } catch (err) {
    console.error("Error getting questions:", err);
    return res.status(500).json({ message: "Failed to retrieve questions" });
  }
});

// POST /api/exam/questions
//    → Create a new question (with at least two options, one flagged isCorrect)
router.post("/questions", async (req, res) => {
  try {
    const { text, options } = req.body;
    // Validate: must have text + an array of at least 2 option objects
    if (
      !text ||
      !options ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      return res.status(400).json({
        message: "Question must have text and at least 2 options"
      });
    }

    // Each option is { text: "...", isCorrect: true/false }. Ensure at least one isCorrect = true.
    const hasCorrectOption = options.some((opt) => opt.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({
        message: "At least one option must be marked as correct"
      });
    }

    // Create & save
    const newQuestion = new Question({
      text,
      options,
      createdBy: req.body.createdBy || null
    });
    await newQuestion.save();
    return res.status(201).json(newQuestion);
  } catch (err) {
    console.error("Error creating question:", err);
    return res.status(500).json({ message: "Failed to create question" });
  }
});

// DELETE /api/exam/questions/:id
// → Deletes a specific question by ID
router.delete("/questions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Question not found" });
    }
    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err);
    return res.status(500).json({ message: "Failed to delete question" });
  }
});


// PUT /api/exam/questions/:id
// → Updates a specific question
router.put("/questions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, options } = req.body;

    if (!text || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        message: "Question must have text and at least 2 options"
      });
    }

    const hasCorrectOption = options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      return res.status(400).json({
        message: "At least one option must be marked as correct"
      });
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      { text, options },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating question:", err);
    return res.status(500).json({ message: "Failed to update question" });
  }
});




// GET /api/exam/status?email=...
router.get('/status', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Find if any attempt exists with passed=true for this email
    const passedAttempt = await ExamAttempt.findOne({ userEmail: email, passed: true }).sort({ createdAt: -1 });

    if (passedAttempt) {
      return res.json({
        passed: true,
        score: passedAttempt.score,
        attemptNumber: passedAttempt.attemptNumber,
      });
    } else {
      return res.json({ passed: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;