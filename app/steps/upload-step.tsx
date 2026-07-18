'use client';

import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from 'react';
import type { Step } from '../types';

type UploadStepProps = {
  isParsing: boolean;
  selectedSource: string;
  onZipUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onZipDrop: (file: File) => void;
  onLoadSample: () => void;
  onNext: () => void;
  hasEvidence: boolean;
  currentStep: Step;
};

export default function UploadStep({
  isParsing,
  selectedSource,
  onZipUpload,
  onZipDrop,
  onLoadSample,
  onNext,
  hasEvidence,
  currentStep,
}: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (currentStep !== 'upload') return null;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onZipDrop(file);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  return (
    <div className='step-enter flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6'>
      <div className='w-full max-w-xl text-center'>
        <div className='mb-3 text-[13px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase'>
          ProofKit
        </div>

        <h1 className='text-[40px] font-semibold leading-[1.1] tracking-[-0.022em] text-[var(--text-primary)]'>
          Is your project ready
          <br />
          to submit?
        </h1>

        <p className='mx-auto mt-4 max-w-md text-[17px] leading-[1.47] text-[var(--text-secondary)]'>
          Upload your project as a ZIP file. ProofKit scans your repo structure
          and generates a judge-facing readiness report.
        </p>

        <input
          ref={fileInputRef}
          className='sr-only'
          type='file'
          accept='.zip,application/zip,application/x-zip-compressed'
          onChange={onZipUpload}
        />

        <div
          role='button'
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mx-auto mt-10 flex max-w-md cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-14 outline-none transition-all duration-200 ${
            isDragging
              ? 'drop-zone-active'
              : 'border-[rgba(0,0,0,0.12)] bg-white hover:border-[var(--accent)] hover:bg-[rgba(0,113,227,0.02)]'
          } focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2`}
        >
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-secondary)]'>
            <svg
              width='24'
              height='24'
              fill='none'
              viewBox='0 0 24 24'
              className='text-[var(--text-secondary)]'
            >
              <path
                d='M12 16V4m0 0L8 8m4-4l4 4'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </div>

          {isParsing ? (
            <p className='mt-4 text-[15px] font-medium text-[var(--text-primary)]'>
              Reading your project…
            </p>
          ) : selectedSource ? (
            <>
              <p className='mt-4 text-[15px] font-medium text-[var(--text-primary)]'>
                {selectedSource}
              </p>
              <p className='mt-1 text-[13px] text-[var(--text-tertiary)]'>
                Drop another file to replace
              </p>
            </>
          ) : (
            <>
              <p className='mt-4 text-[15px] font-medium text-[var(--text-primary)]'>
                Drop your ZIP file here
              </p>
              <p className='mt-1 text-[13px] text-[var(--text-tertiary)]'>
                or click to browse
              </p>
            </>
          )}
        </div>

        <div className='mx-auto mt-6 flex max-w-md items-center justify-center gap-4'>
          <button
            type='button'
            onClick={onLoadSample}
            className='text-[15px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]'
          >
            Try with sample project
          </button>
          <span className='text-[var(--text-tertiary)]'>·</span>
          <a
            href='/api/sample-zip'
            download='beaconboard-sample.zip'
            className='text-[15px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]'
          >
            Download sample
          </a>
        </div>

        {hasEvidence && (
          <div className='mt-12'>
            <button
              type='button'
              onClick={onNext}
              className='inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-[15px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]'
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
