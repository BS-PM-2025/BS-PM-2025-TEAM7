// tests/test.js
const request               = require("supertest");
const mongoose              = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const jwt                   = require("jsonwebtoken");

const User             = require("../models/user");
const Video            = require("../models/Video");
const Quiz             = require("../models/Quiz");

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
  process.env.JWT_SECRET = "testsecret";
  process.env.NODE_ENV   = "test";

  app = require("../index");  // your express app

  if (mongoose.connection.readyState !== 1) {
    await new Promise(res => mongoose.connection.once("open", res));
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

//
// ─── INTEGRATION: UPDATE PROFILE ───────────────────────────────────────────────
//
describe("🚀 Integration tests: PUT /api/users/updateProfile", () => {
  let studentToken;

  beforeAll(async () => {
    await clearDB();

    // signup + login a student
    await request(app)
      .post("/api/auth/signup")
      .send({
        username: "intUser",
        email: "int@user.com",
        password: "pass123",
        confirmPassword: "pass123",
        role: "student",
      });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "intUser", password: "pass123" });

    studentToken = loginRes.body.token;
  });

  it("200 updates and returns new data", async () => {
  const res = await request(app)
    .put("/api/users/updateProfile")
    .set("Authorization", "Bearer " + studentToken)
    .send({ username: "newName", email: "new@e.com" });

  expect(res.status).toBe(200);

  // you *do* get a message:
  expect(res.body).toHaveProperty("message", "Profile updated successfully.");

  // if your route returns the updated user under `res.body.user`, assert that:
  expect(res.body.user).toMatchObject({
    username: "newName",
    email:    "new@e.com",
    role:     "student"
  });
});


  it("401 when no token provided", async () => {
    const res = await request(app)
      .put("/api/users/updateProfile")
      .send({ username: "x", email: "x@x.com" });

    expect(res.status).toBe(401);
  });

  it("404 if token valid but user not in DB", async () => {
    const bogus = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .put("/api/users/updateProfile")
      .set("Authorization", "Bearer " + bogus)
      .send({ username: "x", email: "x@x.com" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found." });  
  });
});

//
// ─── INTEGRATION: Profile Photo & Quiz Submissions (Extended) ─────────────
//
describe("🚀 Integration tests - Quiz saving & retrieval", () => {
  let studentToken, lecturerToken, videoId, quizId;

  const student = {
    username: "photoUser",
    email: "photo@example.com",
    password: "Photo123!",
    confirmPassword: "Photo123!",
    role: "student",
  };
  const lecturer = {
    username: "photoLecturer",
    email: "lecturer@example.com",
    password: "Lect123!",
    confirmPassword: "Lect123!",
    role: "lecturer",
  };

  beforeAll(async () => {
    await clearDB();

    await request(app).post("/api/auth/signup").send(lecturer);
     // now fetch that user and sign your own token:
     const dbLect = await User.findOne({ username: lecturer.username });
     lecturerToken = jwt.sign(
       { id: dbLect._id.toString(), username: dbLect.username, role: dbLect.role },
       process.env.JWT_SECRET,
       { expiresIn: "2h" }
     );

    // student signup + login
    await request(app).post("/api/auth/signup").send(student);
    const studLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: student.username, password: student.password });
    studentToken = studLogin.body.token;

    // create a video record
   const video = await new Video({
      title:    "Video for Quiz",
      filename: "video.mp4",
      section:   1
    }).save();
    videoId = video._id.toString();
  });

  it("1) POST /api/videos/:videoId/quiz → 200 Quiz saved", async () => {
    const questions = [
      {
        prompt: "What is Git?",
        options: [
          { text: "Version control system", isCorrect: true },
          { text: "Programming language", isCorrect: false }
        ],
      },
    ];

    const res = await request(app)
   .post(`/api/videos/${videoId}/quiz`)
   .set("Authorization", `Bearer ${lecturerToken}`)
   .send({ questions });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/quiz saved/i);
    quizId = res.body.quiz._id;
  });

  it("2) GET  /api/videos/:videoId/quiz → 200 + questions array", async () => {
    const res = await request(app)
    .get(`/api/videos/${videoId}/quiz`)
    .set("Authorization", `Bearer ${lecturerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  it("3) GET  /api/submissions → 200 + empty array", async () => {
    const res = await request(app)
      .get("/api/submissions")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

//
// ─── UNIT tests - Model Validations ───────────────────────────────────────────
//
describe("🔧 Unit tests - User & Quiz model basics", () => {
  beforeEach(async () => {
    await clearDB();
  });

  test("User model hashes password before save", async () => {
    const user = new User({
      username: "u1",
      email: "u1@example.com",
      password: "Secret123!",
      role: "student"
    });
    await user.save();
    expect(user.password).not.toBe("Secret123!");
  });

  test("User.matchPassword returns true for correct password", async () => {
    const user = new User({
      username: "u2",
      email: "u2@example.com",
      password: "MyPass!23",
      role: "student"
    });
    await user.save();
    const ok = await user.matchPassword("MyPass!23");
    expect(ok).toBe(true);
  });

  test("Quiz question validation fails if fewer than 2 options", async () => {
    const quiz = new Quiz({
      video: new mongoose.Types.ObjectId(),
      questions: [
        { prompt: "Q?", options: [{ text: "only one" }] }
      ]
    });
    let err = null;
    try { await quiz.validate(); } catch (e) { err = e; }
    expect(err).toBeDefined();
  });

  test("Quiz question validation fails without exactly one correct", async () => {
    const quiz = new Quiz({
      video: new mongoose.Types.ObjectId(),
      questions: [
        {
          prompt: "Q?",
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false }
          ]
        }
      ]
    });
    let err = null;
    try { await quiz.validate(); } catch (e) { err = e; }
    expect(err).toBeDefined();
  });
});