import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyzeRequest = {
  metadata?: {
    projectName?: string;
    track?: string;
    repoUrl?: string;
    demoUrl?: string;
    feedbackSessionId?: string;
    deadline?: string;
  };
  evidence?: {
    sourceName?: string;
    generatedAt?: string;
    fileTree?: string[];
    relevantFiles?: {
      path?: string;
      kind?: string;
      size?: number;
      content?: string;
      note?: string;
    }[];
    packageManagers?: string[];
    detectedCommands?: string[];
    detectedFrameworks?: string[];
    totalFiles?: number;
    omittedFiles?: number;
  };
};

type ReadinessReport = {
  score: number;
  summary: string;
  requirements: {
    id: string;
    label: string;
    status: "pass" | "warn" | "fail";
    evidence: string;
    action: string;
  }[];
  technicalScores: {
    setupClarity: number;
    runnableCommands: number;
    testability: number;
    productCompleteness: number;
  };
  risks: string[];
  readmeCodexUsage: string;
  demoVideoScript: string;
  judgeTestingInstructions: string;
  evidenceNotes: {
    file: string;
    finding: string;
    confidence: "high" | "medium" | "low";
  }[];
};

const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "summary",
    "requirements",
    "technicalScores",
    "risks",
    "readmeCodexUsage",
    "demoVideoScript",
    "judgeTestingInstructions",
    "evidenceNotes",
  ],
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    requirements: {
      type: "array",
      minItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "status", "evidence", "action"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          status: { type: "string", enum: ["pass", "warn", "fail"] },
          evidence: { type: "string" },
          action: { type: "string" },
        },
      },
    },
    technicalScores: {
      type: "object",
      additionalProperties: false,
      required: ["setupClarity", "runnableCommands", "testability", "productCompleteness"],
      properties: {
        setupClarity: { type: "number", minimum: 0, maximum: 100 },
        runnableCommands: { type: "number", minimum: 0, maximum: 100 },
        testability: { type: "number", minimum: 0, maximum: 100 },
        productCompleteness: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    risks: { type: "array", items: { type: "string" } },
    readmeCodexUsage: { type: "string" },
    demoVideoScript: { type: "string" },
    judgeTestingInstructions: { type: "string" },
    evidenceNotes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "finding", "confidence"],
        properties: {
          file: { type: "string" },
          finding: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
  },
};

export async function POST(request: Request) {
  const apiKey = getServerEnv("OPENAI_API_KEY");
  const model = getServerEnv("OPENAI_MODEL") || "gpt-5.6";

  if (!apiKey) {
    const expectedPath = `${process.cwd()}\\.env.local`;
    return Response.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        setup: `Expected ${expectedPath}. Add OPENAI_API_KEY=... there, then fully stop and restart npm run dev.`,
      },
      { status: 500 },
    );
  }

  let payload: AnalyzeRequest;
  try {
    payload = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload.evidence?.relevantFiles || !payload.metadata?.projectName) {
    return Response.json({ error: "Missing project metadata or repository evidence." }, { status: 400 });
  }

  const compactPayload = compactEvidence(payload);
  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are ProofKit, a strict but practical hackathon submission readiness reviewer. Evaluate only the repository evidence provided. Favor concrete, judge-facing gaps. Return the required JSON shape exactly.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                task:
                  "Create a Build Week readiness report for a Developer Tools submission due July 21, 2026 at 5:00 PM PT. Include the eight required checklist items, technical scores, missing-risk items, README Codex/GPT-5.6 section, 3-minute demo script, and judge testing instructions.",
                payload: compactPayload,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "proofkit_readiness_report",
          strict: true,
          schema: reportSchema,
        },
      },
    }),
  });

  if (!openAiResponse.ok) {
    const details = await readError(openAiResponse);
    return Response.json(
      {
        error: `OpenAI analysis failed with ${openAiResponse.status}.`,
        setup: details,
      },
      { status: 502 },
    );
  }

  const responseJson = (await openAiResponse.json()) as unknown;
  const outputText = extractOutputText(responseJson);

  if (!outputText) {
    return Response.json(
      { error: "OpenAI returned no structured report text. This is retryable." },
      { status: 502 },
    );
  }

  try {
    const report = JSON.parse(outputText) as unknown;
    if (!isReadinessReport(report)) {
      return Response.json(
        { error: "OpenAI returned a malformed report. This is retryable." },
        { status: 502 },
      );
    }

    return Response.json({ report, model });
  } catch {
    return Response.json(
      { error: "OpenAI returned non-JSON report text. This is retryable." },
      { status: 502 },
    );
  }
}

