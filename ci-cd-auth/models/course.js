const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true // This ensures 'courseName' is a required field
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  }
});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
