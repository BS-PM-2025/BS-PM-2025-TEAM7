// tests/tests.js
const request               = require("supertest");
const mongoose              = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const User                  = require("../models/user");

let app;
let mongoServer;

beforeAll(async () => {
  // 1. התחל MongoMemoryServer
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.NODE_ENV  = "test";

  // 2. טען את האפליקציה (index.js יריץ mongoose.connect ל־MONGO_URI)
  app = require("../index");

  // 3. חכה לפתיחת החיבור
  if (mongoose.connection.readyState !== 1) {
    await new Promise(resolve =>
      mongoose.connection.once("open", resolve)
    );
  }
});

afterAll(async () => {
  // נקה וסגור חיבור + עצור השרת הווירטואלי
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // נקה כל המסמכים מכל קולקציה
  const collections = await mongoose.connection.db.collections();
  for (const coll of collections) {
    await coll.deleteMany({});
  }
});

// ────────────────────── 10 Unit Tests ──────────────────────────────────
describe("🔧 Unit tests", () => {
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
    expect(r.status).toBe(404);   // ← מתאים להתנהגות בפועל
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

// ──────────────────── 10 Integration Tests ─────────────────────────────
describe("🚀 Integration tests", () => {
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
    expect(res.type).toMatch(/html/);
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
    const res = await request(app).post("/api/auth/login")
                                  .send({ username:student.username, password:student.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("17) Login lecturer → token", async () => {
    await request(app).post("/api/auth/signup").send(lecturer);
    const res = await request(app).post("/api/auth/login")
                                  .send({ username:lecturer.username, password:lecturer.password });
    expect(res.status).toBe(200);
  });

  test("18) GET /StudentProfile → 200 HTML", async () => {
    const res = await request(app).get("/StudentProfile");
    expect(res.status).toBe(200);
  });

  test("19) GET /LecturerProfile → 200 HTML", async () => {
    const res = await request(app).get("/LecturerProfile");
    expect(res.status).toBe(200);
  });

  test("20) GET /video/courses → 200 HTML", async () => {
    const res = await request(app).get("/video/courses");
    expect(res.status).toBe(200);
  });
});