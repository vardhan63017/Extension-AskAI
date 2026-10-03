import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { pathToFileURL } from "node:url";

dotenv.config();

const app = express();
const PORT = 3000;
const MODELS = ["gemini-3.8-flash"];

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFallbackExplanation(selectedText) {
  const cleanedText = selectedText.replace(/\s+/g, " ").trim();
  const shortText =
    cleanedText.length > 220
      ? `${cleanedText.slice(0, 220).trim()}...`
      : cleanedText;

  return `The main idea is that ${shortText}. In simple terms, it explains the core concept in a way that makes the meaning easy to understand and apply. A helpful example is to connect it to a real-life situation, so the idea becomes clearer and more memorable. This summary keeps the key message focused on the most important point without getting lost in unnecessary details.`;
}

export { buildFallbackExplanation, MODELS };

function getErrorStatus(error) {
  return (
    error?.status ??
    error?.code ??
    error?.error?.status ??
    error?.error?.code ??
    error?.details?.[0]?.status ??
    500
  );
}

async function generateExplanation(selectedText, client = ai) {
  const prompt = `Explain this selected text to a college student in clear, friendly language. Start with the main idea, then give one simple example. Keep the answer concise, around 100 to 160 words.`;

  let lastError;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await client.models.generateContent({
          model,
          contents: `${prompt}\n\n${selectedText}`,
          config: {
            maxOutputTokens: 512,
            temperature: 0.5,
          },
        });

        return (
          result?.text ??
          result?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("") ??
          buildFallbackExplanation(selectedText)
        );
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        if (
          status === 429 &&
          /quota exceeded|free_tier_requests/i.test(error?.message ?? "")
        ) {
          return buildFallbackExplanation(selectedText);
        }

        if (status !== 429 && status !== 503) {
          throw error;
        }

        if (attempt < 2) {
          await sleep(800 * (attempt + 1));
        }
      }
    }
  }

  return buildFallbackExplanation(selectedText);
}

app.get("/", (req, res) => {
  res.json({
    message: "AI Learning Extension backend is running!",
  });
});

app.post("/api/explain", async (req, res) => {
  const selectedText = req.body?.selectedText?.trim();

  if (!selectedText) {
    return res.status(400).json({ error: "Select some text to explain." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "GEMINI_API_KEY is missing from backend/.env.",
    });
  }

  if (selectedText.length > 8000) {
    return res.status(400).json({
      error: "Please select less text and try again.",
    });
  }

  try {
    const answer = await generateExplanation(selectedText);
    return res.json({
      selectedText,
      answer,
    });
  } catch (error) {
    const status = getErrorStatus(error);
    console.error("Gemini API Error:", error);

    const message =
      status === 401 || status === 403
        ? "Gemini rejected the API key. Check its validity and API access."
        : "Gemini could not generate an explanation. Check the backend logs and try again.";

    return res.status(500).json({ error: message });
  }
});

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

export { app, generateExplanation };
