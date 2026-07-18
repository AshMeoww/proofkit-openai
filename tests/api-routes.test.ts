import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/analyze/route";
import { GET } from "../app/api/sample-zip/route";
import { parseZipBytes } from "../lib/proofkit-core";

test("analyze route returns a setup error when OPENAI_API_KEY is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFallback = process.env.PROOFKIT_DISABLE_ENV_LOCAL_FALLBACK;
  delete process.env.OPENAI_API_KEY;
  process.env.PROOFKIT_DISABLE_ENV_LOCAL_FALLBACK = "1";

  try {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    const body = (await response.json()) as { error?: string; setup?: string };

    assert.equal(response.status, 500);
    assert.equal(body.error, "OPENAI_API_KEY is not configured.");
    assert.match(body.setup ?? "", /\.env\.local/);
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }

    if (originalFallback === undefined) {
      delete process.env.PROOFKIT_DISABLE_ENV_LOCAL_FALLBACK;
    } else {
      process.env.PROOFKIT_DISABLE_ENV_LOCAL_FALLBACK = originalFallback;
    }
  }
});

test("analyze route rejects invalid JSON before calling OpenAI", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test";

  try {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: "{not-json",
      }),
    );
    const body = (await response.json()) as { error?: string };

    assert.equal(response.status, 400);
    assert.equal(body.error, "Request body must be valid JSON.");
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("analyze route rejects missing project evidence before calling OpenAI", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test";

  try {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { projectName: "ProofKit" } }),
      }),
    );
    const body = (await response.json()) as { error?: string };

    assert.equal(response.status, 400);
    assert.equal(body.error, "Missing project metadata or repository evidence.");
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("analyze route returns a structured report from OpenAI", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "sk-test";

  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(input, "https://api.openai.com/v1/responses");
      assert.equal(init?.method, "POST");
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer sk-test");

      const requestBody = JSON.parse(String(init?.body)) as { model?: string };
      assert.equal(requestBody.model, "gpt-5.6");

      return Response.json({ output_text: JSON.stringify(buildValidReport()) });
    };

    const response = await POST(buildAnalyzeRequest());
    const body = (await response.json()) as { report?: { score?: number }; model?: string };

    assert.equal(response.status, 200);
    assert.equal(body.model, "gpt-5.6");
    assert.equal(body.report?.score, 92);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("analyze route rejects malformed OpenAI report output", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "sk-test";

  try {
    globalThis.fetch = async () =>
      Response.json({
        output_text: JSON.stringify({
          ...buildValidReport(),
          requirements: [{ id: "demo", label: "Demo", status: "maybe", evidence: "Nope", action: "Fix it" }],
        }),
      });

    const response = await POST(buildAnalyzeRequest());
    const body = (await response.json()) as { error?: string };

    assert.equal(response.status, 502);
    assert.equal(body.error, "OpenAI returned a malformed report. This is retryable.");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("sample ZIP route returns a parseable ZIP download", async () => {
  const response = GET();
  const bytes = new Uint8Array(await response.arrayBuffer());
  const evidence = await parseZipBytes("downloaded-sample.zip", bytes);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/zip");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="beaconboard-sample.zip"');
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(evidence.fileTree.includes("beaconboard/README.md"));
  assert.ok(evidence.detectedCommands.includes("npm run test"));
});

function buildAnalyzeRequest(): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: {
        projectName: "ProofKit",
        track: "Developer Tools",
      },
      evidence: {
        sourceName: "proofkit.zip",
        generatedAt: "2026-07-18T00:00:00.000Z",
        fileTree: ["README.md", "package.json", "LICENSE"],
        relevantFiles: [
          {
            path: "README.md",
            kind: "readme",
            size: 120,
            content: "Setup: npm install && npm run dev",
          },
        ],
        packageManagers: ["npm"],
        detectedCommands: ["npm run dev", "npm test"],
        detectedFrameworks: ["Next.js"],
        totalFiles: 3,
        omittedFiles: 0,
      },
    }),
  });
}

function buildValidReport() {
  const requirements = [
    "Working project",
    "Developer Tools category",
    "Public repository link",
    "Clear README",
    "Public demo video",
    "Codex/GPT-5.6 explanation",
    "/feedback session ID",
    "Install and test path",
  ].map((label, index) => ({
    id: `requirement-${index + 1}`,
    label,
    status: index < 6 ? "pass" : "warn",
    evidence: `${label} evidence.`,
    action: "Keep this visible for judges.",
  }));

  return {
    score: 92,
    summary: "ProofKit is close to submission-ready.",
    requirements,
    technicalScores: {
      setupClarity: 95,
      runnableCommands: 90,
      testability: 85,
      productCompleteness: 92,
    },
    risks: ["Add final demo URL before Devpost submission."],
    readmeCodexUsage: "Codex helped implement ProofKit. GPT-5.6 powers analysis.",
    demoVideoScript: "0:00 introduce. 1:00 demo upload. 2:00 show report.",
    judgeTestingInstructions: "Run npm install, npm run dev, then load the bundled sample.",
    evidenceNotes: [
      {
        file: "README.md",
        finding: "Setup commands found.",
        confidence: "high",
      },
    ],
  };
}
