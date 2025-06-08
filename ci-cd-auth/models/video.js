const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  // ← new field: which section (1..4) this video belongs to
  section: { type: Number, required: true, min: 1, max: 4 },
});

module.exports = mongoose.model("Video", videoSchema);
