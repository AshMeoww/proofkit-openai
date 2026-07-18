'use client';

import {
  createHackathonProfile,
  defaultHackathonProfile,
  hackathonProfileStorageKey,
  normalizeHackathonProfile,
} from '@/lib/hackathon-brief';
import { buildReportMarkdown } from '@/lib/report-export';
import {
  buildEvidenceFromFiles,
  parseZipBytes,
  sampleFiles,
  type RepoEvidence,
} from '@/lib/proofkit-core';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import type {
  AnalyzeResponse,
  HackathonBrief,
  ReadinessReport,
  RequirementItem,
  Step,
  SubmissionItem,
} from './types';
import UploadStep from './steps/upload-step';
import RequirementsStep from './steps/requirements-step';
import AnalyzingStep from './steps/analyzing-step';
import ReportStep from './steps/report-step';

const stepLabels: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'requirements', label: 'Details' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'report', label: 'Report' },
];

const checklistLabels = [
  'Working project',
  'Selected category or track',
  'Public repository link',
  'Clear README',
  'Public demo video',
  'Codex/GPT-5.6 explanation',
  '/feedback session ID',
  'Install and test path',
];

export default function ProofKitDashboard() {
  const [step, setStep] = useState<Step>('upload');
  const [hackathonBrief, setHackathonBrief] = useState<HackathonBrief>(
    defaultHackathonProfile.hackathonBrief,
  );
  const [track, setTrack] = useState(defaultHackathonProfile.track);
  const [projectName, setProjectName] = useState('Untitled hackathon project');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [feedbackSessionId, setFeedbackSessionId] = useState('');
  const [evidence, setEvidence] = useState<RepoEvidence | null>(null);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [hasLoadedSavedProfile, setHasLoadedSavedProfile] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');

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
          }
        }
      } catch {
        // localStorage unavailable
      } finally {
        setHasLoadedSavedProfile(true);
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedProfile) return;
    try {
      window.localStorage.setItem(
        hackathonProfileStorageKey,
        JSON.stringify(createHackathonProfile(hackathonBrief, track)),
      );
    } catch {
      // localStorage unavailable
    }
  }, [hackathonBrief, hasLoadedSavedProfile, track]);

  const localReport = useMemo(() => {
    if (!evidence) return null;
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
    [
      activeReport,
      demoUrl,
      evidence,
      feedbackSessionId,
      hackathonBrief,
      repoUrl,
      track,
    ],
  );

  const reportMarkdown = useMemo(() => {
    if (!activeReport || !evidence) return '';
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
  }, [
    activeReport,
    demoUrl,
    evidence,
    feedbackSessionId,
    hackathonBrief,
    projectName,
    repoUrl,
    track,
  ]);

  function updateHackathonBrief<K extends keyof HackathonBrief>(
    key: K,
    value: HackathonBrief[K],
  ) {
    setHackathonBrief((current) => ({ ...current, [key]: value }));
    setReport(null);
  }

  function updateTrack(value: string) {
    setTrack(value);
    setReport(null);
  }

  function resetHackathonProfile() {
    setHackathonBrief(defaultHackathonProfile.hackathonBrief);
    setTrack(defaultHackathonProfile.track);
    setReport(null);
  }

  async function handleZipUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await processZipFile(file);
  }

  async function processZipFile(file: File) {
    if (!isZipFile(file)) {
      setError('Please choose a .zip file.');
      setEvidence(null);
      setReport(null);
      setSelectedSource(file.name);
      return;
    }

    setIsParsing(true);
    setError('');
    setReport(null);
    setSelectedSource(file.name);

    try {
      const parsed = await parseZipFile(file);
      if (parsed.totalFiles === 0)
        throw new Error('That ZIP did not contain readable files.');
      setEvidence(parsed);
      setProjectName(inferProjectName(file.name, parsed));
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : 'Could not parse that ZIP.',
      );
    } finally {
      setIsParsing(false);
    }
  }

  function loadSampleRepo() {
    const sampleEvidence = buildEvidenceFromFiles(
      'Bundled sample: BeaconBoard',
      sampleFiles,
    );
    setEvidence(sampleEvidence);
    setProjectName('BeaconBoard');
    setRepoUrl('https://github.com/example/beaconboard');
    setDemoUrl('');
    setFeedbackSessionId('');
    setReport(null);
    setSelectedSource('Bundled sample: BeaconBoard');
    setError('');
  }

  async function handleAnalyze() {
    if (!evidence) {
      setError('Upload a ZIP or load the sample repo first.');
      return;
    }

    setStep('analyzing');
    setError('');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    if (!response.ok || 'error' in payload) {
      const setup =
        'setup' in payload && payload.setup ? ` ${payload.setup}` : '';
      setError(
        `${'error' in payload ? payload.error : 'Analysis failed.'}${setup}`,
      );
      setStep('requirements');
      return;
    }

    setReport(payload.report);
    setStep('report');
  }

  function handleStartOver() {
    setStep('upload');
    setEvidence(null);
    setReport(null);
    setSelectedSource('');
    setError('');
  }

  const stepIndex = stepLabels.findIndex((s) => s.key === step);

  return (
    <main className='min-h-screen bg-[var(--bg-secondary)]'>
      <nav className='sticky top-0 z-10 border-b border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl'>
        <div className='mx-auto flex h-12 max-w-5xl items-center justify-between px-6'>
          <span className='text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]'>
            ProofKit
          </span>
          <div className='flex items-center gap-2'>
            {stepLabels.map((s, i) => (
              <div key={s.key} className='flex items-center gap-2'>
                {i > 0 && (
                  <div
                    className={`h-px w-6 transition-colors duration-300 ${i <= stepIndex ? 'bg-[var(--accent)]' : 'bg-[rgba(0,0,0,0.1)]'}`}
                  />
                )}
                <div className='flex items-center gap-1.5'>
                  <div
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${i < stepIndex ? 'bg-[var(--accent)]' : i === stepIndex ? 'bg-[var(--accent)] scale-125' : 'bg-[rgba(0,0,0,0.15)]'}`}
                  />
                  <span
                    className={`hidden text-[12px] font-medium sm:block ${i <= stepIndex ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {error && (
        <div className='mx-auto max-w-xl px-6 pt-4'>
          <div className='rounded-xl border border-[rgba(255,59,48,0.2)] bg-[var(--color-fail-bg)] px-4 py-3 text-[14px] text-[#cf222e]'>
            {error}
          </div>
        </div>
      )}

      <UploadStep
        currentStep={step}
        isParsing={isParsing}
        selectedSource={selectedSource}
        hasEvidence={Boolean(evidence)}
        onZipUpload={handleZipUpload}
        onZipDrop={(file) => void processZipFile(file)}
        onLoadSample={loadSampleRepo}
        onNext={() => setStep('requirements')}
      />

      <RequirementsStep
        currentStep={step}
        hackathonBrief={hackathonBrief}
        track={track}
        projectName={projectName}
        repoUrl={repoUrl}
        demoUrl={demoUrl}
        feedbackSessionId={feedbackSessionId}
        onUpdateBrief={updateHackathonBrief}
        onTrackChange={updateTrack}
        onProjectNameChange={setProjectName}
        onRepoUrlChange={setRepoUrl}
        onDemoUrlChange={setDemoUrl}
        onFeedbackIdChange={setFeedbackSessionId}
        onResetProfile={resetHackathonProfile}
        onBack={() => setStep('upload')}
        onAnalyze={() => void handleAnalyze()}
      />

      <AnalyzingStep currentStep={step} projectName={projectName} />

      {activeReport && evidence && (
        <ReportStep
          currentStep={step}
          report={activeReport}
          evidence={evidence}
          isAiReport={Boolean(report)}
          hackathonName={hackathonBrief.hackathonName}
          projectName={projectName}
          submissionItems={submissionItems}
          reportMarkdown={reportMarkdown}
          onStartOver={handleStartOver}
        />
      )}
    </main>
  );
}

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
      const base = path.toLowerCase().split('/').at(-1);
      return base === 'license' || Boolean(base?.startsWith('license.'));
    }),
  );
  const hasInstallPath = Boolean(
    evidence?.detectedCommands.length ||
    evidence?.relevantFiles.some((file) => file.kind === 'setup'),
  );

  return [
    {
      label: 'Hackathon',
      status: hackathonBrief.hackathonName.trim() ? 'pass' : 'fail',
      detail:
        hackathonBrief.hackathonName.trim() ||
        'Name the hackathon or submission program.',
    },
    {
      label: 'Deadline',
      status: hackathonBrief.deadline.trim() ? 'pass' : 'warn',
      detail:
        hackathonBrief.deadline.trim() ||
        'Add the submission deadline so generated actions can be time-aware.',
    },
    {
      label: 'Track',
      status: track.trim() ? 'pass' : 'warn',
      detail: track.trim()
        ? `${track} is selected.`
        : 'Add the target track or category.',
    },
    {
      label: 'Repository',
      status: repoUrl ? 'pass' : 'fail',
      detail: repoUrl || 'Add the public repo URL before submission.',
    },
    {
      label: 'Demo video',
      status: demoUrl ? 'pass' : 'fail',
      detail:
        demoUrl || 'Add the public YouTube URL under 3 minutes with audio.',
    },
    {
      label: 'Feedback ID',
      status: feedbackSessionId ? 'pass' : 'fail',
      detail: feedbackSessionId || 'Paste the /feedback Codex Session ID.',
    },
    {
      label: 'License',
      status: hasLicense ? 'pass' : evidence ? 'fail' : 'warn',
      detail: hasLicense
        ? 'License evidence found in the scanned project.'
        : 'Scan a repo with an open-source license.',
    },
    {
      label: 'Judge test path',
      status: hasInstallPath ? 'pass' : evidence ? 'fail' : 'warn',
      detail: hasInstallPath
        ? 'Install or setup evidence found.'
        : 'Scan a repo with clear install/test commands.',
    },
    {
      label: 'Report generated',
      status: report ? 'pass' : evidence ? 'warn' : 'fail',
      detail: report
        ? 'Readiness report is visible.'
        : 'Generate or review the local scan before recording the demo.',
    },
  ];
}

