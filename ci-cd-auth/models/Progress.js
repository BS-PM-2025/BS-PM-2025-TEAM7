// models/Progress.js
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  percentage: { type: Number, required: true }, // 0 to 100
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
