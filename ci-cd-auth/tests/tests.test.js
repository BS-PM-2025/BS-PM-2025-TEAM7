// tests/tests.js
const request  = require("supertest");
const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");

const MONGO_TEST_URL = "mongodb://127.0.0.1:27017/ci_cd_learning_test";
const JWT_SECRET     = "your_secret_key";

const app  = require("../index");
const User = require("../models/user");

// --- DB Setup/Cleanup ---
beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URL);
});
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await User.deleteMany({});
});



// ─── 10 Unit Tests ────────────────────────────────────────────────────────────
describe("🔧 Unit tests", () => {
  test("1) model: hashes password before saving", async () => {
    const u = new User({username:"u1",email:"u1@e.com",password:"P1",role:"student"});
    await u.save();
    expect(u.password).not.toBe("P1");
  });

  test("2) model: matchPassword true for correct", async () => {
    const u = new User({username:"u2",email:"u2@e.com",password:"P2",role:"student"});
    await u.save();
    expect(await u.matchPassword("P2")).toBe(true);
  });

  test("3) model: matchPassword false for wrong", async () => {
    const u = new User({username:"u3",email:"u3@e.com",password:"P3",role:"student"});
    await u.save();
    expect(await u.matchPassword("X")).toBe(false);
  });

  test("4) signup missing fields → 400 + JSON message", async () => {
    const res = await request(app).post("/signup").send({username:"a"});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/All fields are required/i);
  });

  test("5) signup password mismatch → 400 + JSON message", async () => {
    const res = await request(app)
      .post("/signup")
      .type("form")
      .send({username:"a",email:"a@e","password":"1","confirmPassword":"2",role:"student"});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Passwords do not match/i);
  });

  test("6) signup duplicate → 400 + JSON message", async () => {
    await new User({username:"a",email:"a@e",password:"1",role:"student"}).save();
    const res = await request(app)
      .post("/signup")
      .type("form")
      .send({username:"a",email:"a@e","password":"1","confirmPassword":"1",role:"student"});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test("7) login missing fields → 400", async () => {
    const res = await request(app).post("/login").send({username:"x"});
    expect(res.status).toBe(400);
  });

  test("8) login user not found → 404", async () => {
    const res = await request(app).post("/login").send({username:"x",password:"x"});
    expect(res.status).toBe(404);
  });

  test("9) login wrong password → 401", async () => {
    await new User({username:"u",email:"u@e",password:"p",role:"student"}).save();
    const res = await request(app).post("/login").send({username:"u",password:"bad"});
    expect(res.status).toBe(401);
  });

  test("10) logout route returns 200 + JSON", async () => {
    const res = await request(app).post("/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Logged out/i);
  });
});



// ─── 10 Integration Tests ─────────────────────────────────────────────────────
describe("🚀 Integration tests", () => {
  const student = {
    username: "stud1",
    email: "stud1@example.com",
    password: "Stud!",
    confirmPassword: "Stud!",
    role: "student",
  };
  const lecturer = {
    username: "lect1",
    email: "lect1@example.com",
    password: "Lect!",
    confirmPassword: "Lect!",
    role: "lecturer",
  };

  test("11) GET / → 200 HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
  });

  test("12) GET /signup → 200 HTML", async () => {
    const res = await request(app).get("/signup");
    expect(res.status).toBe(200);
  });

  test("13) GET /login → 200 HTML", async () => {
    const res = await request(app).get("/login");
    expect(res.status).toBe(200);
  });

  test("14) Sign-up Student → redirect /login", async () => {
    const res = await request(app).post("/signup").type("form").send(student);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  test("15) Sign-up Lecturer → redirect /login", async () => {
    const res = await request(app).post("/signup").type("form").send(lecturer);
    expect(res.status).toBe(302);
  });

  test("16) Login-Student returns token", async () => {
    await request(app).post("/signup").type("form").send(student);
    const res = await request(app).post("/login")
      .send({username:student.username,password:student.password});
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("17) Login-Lecturer returns token", async () => {
    await request(app).post("/signup").type("form").send(lecturer);
    const res = await request(app).post("/login")
      .send({username:lecturer.username,password:lecturer.password});
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

  test("20) GET /HomePage → 200 HTML", async () => {
    const res = await request(app).get("/HomePage");
    expect(res.status).toBe(200);
  });
});