async function parseZipFile(file: File): Promise<RepoEvidence> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseZipBytes(file.name, bytes);
}

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed'
  );
}

function inferProjectName(fileName: string, evidence: RepoEvidence): string {
  const packageFile = evidence.relevantFiles.find((file) =>
    file.path.toLowerCase().endsWith('package.json'),
  );
  if (packageFile?.content) {
    try {
      const parsed = JSON.parse(packageFile.content) as { name?: string };
      if (parsed.name) {
        return parsed.name;
      }
    } catch {
      return fileName.replace(/\.zip$/i, '');
    }
  }

  return fileName.replace(/\.zip$/i, '');
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
  const hasReadme = paths.some((path) =>
    path.split('/').at(-1)?.startsWith('readme'),
  );
  const hasLicense = paths.some(
    (path) => path.split('/').at(-1) === 'license' || path.includes('license.'),
  );
  const hasManifest = evidence.relevantFiles.some(
    (file) => file.kind === 'manifest',
  );
  const hasTests =
    evidence.relevantFiles.some((file) => file.kind === 'test') ||
    evidence.detectedCommands.some((cmd) => cmd.includes('test'));
  const hasSetup =
    evidence.detectedCommands.length > 0 ||
    evidence.relevantFiles.some((file) => file.kind === 'setup');
  const hasCodex = evidence.relevantFiles.some((file) =>
    /codex|gpt-5\.6|gpt/i.test(file.content ?? ''),
  );
  const baseRequirements: RequirementItem[] = [
    item(
      'working-project',
      checklistLabels[0],
      hasManifest && hasSetup,
      hasManifest
        ? 'Manifest or setup file found.'
        : 'No runnable manifest found.',
    ),
    item(
      'category',
      checklistLabels[1],
      Boolean(metadata.track.trim()),
      metadata.track.trim()
        ? `Selected track: ${metadata.track}.`
        : 'No track or category selected.',
    ),
    item(
      'repo',
      checklistLabels[2],
      Boolean(metadata.repoUrl),
      metadata.repoUrl || 'Repo URL is not filled in yet.',
    ),
    item(
      'readme',
      checklistLabels[3],
      hasReadme,
      hasReadme ? 'README detected.' : 'No README detected.',
    ),
    item(
      'demo',
      checklistLabels[4],
      Boolean(metadata.demoUrl),
      metadata.demoUrl || 'Demo URL is not filled in yet.',
    ),
    item(
      'codex',
      checklistLabels[5],
      hasCodex,
      hasCodex
        ? 'Codex/GPT mention found in repo text.'
        : 'Add a short Codex/GPT-5.6 usage section.',
    ),
    item(
      'feedback',
      checklistLabels[6],
      Boolean(metadata.feedbackSessionId),
      metadata.feedbackSessionId ||
        'Paste the /feedback session ID before submission.',
    ),
    item(
      'install-test',
      checklistLabels[7],
      hasSetup && hasTests,
      hasTests
        ? 'Test evidence detected.'
        : 'Add judge-facing install and test commands.',
    ),
  ];
  const customRequirements = extractListItems(
    metadata.hackathonBrief.requirementsText,
  )
    .filter(
      (label) =>
        !baseRequirements.some((requirement) =>
          labelsOverlap(requirement.label, label),
        ),
    )
    .slice(0, 8)
    .map((label, index) =>
      matchCustomRequirement(label, index, {
        hasReadme,
        hasLicense,
        hasTests,
        hasSetup,
        hasCodex,
        repoUrl: metadata.repoUrl,
        demoUrl: metadata.demoUrl,
      }),
    );
  const requirements = [...baseRequirements, ...customRequirements];

  const passCount = requirements.filter(
    (requirement) => requirement.status === 'pass',
  ).length;
  const warnCount = requirements.filter(
    (requirement) => requirement.status === 'warn',
  ).length;
  const requirementScore = requirements.length
    ? ((passCount + warnCount * 0.45) / requirements.length) * 65
    : 0;
  const score = Math.round(
    requirementScore +
      (hasLicense ? 10 : 0) +
      (hasTests ? 10 : 0) +
      (hasReadme ? 15 : 0),
  );
  const risks = requirements
    .filter((requirement) => requirement.status !== 'pass')
    .map((requirement) => `${requirement.label}: ${requirement.action}`);

  return {
    score: Math.min(100, score),
    summary: `Local evidence scan for ${metadata.hackathonBrief.hackathonName || 'this hackathon'} complete. Generate the GPT-5.6 report for deeper judging feedback against the custom requirements and criteria.`,
    requirements,
    technicalScores: {
      setupClarity: hasReadme && hasSetup ? 80 : hasReadme ? 55 : 30,
      runnableCommands: evidence.detectedCommands.length ? 80 : 30,
      testability: hasTests ? 80 : 35,
      productCompleteness: hasManifest && hasReadme ? 72 : 45,
    },
    risks: risks.length
      ? risks
      : ['No major blocking gaps found in the local scan.'],
    readmeCodexUsage:
      '## How Codex and GPT-5.6 were used\n\nCodex was used to plan, implement, debug, and polish the project. GPT-5.6 powers the readiness analysis that turns repository evidence into a judge-facing checklist, risk list, README guidance, and demo outline.',
    demoVideoScript: `0:00 - Introduce the project, ${metadata.hackathonBrief.hackathonName || 'the hackathon'}, and ${metadata.track || 'the selected track'}.\n0:25 - Show the primary workflow with the sample repo or uploaded ZIP.\n1:10 - Explain the repo evidence extraction and GPT-5.6 analysis.\n1:50 - Walk through the readiness checklist, custom requirements, risks, README draft, and judge test instructions.\n2:35 - Close with install/test commands and what was built for the submission.`,
    judgeTestingInstructions:
      '1. Run npm install.\n2. Set OPENAI_API_KEY and optionally OPENAI_MODEL=gpt-5.6.\n3. Run npm run dev.\n4. Open http://localhost:3000, load the bundled sample, then generate the report.',
    evidenceNotes: evidence.relevantFiles.slice(0, 10).map((file) => ({
      file: file.path,
      finding:
        file.note ??
        `${file.kind} evidence captured (${Math.round(file.size / 1024)} KB).`,
      confidence: file.content ? 'high' : 'medium',
    })),
  };
}

