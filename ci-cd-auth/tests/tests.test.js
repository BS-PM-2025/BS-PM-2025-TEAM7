// tests/test.js
const request               = require("supertest");
const mongoose              = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");

const User             = require("../models/user");
const Video            = require("../models/video");
const Course           = require("../models/course");
const Feedback         = require("../models/FeedBack");
const Progress         = require("../models/Progress");
const Quiz             = require("../models/Quiz");
const QuizSubmission   = require("../models/QuizSubmission");

let app;
let mongoServer;
const jwt = require("jsonwebtoken");

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
  process.env.JWT_SECRET = "testsecret"; 
  process.env.GITHUB_CLIENT_ID     = "dummy";
process.env.GITHUB_CLIENT_SECRET = "dummy";
process.env.GITHUB_CALLBACK_URL  = "http://localhost/callback";
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

// ───────────── Sprint 1 Unit ─────────────
describe("🔧 Unit tests - Sprint 1", () => {
  beforeEach(async () => { await clearDB(); });

  test("1) model hashes password before save", async () => {
    const u = new User({ username:"u1", email:"u1@e.com", password:"P1", role:"student" });
    await u.save();
    expect(u.password).not.toBe("P1");
  });
  test("2) matchPassword → true", async () => {
    const u = new User({ username:"u2", email:"u2@e.com", password:"P2", role:"student" });
    await u.save();
    expect(await u.matchPassword("P2")).toBe(true);
  });
  test("3) matchPassword → false", async () => {
    const u = new User({ username:"u3", email:"u3@e.com", password:"P3", role:"student" });
    await u.save();
    expect(await u.matchPassword("X")).toBe(false);
  });
  test("4) signup missing fields → 400", async () => {
    const res = await request(app).post("/api/auth/signup").send({ username:"a" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/All fields are required/i);
  });
  test("5) signup password mismatch → 400", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username:"a", email:"a@e", password:"1", confirmPassword:"2", role:"student" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Passwords do not match/i);
  });
  test("6) signup duplicate → 400", async () => {
    await new User({ username:"a", email:"a@e", password:"1", role:"student" }).save();
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username:"a", email:"a@e", password:"1", confirmPassword:"1", role:"student" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });
  test("7) login missing fields → 404", async () => {
    const r = await request(app).post("/api/auth/login").send({ username:"x" });
    expect(r.status).toBe(404);
  });
  test("8) login user not found → 404", async () => {
    const res = await request(app).post("/api/auth/login").send({ username:"x", password:"x" });
    expect(res.status).toBe(404);
  });
  test("9) login wrong password → 401", async () => {
    await new User({ username:"u", email:"u@e", password:"p", role:"student" }).save();
    const res = await request(app).post("/api/auth/login").send({ username:"u", password:"bad" });
    expect(res.status).toBe(401);
  });
  test("10) logout returns 200 JSON", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Logged out/i);
  });
});

