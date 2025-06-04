//models/Certificate.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  examAttempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExamAttempt",
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  }
});

// Index to efficiently query certificates by student
certificateSchema.index({ student: 1 });

// Generate a unique certificate ID before saving
certificateSchema.pre("save", function(next) {
  if (!this.certificateId) {
    // Generate a unique certificate ID using timestamp and random bytes
    const timestamp = new Date().getTime().toString(16);
    const randomBytes = crypto.randomBytes(8).toString("hex");
    this.certificateId = `CERT-${timestamp}-${randomBytes}`.toUpperCase();
  }
  next();
});

const Certificate = mongoose.model("Certificate", certificateSchema);
module.exports = Certificate;
