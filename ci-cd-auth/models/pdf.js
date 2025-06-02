// models/pdf.js
const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  uploadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PDF", pdfSchema);
