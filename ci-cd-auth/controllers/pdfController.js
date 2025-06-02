const PDF = require("../models/pdf");
const fs = require("fs");
const path = require("path");

// POST /api/pdfs/upload
exports.uploadPDF = async (req, res) => {
  const { title, courseId } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send("No PDF file uploaded.");
  }

  const pdf = new PDF({
    title,
    filename: file.filename,
    courseId,
    uploadDate: new Date(),
  });

  try {
    await pdf.save();
    res.status(200).json({ success: true, pdf });
  } catch (err) {
    console.error("Error saving PDF:", err);
    res.status(500).send("Failed to save PDF.");
  }
};

// GET /api/pdfs/course/:courseId
exports.getPDFsByCourse = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const pdfs = await PDF.find({ courseId }).sort({ uploadDate: -1 });
    res.json(pdfs);
  } catch (error) {
    console.error("Error retrieving PDFs:", error);
    res.status(500).json({ message: "Error retrieving PDFs" });
  }
};

// DELETE /api/pdfs/:id
exports.deletePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const pdf = await PDF.findById(id);
    if (!pdf) return res.status(404).json({ message: "PDF not found" });

    // Delete PDF file
    const filePath = path.join(__dirname, "..", "public", "uploads", pdf.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the PDF document
    await pdf.deleteOne();

    res.json({ message: "PDF deleted successfully" });
  } catch (err) {
    console.error("Error deleting PDF:", err);
    res.status(500).json({ message: "Failed to delete PDF" });
  }
};
