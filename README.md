# ProofKit

ProofKit is a local-first Build Week submission readiness scanner for the Developer Tools track. It lets a builder upload a project ZIP, extracts repository evidence in the browser, and asks GPT-5.6 for a judge-facing readiness report.

## What it checks

- Working project evidence from manifests, setup scripts, lockfiles, and commands.
- Developer Tools track alignment.
- Public repo, README, demo video, Codex/GPT-5.6 explanation, `/feedback` session ID, and install/test path.
- Technical implementation signals: setup clarity, runnable commands, testability, and product completeness.
- Missing-risk items that could block judging.
- Draft README Codex usage section, 3-minute demo outline, and judge testing instructions.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Set `OPENAI_API_KEY` in `.env.local` to enable the GPT-5.6 report. `OPENAI_MODEL` defaults to `gpt-5.6`.

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6
```

The dashboard still performs a local evidence scan when the API key is missing.

## Judge testing path

1. Run `npm install`.
2. Create `.env.local` with `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6`.
3. Run `npm run dev`.
4. Open http://localhost:3000.
5. Click `Load bundled sample`.
6. Optionally click `Download sample ZIP`, then upload that ZIP to verify the file path.
7. Click `Generate GPT-5.6 report`.
8. Review the score, Devpost readiness panel, checklist, evidence table, README section, demo script, and judge testing instructions.
9. Use `Copy full report` or `Download .md` to export the judge-facing handoff.

You can also upload any repository ZIP. ProofKit parses the file tree locally and extracts relevant text evidence before sending a compact summary to the server route.

## Supported platforms

- Windows, macOS, or Linux with Node.js 20.9 or newer.
- A modern Chromium, Edge, Safari, or Firefox browser with ZIP decompression support.
- Local Next.js development or any Node-compatible deployment target that can provide `OPENAI_API_KEY`.

## Bundled sample

The app includes an in-memory sample project called BeaconBoard so judges can test without providing their own ZIP. The same sample is represented under `samples/beaconboard/` for review and can be zipped manually if a file-upload test is preferred.

## How Codex and GPT-5.6 were used

Codex was used to plan, implement, debug, and polish ProofKit, including the repository scanner, upload flow, API route, and dashboard copy. GPT-5.6 is used by the app through the OpenAI Responses API to turn summarized repository evidence into a structured readiness report, README improvement guidance, demo script, and judge testing path.

## Privacy and limitations

- ZIP parsing happens in the browser. Only the compact repository summary is sent to `/api/analyze`.
- `.env.local` is intentionally ignored by git. Do not commit API keys.
- ProofKit does not execute uploaded code. It reviews file evidence and generated instructions, so it should be treated as a readiness assistant rather than a security sandbox.
- Very large files are summarized by path, kind, and size instead of full content.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Build Week submission notes

- Track: Developer Tools.
- Deadline target: July 21, 2026 at 5:00 PM PT.
- Include a public repo link, open-source license, public YouTube demo under 3 minutes with audio, and `/feedback` Codex Session ID in the final Devpost submission.
- The demo should show the bundled sample path, one uploaded ZIP path, the generated report, and where GPT-5.6 is called in the code.
- The Devpost description should explicitly say ProofKit helps hackathon builders avoid incomplete, untestable submissions.
