'use client';

import { useEffect, useState } from 'react';
import type { Step } from '../types';

type AnalyzingStepProps = {
  currentStep: Step;
  projectName: string;
};

const phases = [
  'Reading file structure…',
  'Scanning manifests and dependencies…',
  'Checking setup commands…',
  'Evaluating test coverage…',
  'Matching hackathon requirements…',
  'Building readiness report…',
];

export default function AnalyzingStep({
  currentStep,
  projectName,
}: AnalyzingStepProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (currentStep !== 'analyzing') {
      setPhaseIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(timer);
  }, [currentStep]);

  if (currentStep !== 'analyzing') return null;

  const progress = Math.min(((phaseIndex + 1) / phases.length) * 100, 95);

  return (
    <div className='step-enter flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6'>
      <div className='w-full max-w-sm text-center'>
        <div className='analyze-ring mx-auto' />

        <h2 className='mt-8 text-[24px] font-semibold tracking-[-0.022em] text-[var(--text-primary)]'>
          Analyzing {projectName}
        </h2>

        <p className='mt-3 text-[15px] text-[var(--text-secondary)]'>
          {phases[phaseIndex]}
        </p>

        <div className='mx-auto mt-8 h-1 max-w-xs overflow-hidden rounded-full bg-[rgba(0,0,0,0.06)]'>
          <div
            className='progress-fill h-full rounded-full bg-[var(--accent)]'
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className='mt-4 text-[12px] text-[var(--text-tertiary)]'>
          This usually takes a few seconds
        </p>
      </div>
    </div>
  );
}
