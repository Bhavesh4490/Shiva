const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");
const multer = require("multer");
// FIX 1: Correct the import to match what you actually call later
const pdfParse = require("pdf-parse"); 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage()
});

let uploadedPDFText = "";
let pdfName = "";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.get("/", (req, res) => {
    res.send("Shiva AI Server Running ✅");
});

// FIX 2: Explicitly include /api in your routes so Vercel routing matches
app.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No PDF received" });
        }

        // This will now work because pdfParse is properly imported
        const data = await pdfParse(req.file.buffer); 
        uploadedPDFText = data.text;
        pdfName = req.file.originalname;

        console.log("PDF Loaded:", pdfName, "Characters:", uploadedPDFText.length);

        res.json({
            message: `PDF "${pdfName}" uploaded. You can ask questions about it.`,
            pages: data.numpages
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "PDF processing failed" });
    }
});

// FIX 2: Explicitly include /api in your routes
app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message;

        // FIX 3: Move these logs INSIDE the try block where `message` is actually defined!
        console.log("PDF characters available:", uploadedPDFText.length);
        console.log("Question:", message);

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are Shiva AI.\n\nAnswer like ChatGPT:\n- Use headings\n- Use bullet points\n- Give examples\n- Keep answers interactive\n- Use markdown formatting"
                },
                {
                    role: "user",
                    content: `You are Shiva AI, owner assistant of BOOKStore.\n\nAnswer according to:\n1. Uploaded PDF knowledge\n2. BOOKStore database\n3. General knowledge\n\nIf information exists in PDF, prioritize it.\n\nPDF CONTENT:\n\n${uploadedPDFText ? uploadedPDFText : "No PDF uploaded"}\n\nUSER QUESTION:\n\n${message}\n\nRules:\n- Use headings\n- Use bullet points\n- Give examples\n- Be friendly\n- Answer like BOOKStore owner when questions are about books/courses.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            stream: true
        });

        res.setHeader("Content-Type", "text/plain; charset=utf-8");

        for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || "";
            res.write(text);
        }
        res.end();
    } catch (error) {
        console.log(error);
        res.status(500).end("AI Error: " + error.message);
    }
});

module.exports = app;