// ───────────── Sprint 1 Integration ─────────────
describe("🚀 Integration tests - Sprint 1", () => {
  beforeAll(async () => { await clearDB(); });

  const student  = { username:"stud1", email:"stud1@example.com", password:"Stud!", confirmPassword:"Stud!", role:"student" };
  const lecturer = { username:"lect1", email:"lect1@example.com", password:"Lect!", confirmPassword:"Lect!", role:"lecturer" };

  test("11) GET / → 200 HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
  });
  test("12) GET /signup page → 200 HTML", async () => {
    const res = await request(app).get("/signup");
    expect(res.status).toBe(200);
  });
  test("13) GET /login page → 200 HTML", async () => {
    const res = await request(app).get("/login");
    expect(res.status).toBe(200);
  });
  test("14) API signup (student) → 201 JSON", async () => {
    const res = await request(app).post("/api/auth/signup").send(student);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registered/i);
  });
  test("15) API signup (lecturer) → 201 JSON", async () => {
    const res = await request(app).post("/api/auth/signup").send(lecturer);
    expect(res.status).toBe(201);
  });
  test("16) Login student → token", async () => {
    await request(app).post("/api/auth/signup").send(student);
    const res = await request(app).post("/api/auth/login").send({ username:student.username, password:student.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
  test("17) Login lecturer → forbidden", async () => {
    await request(app).post("/api/auth/signup").send(lecturer);
    const res = await request(app).post("/api/auth/login").send({ username:lecturer.username, password:lecturer.password });
    expect(res.status).toBe(403);
  });
  test("18) GET /StudentProfile → 200 HTML", async () => {
    const res = await request(app).get("/StudentProfile"); expect(res.status).toBe(200);
  });
  test("19) GET /LecturerProfile → 200 HTML", async () => {
    const res = await request(app).get("/LecturerProfile"); expect(res.status).toBe(200);
  });
  test("20) GET /video/courses → 200 HTML", async () => {
    const res = await request(app).get("/video/courses"); expect(res.status).toBe(200);
  });
});

// ───────────── Sprint 2 Unit ─────────────
describe("🔧 Unit tests - Sprint 2", () => {
  beforeEach(async () => { await clearDB(); });

  test("1) Video model missing title → validation error", async () => {
    try { const v = new Video({ filename:"file.mp4" }); await v.validate(); } 
    catch (e) { expect(e.errors.title).toBeDefined(); }
  });
  test("2) Video model missing filename → validation error", async () => {
    try { const v = new Video({ title:"T" }); await v.validate(); }
    catch (e) { expect(e.errors.filename).toBeDefined(); }
  });
  test("3) Video model default uploadDate is Date", () => {
    const v = new Video({ title:"T", filename:"file.mp4" });
    expect(v.uploadDate).toBeInstanceOf(Date);
  });
  test("4) Course model missing courseName → validation error", async () => {
    try { const c = new Course({ description:"D" }); await c.validate(); }
    catch (e) { expect(e.errors.courseName).toBeDefined(); }
  });
  test("5) Course model missing description → validation error", async () => {
    try { const c = new Course({ courseName:"C" }); await c.validate(); }
    catch (e) { expect(e.errors.description).toBeDefined(); }
  });
  test("6) Course model optional imageUrl works", () => {
    const c = new Course({ courseName:"C", description:"D", imageUrl:"/img.png" });
    expect(c.imageUrl).toBe("/img.png");
  });
  test("7) Feedback default createdAt is Date", () => {
    const f = new Feedback({ username:"u", comment:"c", rating:3 });
    expect(f.createdAt).toBeInstanceOf(Date);
  });
  test("8) Progress model missing student → validation error", async () => {
    try { const p = new Progress({ quiz:new mongoose.Types.ObjectId(), percentage:50 }); await p.validate(); }
    catch (e) { expect(e.errors.student).toBeDefined(); }
  });
  test("9) Quiz default questions is []", () => {
    const q = new Quiz({ video:new mongoose.Types.ObjectId() });
    expect(Array.isArray(q.questions) && q.questions.length===0).toBe(true);
  });
  test("10) QuizSubmission missing quiz → validation error", async () => {
    try { const s = new QuizSubmission({ student:new mongoose.Types.ObjectId(), answers:[] }); await s.validate(); }
    catch (e) { expect(e.errors.quiz).toBeDefined(); }
  });
});

// ───────────── Sprint 2 Integration ─────────────
describe("🚀 Integration tests - Sprint 2", () => {
  beforeAll(async () => { await clearDB(); });

  const lecturer = { username:"l2", email:"l2@e.com", password:"L2p!", confirmPassword:"L2p!", role:"lecturer" };
  let lecturerToken, studentToken, videoId, feedbackId, studentId;

  test("1) Lecturer signup & token generation", async () => {
  // 1. Sign the lecturer up so they exist in the DB
  const signup = await request(app)
    .post("/api/auth/signup")
    .send(lecturer);
  expect(signup.status).toBe(201);

  // 2. Fetch the lecturer record to get _id & role
  const dbUser = await User.findOne({ username: lecturer.username });
  expect(dbUser).not.toBeNull();

  // 3. Manually sign a JWT for that lecturer
  lecturerToken = jwt.sign(
    { id: dbUser._id.toString(), username: dbUser.username, role: dbUser.role },
    process.env.JWT_SECRET,        // make sure you set this in beforeAll
    { expiresIn: "2h" }
  );
  expect(typeof lecturerToken).toBe("string");
});


  test("2) Upload video → 302 redirect + save", async () => {
    const res = await request(app)
     .post("/api/videos/upload")
     .set("Authorization", `Bearer ${lecturerToken}`)
     .field("title",   "TestVid")
     .field("section", "1")               // ← supply the section!
     .attach("video",  Buffer.from("data"), "test.mp4");
    expect(res.status).toBe(302);
    const doc = await Video.findOne({ title:"TestVid" });
    videoId = doc._id.toString(); expect(videoId).toBeDefined();
  });

  test("3) GET /api/videos/all → contains TestVid", async () => {
    const res = await request(app)
      .get("/api/videos/all")
      .set("Authorization", `Bearer ${lecturerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some(v => v.title==="TestVid")).toBe(true);
  });

  test("4) Save quiz → 200 message", async () => {
    const questions = [{ prompt:"Q1", options:[{text:"A",isCorrect:true},{text:"B"}] }];
    const res = await request(app)
      .post(`/api/videos/${videoId}/quiz`)
      .set("Authorization", `Bearer ${lecturerToken}`)
      .send({ questions });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Quiz saved/i);
  });

  test("5) GET quiz → 200 JSON", async () => {
    const res = await request(app)
    .get(`/api/videos/${videoId}/quiz`)
    .set("Authorization", `Bearer ${lecturerToken}`);    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  test("6) Student signup/login & submit feedback → 201", async () => {
    const student = { username:"s2", email:"s2@e.com", password:"S2p!", confirmPassword:"S2p!", role:"student" };
    await request(app).post("/api/auth/signup").send(student);
    const lr = await request(app).post("/api/auth/login").send({ username:student.username, password:student.password });
    studentToken = lr.body.token;
    const fbRes = await request(app)
      .post("/api/feedback/submit")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ comment:"Nice vid", rating:5 });
    expect(fbRes.status).toBe(201);
    feedbackId = fbRes.body._id;
  });

   test("7) GET non-existent video → 404", async () => {
    const fakeId = "000000000000000000000000"; 
    const res = await request(app)
      .get(`/api/videos/${fakeId}`)
      .set("Authorization", `Bearer ${lecturerToken}`);
    expect(res.status).toBe(404);
  });

  test("8) GET progress → empty array", async () => {
    studentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/progress/${studentId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) && res.body.length===0).toBe(true);
  });

  test("9) GET users → array", async () => {
       const res = await request(app)
      .get("/api/users/all")
      .set("Authorization", `Bearer ${lecturerToken}`);    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("10) Delete video → 200 JSON", async () => {
      const res = await request(app)
      .delete(`/api/videos/${videoId}`)
      .set("Authorization", `Bearer ${lecturerToken}`);    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});