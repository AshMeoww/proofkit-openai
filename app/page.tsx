import Link from "next/link";

const readinessChecks = [
  { label: "Working project", status: "PASS", tone: "pass" },
  { label: "Public repository link", status: "FAIL", tone: "fail" },
  { label: "Clear README", status: "PASS", tone: "pass" },
  { label: "Public demo video", status: "FAIL", tone: "fail" },
  { label: "Codex/GPT-5.6 explanation", status: "FAIL", tone: "fail" },
  { label: "Install and test path", status: "PASS", tone: "pass" },
];

const workflowSteps = [
  "Upload a project ZIP",
  "Extract README, manifests, tests, licenses, and docs",
  "Customize hackathon requirements and judging criteria",
  "Generate a GPT-5.6 readiness report",
  "Export README copy, demo script, and judge test steps",
];

const featureCards = [
  {
    eyebrow: "Local-first evidence",
    title: "Scan the repo before you ask the model.",
    body: "ProofKit parses the ZIP in-browser, keeps source files local, and sends only compact evidence to the analysis route.",
  },
  {
    eyebrow: "Hackathon-aware",
    title: "Paste the rules for any event.",
    body: "Swap the default OpenAI Build Week preset for another hackathon’s deadline, requirements, tracks, and judging rubric.",
  },
  {
    eyebrow: "Judge-ready output",
    title: "Turn gaps into copyable deliverables.",
    body: "Get a checklist, risk list, README Codex/GPT usage section, demo outline, and testing instructions in one exportable report.",
  },
];

const codeSample = `const report = await proofkit.analyze({
  source: "FINSHARC-main.zip",
  hackathon: "OpenAI Build Week",
  evidence: ["README.md", "package.json", "docs/TESTING.md"],
});

return report.blockers;
// ["repo url", "demo video", "Codex usage", "license"]`;

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07110d] text-[#f3f7ef]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#2f6b4f55,transparent_34%),radial-gradient(circle_at_78%_18%,#7dd3fc22,transparent_28%),linear-gradient(135deg,#07110d,#101917_48%,#15130f)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_520px] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-emerald-100/80">
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_#6ee7b7]" />
              Built for builders before judges click run
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Catch submission blockers before they cost you points.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              ProofKit turns a project ZIP into a hackathon readiness report: runnable evidence, missing-risk items,
              README improvements, demo-script guidance, and judge testing steps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#d9f99d] px-5 py-3 text-center text-sm font-bold text-[#102016] shadow-[0_18px_60px_#bef26426] transition hover:translate-y-[-1px] hover:bg-[#ecfccb]"
              >
                Scan a project ZIP
              </Link>
              <a
                href="#example"
                className="rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                View report preview
              </a>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <Stat value="49/100" label="sample score surfaced" />
              <Stat value="565" label="files scanned" />
              <Stat value="66" label="evidence files captured" />
            </div>
          </div>

          <section id="example" className="relative">
            <div className="absolute -inset-8 rounded-[2rem] bg-emerald-300/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#0d1713]/90 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-100/55">
                    Readiness report
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">finsharc-mobile</h2>
                </div>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-mono text-xs text-amber-100">
                  49 / 100
                </span>
              </div>
              <div className="grid gap-4 p-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-semibold tracking-[-0.06em] text-white">49</span>
                    <span className="pb-2 text-lg text-white/45">/100</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/62">
                    Local evidence scan found setup, README, tests, and commands — but repo URL, demo video, license,
                    feedback ID, and Codex usage still block submission confidence.
                  </p>
                </div>
                <div className="grid gap-2">
                  {readinessChecks.map((check) => (
                    <div
                      key={check.label}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"
                    >
                      <span className="text-sm text-white/72">{check.label}</span>
                      <span
                        className={`rounded-md px-2 py-1 font-mono text-[11px] ${
                          check.tone === "pass"
                            ? "bg-emerald-300/10 text-emerald-100"
                            : "bg-red-300/10 text-red-100"
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
                <pre className="overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#06100c] p-4 font-mono text-xs leading-6 text-emerald-100/72">
                  {codeSample}
                </pre>
              </div>
            </div>
          </section>
        </section>

        <section id="workflow" className="grid gap-6 border-t border-white/10 py-14 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-100/55">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">A submission QA loop for teams moving fast.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <span className="font-mono text-xs text-emerald-100/50">0{index + 1}</span>
                <p className="mt-4 text-sm font-medium leading-6 text-white/78">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-4 pb-16 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-100/50">{feature.eyebrow}</p>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/62">{feature.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/50">{label}</p>
    </div>
  );
}