function item(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): RequirementItem {
  return {
    id,
    label,
    status: passed ? 'pass' : 'fail',
    evidence,
    action: passed
      ? 'Keep this visible in the final submission.'
      : 'Resolve before the submission deadline.',
  };
}

function extractListItems(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function labelsOverlap(a: string, b: string): boolean {
  const left = normalizeLabel(a);
  const right = normalizeLabel(b);
  return left.includes(right) || right.includes(left);
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
    {
      pattern: /readme|documentation|docs?/,
      passed: signals.hasReadme,
      evidence: signals.hasReadme
        ? 'README or documentation evidence detected.'
        : 'No README evidence detected.',
    },
    {
      pattern: /license|open source/,
      passed: signals.hasLicense,
      evidence: signals.hasLicense
        ? 'License evidence detected.'
        : 'No license evidence detected.',
    },
    {
      pattern: /test|testing|coverage/,
      passed: signals.hasTests,
      evidence: signals.hasTests
        ? 'Test evidence detected.'
        : 'No test evidence detected.',
    },
    {
      pattern: /install|setup|run|runnable/,
      passed: signals.hasSetup,
      evidence: signals.hasSetup
        ? 'Setup or run command evidence detected.'
        : 'No setup command evidence detected.',
    },
    {
      pattern: /demo|video|youtube/,
      passed: Boolean(signals.demoUrl),
      evidence: signals.demoUrl || 'No demo URL provided.',
    },
    {
      pattern: /repo|repository|github|source/,
      passed: Boolean(signals.repoUrl),
      evidence: signals.repoUrl || 'No repository URL provided.',
    },
    {
      pattern: /codex|gpt|openai/,
      passed: signals.hasCodex,
      evidence: signals.hasCodex
        ? 'Codex/GPT evidence detected in repository text.'
        : 'No Codex/GPT usage evidence detected.',
    },
  ];
  const matched = matchers.find((matcher) => matcher.pattern.test(normalized));

  if (matched) {
    return item(`custom-${index + 1}`, label, matched.passed, matched.evidence);
  }

  return {
    id: `custom-${index + 1}`,
    label,
    status: 'warn',
    evidence:
      'Custom requirement added from the hackathon brief. Local scan cannot fully verify this requirement.',
    action:
      'Use the GPT-5.6 report or manually confirm this requirement before submission.',
  };
}
