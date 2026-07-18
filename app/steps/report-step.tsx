'use client';

import { useState } from 'react';
import { slugifyFileName } from '@/lib/report-export';
import type { RepoEvidence } from '@/lib/proofkit-core';
import type {
  ReadinessReport,
  RequirementStatus,
  SubmissionItem,
  Step,
} from '../types';

type ReportStepProps = {
  currentStep: Step;
  report: ReadinessReport;
  evidence: RepoEvidence;
  isAiReport: boolean;
  hackathonName: string;
  projectName: string;
  submissionItems: SubmissionItem[];
  reportMarkdown: string;
  onStartOver: () => void;
};

export default function ReportStep({
  currentStep,
  report,
  evidence,
  isAiReport,
  hackathonName,
  projectName,
  submissionItems,
  reportMarkdown,
  onStartOver,
}: ReportStepProps) {
  if (currentStep !== 'report') return null;

  return (
    <div className='step-enter mx-auto max-w-5xl px-6 py-12'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <div className='text-[13px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase'>
            {isAiReport ? 'GPT-5.6 Report' : 'Local Scan'}
          </div>
          <h1 className='mt-2 text-[32px] font-semibold leading-[1.12] tracking-[-0.022em] text-[var(--text-primary)]'>
            {projectName}
          </h1>
        </div>
        <button
          type='button'
          onClick={onStartOver}
          className='mt-2 flex items-center gap-1.5 text-[15px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]'
        >
          Scan another project
        </button>
      </div>

      <div className='mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
        <div className='space-y-6'>
          <ScoreSection report={report} />
          <MetricsGrid scores={report.technicalScores} />
          <RequirementsList
            hackathonName={hackathonName}
            requirements={report.requirements}
          />
          <RisksList risks={report.risks} />
          <EvidenceTable notes={report.evidenceNotes} />
          <FactsGrid evidence={evidence} />
          <DraftsSection report={report} />
        </div>

        <div className='space-y-6'>
          <SubmissionPanel items={submissionItems} />
          <ExportPanel markdown={reportMarkdown} projectName={projectName} />
        </div>
      </div>
    </div>
  );
}

function ScoreSection({ report }: { report: ReadinessReport }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (report.score / 100) * circumference;

  return (
    <div className='flex items-center gap-8 rounded-2xl bg-white p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <div className='relative flex-shrink-0'>
        <svg width='108' height='108' viewBox='0 0 108 108'>
          <circle
            cx='54'
            cy='54'
            r='42'
            fill='none'
            stroke='rgba(0,0,0,0.06)'
            strokeWidth='6'
          />
          <circle
            cx='54'
            cy='54'
            r='42'
            fill='none'
            stroke='var(--accent)'
            strokeWidth='6'
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className='score-ring-fill'
            transform='rotate(-90 54 54)'
          />
        </svg>
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-[28px] font-semibold text-[var(--text-primary)]'>
            {report.score}
          </span>
        </div>
      </div>
      <div className='min-w-0'>
        <p className='text-[13px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase'>
          Readiness Score
        </p>
        <p className='mt-2 text-[15px] leading-[1.53] text-[var(--text-secondary)]'>
          {report.summary}
        </p>
      </div>
    </div>
  );
}

