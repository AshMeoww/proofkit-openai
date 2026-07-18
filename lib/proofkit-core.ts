export type EvidenceFile = {
  path: string;
  kind: string;
  size: number;
  content?: string;
  note?: string;
};

export type RepoEvidence = {
  sourceName: string;
  generatedAt: string;
  fileTree: string[];
  relevantFiles: EvidenceFile[];
  packageManagers: string[];
  detectedCommands: string[];
  detectedFrameworks: string[];
  totalFiles: number;
  omittedFiles: number;
};

export const sampleFiles: EvidenceFile[] = [
  {
    path: "README.md",
    kind: "readme",
    size: 2840,
    content:
      "# BeaconBoard\n\nA Developer Tools dashboard that turns build logs into a launch checklist.\n\n## Setup\n\n```bash\nnpm install\nnpm run dev\nnpm test\n```\n\nOpen http://localhost:3000 and upload a JSON build log.\n\n## Built with Codex and GPT-5.6\n\nCodex helped scaffold the repository, write parser tests, and iterate on the dashboard layout. GPT-5.6 is used in the app to summarize build failures into a release checklist.\n\n## Demo\n\nA public demo video will be linked before submission.\n",
  },
  {
    path: "package.json",
    kind: "manifest",
    size: 516,
    content: `{
  "name": "beaconboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
`,
  },
  {
    path: "LICENSE",
    kind: "license",
    size: 1080,
    content: "MIT License\n\nCopyright (c) 2026 BeaconBoard contributors\n",
  },
  {
    path: "docs/demo-script.md",
    kind: "demo-notes",
    size: 620,
    content:
      "# Demo Notes\n\nShow upload, explain how GPT-5.6 turns repo evidence into judging guidance, and close with test commands.\n",
  },
  {
    path: "tests/parser.test.ts",
    kind: "test",
    size: 740,
    content:
      'import { describe, expect, it } from "vitest";\n\ndescribe("parser", () => {\n  it("detects package manifests", () => {\n    expect(["README.md", "package.json"]).toContain("package.json");\n  });\n});\n',
  },
  {
    path: ".env.example",
    kind: "setup",
    size: 64,
    content: "OPENAI_API_KEY=\nOPENAI_MODEL=gpt-5.6\n",
  },
];

export function buildEvidenceFromFiles(sourceName: string, files: EvidenceFile[]): RepoEvidence {
  return decorateEvidence({
    sourceName,
    generatedAt: new Date().toISOString(),
    fileTree: files.map((file) => file.path),
    relevantFiles: files,
    packageManagers: [],
    detectedCommands: [],
    detectedFrameworks: [],
    totalFiles: files.length,
    omittedFiles: 0,
  });
}

export async function parseZipBytes(sourceName: string, bytes: Uint8Array): Promise<RepoEvidence> {
  const entries = readZipCentralDirectory(bytes);
  const relevantFiles: EvidenceFile[] = [];
  const fileTree: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    fileTree.push(entry.path);
    const kind = classifyFile(entry.path);
    if (!kind && relevantFiles.length > 160) {
      continue;
    }

    if (kind) {
      const extracted = await safeExtractZipEntry(bytes, entry);
      relevantFiles.push({
        path: entry.path,
        kind,
        size: entry.uncompressedSize,
        content: extracted.text,
        note: extracted.note,
      });
    }
  }

  return decorateEvidence({
    sourceName,
    generatedAt: new Date().toISOString(),
    fileTree: fileTree.slice(0, 500),
    relevantFiles,
    packageManagers: [],
    detectedCommands: [],
    detectedFrameworks: [],
    totalFiles: fileTree.length,
    omittedFiles: Math.max(0, fileTree.length - 500),
  });
}

export function classifyFile(path: string): string | null {
  const lower = path.toLowerCase();
  const base = lower.split("/").at(-1) ?? lower;

  if (base.startsWith("readme")) return "readme";
  if (base === "license" || base.startsWith("license.")) return "license";
  if (["package.json", "pyproject.toml", "requirements.txt", "cargo.toml", "go.mod", "composer.json"].includes(base)) {
    return "manifest";
  }
  if (["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"].includes(base)) return "lockfile";
  if (base.includes("test") || base.includes("spec") || lower.includes("/test/") || lower.includes("/tests/")) return "test";
  if (base === "dockerfile" || base === "makefile" || base.endsWith(".sh") || base.endsWith(".ps1")) return "setup";
  if (lower.includes("demo") || lower.includes("screenshot") || lower.includes("feedback")) return "demo-notes";
  if (["tsconfig.json", "vitest.config.ts", "jest.config.ts", "playwright.config.ts", ".env.example"].includes(base)) {
    return "config";
  }

  return null;
}

