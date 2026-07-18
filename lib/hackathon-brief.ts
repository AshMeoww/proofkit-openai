export type HackathonBrief = {
  hackathonName: string;
  deadline: string;
  requirementsText: string;
  judgingCriteriaText: string;
};

export type HackathonProfile = {
  hackathonBrief: HackathonBrief;
  track: string;
};

export const hackathonProfileStorageKey = "proofkit:hackathon-profile:v1";

export const defaultHackathonBrief: HackathonBrief = {
  hackathonName: "OpenAI Global Build Week — Manila",
  deadline: "July 18, 2026 at 5:00 PM PHT",
  requirementsText: [
    "[Gate] Clean start — code, prototypes, and design artifacts begin on Saturday",
    "[Gate] Runs live — the project itself runs during review (no video/slides/mockup substitutes)",
    "[Gate] Claims have evidence — if a feature or Codex contribution cannot be shown, judges score as though the claim was not made",
    "Public repository link",
    "Clear README with install and test path for judges",
    "Explanation of how Codex was used (specific artifacts, sessions, decisions)",
    "/feedback Codex Session ID",
    "Public demo video under 3 minutes",
    "Relevant open-source license",
  ].join("\n"),
  judgingCriteriaText: [
    "Codex Craft (10 pts) — Did the team use Codex deeply, appropriately, and demonstrably? Look for: specific artifacts, sessions, decisions, steering, recovery from failure, and visible payoff.",
    "Product Judgment (10 pts) — Did the team choose the right scope and turn it into one coherent, complete core experience? Look for: a clear job, deliberate priorities, sensible boundaries, and cuts that protect the core.",
    "Problem & Insight (10 pts) — Is the project grounded in a specific problem and audience, with a thoughtful or non-obvious approach? Look for: a named audience, evidence or firsthand knowledge, a solution aimed at the cause of the pain.",
  ].join("\n"),
};

export const defaultHackathonProfile: HackathonProfile = {
  hackathonBrief: defaultHackathonBrief,
  track: "Developer Tools",
};

export function normalizeHackathonProfile(value: unknown): HackathonProfile | null {
  if (!isRecord(value) || !isRecord(value.hackathonBrief)) {
    return null;
  }

  const hackathonBrief = normalizeHackathonBrief(value.hackathonBrief);
  if (!hackathonBrief || typeof value.track !== "string") {
    return null;
  }

  return {
    hackathonBrief,
    track: limitText(value.track, 80) || defaultHackathonProfile.track,
  };
}

export function createHackathonProfile(hackathonBrief: HackathonBrief, track: string): HackathonProfile {
  return {
    hackathonBrief: normalizeHackathonBrief(hackathonBrief) ?? defaultHackathonBrief,
    track: limitText(track, 80) || defaultHackathonProfile.track,
  };
}

function normalizeHackathonBrief(value: Record<string, unknown>): HackathonBrief | null {
  if (
    typeof value.hackathonName !== "string" ||
    typeof value.deadline !== "string" ||
    typeof value.requirementsText !== "string" ||
    typeof value.judgingCriteriaText !== "string"
  ) {
    return null;
  }

  return {
    hackathonName: limitText(value.hackathonName, 120),
    deadline: limitText(value.deadline, 120),
    requirementsText: limitText(value.requirementsText, 6000),
    judgingCriteriaText: limitText(value.judgingCriteriaText, 4000),
  };
}

function limitText(value: string, maxLength: number): string {
  return value.replace(/\u0000/g, "").slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
