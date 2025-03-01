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

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HUGGINGFACE_API_KEY) {
    console.error("❌ Missing Hugging Face API Key! Make sure you have a .env file with HUGGINGFACE_API_KEY.");
    process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());

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

app.post("/generate-resume", async (req, res) => {
    const formData = req.body;
    console.log("📥 Received Resume Data:", formData);

    if (!formData.name || !formData.email || !formData.education || !formData.skills) {
        return res.status(400).json({ error: "Missing required fields!" });
    }

    const resumeText = `${formData.name} is skilled in ${formData.skills.join(", ")}. Their education includes ${formData.education}.`;
    const summary = await generateSummary(resumeText);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const fileName = `resume_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, "resumes", fileName);

    if (!fs.existsSync("resumes")) fs.mkdirSync("resumes");
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // **Header - Large Name Display**
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#000").text(formData.name, { align: "center" });
    doc.moveDown(0.5);
    doc.lineWidth(1.5).strokeColor("#000").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.8);

    // **Contact Details (Clickable Links - Fixed Formatting)**
    doc.font("Helvetica-Bold").fontSize(14).text("Contact Information", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("blue").text(`Email: ${formData.email}`, { link: `mailto:${formData.email}`, underline: true });
    doc.fillColor("blue");
    if (formData.github) doc.text(`GitHub: ${formData.github}`, { link: formData.github, underline: true });
    if (formData.linkedin) doc.text(`LinkedIn: ${formData.linkedin}`, { link: formData.linkedin, underline: true });
    doc.fillColor("#000"); // Reset text color to normal
    doc.moveDown(0.8);

    // **Education (Formatted Compactly)**
    doc.font("Helvetica-Bold").fontSize(14).text("Education", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).fillColor("#000").text(formData.education);
    doc.moveDown(0.8);

    // **Experience (Formatted Compactly)**
    if (formData.experience) {
        doc.font("Helvetica-Bold").fontSize(14).text("Experience", { underline: true });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(11).text(formData.experience);
        doc.moveDown(0.8);
    }

    // **Skills**
    doc.font("Helvetica-Bold").fontSize(14).text("Skills", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).text(formData.skills.join(", "));
    doc.moveDown(0.8);

    // **AI-Generated Summary**
    doc.font("Helvetica-Bold").fontSize(14).text("AI-Generated Summary", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).text(summary);
    doc.moveDown(0.8);

    doc.end();

    stream.on("finish", () => {
        res.download(filePath, fileName, (err) => {
            if (err) console.error("❌ Error sending file:", err);
            fs.unlinkSync(filePath);
        });
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