function MetricsGrid({
  scores,
}: {
  scores: ReadinessReport['technicalScores'];
}) {
  const items = [
    { label: 'Setup clarity', value: scores.setupClarity },
    { label: 'Runnable commands', value: scores.runnableCommands },
    { label: 'Testability', value: scores.testability },
    { label: 'Completeness', value: scores.productCompleteness },
  ];

  return (
    <div className='grid gap-3 sm:grid-cols-4'>
      {items.map((m) => (
        <div
          key={m.label}
          className='rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'
        >
          <p className='text-[13px] text-[var(--text-tertiary)]'>{m.label}</p>
          <p className='mt-3 text-[28px] font-semibold text-[var(--text-primary)]'>
            {m.value}
          </p>
          <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(0,0,0,0.06)]'>
            <div
              className='progress-fill h-full rounded-full bg-[var(--accent)]'
              style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RequirementsList({
  hackathonName,
  requirements,
}: {
  hackathonName: string;
  requirements: ReadinessReport['requirements'];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between px-6 py-4 text-left'
      >
        <h2 className='text-[17px] font-semibold text-[var(--text-primary)]'>
          {hackathonName || 'Hackathon'} requirements
        </h2>
        <Chevron open={open} />
      </button>
      {open && (
        <div className='divide-y divide-[rgba(0,0,0,0.04)] border-t border-[rgba(0,0,0,0.06)]'>
          {requirements.map((req) => (
            <div key={req.id} className='flex items-start gap-4 px-6 py-4'>
              <StatusDot status={req.status} />
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-[15px] font-medium text-[var(--text-primary)]'>
                    {req.label}
                  </span>
                  <StatusTag status={req.status} />
                </div>
                <p className='mt-1 text-[13px] leading-[1.46] text-[var(--text-secondary)]'>
                  {req.evidence}
                </p>
                <p className='mt-0.5 text-[12px] text-[var(--text-tertiary)]'>
                  {req.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RisksList({ risks }: { risks: string[] }) {
  const [open, setOpen] = useState(false);

  if (!risks.length) return null;

  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between px-6 py-4 text-left'
      >
        <h2 className='text-[17px] font-semibold text-[var(--text-primary)]'>
          Risks
        </h2>
        <Chevron open={open} />
      </button>
      {open && (
        <div className='divide-y divide-[rgba(0,0,0,0.04)] border-t border-[rgba(0,0,0,0.06)] px-6'>
          {risks.map((risk) => (
            <p
              key={risk}
              className='py-3.5 text-[14px] leading-[1.5] text-[var(--text-secondary)]'
            >
              {risk}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceTable({ notes }: { notes: ReadinessReport['evidenceNotes'] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between px-6 py-4 text-left'
      >
        <h2 className='text-[17px] font-semibold text-[var(--text-primary)]'>
          Evidence
        </h2>
        <Chevron open={open} />
      </button>
      {open && (
        <div className='divide-y divide-[rgba(0,0,0,0.04)] border-t border-[rgba(0,0,0,0.06)]'>
          {notes.slice(0, 10).map((note) => (
            <div
              key={`${note.file}-${note.finding}`}
              className='grid grid-cols-[minmax(0,1fr)_80px_minmax(0,1.5fr)] gap-4 px-6 py-3.5'
            >
              <span className='truncate font-mono text-[13px] text-[var(--text-primary)]'>
                {note.file}
              </span>
              <span className='text-[12px] capitalize text-[var(--text-tertiary)]'>
                {note.confidence}
              </span>
              <span className='text-[13px] leading-[1.46] text-[var(--text-secondary)]'>
                {note.finding}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width='16'
      height='16'
      fill='none'
      viewBox='0 0 16 16'
      className={`flex-shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${
        open ? 'rotate-180' : ''
      }`}
    >
      <path
        d='M4 6l4 4 4-4'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function FactsGrid({ evidence }: { evidence: RepoEvidence }) {
  const facts = [
    { label: 'Files scanned', value: String(evidence.totalFiles) },
    { label: 'Relevant files', value: String(evidence.relevantFiles.length) },
    {
      label: 'Package managers',
      value: evidence.packageManagers.join(', ') || 'None',
    },
    {
      label: 'Commands',
      value: evidence.detectedCommands.slice(0, 3).join(', ') || 'None',
    },
  ];

  return (
    <div className='grid gap-3 sm:grid-cols-4'>
      {facts.map((f) => (
        <div
          key={f.label}
          className='rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'
        >
          <p className='text-[12px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase'>
            {f.label}
          </p>
          <p className='mt-2 text-[14px] font-medium leading-[1.5] text-[var(--text-primary)]'>
            {f.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function DraftsSection({ report }: { report: ReadinessReport }) {
  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <div className='border-b border-[rgba(0,0,0,0.06)] px-6 py-4'>
        <h2 className='text-[17px] font-semibold text-[var(--text-primary)]'>
          Generated drafts
        </h2>
        <p className='mt-1 text-[13px] text-[var(--text-tertiary)]'>
          Ready to paste into your README or planning doc.
        </p>
      </div>
      <div className='divide-y divide-[rgba(0,0,0,0.04)] p-6'>
        <DraftBlock
          title='README Codex usage'
          value={report.readmeCodexUsage}
        />
        <DraftBlock
          title='3-minute demo outline'
          value={report.demoVideoScript}
        />
        <DraftBlock
          title='Judge testing instructions'
          value={report.judgeTestingInstructions}
        />
      </div>
    </div>
  );
}

function DraftBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className='py-4 first:pt-0 last:pb-0'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-[14px] font-semibold text-[var(--text-primary)]'>
          {title}
        </h3>
        <button
          type='button'
          onClick={() => void navigator.clipboard.writeText(value)}
          className='rounded-lg px-2.5 py-1 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[rgba(0,113,227,0.06)]'
        >
          Copy
        </button>
      </div>
      <pre className='mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--bg-secondary)] p-4 font-mono text-[12px] leading-[1.5] text-[var(--text-secondary)]'>
        {value}
      </pre>
    </div>
  );
}

function SubmissionPanel({ items }: { items: SubmissionItem[] }) {
  const readyCount = items.filter((i) => i.status === 'pass').length;

  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <div className='border-b border-[rgba(0,0,0,0.06)] px-5 py-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-[15px] font-semibold text-[var(--text-primary)]'>
            Submission readiness
          </h2>
          <span className='rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--text-secondary)]'>
            {readyCount}/{items.length}
          </span>
        </div>
      </div>
      <div className='divide-y divide-[rgba(0,0,0,0.04)]'>
        {items.map((item) => (
          <div key={item.label} className='px-5 py-3.5'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2.5'>
                <StatusDot status={item.status} />
                <span className='text-[14px] font-medium text-[var(--text-primary)]'>
                  {item.label}
                </span>
              </div>
              <StatusTag status={item.status} />
            </div>
            <p className='mt-1 pl-[22px] text-[12px] leading-[1.5] text-[var(--text-tertiary)]'>
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportPanel({
  markdown,
  projectName,
}: {
  markdown: string;
  projectName: string;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('error');
    }
  }

  function downloadReport() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugifyFileName(projectName)}-proofkit-report.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className='rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
      <div className='border-b border-[rgba(0,0,0,0.06)] px-5 py-4'>
        <h2 className='text-[15px] font-semibold text-[var(--text-primary)]'>
          Export report
        </h2>
        <p className='mt-1 text-[12px] text-[var(--text-tertiary)]'>
          Save the full checklist and evidence as Markdown.
        </p>
      </div>
      <div className='grid gap-2 p-5'>
        <button
          type='button'
          onClick={() => void copyReport()}
          className='flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[14px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]'
        >
          {copyStatus === 'copied' ? 'Copied' : 'Copy full report'}
        </button>
        <button
          type='button'
          onClick={downloadReport}
          className='flex h-10 items-center justify-center rounded-xl border border-[rgba(0,0,0,0.1)] text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]'
        >
          Download .md
        </button>
      </div>
      {copyStatus === 'error' && (
        <p className='px-5 pb-4 text-[12px] text-[var(--color-fail)]'>
          Clipboard blocked. Use Download instead.
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: RequirementStatus }) {
  const colors = {
    pass: 'bg-[var(--color-pass)]',
    warn: 'bg-[var(--color-warn)]',
    fail: 'bg-[var(--color-fail)]',
  };
  return (
    <div
      className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${colors[status]}`}
    />
  );
}

function StatusTag({ status }: { status: RequirementStatus }) {
  const styles = {
    pass: 'bg-[var(--color-pass-bg)] text-[#1a7f37]',
    warn: 'bg-[var(--color-warn-bg)] text-[#9a6700]',
    fail: 'bg-[var(--color-fail-bg)] text-[#cf222e]',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}
