import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceFromFiles, classifyFile, createStoredZip, parseZipBytes, sampleFiles } from "../lib/proofkit-core";

test("classifies key repository evidence files", () => {
  assert.equal(classifyFile("README.md"), "readme");
  assert.equal(classifyFile("package.json"), "manifest");
  assert.equal(classifyFile("LICENSE"), "license");
  assert.equal(classifyFile("tests/parser.test.ts"), "test");
  assert.equal(classifyFile("docs/demo-script.md"), "demo-notes");
  assert.equal(classifyFile("src/app/page.tsx"), null);
});

test("parses a ZIP with README, package manifest, license, and tests", async () => {
  const zip = createStoredZip(
    sampleFiles.map((file) => ({
      path: file.path,
      content: file.content ?? "",
    })),
  );

  const evidence = await parseZipBytes("sample.zip", new Uint8Array(zip));
  const relevantPaths = evidence.relevantFiles.map((file) => file.path);

  assert.equal(evidence.sourceName, "sample.zip");
  assert.equal(evidence.totalFiles, sampleFiles.length);
  assert.ok(relevantPaths.includes("README.md"));
  assert.ok(relevantPaths.includes("package.json"));
  assert.ok(relevantPaths.includes("LICENSE"));
  assert.ok(relevantPaths.includes("tests/parser.test.ts"));
  assert.ok(evidence.detectedCommands.includes("npm run test"));
  assert.ok(evidence.detectedFrameworks.includes("Next.js"));
});

test("surfaces missing README as absent evidence instead of inventing it", async () => {
  const zip = createStoredZip([
    {
      path: "package.json",
      content: '{"scripts":{"dev":"next dev"}}',
    },
  ]);

  const evidence = await parseZipBytes("missing-readme.zip", new Uint8Array(zip));

  assert.equal(evidence.totalFiles, 1);
  assert.equal(evidence.relevantFiles.some((file) => file.kind === "readme"), false);
  assert.deepEqual(evidence.detectedCommands, ["npm run dev"]);
});

test("detects multiple package managers from lockfiles", async () => {
  const zip = createStoredZip([
    { path: "README.md", content: "# Locks" },
    { path: "package.json", content: '{"scripts":{"build":"next build"}}' },
    { path: "package-lock.json", content: "{}" },
    { path: "pnpm-lock.yaml", content: "lockfileVersion: 9" },
    { path: "yarn.lock", content: "# yarn" },
  ]);

  const evidence = await parseZipBytes("locks.zip", new Uint8Array(zip));

  assert.deepEqual(evidence.packageManagers, ["npm", "pnpm", "yarn"]);
});

test("records large relevant files without sending their full content", async () => {
  const zip = createStoredZip([
    {
      path: "README.md",
      content: `# Big\n${"x".repeat(260_000)}`,
    },
  ]);

  const evidence = await parseZipBytes("large.zip", new Uint8Array(zip));
  const readme = evidence.relevantFiles.find((file) => file.path === "README.md");

  assert.ok(readme);
  assert.equal(readme.content, undefined);
  assert.equal(readme.note, "Large file skipped after recording path and size.");
});

test("builds evidence from in-memory sample files", () => {
  const evidence = buildEvidenceFromFiles("sample", sampleFiles);

  assert.equal(evidence.totalFiles, sampleFiles.length);
  assert.ok(evidence.detectedCommands.includes("npm run dev"));
  assert.ok(evidence.detectedCommands.includes("npm run test"));
});
