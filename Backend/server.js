import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import LanguageTool from "languagetool-api";
import { dirname } from "path";
import { fileURLToPath } from "url";
import students from "./stud.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const UPLOAD_FOLDER = path.join(__dirname, "uploads");
const REPORTS_FOLDER = path.join(__dirname, "reports");




fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
fs.mkdirSync(REPORTS_FOLDER, { recursive: true });

//app.use("/reports", express.static(REPORTS_FOLDER));

const upload = multer({ dest: UPLOAD_FOLDER });


async function analyzeEssay(essayText, filename) {
  try {
    // Proper API Request to LanguageTool
    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text: essayText,
        language: "en-US", // Change language if needed
      }),
    });

    const data = await response.json(); // Convert response to JSON

    if (!data.matches) {
      throw new Error("Invalid response from LanguageTool API");
    }

    // Extract feedback messages
    const aiFeedback = data.matches.length > 0
      ? data.matches.map(match => match.message).join("\n")
      : "No feedback available";

    console.log("LanguageTool API Response:", data);

    // Readability Score (Placeholder)
    const readabilityScore = Math.random() * 100;

    // Sentence Count
    const numSentences = essayText.split(".").length;

    // Compute Final Score (Simple penalty logic)
    const finalScore = Math.max(100 - numSentences, 60);

    // Generate PDF Report
    const pdfFilename = generatePDFReport(
      filename, readabilityScore, numSentences, aiFeedback, finalScore
    );

    return {
      readabilityScore,
      totalSentences: numSentences,
      aiFeedback,
      finalScore,
      pdfReport: `/reports/${pdfFilename}`,
    };
  } catch (error) {
    console.error("Error analyzing essay:", error);
    return { error: "Failed to analyze essay" };
  }
}

function generatePDFReport(filename, readability, sentences, feedback, score) {
  const pdfFilename = filename.replace(".txt", ".pdf");
  const pdfPath = path.join(REPORTS_FOLDER, pdfFilename);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(14).text(`Essay Report: ${filename}`);
  doc.text(`Readability Score: ${readability}`);
  doc.text(`Total Sentences: ${sentences}`);
  doc.text(`Final Score: ${score}`);
  doc.text("Feedback:");
  doc.text(feedback);
  doc.end();

  return pdfFilename;
}








app.post("/uploads", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = path.join(UPLOAD_FOLDER, req.file.filename);
  const essayText = fs.readFileSync(filePath, "utf-8");

  const result = await analyzeEssay(essayText, req.file.originalname);
  res.json(result);
});






app.get("/download/:filename", (req, res) => {
  const filePath = path.join(REPORTS_FOLDER, req.params.filename);
  res.download(filePath);
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/stud.html");
});


//app.use("/reports", express.static(REPORTS_FOLDER));

app.use(express.static("public"));
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");  
}

app.get("/teacher", (req, res) => {
  res.redirect("/teacher.html");
});

app.get("/3.3teacher/uploads", (req, res) => {
  const uploadsFile = "uploads.json"
  if (!fs.existsSync(uploadsFile)) {
      return res.status(404).json({ error: "No uploads found" });
  }

  try {
      const uploads = JSON.parse(fs.readFileSync(uploadsFile));
      uploads.forEach(upload => {
        if (!upload.fileUrl) {
            upload.fileUrl = `http://localhost:${PORT}/uploads/${encodeURIComponent(upload.filename)}`;
        }
    });

      res.json(uploads);
  } catch (error) {
      console.error("Error reading uploads file:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${cleanFilename}`);
  },
});
const uploadAssignment = multer({ storage: storage });

const uploadsFile = "uploads.json";

app.post("/login", (req, res) => {
    console.log("Login request received:", req.body);

    const { name, studentID } = req.body;
    if (!name || !studentID) {
        return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const student = students.find(
        (s) => s.name.toLowerCase() === name.toLowerCase() && s.studentID === studentID
    );

    if (student) {
        res.json({ success: true, message: "Login successful!", student });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/upload", uploadAssignment.single("assignment"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { studentID, name } = req.body;
    const timestamp = new Date().toLocaleString();
    const fileUrl = `http://localhost:${PORT}/uploads/${encodeURIComponent(req.file.filename)}`;
    
    let uploads = [];
    if (fs.existsSync(uploadsFile)) {
        uploads = JSON.parse(fs.readFileSync(uploadsFile));
    }

    const newUpload = {
        studentID,
        name,
        filename: req.file.filename,
        originalName: req.file.originalname,
        timestamp,
        fileUrl 
    };
    uploads.push(newUpload);
    fs.writeFileSync(uploadsFile, JSON.stringify(uploads, null, 2));

    res.json({ success: true, message: "File uploaded successfully!", upload: newUpload });
});

app.post("/uploads", (req, res) => {
  res.status(200).json({ message: "POST request received at /" });
});
app.get("/reports/:filename", (req, res) => {
  const filePath = path.join(REPORTS_FOLDER, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Report not found");
  }

  res.sendFile(filePath);
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));











