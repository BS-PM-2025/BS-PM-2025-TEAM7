const Course = require("../models/Course");

exports.listCourses = async (req, res) => {
  const courses = await Course.find();
  res.status(200).json({ courses });
};

exports.addCourse = async (req, res) => {
  const { courseName, description, imageUrl } = req.body;
  if (!courseName || !description || !imageUrl) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const course = new Course({ courseName, description, imageUrl });
  await course.save();
  res.status(201).json({ message: "Course added." });
};

exports.deleteCourse = async (req, res) => {
  const { id } = req.params;
  const deleted = await Course.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: "Course not found." });
  res.status(200).json({ message: "Course deleted." });
};