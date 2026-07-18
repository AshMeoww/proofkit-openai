"use client";

import {
  createHackathonProfile,
  defaultHackathonProfile,
  hackathonProfileStorageKey,
  normalizeHackathonProfile,
  type HackathonBrief,
} from "@/lib/hackathon-brief";
import { buildReportMarkdown, slugifyFileName } from "@/lib/report-export";
import { buildEvidenceFromFiles, parseZipBytes, sampleFiles, type RepoEvidence } from "@/lib/proofkit-core";
import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type RequirementStatus = "pass" | "warn" | "fail";

type RequirementItem = {
  id: string;
  label: string;
  status: RequirementStatus;
  evidence: string;
  action: string;
};

type ReadinessReport = {
  score: number;
  summary: string;
  requirements: RequirementItem[];
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

type AnalyzeResponse =
  | { report: ReadinessReport; model: string }
  | { error: string; setup?: string };

type SubmissionItem = {
  label: string;
  status: RequirementStatus;
  detail: string;
};

const checklistLabels = [
  "Working project",
  "Selected category or track",
  "Public repository link",
  "Clear README",
  "Public demo video",
  "Codex/GPT-5.6 explanation",
  "/feedback session ID",
  "Install and test path",
];

export default function ProofKitDashboard() {
  const [hackathonBrief, setHackathonBrief] = useState<HackathonBrief>(defaultHackathonProfile.hackathonBrief);
  const [track, setTrack] = useState(defaultHackathonProfile.track);
  const [projectName, setProjectName] = useState("Untitled hackathon project");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [feedbackSessionId, setFeedbackSessionId] = useState("");
  const [evidence, setEvidence] = useState<RepoEvidence | null>(null);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [hasLoadedSavedProfile, setHasLoadedSavedProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loaded" | "saved" | "reset" | "error">("idle");
  const [selectedSource, setSelectedSource] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.setTimeout(() => {
      try {
        const savedProfile = window.localStorage.getItem(hackathonProfileStorageKey);
        if (savedProfile) {
          const normalized = normalizeHackathonProfile(JSON.parse(savedProfile));
          if (normalized) {
            setHackathonBrief(normalized.hackathonBrief);
            setTrack(normalized.track);
            setReport(null);
            setProfileStatus("loaded");
          }
        }
      } catch {
        setProfileStatus("error");
      } finally {
        setHasLoadedSavedProfile(true);
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedProfile) {
      return;
    }

    try {
      window.localStorage.setItem(
        hackathonProfileStorageKey,
        JSON.stringify(createHackathonProfile(hackathonBrief, track)),
      );
    } catch {
      window.setTimeout(() => setProfileStatus("error"), 0);
    }
  }, [hackathonBrief, hasLoadedSavedProfile, track]);

  const localReport = useMemo(() => {
    if (!evidence) {
      return null;
    }
    return buildLocalReport(evidence, {
      hackathonBrief,
      track,
      repoUrl,
      demoUrl,
      feedbackSessionId,
    });
  }, [demoUrl, evidence, feedbackSessionId, hackathonBrief, repoUrl, track]);

  const activeReport = report ?? localReport;
  const submissionItems = useMemo(
    () =>
      buildSubmissionItems({
        evidence,
        report: activeReport,
        hackathonBrief,
        track,
        repoUrl,
        demoUrl,
        feedbackSessionId,
      }),
    [activeReport, demoUrl, evidence, feedbackSessionId, hackathonBrief, repoUrl, track],
  );
  const reportMarkdown = useMemo(() => {
    if (!activeReport || !evidence) {
      return "";
    }

    return buildReportMarkdown({
      projectName,
      hackathonName: hackathonBrief.hackathonName,
      deadline: hackathonBrief.deadline,
      track,
      repoUrl,
      demoUrl,
      feedbackSessionId,
      requirementsText: hackathonBrief.requirementsText,
      judgingCriteriaText: hackathonBrief.judgingCriteriaText,
      report: activeReport,
      evidence,
    });
  }, [activeReport, demoUrl, evidence, feedbackSessionId, hackathonBrief, projectName, repoUrl, track]);

  function updateHackathonBrief<K extends keyof HackathonBrief>(key: K, value: HackathonBrief[K]) {
    setHackathonBrief((current) => ({ ...current, [key]: value }));
    setReport(null);
    setProfileStatus("saved");
  }

  function updateTrack(value: string) {
    setTrack(value);
    setReport(null);
    setProfileStatus("saved");
  }

  function resetHackathonProfile() {
    setHackathonBrief(defaultHackathonProfile.hackathonBrief);
    setTrack(defaultHackathonProfile.track);
    setReport(null);
    setProfileStatus("reset");
  }

  async function handleZipUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    await processZipFile(file);
  }

  async function processZipFile(file: File) {
    if (!isZipFile(file)) {
      setError("Please choose a .zip file. Folder uploads and raw project files are not supported yet.");
      setEvidence(null);
      setReport(null);
      setSelectedSource(file.name);
      return;
    }

    setIsParsing(true);
    setError("");
    setReport(null);
    setSelectedSource(file.name);

    try {
      const parsed = await parseZipFile(file);
      if (parsed.totalFiles === 0) {
        throw new Error("That ZIP did not contain readable files.");
      }
      setEvidence(parsed);
      setProjectName(inferProjectName(file.name, parsed));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Could not parse that ZIP.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleZipDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingZip(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processZipFile(file);
    }
  }

  function handleDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function loadSampleRepo() {
    const sampleEvidence = buildEvidenceFromFiles("Bundled sample: BeaconBoard", sampleFiles);
    setEvidence(sampleEvidence);
    setProjectName("BeaconBoard");
    setRepoUrl("https://github.com/example/beaconboard");
    setDemoUrl("");
    setFeedbackSessionId("");
    setReport(null);
    setSelectedSource("Bundled sample: BeaconBoard");
    setError("");
  }

  async function analyzeWithOpenAI() {
    if (!evidence) {
      setError("Upload a ZIP or load the sample repo first.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: {
          projectName,
          hackathonName: hackathonBrief.hackathonName,
          track,
          repoUrl,
          demoUrl,
          feedbackSessionId,
          deadline: hackathonBrief.deadline,
          requirementsText: hackathonBrief.requirementsText,
          judgingCriteriaText: hackathonBrief.judgingCriteriaText,
        },
        evidence,
      }),
    });

    const payload = (await response.json()) as AnalyzeResponse;
    setIsAnalyzing(false);

    if (!response.ok || "error" in payload) {
      const setup = "setup" in payload && payload.setup ? ` ${payload.setup}` : "";
      setError(`${"error" in payload ? payload.error : "Analysis failed."}${setup}`);
      return;
    }

    setReport(payload.report);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#171717]">
      <div className="mx-auto grid min-h-screen max-w-[1520px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)_390px]">
        <aside className="rounded-lg border border-[#d8d0c3] bg-[#fffaf3] p-4 shadow-sm">
          <div className="mb-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6f6254]">ProofKit</p>
            <h1 className="mt-2 text-2xl font-semibold">Submission readiness scanner</h1>
            <p className="mt-2 text-sm leading-6 text-[#675e55]">
              Local ZIP evidence first. GPT-5.6 report when your API key is configured.
            </p>
          </div>

          <label className="block text-sm font-medium" htmlFor="project-zip-input">
            Project ZIP
          </label>
          <input
            ref={fileInputRef}
            id="project-zip-input"
            className="sr-only"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleZipUpload}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleDropZoneKeyDown}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingZip(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingZip(true);
            }}
            onDragLeave={() => setIsDraggingZip(false)}
            onDrop={handleZipDrop}
            className={`mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center outline-none transition focus:ring-2 focus:ring-[#1f2937]/20 ${
              isDraggingZip ? "border-[#1f2937] bg-[#eef3ef]" : "border-[#aa9d8f] bg-white hover:border-[#334155]"
            }`}
          >
            <span className="text-sm font-medium">{isParsing ? "Parsing ZIP..." : "Drop ZIP here"}</span>
            <span className="mt-1 text-xs text-[#746b62]">or click to choose README, manifests, tests, license, docs</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-3 rounded-md bg-[#263241] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#111827]"
            >
              Choose ZIP
            </button>
            {selectedSource ? (
              <span className="mt-3 max-w-full truncate font-mono text-xs text-[#5f564e]">{selectedSource}</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={loadSampleRepo}
            className="mt-3 w-full rounded-md border border-[#c6bcaf] bg-[#f3eadf] px-3 py-2 text-sm font-medium transition hover:bg-[#eadccf]"
          >
            Load bundled sample
          </button>

          <a
            href="/api/sample-zip"
            download="beaconboard-sample.zip"
            className="mt-2 block w-full rounded-md border border-[#c6bcaf] bg-white px-3 py-2 text-center text-sm font-medium transition hover:bg-[#f7f0e8]"
          >
            Download sample ZIP
          </a>

          <div className="mt-6 space-y-4">
            <Field
              label="Hackathon"
              value={hackathonBrief.hackathonName}
              onChange={(value) => updateHackathonBrief("hackathonName", value)}
            />
            <Field
              label="Deadline"
              value={hackathonBrief.deadline}
              onChange={(value) => updateHackathonBrief("deadline", value)}
              placeholder="July 21, 2026 at 5:00 PM PT"
            />
            <div className="rounded-md border border-[#e4dbcf] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Hackathon profile</p>
                  <p className="mt-1 text-xs leading-5 text-[#766b60]">
                    {profileStatusMessage(profileStatus, hasLoadedSavedProfile)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetHackathonProfile}
                  className="shrink-0 rounded-md border border-[#c5bbae] px-2 py-1 text-xs font-medium hover:bg-[#f1e9df]"
                >
                  Reset preset
                </button>
              </div>
            </div>
            <Field label="Track" value={track} onChange={updateTrack} />
            <Field label="Project name" value={projectName} onChange={setProjectName} />
            <Field label="Repo URL" value={repoUrl} onChange={setRepoUrl} placeholder="https://github.com/..." />
            <Field label="Demo URL" value={demoUrl} onChange={setDemoUrl} placeholder="https://youtube.com/..." />
            <Field
              label="/feedback session ID"
              value={feedbackSessionId}
              onChange={setFeedbackSessionId}
              placeholder="sess_..."
            />
            <TextAreaField
              label="Hackathon requirements"
              value={hackathonBrief.requirementsText}
              onChange={(value) => updateHackathonBrief("requirementsText", value)}
              rows={7}
            />
            <TextAreaField
              label="Judging criteria"
              value={hackathonBrief.judgingCriteriaText}
              onChange={(value) => updateHackathonBrief("judgingCriteriaText", value)}
              rows={4}
            />
          </div>

          <button
            type="button"
            disabled={!evidence || isAnalyzing}
            onClick={analyzeWithOpenAI}
            className="mt-6 w-full rounded-md bg-[#1f2937] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:bg-[#a6a09a]"
          >
            {isAnalyzing ? "Generating report..." : "Generate GPT-5.6 report"}
          </button>

          {error ? (
            <div className="mt-4 rounded-md border border-[#e2a49a] bg-[#fff1ee] p-3 text-sm leading-6 text-[#783027]">
              {error}
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 rounded-lg border border-[#d8d0c3] bg-white p-4 shadow-sm">
          {activeReport && evidence ? (
            <DashboardReport
              report={activeReport}
              evidence={evidence}
              isAiReport={Boolean(report)}
              hackathonName={hackathonBrief.hackathonName}
            />
          ) : (
            <EmptyState />
          )}
        </section>

        <aside className="rounded-lg border border-[#d8d0c3] bg-[#fdfbf7] p-4 shadow-sm">
          <SubmissionPack items={submissionItems} />

          {activeReport && evidence ? <ReportActions markdown={reportMarkdown} projectName={projectName} /> : null}

          <h2 className="text-lg font-semibold">Generated drafts</h2>
          <p className="mt-1 text-sm text-[#675e55]">Ready to paste into the README or demo planning doc.</p>
          {activeReport ? (
            <div className="mt-4 space-y-4">
              <DraftBlock title="README Codex usage" value={activeReport.readmeCodexUsage} />
              <DraftBlock title="3-minute demo outline" value={activeReport.demoVideoScript} />
              <DraftBlock title="Judge testing instructions" value={activeReport.judgeTestingInstructions} />
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-dashed border-[#c7bdb0] p-4 text-sm leading-6 text-[#6d6359]">
              Upload a repository ZIP or load the sample to generate these sections.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#cbc2b6] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#a39a91] focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/15"
      />
    </label>
  );
}

function profileStatusMessage(status: "idle" | "loaded" | "saved" | "reset" | "error", hasLoadedSavedProfile: boolean): string {
  if (!hasLoadedSavedProfile) {
    return "Checking for a saved local profile...";
  }

  if (status === "loaded") {
    return "Loaded your saved hackathon settings from this browser.";
  }

  if (status === "reset") {
    return "Reset to the OpenAI Build Week preset. Changes save locally.";
  }

  if (status === "error") {
    return "Could not access local browser storage. You can still edit this run.";
  }

  return "Autosaves hackathon settings locally in this browser.";
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-md border border-[#cbc2b6] bg-white px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-[#a39a91] focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/15"
      />
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
      <div className="max-w-xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#85766a]">Ready when your repo is</p>
        <h2 className="mt-3 text-3xl font-semibold">Turn a project ZIP into a judge-facing readiness report.</h2>
        <p className="mt-3 text-sm leading-6 text-[#675e55]">
          ProofKit extracts the file tree, setup evidence, manifests, tests, license, and demo notes before asking GPT-5.6
          for a structured hackathon readiness checklist.
        </p>
      </div>
    </div>
  );
}

function DashboardReport({
  report,
  evidence,
  isAiReport,
  hackathonName,
}: {
  report: ReadinessReport;
  evidence: RepoEvidence;
  isAiReport: boolean;
  hackathonName: string;
}) {
  return (
    <div>
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg bg-[#202a35] p-5 text-white">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d4c7b8]">
            {isAiReport ? "GPT-5.6 report" : "Local scan"}
          </p>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-6xl font-semibold">{report.score}</span>
            <span className="pb-2 text-lg text-[#ddd5ca]">/100</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#eee7dc]">{report.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Setup clarity" value={report.technicalScores.setupClarity} />
          <Metric label="Runnable commands" value={report.technicalScores.runnableCommands} />
          <Metric label="Testability" value={report.technicalScores.testability} />
          <Metric label="Completeness" value={report.technicalScores.productCompleteness} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h2 className="text-lg font-semibold">{hackathonName || "Hackathon"} requirement checklist</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#ddd5c9]">
            {report.requirements.map((item) => (
              <div key={item.id} className="grid gap-3 border-b border-[#eee8df] p-3 last:border-b-0 sm:grid-cols-[140px_1fr]">
                <StatusBadge status={item.status} label={item.label} />
                <div>
                  <p className="text-sm leading-6 text-[#3b3530]">{item.evidence}</p>
                  <p className="mt-1 text-xs leading-5 text-[#756b60]">{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Missing-risk items</h2>
          <div className="mt-3 space-y-2">
            {report.risks.map((risk) => (
              <div key={risk} className="rounded-md border border-[#ead6bc] bg-[#fff7ed] p-3 text-sm leading-6 text-[#6f3e16]">
                {risk}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-semibold">Evidence table</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-[#ddd5c9]">
          <div className="grid grid-cols-[minmax(0,1.1fr)_120px_minmax(0,1.4fr)] bg-[#f3eee6] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#70665b]">
            <span>File</span>
            <span>Kind</span>
            <span>Finding</span>
          </div>
          {report.evidenceNotes.slice(0, 10).map((note) => (
            <div
              key={`${note.file}-${note.finding}`}
              className="grid grid-cols-[minmax(0,1.1fr)_120px_minmax(0,1.4fr)] gap-3 border-t border-[#eee8df] px-3 py-3 text-sm"
            >
              <span className="truncate font-mono text-xs">{note.file}</span>
              <span className="capitalize text-[#665d54]">{note.confidence}</span>
              <span className="leading-6 text-[#3f3933]">{note.finding}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <SmallFact label="Files scanned" value={String(evidence.totalFiles)} />
        <SmallFact label="Relevant files" value={String(evidence.relevantFiles.length)} />
        <SmallFact label="Package managers" value={evidence.packageManagers.join(", ") || "None detected"} />
        <SmallFact label="Commands" value={evidence.detectedCommands.slice(0, 3).join(", ") || "None detected"} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#ddd5c9] bg-[#fbf8f3] p-4">
      <p className="text-sm text-[#6e6258]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7ded3]">
        <div className="h-full rounded-full bg-[#466354]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-24 rounded-lg border border-[#ddd5c9] p-3">
      <p className="text-xs uppercase tracking-[0.08em] text-[#796f65]">{label}</p>
      <p className="mt-2 break-words text-sm font-medium leading-6">{value}</p>
    </div>
  );
}

function StatusBadge({ status, label }: { status: RequirementStatus; label: string }) {
  const styles = {
    pass: "border-[#9fbea4] bg-[#edf7ee] text-[#245a31]",
    warn: "border-[#e1c486] bg-[#fff7df] text-[#73520b]",
    fail: "border-[#dfa7a1] bg-[#fff0ef] text-[#80342d]",
  };

  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium ${styles[status]}`}>
      <span>{label}</span>
      <span className="font-mono text-xs uppercase">{status}</span>
    </div>
  );
}

function ReportActions({ markdown, projectName }: { markdown: string; projectName: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
    }
  }

  function downloadReport() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${slugifyFileName(projectName)}-proofkit-report.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="mb-6 rounded-lg border border-[#ddd5c9] bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">Export report</h2>
        <p className="mt-1 text-sm leading-6 text-[#675e55]">
          Save the full checklist, evidence notes, risks, and generated drafts as a Markdown handoff.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => void copyReport()}
          className="rounded-md bg-[#1f2937] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#111827]"
        >
          {copyStatus === "copied" ? "Copied" : "Copy full report"}
        </button>
        <button
          type="button"
          onClick={downloadReport}
          className="rounded-md border border-[#c5bbae] bg-[#fbf8f3] px-3 py-2 text-sm font-semibold transition hover:bg-[#f1e9df]"
        >
          Download .md
        </button>
      </div>
      {copyStatus === "error" ? (
        <p className="mt-3 text-xs leading-5 text-[#80342d]">Clipboard permission was blocked. Use Download .md instead.</p>
      ) : null}
    </section>
  );
}

function DraftBlock({ title, value }: { title: string; value: string }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(value)}
          className="rounded-md border border-[#c5bbae] px-2 py-1 text-xs font-medium hover:bg-[#f1e9df]"
        >
          Copy
        </button>
      </div>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-[#ddd5c9] bg-white p-3 font-mono text-xs leading-5 text-[#2b2927]">
        {value}
      </pre>
    </section>
  );
}

function SubmissionPack({ items }: { items: SubmissionItem[] }) {
  const readyCount = items.filter((item) => item.status === "pass").length;

  return (
    <section className="mb-6 rounded-lg border border-[#ddd5c9] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Devpost readiness</h2>
          <p className="mt-1 text-sm leading-6 text-[#675e55]">{readyCount} of {items.length} signals ready</p>
        </div>
        <span className="rounded-md bg-[#202a35] px-2 py-1 font-mono text-xs text-white">Jul 21</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-[#ebe4da] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.label}</p>
              <span className={`rounded px-2 py-1 font-mono text-[11px] uppercase ${submissionStatusStyles[item.status]}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#6b6259]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const submissionStatusStyles = {
  pass: "bg-[#edf7ee] text-[#245a31]",
  warn: "bg-[#fff7df] text-[#73520b]",
  fail: "bg-[#fff0ef] text-[#80342d]",
};

function buildSubmissionItems({
  evidence,
  report,
  hackathonBrief,
  track,
  repoUrl,
  demoUrl,
  feedbackSessionId,
}: {
  evidence: RepoEvidence | null;
  report: ReadinessReport | null;
  hackathonBrief: HackathonBrief;
  track: string;
  repoUrl: string;
  demoUrl: string;
  feedbackSessionId: string;
}): SubmissionItem[] {
  const hasLicense = Boolean(
    evidence?.fileTree.some((path) => {
      const base = path.toLowerCase().split("/").at(-1);
      return base === "license" || Boolean(base?.startsWith("license."));
    }),
  );
  const hasInstallPath = Boolean(
    evidence?.detectedCommands.length || evidence?.relevantFiles.some((file) => file.kind === "setup"),
  );

  return [
    {
      label: "Hackathon",
      status: hackathonBrief.hackathonName.trim() ? "pass" : "fail",
      detail: hackathonBrief.hackathonName.trim() || "Name the hackathon or submission program.",
    },
    {
      label: "Deadline",
      status: hackathonBrief.deadline.trim() ? "pass" : "warn",
      detail: hackathonBrief.deadline.trim() || "Add the submission deadline so generated actions can be time-aware.",
    },
    {
      label: "Track",
      status: track.trim() ? "pass" : "warn",
      detail: track.trim() ? `${track} is selected.` : "Add the target track or category.",
    },
    {
      label: "Repository",
      status: repoUrl ? "pass" : "fail",
      detail: repoUrl || "Add the public repo URL before submission.",
    },
    {
      label: "Demo video",
      status: demoUrl ? "pass" : "fail",
      detail: demoUrl || "Add the public YouTube URL under 3 minutes with audio.",
    },
    {
      label: "Feedback ID",
      status: feedbackSessionId ? "pass" : "fail",
      detail: feedbackSessionId || "Paste the /feedback Codex Session ID.",
    },
    {
      label: "License",
      status: hasLicense ? "pass" : evidence ? "fail" : "warn",
      detail: hasLicense ? "License evidence found in the scanned project." : "Scan a repo with an open-source license.",
    },
    {
      label: "Judge test path",
      status: hasInstallPath ? "pass" : evidence ? "fail" : "warn",
      detail: hasInstallPath ? "Install or setup evidence found." : "Scan a repo with clear install/test commands.",
    },
    {
      label: "Report generated",
      status: report ? "pass" : evidence ? "warn" : "fail",
      detail: report ? "Readiness report is visible." : "Generate or review the local scan before recording the demo.",
    },
  ];
}

async function parseZipFile(file: File): Promise<RepoEvidence> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseZipBytes(file.name, bytes);
}

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

function inferProjectName(fileName: string, evidence: RepoEvidence): string {
  const packageFile = evidence.relevantFiles.find((file) => file.path.toLowerCase().endsWith("package.json"));
  if (packageFile?.content) {
    try {
      const parsed = JSON.parse(packageFile.content) as { name?: string };
      if (parsed.name) {
        return parsed.name;
      }
    } catch {
      return fileName.replace(/\.zip$/i, "");
    }
  }

  return fileName.replace(/\.zip$/i, "");
}

function buildLocalReport(
  evidence: RepoEvidence,
  metadata: {
    hackathonBrief: HackathonBrief;
    track: string;
    repoUrl: string;
    demoUrl: string;
    feedbackSessionId: string;
  },
): ReadinessReport {
  const paths = evidence.fileTree.map((path) => path.toLowerCase());
  const hasReadme = paths.some((path) => path.split("/").at(-1)?.startsWith("readme"));
  const hasLicense = paths.some((path) => path.split("/").at(-1) === "license" || path.includes("license."));
  const hasManifest = evidence.relevantFiles.some((file) => file.kind === "manifest");
  const hasTests = evidence.relevantFiles.some((file) => file.kind === "test") || evidence.detectedCommands.some((cmd) => cmd.includes("test"));
  const hasSetup = evidence.detectedCommands.length > 0 || evidence.relevantFiles.some((file) => file.kind === "setup");
  const hasCodex = evidence.relevantFiles.some((file) => /codex|gpt-5\.6|gpt/i.test(file.content ?? ""));
  const baseRequirements: RequirementItem[] = [
    item("working-project", checklistLabels[0], hasManifest && hasSetup, hasManifest ? "Manifest or setup file found." : "No runnable manifest found."),
    item("category", checklistLabels[1], Boolean(metadata.track.trim()), metadata.track.trim() ? `Selected track: ${metadata.track}.` : "No track or category selected."),
    item("repo", checklistLabels[2], Boolean(metadata.repoUrl), metadata.repoUrl || "Repo URL is not filled in yet."),
    item("readme", checklistLabels[3], hasReadme, hasReadme ? "README detected." : "No README detected."),
    item("demo", checklistLabels[4], Boolean(metadata.demoUrl), metadata.demoUrl || "Demo URL is not filled in yet."),
    item("codex", checklistLabels[5], hasCodex, hasCodex ? "Codex/GPT mention found in repo text." : "Add a short Codex/GPT-5.6 usage section."),
    item(
      "feedback",
      checklistLabels[6],
      Boolean(metadata.feedbackSessionId),
      metadata.feedbackSessionId || "Paste the /feedback session ID before submission.",
    ),
    item("install-test", checklistLabels[7], hasSetup && hasTests, hasTests ? "Test evidence detected." : "Add judge-facing install and test commands."),
  ];
  const customRequirements = extractListItems(metadata.hackathonBrief.requirementsText)
    .filter((label) => !baseRequirements.some((requirement) => labelsOverlap(requirement.label, label)))
    .slice(0, 8)
    .map((label, index) => matchCustomRequirement(label, index, { hasReadme, hasLicense, hasTests, hasSetup, hasCodex, repoUrl: metadata.repoUrl, demoUrl: metadata.demoUrl }));
  const requirements = [...baseRequirements, ...customRequirements];

  const passCount = requirements.filter((requirement) => requirement.status === "pass").length;
  const warnCount = requirements.filter((requirement) => requirement.status === "warn").length;
  const requirementScore = requirements.length ? ((passCount + warnCount * 0.45) / requirements.length) * 65 : 0;
  const score = Math.round(requirementScore + (hasLicense ? 10 : 0) + (hasTests ? 10 : 0) + (hasReadme ? 15 : 0));
  const risks = requirements
    .filter((requirement) => requirement.status !== "pass")
    .map((requirement) => `${requirement.label}: ${requirement.action}`);

  return {
    score: Math.min(100, score),
    summary: `Local evidence scan for ${metadata.hackathonBrief.hackathonName || "this hackathon"} complete. Generate the GPT-5.6 report for deeper judging feedback against the custom requirements and criteria.`,
    requirements,
    technicalScores: {
      setupClarity: hasReadme && hasSetup ? 80 : hasReadme ? 55 : 30,
      runnableCommands: evidence.detectedCommands.length ? 80 : 30,
      testability: hasTests ? 80 : 35,
      productCompleteness: hasManifest && hasReadme ? 72 : 45,
    },
    risks: risks.length ? risks : ["No major blocking gaps found in the local scan."],
    readmeCodexUsage:
      "## How Codex and GPT-5.6 were used\n\nCodex was used to plan, implement, debug, and polish the project. GPT-5.6 powers the readiness analysis that turns repository evidence into a judge-facing checklist, risk list, README guidance, and demo outline.",
    demoVideoScript:
      `0:00 - Introduce the project, ${metadata.hackathonBrief.hackathonName || "the hackathon"}, and ${metadata.track || "the selected track"}.\n0:25 - Show the primary workflow with the sample repo or uploaded ZIP.\n1:10 - Explain the repo evidence extraction and GPT-5.6 analysis.\n1:50 - Walk through the readiness checklist, custom requirements, risks, README draft, and judge test instructions.\n2:35 - Close with install/test commands and what was built for the submission.`,
    judgeTestingInstructions:
      "1. Run npm install.\n2. Set OPENAI_API_KEY and optionally OPENAI_MODEL=gpt-5.6.\n3. Run npm run dev.\n4. Open http://localhost:3000, load the bundled sample, then generate the report.",
    evidenceNotes: evidence.relevantFiles.slice(0, 10).map((file) => ({
      file: file.path,
      finding: file.note ?? `${file.kind} evidence captured (${Math.round(file.size / 1024)} KB).`,
      confidence: file.content ? "high" : "medium",
    })),
  };
}

function item(id: string, label: string, passed: boolean, evidence: string): RequirementItem {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
    action: passed ? "Keep this visible in the final submission." : "Resolve before the submission deadline.",
  };
}

function extractListItems(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function labelsOverlap(a: string, b: string): boolean {
  const left = normalizeLabel(a);
  const right = normalizeLabel(b);
  return left.includes(right) || right.includes(left);
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchCustomRequirement(
  label: string,
  index: number,
  signals: {
    hasReadme: boolean;
    hasLicense: boolean;
    hasTests: boolean;
    hasSetup: boolean;
    hasCodex: boolean;
    repoUrl: string;
    demoUrl: string;
  },
): RequirementItem {
  const normalized = normalizeLabel(label);
  const matchers: { pattern: RegExp; passed: boolean; evidence: string }[] = [
    { pattern: /readme|documentation|docs?/, passed: signals.hasReadme, evidence: signals.hasReadme ? "README or documentation evidence detected." : "No README evidence detected." },
    { pattern: /license|open source/, passed: signals.hasLicense, evidence: signals.hasLicense ? "License evidence detected." : "No license evidence detected." },
    { pattern: /test|testing|coverage/, passed: signals.hasTests, evidence: signals.hasTests ? "Test evidence detected." : "No test evidence detected." },
    { pattern: /install|setup|run|runnable/, passed: signals.hasSetup, evidence: signals.hasSetup ? "Setup or run command evidence detected." : "No setup command evidence detected." },
    { pattern: /demo|video|youtube/, passed: Boolean(signals.demoUrl), evidence: signals.demoUrl || "No demo URL provided." },
    { pattern: /repo|repository|github|source/, passed: Boolean(signals.repoUrl), evidence: signals.repoUrl || "No repository URL provided." },
    { pattern: /codex|gpt|openai/, passed: signals.hasCodex, evidence: signals.hasCodex ? "Codex/GPT evidence detected in repository text." : "No Codex/GPT usage evidence detected." },
  ];
  const matched = matchers.find((matcher) => matcher.pattern.test(normalized));

  if (matched) {
    return item(`custom-${index + 1}`, label, matched.passed, matched.evidence);
  }

  return {
    id: `custom-${index + 1}`,
    label,
    status: "warn",
    evidence: "Custom requirement added from the hackathon brief. Local scan cannot fully verify this requirement.",
    action: "Use the GPT-5.6 report or manually confirm this requirement before submission.",
  };
}