function getServerEnv(name: "OPENAI_API_KEY" | "OPENAI_MODEL") {
  const processValue = process.env[name]?.trim();
  if (processValue) {
    return processValue;
  }

  if (process.env.NODE_ENV === "test" || process.env.PROOFKIT_DISABLE_ENV_LOCAL_FALLBACK === "1") {
    return undefined;
  }

  const localValue = readEnvLocalValue(name);
  if (localValue) {
    process.env[name] = localValue;
  }

  return localValue;
}

function readEnvLocalValue(name: string) {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
      const match = normalized.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!match || match[1] !== name) {
        continue;
      }

      return stripEnvQuotes(match[2].trim()).trim();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function stripEnvQuotes(value: string) {
  const quote = value[0];
  if ((quote === '"' || quote === "'" || quote === "`") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value;
}

function compactEvidence(payload: AnalyzeRequest) {
  return {
    metadata: payload.metadata,
    evidence: {
      ...payload.evidence,
      fileTree: payload.evidence?.fileTree?.slice(0, 240),
      relevantFiles: payload.evidence?.relevantFiles?.slice(0, 60).map((file) => ({
        ...file,
        content: file.content?.slice(0, 6000),
      })),
    },
  };
}

async function readError(response: Response) {
  try {
    const json = (await response.json()) as { error?: { message?: string } };
    return json.error?.message ?? "Check the model name, API key, and account access.";
  } catch {
    return "Check the model name, API key, and account access.";
  }
}

function extractOutputText(value: unknown): string {
  if (isRecord(value) && typeof value.output_text === "string") {
    return value.output_text;
  }

  if (!isRecord(value) || !Array.isArray(value.output)) {
    return "";
  }

  return value.output
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("");
}

function isReadinessReport(value: unknown): value is ReadinessReport {
  if (!isRecord(value)) {
    return false;
  }

  if (!isScore(value.score) || typeof value.summary !== "string") {
    return false;
  }

  if (!Array.isArray(value.requirements) || !isRecord(value.technicalScores)) {
    return false;
  }

  return (
    value.requirements.every(isRequirementItem) &&
    isTechnicalScores(value.technicalScores) &&
    Array.isArray(value.risks) &&
    value.risks.every((risk) => typeof risk === "string") &&
    typeof value.readmeCodexUsage === "string" &&
    typeof value.demoVideoScript === "string" &&
    typeof value.judgeTestingInstructions === "string" &&
    Array.isArray(value.evidenceNotes) &&
    value.evidenceNotes.every(isEvidenceNote)
  );
}

function isRequirementItem(value: unknown): value is ReadinessReport["requirements"][number] {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    isRequirementStatus(value.status) &&
    typeof value.evidence === "string" &&
    typeof value.action === "string"
  );
}

function isTechnicalScores(value: Record<string, unknown>): value is ReadinessReport["technicalScores"] {
  return (
    isScore(value.setupClarity) &&
    isScore(value.runnableCommands) &&
    isScore(value.testability) &&
    isScore(value.productCompleteness)
  );
}

function isEvidenceNote(value: unknown): value is ReadinessReport["evidenceNotes"][number] {
  return (
    isRecord(value) &&
    typeof value.file === "string" &&
    typeof value.finding === "string" &&
    (value.confidence === "high" || value.confidence === "medium" || value.confidence === "low")
  );
}

function isRequirementStatus(value: unknown): value is ReadinessReport["requirements"][number]["status"] {
  return value === "pass" || value === "warn" || value === "fail";
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
