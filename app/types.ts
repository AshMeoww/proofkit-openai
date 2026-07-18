export type RequirementStatus = 'pass' | 'warn' | 'fail';

export type RequirementItem = {
  id: string;
  label: string;
  status: RequirementStatus;
  evidence: string;
  action: string;
};

export type ReadinessReport = {
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
    confidence: 'high' | 'medium' | 'low';
  }[];
};

export type AnalyzeResponse =
  | { report: ReadinessReport; model: string }
  | { error: string; setup?: string };

export type SubmissionItem = {
  label: string;
  status: RequirementStatus;
  detail: string;
};

export type { HackathonBrief } from '@/lib/hackathon-brief';

export type Step = 'upload' | 'requirements' | 'analyzing' | 'report';
