import assert from "node:assert/strict";
import test from "node:test";
import { buildReportMarkdown, slugifyFileName, type ExportableReadinessReport } from "../lib/report-export";
import type { RepoEvidence } from "../lib/proofkit-core";

test("buildReportMarkdown creates a complete judge-facing handoff", () => {
  const report: ExportableReadinessReport = {
    score: 87,
    summary: "Ready with one demo-video gap.",
    requirements: [
      {
        id: "readme",
        label: "Clear README",
        status: "pass",
        evidence: "README.md includes setup.",
        action: "Keep it visible.",
      },
      {
        id: "demo",
        label: "Public demo video",
        status: "fail",
        evidence: "No demo URL provided.",
        action: "Record the 3-minute video.",
      },
    ],
    technicalScores: {
      setupClarity: 90,
      runnableCommands: 80,
      testability: 75,
      productCompleteness: 85,
    },
    risks: ["Demo video URL is missing."],
    readmeCodexUsage: "## How Codex and GPT-5.6 were used\n\nCodex helped build ProofKit.",
    demoVideoScript: "0:00 - Show upload.\n1:00 - Explain GPT-5.6 report.",
    judgeTestingInstructions: "Run npm install, npm run dev, then load the sample.",
    evidenceNotes: [
      {
        file: "README.md",
        finding: "Setup path found.",
        confidence: "high",
      },
    ],
  };
  const evidence: RepoEvidence = {
    sourceName: "sample.zip",
    generatedAt: "2026-07-18T00:00:00.000Z",
    fileTree: ["README.md", "package.json"],
    relevantFiles: [{ path: "README.md", kind: "readme", size: 120, content: "Setup" }],
    packageManagers: ["npm"],
    detectedCommands: ["npm run dev", "npm test"],
    detectedFrameworks: ["Next.js"],
    totalFiles: 2,
    omittedFiles: 0,
  };

  const markdown = buildReportMarkdown({
    projectName: "ProofKit",
    hackathonName: "Launch Jam",
    deadline: "August 1, 2026 at 11:59 PM ET",
    track: "Developer Tools",
    requirementsText: "Public repo\nDemo video under 3 minutes",
    judgingCriteriaText: "Technical implementation\nDesign",
    report,
    evidence,
    generatedAt: "2026-07-18T12:00:00.000Z",
  });

  assert.match(markdown, /^# ProofKit readiness report: ProofKit/m);
  assert.match(markdown, /- \*\*Hackathon:\*\* Launch Jam/);
  assert.match(markdown, /- \*\*Deadline:\*\* August 1, 2026 at 11:59 PM ET/);
  assert.match(markdown, /- \*\*Repository:\*\* Not provided/);
  assert.match(markdown, /## Launch Jam requirement checklist/);
  assert.match(markdown, /## Hackathon brief/);
  assert.match(markdown, /- Public repo/);
  assert.match(markdown, /- Technical implementation/);
  assert.match(markdown, /\| Public demo video \| FAIL \| No demo URL provided\. \| Record the 3-minute video\. \|/);
  assert.match(markdown, /- Demo video URL is missing\./);
  assert.match(markdown, /\| README\.md \| high \| Setup path found\. \|/);
  assert.match(markdown, /## README Codex\/GPT-5\.6 usage draft/);
  assert.match(markdown, /Run npm install, npm run dev, then load the sample\./);
});

test("slugifyFileName produces safe markdown download names", () => {
  assert.equal(slugifyFileName("BeaconBoard / ProofKit MVP!"), "beaconboard-proofkit-mvp");
  assert.equal(slugifyFileName(""), "proofkit-report");
});
