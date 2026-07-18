'use client';

import type { HackathonBrief, Step } from '../types';

type RequirementsStepProps = {
  currentStep: Step;
  hackathonBrief: HackathonBrief;
  track: string;
  projectName: string;
  repoUrl: string;
  demoUrl: string;
  feedbackSessionId: string;
  onUpdateBrief: <K extends keyof HackathonBrief>(
    key: K,
    value: HackathonBrief[K],
  ) => void;
  onTrackChange: (value: string) => void;
  onProjectNameChange: (value: string) => void;
  onRepoUrlChange: (value: string) => void;
  onDemoUrlChange: (value: string) => void;
  onFeedbackIdChange: (value: string) => void;
  onBack: () => void;
  onAnalyze: () => void;
};

export default function RequirementsStep({
  currentStep,
  hackathonBrief,
  track,
  projectName,
  repoUrl,
  demoUrl,
  feedbackSessionId,
  onUpdateBrief,
  onTrackChange,
  onProjectNameChange,
  onRepoUrlChange,
  onDemoUrlChange,
  onFeedbackIdChange,
  onBack,
  onAnalyze,
}: RequirementsStepProps) {
  if (currentStep !== 'requirements') return null;

  return (
    <div className='step-enter mx-auto max-w-2xl px-6 py-16'>
      <button
        type='button'
        onClick={onBack}
        className='mb-8 flex items-center gap-1.5 text-[15px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]'
      >
        <svg width='16' height='16' fill='none' viewBox='0 0 16 16'>
          <path
            d='M10 12L6 8l4-4'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
        Back
      </button>

      <h1 className='text-[32px] font-semibold leading-[1.12] tracking-[-0.022em] text-[var(--text-primary)]'>
        Hackathon details
      </h1>
      <p className='mt-3 text-[17px] leading-[1.47] text-[var(--text-secondary)]'>
        Tell us about the hackathon so we can tailor the readiness report to its
        requirements.
      </p>

      <div className='mt-10 space-y-8'>
        <Section title='Event'>
          <div className='grid gap-5 sm:grid-cols-2'>
            <InputField
              label='Hackathon name'
              value={hackathonBrief.hackathonName}
              onChange={(v) => onUpdateBrief('hackathonName', v)}
            />
            <InputField
              label='Deadline'
              value={hackathonBrief.deadline}
              onChange={(v) => onUpdateBrief('deadline', v)}
              placeholder='July 21, 2026 at 5:00 PM PT'
            />
          </div>
        </Section>

        <Section title='Project'>
          <div className='grid gap-5 sm:grid-cols-2'>
            <InputField
              label='Project name'
              value={projectName}
              onChange={onProjectNameChange}
            />
            <InputField
              label='Track / category'
              value={track}
              onChange={onTrackChange}
            />
          </div>
          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <InputField
              label='Repository URL'
              value={repoUrl}
              onChange={onRepoUrlChange}
              placeholder='https://github.com/…'
            />
            <InputField
              label='Demo video URL'
              value={demoUrl}
              onChange={onDemoUrlChange}
              placeholder='https://youtube.com/…'
            />
          </div>
          <div className='mt-5'>
            <InputField
              label='Feedback session ID'
              value={feedbackSessionId}
              onChange={onFeedbackIdChange}
              placeholder='sess_…'
            />
          </div>
        </Section>

        <Section title='Requirements & Criteria'>
          <TextArea
            label='Hackathon requirements'
            value={hackathonBrief.requirementsText}
            onChange={(v) => onUpdateBrief('requirementsText', v)}
            rows={6}
            hint='One per line. These become your custom checklist items.'
          />
          <div className='mt-5'>
            <TextArea
              label='Judging criteria'
              value={hackathonBrief.judgingCriteriaText}
              onChange={(v) => onUpdateBrief('judgingCriteriaText', v)}
              rows={4}
              hint='The dimensions judges will score on.'
            />
          </div>
        </Section>
      </div>

      <div className='mt-12 flex items-center justify-end gap-4'>
        <button
          type='button'
          onClick={onBack}
          className='h-12 rounded-full px-6 text-[15px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]'
        >
          Back
        </button>
        <button
          type='button'
          onClick={onAnalyze}
          className='inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-[15px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]'
        >
          Generate report
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className='mb-4 text-[13px] font-semibold tracking-wide text-[var(--text-tertiary)] uppercase'>
        {title}
      </h2>
      <div className='rounded-2xl bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'>
        {children}
      </div>
    </div>
  );
}

function InputField({
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
    <label className='block'>
      <span className='mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]'>
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className='w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-[15px] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]'
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  rows,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className='block'>
      <span className='mb-1.5 block text-[13px] font-medium text-[var(--text-secondary)]'>
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className='w-full resize-y rounded-lg border border-[rgba(0,0,0,0.1)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-[15px] leading-[1.5] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[rgba(0,113,227,0.15)]'
      />
      {hint && (
        <span className='mt-1 block text-[12px] text-[var(--text-tertiary)]'>
          {hint}
        </span>
      )}
    </label>
  );
}
