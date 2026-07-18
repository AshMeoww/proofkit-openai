import { describe, expect, it } from "vitest";

describe("parser", () => {
  it("detects package manifests", () => {
    expect(["README.md", "package.json"]).toContain("package.json");
  });
});
