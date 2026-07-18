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
  hackathonName: "OpenAI Build Week",
  deadline: "July 21, 2026 at 5:00 PM PT",
  requirementsText: [
    "Working project",
    "Selected category or track",
    "Public repository link",
    "Clear README",
    "Public demo video under 3 minutes",
    "Explanation of how Codex/GPT-5.6 were used",
    "/feedback Codex Session ID",
    "Install and test path for judges",
    "Relevant open-source license",
  ].join("\n"),
  judgingCriteriaText: [
    "Technological Implementation",
    "Design",
    "Potential Impact",
    "Quality of Idea",
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
