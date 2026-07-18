import assert from "node:assert/strict";
import test from "node:test";
import {
  createHackathonProfile,
  defaultHackathonProfile,
  normalizeHackathonProfile,
} from "../lib/hackathon-brief";

test("normalizeHackathonProfile accepts a complete saved profile", () => {
  const profile = normalizeHackathonProfile({
    hackathonBrief: {
      hackathonName: "Launch Jam",
      deadline: "August 1, 2026 at 11:59 PM ET",
      requirementsText: "Public repo\nDemo video",
      judgingCriteriaText: "Originality\nTechnical implementation",
    },
    track: "AI Tools",
  });

  assert.deepEqual(profile, {
    hackathonBrief: {
      hackathonName: "Launch Jam",
      deadline: "August 1, 2026 at 11:59 PM ET",
      requirementsText: "Public repo\nDemo video",
      judgingCriteriaText: "Originality\nTechnical implementation",
    },
    track: "AI Tools",
  });
});

test("normalizeHackathonProfile rejects incomplete saved profiles", () => {
  assert.equal(normalizeHackathonProfile(null), null);
  assert.equal(normalizeHackathonProfile({}), null);
  assert.equal(
    normalizeHackathonProfile({
      hackathonBrief: {
        hackathonName: "Launch Jam",
        deadline: "August 1",
        requirementsText: "Public repo",
      },
      track: "AI Tools",
    }),
    null,
  );
});

test("createHackathonProfile strips null bytes and limits oversized saved text", () => {
  const profile = createHackathonProfile(
    {
      hackathonName: `Jam\u0000${"x".repeat(200)}`,
      deadline: "Soon",
      requirementsText: "r".repeat(7000),
      judgingCriteriaText: "c".repeat(5000),
    },
    "",
  );

  assert.equal(profile.hackathonBrief.hackathonName.length, 120);
  assert.equal(profile.hackathonBrief.hackathonName.includes("\u0000"), false);
  assert.equal(profile.hackathonBrief.requirementsText.length, 6000);
  assert.equal(profile.hackathonBrief.judgingCriteriaText.length, 4000);
  assert.equal(profile.track, defaultHackathonProfile.track);
});
