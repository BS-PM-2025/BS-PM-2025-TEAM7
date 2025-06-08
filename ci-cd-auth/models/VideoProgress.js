// ci-cd-auth/models/VideoProgress.js
// ── This model tracks which student has “watched” which video.

const mongoose = require("mongoose");

const videoProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  video:   { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
  watched: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("VideoProgress", videoProgressSchema);
