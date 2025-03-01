require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = 5000;

// Load Hugging Face API Key from .env file
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HUGGINGFACE_API_KEY) {
    console.error("❌ Missing Hugging Face API Key! Make sure you have a .env file with HUGGINGFACE_API_KEY.");
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// AI-enhanced Resume Summary using Hugging Face
async function generateSummary(text) {
    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            { inputs: text },
            {
                headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` }
            }
        );
        return response.data[0].summary_text;
    } catch (error) {
        console.error("❌ Error calling Hugging Face API:", error);
        return "Summary generation failed.";
    }
}

// Handle form submission and generate a PDF
app.post("/generate-resume", async (req, res) => {
    const formData = req.body;
    console.log("📥 Received Resume Data:", formData);

    // Validate required fields
    if (!formData.name || !formData.email || !formData.education || !formData.skills) {
        return res.status(400).json({ error: "Missing required fields!" });
    }

    // Generate AI-enhanced resume summary
    const resumeText = `${formData.name} is a skilled professional with expertise in ${formData.skills.join(", ")}. Their education background includes ${formData.education}.`;
    const summary = await generateSummary(resumeText);

    // Generate a PDF document
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `resume_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, "resumes", fileName);

    // Ensure the "resumes" folder exists
    if (!fs.existsSync("resumes")) {
        fs.mkdirSync("resumes");
    }

    // Pipe the PDF to a file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // **Header - SmartResume Title**
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#0056b3").text("SmartResume", { align: "center" });
    doc.moveDown(1);
    doc.lineWidth(2).strokeColor("#0056b3").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // **Personal Information**
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("Personal Information", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).fillColor("#444").text(`👤 Name: ${formData.name}`);
    doc.text(`📧 Email: ${formData.email}`);
    doc.moveDown(1);

    // **Education**
    doc.lineWidth(1).strokeColor("#ddd").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("🎓 Education", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).fillColor("#444").text(formData.education);
    doc.moveDown(1);

    // **Experience (if available)**
    if (formData.experience) {
        doc.lineWidth(1).strokeColor("#ddd").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("💼 Experience", { underline: true });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(14).fillColor("#444").text(formData.experience);
        doc.moveDown(1);
    }

    // **Skills**
    doc.lineWidth(1).strokeColor("#ddd").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("🛠 Skills", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).fillColor("#444").text(formData.skills.join(", "));
    doc.moveDown(1);

    // **AI-Generated Summary**
    doc.lineWidth(1).strokeColor("#ddd").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("📄 AI-Generated Summary", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).fillColor("#444").text(summary);
    doc.moveDown(1);

    // **Links (GitHub & LinkedIn)**
    if (formData.github || formData.linkedin) {
        doc.lineWidth(1).strokeColor("#ddd").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#222").text("🔗 Links", { underline: true });
        doc.moveDown(0.5);
        if (formData.github) {
            doc.font("Helvetica").fillColor("blue").text(`GitHub: ${formData.github}`, { link: formData.github, underline: true });
        }
        if (formData.linkedin) {
            doc.moveDown(0.5);
            doc.font("Helvetica").fillColor("blue").text(`LinkedIn: ${formData.linkedin}`, { link: formData.linkedin, underline: true });
        }
        doc.moveDown(1);
    }

    // Finalize the document
    doc.end();

    // Wait for the file to be saved, then send it as a response
    stream.on("finish", () => {
        res.download(filePath, fileName, (err) => {
            if (err) console.error("❌ Error sending file:", err);
            // Cleanup: Delete the file after sending
            fs.unlinkSync(filePath);
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
