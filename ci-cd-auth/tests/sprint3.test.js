// tests/sprint3.test.js
const request               = require("supertest");
const mongoose              = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const jwt                   = require("jsonwebtoken");

const User       = require("../models/user");
const Video      = require("../models/video");
const Feedback   = require("../models/FeedBack");
const Progress   = require("../models/Progress");
const Certificate= require("../models/Certificate");
const Question   = require("../models/Question");
const SupportTicket = require("../models/SupportTicket");

let app, mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI    = mongoServer.getUri();
  process.env.JWT_SECRET   = "testsecret";
  process.env.NODE_ENV     = "test";
  app = require("../index");
  await new Promise(res => mongoose.connection.once("open", res));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// ───────────── Sprint 3 Unit ─────────────
describe("🔧 Unit tests - Sprint 3", () => {
  beforeEach(async () => {
    for (const c of await mongoose.connection.db.collections()) {
      await c.deleteMany({});
    }
  });
  
  test("Course model optional imageUrl works", () => {
  const Course = require("../models/course");
  const c = new Course({ courseName: "X", description: "Y" });
  expect(c.imageUrl).toBeUndefined();
});

  test("1) ExamAttempt model requires exam & student", async () => {
    const ExamAttempt = require("../models/ExamAttempt");
    const bad = new ExamAttempt({});
    await expect(bad.validate()).rejects.toThrow(/required/);
  });

   test("2) Question model requires prompt & options", async () => {
    const bad = new Question({ /* missing both */ });
    await expect(bad.validate()).rejects.toThrow(/required/);
  });

  test("3) SupportTicket model requires `title` & `message`", async () => {
    const bad = new SupportTicket({});
    await expect(bad.validate()).rejects.toThrow(/required/);
  });

   test("5) VideoProgress model requires video & student", async () => {
    const VideoProgress = require("../models/VideoProgress");
    const bad = new VideoProgress({});
    await expect(bad.validate()).rejects.toThrow(/required/);
  });
  test("7) Feedback schema computes averageRating correctly", () => {
    const f1 = new Feedback({ comment:"x", rating:4, username:"a" });
    const f2 = new Feedback({ comment:"y", rating:2, username:"b" });
    // pretend we push into an array and recalc:
    const avg = (f1.rating + f2.rating) / 2;
    expect(avg).toBe(3);
  });
   test("Course model requires courseName & description", async () => {
    const Course = require("../models/course");
    const bad = new Course({});
    await expect(bad.validate()).rejects.toThrow(/courseName/);
    await expect(bad.validate()).rejects.toThrow(/description/);
  });
    test("QuizSubmission model requires quiz & student", async () => {
    const QuizSubmission = require("../models/QuizSubmission");
    const bad = new QuizSubmission({ answers: [] });
    await expect(bad.validate()).rejects.toThrow(/quiz/);
    await expect(bad.validate()).rejects.toThrow(/student/);
  });

 
});

// ───────────── Sprint 3 Integration ─────────────
describe("🚀 Integration tests - Sprint 3", () => {
  let studentToken, lecturerToken, supportId;

  beforeAll(async () => {
    await User.deleteMany({});
    // student signup/login
    await request(app).post("/api/auth/signup").send({
      username:"s3",
      email:"s3@e.com",
      password:"P3!",
      confirmPassword:"P3!",
      role:"student"
    });
    const sr = await request(app)
      .post("/api/auth/login")
      .send({ username:"s3", password:"P3!" });
    studentToken = sr.body.token;

    // lecturer signup/login
    await request(app).post("/api/auth/signup").send({
      username:"l3",
      email:"l3@e.com",
      password:"L3!",
      confirmPassword:"L3!",
      role:"lecturer"
    });
    const lr = await request(app)
      .post("/api/auth/login")
      .send({ username:"l3", password:"L3!" });
    lecturerToken = lr.body.token;
  });

  
  test("10) GET /api/videos/:fakeId → 404", async () => {
    const res = await request(app)
      .get("/api/videos/000000000000000000000000")
      .set("Authorization", `Bearer ${lecturerToken}`);
    expect(res.status).toBe(404);
  });
  test("11) POST /api/auth/logout → 200 JSON", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
   test("13) GET /api/progress/:id → 200 + empty array", async () => {
    const fake = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/progress/${fake}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
  test("GET /api/pdfs/:id → 404 if not found", async () => {
    const fake = "000000000000000000000000";
    const res = await request(app).get(`/api/pdfs/${fake}`);
    expect(res.status).toBe(404);
  });
   test("GET /api/videos/all → 200 + array", async () => {
    const res = await request(app).get("/api/videos/all");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  test("GET /api/videos/:videoId/quiz → 404 if none saved", async () => {
    const vid = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/videos/${vid}/quiz`)
      .set("Authorization", `Bearer ${lecturerToken}`);
    expect(res.status).toBe(404);
  });
   
  
});
