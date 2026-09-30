import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

const PORT = 3000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(express.json());

// ========================================
// GEMINI CLIENT
// ========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ========================================
// TEST ROUTE
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "AI Learning Extension backend is running!",
  });
});

// ========================================
// EXPLAIN ROUTE
// ========================================

app.post("/api/explain", async (req, res) => {
  try {
    const { selectedText } = req.body;

    // -------------------------------
    // Validate input
    // -------------------------------

    if (!selectedText || typeof selectedText !== "string") {
      return res.status(400).json({
        error: "selectedText is required",
      });
    }

    console.log("Received:", selectedText);

    // -------------------------------
    // Prompt
    // -------------------------------

    const prompt = `
You are an educational AI assistant.

The student selected this text:

"${selectedText}"

Explain the selected concept for a college student.

Return the answer in these sections:

1. Simple Definition
2. Example
3. Real-world Use
4. How It Works
5. Applications

Keep the explanation clear and technically accurate.

Do not assume the student already understands advanced concepts.
`;

    // -------------------------------
    // Gemini request
    // -------------------------------

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",

      contents: prompt,
    });

    const answer = response.text;

    console.log("Gemini response received.");

    // -------------------------------
    // Send response
    // -------------------------------

    res.json({
      selectedText,

      answer,
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Failed to generate AI explanation.",
    });
  }
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
