import Link from "next/link";

const readinessChecks = [
  { label: "Working project", status: "PASS", tone: "pass" as const },
  { label: "Public repository link", status: "FAIL", tone: "fail" as const },
  { label: "Clear README", status: "PASS", tone: "pass" as const },
  { label: "Public demo video", status: "FAIL", tone: "fail" as const },
  { label: "Codex/GPT-5.6 explanation", status: "FAIL", tone: "fail" as const },
  { label: "Install and test path", status: "PASS", tone: "pass" as const },
];

const workflowSteps = [
  { num: "01", text: "Upload a project ZIP" },
  { num: "02", text: "Extract README, manifests, tests, licenses, and docs" },
  { num: "03", text: "Customize hackathon requirements and judging criteria" },
  { num: "04", text: "Generate a GPT-5.6 readiness report" },
  { num: "05", text: "Export README copy, demo script, and judge test steps" },
];

const featureCards = [
  {
    eyebrow: "Local-first",
    title: "Scan the repo before you ask the model.",
    body: "ProofKit parses the ZIP in-browser, keeps source files local, and sends only compact evidence to the analysis route.",
  },
  {
    eyebrow: "Hackathon-aware",
    title: "Paste the rules for any event.",
    body: "Swap the default OpenAI Build Week preset for another hackathon deadline, requirements, tracks, and judging rubric.",
  },
  {
    eyebrow: "Judge-ready",
    title: "Turn gaps into copyable deliverables.",
    body: "Get a checklist, risk list, README Codex usage section, demo outline, and testing instructions in one exportable report.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <nav className="sticky top-0 z-10 border-b border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">ProofKit</span>
          <Link
            href="/dashboard"
            className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]"
          >
            Open Scanner
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 lg:pt-32">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-[var(--accent)] uppercase">
              Submission readiness scanner
            </p>
            <h1 className="mt-4 text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[56px]">
              Catch blockers before they cost you points.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-[1.47] text-[var(--text-secondary)]">
              ProofKit turns a project ZIP into a hackathon readiness report &mdash; runnable evidence,
              missing-risk items, README improvements, and judge testing steps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-7 text-[15px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
              >
                Scan a project
              </Link>
              <a
                href="#preview"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[rgba(0,0,0,0.12)] px-7 text-[15px] font-medium text-[var(--text-primary)] transition-colors hover:bg-white"
              >
                See a report preview
              </a>
            </div>
          </div>

          <div id="preview" className="relative">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_8px_40px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
                <div>
                  <p className="text-[12px] font-medium tracking-wide text-[var(--text-tertiary)] uppercase">Readiness report</p>
                  <h2 className="mt-0.5 text-[17px] font-semibold">finsharc-mobile</h2>
                </div>
                <span className="rounded-full bg-[var(--color-warn-bg)] px-3 py-1 text-[12px] font-semibold text-[#9a6700]">
                  49 / 100
                </span>
              </div>
              <div className="space-y-3 p-5">
                <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-[40px] font-semibold leading-none tracking-[-0.03em]">49</span>
                    <span className="pb-1 text-[15px] text-[var(--text-tertiary)]">/100</span>
                  </div>
                  <p className="mt-3 text-[13px] leading-[1.46] text-[var(--text-secondary)]">
                    Local scan found setup, README, and tests &mdash; but repo URL, demo video,
                    license, and Codex usage still need attention.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {readinessChecks.map((check) => (
                    <div key={check.label} className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3.5 py-2.5">
                      <span className="text-[13px] text-[var(--text-secondary)]">{check.label}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${check.tone === "pass" ? "bg-[var(--color-pass-bg)] text-[#1a7f37]" : "bg-[var(--color-fail-bg)] text-[#cf222e]"}`}>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(0,0,0,0.06)] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[13px] font-medium tracking-wide text-[var(--accent)] uppercase">How it works</p>
          <h2 className="mt-3 max-w-md text-[32px] font-semibold leading-[1.12] tracking-[-0.022em]">
            A QA loop for teams moving fast.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-5">
            {workflowSteps.map((step) => (
              <div key={step.num} className="rounded-2xl bg-[var(--bg-secondary)] p-5">
                <span className="text-[12px] font-semibold text-[var(--accent)]">{step.num}</span>
                <p className="mt-3 text-[14px] font-medium leading-[1.43] text-[var(--text-primary)]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(0,0,0,0.06)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((feature) => (
              <article key={feature.title} className="rounded-2xl bg-white p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="text-[12px] font-semibold tracking-wide text-[var(--accent)] uppercase">{feature.eyebrow}</p>
                <h3 className="mt-3 text-[19px] font-semibold leading-[1.26] tracking-[-0.01em]">{feature.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.57] text-[var(--text-secondary)]">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(0,0,0,0.06)] bg-white py-20">
        <div className="mx-auto max-w-lg px-6 text-center">
          <h2 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.022em]">
            Ready to check your project?
          </h2>
          <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
            Upload a ZIP, configure your hackathon requirements, and get a judge-facing readiness report in seconds.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-[15px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-[rgba(0,0,0,0.06)] py-6">
        <p className="text-center text-[12px] text-[var(--text-tertiary)]">
          ProofKit &mdash; Hackathon submission readiness scanner
        </p>
      </footer>
    </main>
  );
}