export function createStoredZip(files: { path: string; content: string }[]): ArrayBuffer {
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encodeUtf8(file.path);
    const data = encodeUtf8(file.content);
    const crc = crc32(data);
    const localHeader = bytes([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
    ]);
    const localOffset = offset;

    chunks.push(localHeader, name, data);
    offset += localHeader.length + name.length + data.length;

    centralDirectory.push(
      bytes([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(0x0800),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(name.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(localOffset),
      ]),
      name,
    );
  }

  const centralStart = offset;
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = bytes([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0),
  ]);
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0) + centralSize + endRecord.length;
  const output = new Uint8Array(new ArrayBuffer(totalSize));
  let cursor = 0;

  for (const chunk of [...chunks, ...centralDirectory, endRecord]) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }

  return output.buffer;
}

function decorateEvidence(evidence: RepoEvidence): RepoEvidence {
  const paths = evidence.fileTree.map((path) => path.toLowerCase());
  const packageManagers = [
    paths.some((path) => path.endsWith("package-lock.json")) ? "npm" : "",
    paths.some((path) => path.endsWith("pnpm-lock.yaml")) ? "pnpm" : "",
    paths.some((path) => path.endsWith("yarn.lock")) ? "yarn" : "",
    paths.some((path) => path.endsWith("bun.lockb") || path.endsWith("bun.lock")) ? "bun" : "",
    paths.some((path) => path.endsWith("requirements.txt") || path.endsWith("pyproject.toml")) ? "python" : "",
  ].filter(Boolean);

  const packageFile = evidence.relevantFiles.find((file) => file.path.toLowerCase().endsWith("package.json"));
  const scripts = packageFile?.content ? parsePackageScripts(packageFile.content) : [];
  const detectedFrameworks = [
    packageFile?.content?.includes('"next"') ? "Next.js" : "",
    packageFile?.content?.includes('"vite"') ? "Vite" : "",
    packageFile?.content?.includes('"react"') ? "React" : "",
    paths.some((path) => path.endsWith("pyproject.toml")) ? "Python" : "",
  ].filter(Boolean);

  return {
    ...evidence,
    packageManagers,
    detectedCommands: scripts.map((script) => `npm run ${script}`),
    detectedFrameworks,
  };
}

function parsePackageScripts(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { scripts?: Record<string, unknown> };
    if (!parsed.scripts) {
      return [];
    }
    return Object.keys(parsed.scripts);
  } catch {
    return [];
  }
}

type ZipEntry = {
  path: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  isDirectory: boolean;
  encrypted: boolean;
};

function readZipCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) {
    throw new Error("This does not look like a ZIP file.");
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("ZIP central directory is malformed.");
    }

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLength);
    const rawPath = decodeText(nameBytes).replaceAll("\\", "/");
    const path = normalizeZipPath(rawPath);

    if (path) {
      entries.push({
        path,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
        isDirectory: rawPath.endsWith("/"),
        encrypted: Boolean(flags & 1),
      });
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view: DataView): number {
  const maxCommentLength = 0xffff;
  const minOffset = Math.max(0, view.byteLength - maxCommentLength - 22);

  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

async function safeExtractZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<{ text?: string; note?: string }> {
  try {
    return await extractZipEntry(bytes, entry);
  } catch (error) {
    return {
      note: `Could not read file contents: ${error instanceof Error ? error.message : "unknown ZIP extraction error"}.`,
    };
  }
}

async function extractZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<{ text?: string; note?: string }> {
  if (entry.encrypted) {
    return { note: "Encrypted file skipped." };
  }

  if (entry.uncompressedSize > 250_000) {
    return { note: "Large file skipped after recording path and size." };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = entry.localHeaderOffset;

  if (view.getUint32(offset, true) !== 0x04034b50) {
    return { note: "Local file header was not readable." };
  }

  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return { text: decodeText(compressed).slice(0, 20_000) };
  }

  if (entry.compressionMethod === 8) {
    if (!("DecompressionStream" in globalThis)) {
      return { note: "Deflated file found, but this browser cannot decompress ZIP entries." };
    }

    const buffer = new ArrayBuffer(compressed.byteLength);
    new Uint8Array(buffer).set(compressed);
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
    return { text: decodeText(inflated).slice(0, 20_000) };
  }

  return { note: `Unsupported ZIP compression method ${entry.compressionMethod}.` };
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeZipPath(path: string): string {
  return path.replaceAll("\\", "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytes(values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
