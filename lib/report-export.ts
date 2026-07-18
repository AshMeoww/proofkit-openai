import type { RepoEvidence } from "./proofkit-core";

export type ExportRequirementStatus = "pass" | "warn" | "fail";

export type ExportableReadinessReport = {
  score: number;
  summary: string;
  requirements: {
    id: string;
    label: string;
    status: ExportRequirementStatus;
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

export type ReportMarkdownInput = {
  projectName: string;
  track: string;
  repoUrl?: string;
  demoUrl?: string;
  feedbackSessionId?: string;
  report: ExportableReadinessReport;
  evidence: RepoEvidence;
  generatedAt?: string;
};

export function buildReportMarkdown({
  projectName,
  track,
  repoUrl,
  demoUrl,
  feedbackSessionId,
  report,
  evidence,
  generatedAt = evidence.generatedAt,
}: ReportMarkdownInput): string {
  const lines = [
    `# ProofKit readiness report: ${projectName || "Untitled project"}`,
    "",
    "## Submission metadata",
    "",
    metadataLine("Project", projectName),
    metadataLine("Track", track),
    metadataLine("Repository", repoUrl),
    metadataLine("Demo video", demoUrl),
    metadataLine("/feedback session ID", feedbackSessionId),
    metadataLine("Evidence source", evidence.sourceName),
    metadataLine("Generated", generatedAt),
    "",
    "## Readiness score",
    "",
    `**${clampScore(report.score)}/100**`,
    "",
    report.summary,
    "",
    "## Build Week requirement checklist",
    "",
    "| Requirement | Status | Evidence | Action |",
    "| --- | --- | --- | --- |",
    ...report.requirements.map(
      (item) =>
        `| ${escapeTableCell(item.label)} | ${formatStatus(item.status)} | ${escapeTableCell(item.evidence)} | ${escapeTableCell(item.action)} |`,
    ),
    "",
    "## Technical implementation scores",
    "",
    "| Area | Score |",
    "| --- | ---: |",
    `| Setup clarity | ${clampScore(report.technicalScores.setupClarity)} |`,
    `| Runnable commands | ${clampScore(report.technicalScores.runnableCommands)} |`,
    `| Testability | ${clampScore(report.technicalScores.testability)} |`,
    `| Product completeness | ${clampScore(report.technicalScores.productCompleteness)} |`,
    "",
    "## Missing-risk items",
    "",
    ...listOrFallback(report.risks, "No major blocking gaps found."),
    "",
    "## Evidence notes",
    "",
    "| File | Confidence | Finding |",
    "| --- | --- | --- |",
    ...report.evidenceNotes.map(
      (note) =>
        `| ${escapeTableCell(note.file)} | ${escapeTableCell(note.confidence)} | ${escapeTableCell(note.finding)} |`,
    ),
    "",
    "## Repository scan summary",
    "",
    metadataLine("Files scanned", String(evidence.totalFiles)),
    metadataLine("Relevant files captured", String(evidence.relevantFiles.length)),
    metadataLine("Omitted files", String(evidence.omittedFiles)),
    metadataLine("Package managers", evidence.packageManagers.join(", ")),
    metadataLine("Detected frameworks", evidence.detectedFrameworks.join(", ")),
    metadataLine("Detected commands", evidence.detectedCommands.join(", ")),
    "",
    "## README Codex/GPT-5.6 usage draft",
    "",
    report.readmeCodexUsage,
    "",
    "## 3-minute demo video outline",
    "",
    report.demoVideoScript,
    "",
    "## Judge testing instructions",
    "",
    report.judgeTestingInstructions,
    "",
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export function slugifyFileName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "proofkit-report";
}

function metadataLine(label: string, value?: string): string {
  const normalized = value?.trim();
  return `- **${label}:** ${normalized || "Not provided"}`;
}

function listOrFallback(items: string[], fallback: string): string[] {
  if (!items.length) {
    return [`- ${fallback}`];
  }

  return items.map((item) => `- ${item}`);
}

function formatStatus(status: ExportRequirementStatus): string {
  return status.toUpperCase();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
