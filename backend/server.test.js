import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EXPLANATION_SCHEMA,
  generateExplanation,
  getPublicErrorMessage,
  MODELS,
} from "./server.js";

const root = new URL("..", import.meta.url);
const manifestPath = new URL("manifest.json", root);
const packagePath = new URL("backend/package.json", root);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const contentScript = fs.readFileSync(new URL("content.js", root), "utf8");
const backgroundScript = fs.readFileSync(
  new URL("background.js", root),
  "utf8",
);

test("extension has localhost access permission", () => {
  assert.ok(Array.isArray(manifest.host_permissions));
  assert.ok(manifest.host_permissions.includes("http://localhost:3000/*"));
  assert.equal(manifest.background?.service_worker, "background.js");
  assert.match(contentScript, /chrome\.runtime\s*\.\s*sendMessage/);
  assert.doesNotMatch(contentScript, /fetch\s*\(/);
  assert.match(backgroundScript, /chrome\.runtime\.onMessage/);
  assert.match(backgroundScript, /fetch\(BACKEND_URL/);
});

test("backend package points to the actual server entry", () => {
  assert.equal(pkg.main, "server.js");
});

test("backend uses a supported Gemini model list", () => {
  assert.deepEqual(MODELS, ["gemini-3.8-flash", "gemini-3.7-flash"]);
});

test("Gemini uses a schema-constrained JSON response", async () => {
  const expected = {
    definition: "World means the Earth or all people and places.",
    example: "Earth is one world.",
    realWorldExample: "People around the world share the same planet.",
    howItWorks: [],
    applications: [],
    advantages: [],
    limitations: [],
    deepDive: "The word can refer to the planet or human society.",
  };
  let request;
  const client = {
    models: {
      async generateContent(options) {
        request = options;
        return { text: JSON.stringify(expected) };
      },
    },
  };

  const answer = await generateExplanation("world", client);

  assert.deepEqual(answer, expected);
  assert.equal(request.config.responseMimeType, "application/json");
  assert.equal(request.config.maxOutputTokens, 1024);
  assert.deepEqual(request.config.responseSchema, EXPLANATION_SCHEMA);
  assert.deepEqual(EXPLANATION_SCHEMA.required, [
    "definition",
    "example",
    "realWorldExample",
    "howItWorks",
    "applications",
    "advantages",
    "limitations",
    "deepDive",
  ]);
  assert.match(request.contents, /world/);
  assert.deepEqual(Object.keys(answer), EXPLANATION_SCHEMA.required);
});

test("invalid structured output is retried", async () => {
  const expected = {
    definition: "Plants use sunlight to make food.",
    example: "A leaf uses sunlight to make sugar.",
    realWorldExample: "Crops grow by using sunlight, water, and air.",
    howItWorks: ["Step one.", "Step two.", "Step three.", "Step four."],
    applications: ["Growing food."],
    advantages: ["It stores energy."],
    limitations: ["It depends on light."],
    deepDive: "The process stores energy in chemical bonds.",
  };
  let calls = 0;
  const client = {
    models: {
      async generateContent() {
        calls += 1;
        return {
          text: calls === 1 ? "not JSON" : JSON.stringify(expected),
        };
      },
    },
  };

  assert.deepEqual(
    await generateExplanation("Photosynthesis", client),
    expected,
  );
  assert.equal(calls, 2);
});

test("panel renders explanation headings in the requested order", () => {
  const headings = [
    "📌 Selected",
    "📖 Simple Definition",
    "💡 Example",
    "🌍 Real-World Example",
    "⚙️ How It Works",
    "📱 Applications",
    "⭐ Advantages",
    "⚠️ Limitations",
    "🔍 Deep Dive",
  ];
  let previousIndex = -1;

  for (const heading of headings) {
    const index = contentScript.indexOf(heading);
    assert.ok(
      index > previousIndex,
      `${heading} should follow the previous heading`,
    );
    previousIndex = index;
  }
});

test("quota exhaustion does not produce fabricated fallback content", async () => {
  let calls = 0;
  const client = {
    models: {
      async generateContent() {
        calls += 1;
        throw Object.assign(
          new Error("Quota exceeded for generate_content_free_tier_requests"),
          { status: 429 },
        );
      },
    },
  };

  await assert.rejects(
    generateExplanation("Plants convert sunlight into energy.", client),
    /Quota exceeded/,
  );
  assert.equal(calls, 1);
});

test("quota failures return a clear user-facing message without API details", () => {
  const message = getPublicErrorMessage(
    Object.assign(new Error("private provider details"), { status: 429 }),
  );

  assert.match(message, /daily usage limit/i);
  assert.doesNotMatch(message, /private provider details|API key/i);
});

test("temporary provider outages return a clear user-facing message", () => {
  const message = getPublicErrorMessage(
    Object.assign(new Error("temporary provider details"), { status: 503 }),
  );

  assert.match(message, /temporarily busy/i);
  assert.doesNotMatch(message, /temporary provider details|API key/i);
});
