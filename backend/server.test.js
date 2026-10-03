import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildFallbackExplanation,
  generateExplanation,
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

test("fallback explanation is produced for a selected text", () => {
  const message = buildFallbackExplanation(
    "Photosynthesis is the method plants use to turn sunlight into energy.",
  );
  assert.match(message, /Photosynthesis/i);
  assert.ok(message.length > 80);
  assert.match(message, /main idea|simple/i);
});

test("quota exhaustion returns a fallback explanation without retrying", async () => {
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

  const answer = await generateExplanation(
    "Plants convert sunlight into energy.",
    client,
  );

  assert.match(answer, /Plants convert sunlight into energy/i);
  assert.equal(calls, 1);
});
