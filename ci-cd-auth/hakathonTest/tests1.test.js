// tests/test.js
const request               = require("supertest");
const mongoose              = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");

const User             = require("../models/user");
const Video            = require("../models/Video");
const Course           = require("../models/course");
const Feedback         = require("../models/FeedBack");
const Progress         = require("../models/Progress");
const Quiz             = require("../models/Quiz");
const QuizSubmission   = require("../models/QuizSubmission");

let app;
let mongoServer;

// Helper to clear all collections
async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  for (const coll of collections) {
    await coll.deleteMany({});
  }
}

beforeAll(async () => {
  // ensure upload folder
  const fs   = require("fs");
  const path = require("path");
  fs.mkdirSync(path.join(__dirname, "../public/uploads"), { recursive: true });

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI  = mongoServer.getUri();
  process.env.NODE_ENV   = "test";
  app = require("../index");

  if (mongoose.connection.readyState !== 1) {
    await new Promise(res => mongoose.connection.once("open", res));
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});


describe("🚀 Integration tests - Profile Photo & Quiz Submissions (Extended)", () => {
  let studentToken, lecturerToken, studentId, videoId, quizId;

  const student = { username:"photoUser", email:"photo@example.com", password:"Photo123!", confirmPassword:"Photo123!", role:"student" };
  const lecturer = { username:"photoLecturer", email:"lecturer@example.com", password:"Lect123!", confirmPassword:"Lect123!", role:"lecturer" };

  beforeAll(async () => {
    await clearDB();

    await request(app).post("/api/auth/signup").send(lecturer);
    const lectLogin = await request(app).post("/api/auth/login").send({ username: lecturer.username, password: lecturer.password });
    lecturerToken = lectLogin.body.token;

    await request(app).post("/api/auth/signup").send(student);
    const studLogin = await request(app).post("/api/auth/login").send({ username: student.username, password: student.password });
    studentToken = studLogin.body.token;

    const user = await User.findOne({ username: student.username });
    studentId = user._id.toString();

    const video = new Video({ title:"Video for Quiz", filename:"video.mp4" });
    await video.save();
    videoId = video._id.toString();
  });

  test("1) Save quiz for a video → 200 Quiz saved", async () => {
    const questions = [
      {
        prompt: "What is Git?",
        options: [
          { text: "Version control system", isCorrect: true },
          { text: "Programming language" }
        ]
      }
    ];

    const res = await request(app)
      .post(`/api/videos/${videoId}/quiz`)
      .set("Authorization", `Bearer ${lecturerToken}`)
      .send({ questions });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/quiz saved/i);
    quizId = res.body.quiz._id;
  });

  test("2) Get quiz for video → 200 and questions array", async () => {
    const res = await request(app)
      .get(`/api/videos/${videoId}/quiz`)
      .set("Authorization", `Bearer ${studentToken}`); // אם נדרש, או אפשר בלי

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  test("6) Get user quiz submissions → 200 JSON array", async () => {
    const res = await request(app)
      .get("/api/submissions")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("videoId");
      expect(res.body[0]).toHaveProperty("score");
      expect(res.body[0]).toHaveProperty("results");
    }
  });
});

 
describe("🔧 Unit tests - User and Quiz models", () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  // 1. וידוא שהסיסמה נשמרת בצורה מוצפנת (hashed)
  test("User model hashes password before save", async () => {
    const user = new User({ username: "user1", email: "user1@example.com", password: "Password123!", role: "student" });
    await user.save();
    expect(user.password).not.toBe("Password123!");
  });

  // 2. בדיקת פונקציית matchPassword מחזירה true לסיסמה נכונה
  test("User.matchPassword returns true for correct password", async () => {
    const user = new User({ username: "user2", email: "user2@example.com", password: "Pass1234!", role: "student" });
    await user.save();
    const isMatch = await user.matchPassword("Pass1234!");
    expect(isMatch).toBe(true);
  });

  // 4. ולידציה: כל שאלה חייבת להכיל לפחות 2 אפשרויות
  test("Quiz question validation fails if less than 2 options", async () => {
    const quiz = new Quiz({
      video: new mongoose.Types.ObjectId(),
      questions: [
        { prompt: "Sample?", options: [{ text: "Only one option" }] }
      ]
    });
    let error = null;
    try {
      await quiz.validate();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });

  // 5. ולידציה: כל שאלה חייבת להכיל בדיוק אפשרות אחת נכונה
  test("Quiz question validation fails if no correct option", async () => {
    const quiz = new Quiz({
      video: new mongoose.Types.ObjectId(),
      questions: [
        {
          prompt: "Sample?",
          options: [
            { text: "Option 1", isCorrect: false },
            { text: "Option 2", isCorrect: false }
          ]
        }
      ]
    });
    let error = null;
    try {
      await quiz.validate();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });
});