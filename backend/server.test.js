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

test("extension has localhost access permission", () => {
  assert.ok(Array.isArray(manifest.host_permissions));
  assert.ok(manifest.host_permissions.includes("http://localhost:3000/*"));
});

test("backend package points to the actual server entry", () => {
  assert.equal(pkg.main, "server.js");
});

test("backend uses a supported Gemini model list", () => {
  assert.deepEqual(MODELS, ["gemini-3.8-flash"]);
});

test("Gemini uses a schema-constrained JSON response", async () => {
  const expected = {
    definition: "World means the Earth or all people and places.",
    examples: ["Earth is one world."],
    realWorldApplications: [],
    howItWorks: [],
    advantages: [],
    disadvantages: [],
    deepDive: [],
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
  assert.deepEqual(request.config.responseSchema, EXPLANATION_SCHEMA);
  assert.match(request.contents, /world/);
  assert.deepEqual(Object.keys(answer), EXPLANATION_SCHEMA.required);
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
