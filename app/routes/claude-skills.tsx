import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Bug,
  Check,
  ClipboardCopy,
  Download,
  FileText,
  FolderTree,
  Github,
  ListChecks,
  Lock,
  Package,
  PlayCircle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Tags,
  Terminal,
} from "lucide-react"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"

const MARKETPLACE_REPO = "lucciii33/OliviaIA-skills"
const MARKETPLACE_NAME = "olivia-skils"
const PLUGIN_NAME = "olivia-tools"
const PLUGIN_VERSION = "1.0.0"

const installSteps = [
  {
    step: "01",
    icon: Github,
    title: "Register the marketplace",
    body: "A marketplace is just a Git repo with a .claude-plugin/marketplace.json manifest. Claude Code clones it and reads the plugins it declares.",
    code: `claude plugin marketplace add ${MARKETPLACE_REPO}`,
  },
  {
    step: "02",
    icon: Package,
    title: "Install the plugin",
    body: `The syntax is plugin@marketplace. Add --scope project to commit it into your repo's .claude/settings.json so the whole team gets it.`,
    code: `claude plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`,
  },
  {
    step: "03",
    icon: PlayCircle,
    title: "Call it with your API docs on hand",
    body: "Point Claude at your spec — an OpenAPI file, a Markdown doc, a Postman export, or an Olivia-generated doc page. That is the only input it needs.",
    code: `/${PLUGIN_NAME}:api`,
  },
]

const skills = [
  {
    id: `${PLUGIN_NAME}:api`,
    icon: ListChecks,
    accent: "sky" as const,
    tagline: "Build, run, and label the regression suite",
    body: "Reads your API docs end to end, writes down every endpoint, method, param, enum and documented error shape, then turns that inventory into a runnable Postman collection and executes it with Newman.",
    bullets: [
      "One folder per endpoint, saved under APITest/olivia/",
      "Every validation is its own pm.test() — never bundled assertions",
      "Runs through Newman and reports real pass/fail counts",
      "Labels findings BUG or DOCS-MISMATCH only after a real run",
    ],
  },
  {
    id: `${PLUGIN_NAME}:bugs`,
    icon: Bug,
    accent: "rose" as const,
    tagline: "Turn confirmed failures into tickets",
    body: "Takes the confirmed findings and produces two things: a minimal repro collection and a Markdown ticket file a developer can act on without ever opening Postman.",
    bullets: [
      "Minimal repros — only the headers, params and fields that trigger the bug",
      "Assertions written against correct behavior, so they pass once it is fixed",
      "Fixed ticket structure: Summary, Steps, Happening, Should Happen, Evidence, Impact",
      "Ordered by impact — data exposure and access control first",
    ],
  },
]

const pipeline = [
  {
    icon: ScanSearch,
    title: "Inventory",
    body: "Reads the docs completely before writing anything. Every endpoint, param, enum, nullable field and error shape becomes a coverage matrix.",
  },
  {
    icon: FolderTree,
    title: "Scaffold",
    body: "Builds the collection skeleton under APITest/olivia/, one folder per endpoint, with collection-level helper scripts already wired up.",
  },
  {
    icon: PlayCircle,
    title: "Run",
    body: "Executes through Newman. Credentials live only in a private temporary environment and the persisted report comes out redacted.",
  },
  {
    icon: Tags,
    title: "Label",
    body: "Marks BUG for wrong API behavior and DOCS-MISMATCH for implementation that drifted from the docs — only for behavior observed in the run.",
  },
  {
    icon: FileText,
    title: "Report",
    body: "Hands off to the bugs skill, which writes the repro collection and the ticket file, then closes with a coverage and gaps summary.",
  },
]

const coverage = [
  {
    title: "Happy paths",
    body: "The baseline, plus one per meaningful parameter combination.",
  },
  {
    title: "Missing fields",
    body: "One request per required field omitted, and one per required param omitted.",
  },
  {
    title: "Invalid input",
    body: "Wrong type, invalid enum, and out-of-range value for every field.",
  },
  {
    title: "Auth",
    body: "No auth, malformed auth, expired token, and wrong-tenant token.",
  },
  {
    title: "Boundaries",
    body: "Lengths, limits, page sizes, offsets, dates and ID formats — at the boundary, one below, one above.",
  },
  {
    title: "Filters & pagination",
    body: "Sorting, paging, empty result sets, and unknown IDs.",
  },
  {
    title: "Schema conformance",
    body: "Full response-shape checks, plus cross-field consistency.",
  },
  {
    title: "Bug hunters",
    body: "Mass assignment, param abuse, unicode and oversized strings, number coercion, malformed bodies, IDOR, double-delete.",
  },
]

const differentiators = [
  {
    icon: ListChecks,
    title: "The coverage floor is a promise, not a suggestion",
    body: "Most generators give you one request per endpoint and call it a test suite. This one treats a shallow collection as a failed deliverable: if your docs describe 8 endpoints, expect 15 to 30 requests per endpoint, not 8 in total.",
  },
  {
    icon: Bug,
    title: "Adversarial requests are the point",
    body: "Happy paths only prove the endpoint matches its docs. The bug-hunter section is what actually surfaces defects — mass assignment, IDOR, coercion — and the skill budgets real time for it instead of padding the count with 200s.",
  },
  {
    icon: ScanSearch,
    title: "It catches what existence checks miss",
    body: "Every 2xx test asserts there are no undocumented fields in the payload, because an added field can leak data or break consumers. Lengths are asserted explicitly too — array lengths against pagination metadata, string lengths against documented maximums — so silent truncation cannot slip through.",
  },
  {
    icon: Check,
    title: "Nothing is reported unless it was observed",
    body: "Findings get labelled only after the behavior shows up in an actual run. Nothing inferred from the docs and nothing guessed from the code enters the tickets; unverified observations go in the summary as “needs verification” instead.",
  },
  {
    icon: ShieldCheck,
    title: "Bug reports double as acceptance tests",
    body: "Repro assertions are written against the correct behavior, so they fail while the bug exists and pass the moment it is fixed. Your bug report is the regression test for the fix — no extra work.",
  },
  {
    icon: FileText,
    title: "Tickets a human actually wants to read",
    body: "Short sentences, plain words, no speculation about root cause, 150 to 250 words each. The same broken behavior across five endpoints is one ticket listing five endpoints, not five near-identical tickets.",
  },
]

const guardrails = [
  "Asks permission before reading any .env file, and never asks you to paste a secret into chat.",
  "Never sources a dotenv file as shell code, and never invents IDs — they are discovered through safe list requests.",
  "Refuses to run against a production-looking URL without explicit confirmation.",
  "Asks before installing anything, including Newman itself.",
  "Credentials are injected into a temporary environment and stripped from the saved report.",
]

const deliverables = [
  {
    path: "APITest/olivia/<area>.postman_collection.json",
    label: "Full regression collection",
  },
  {
    path: "APITest/olivia/<area>-bugs.postman_collection.json",
    label: "Minimal repros for confirmed bugs",
  },
  {
    path: "APITest/olivia/<area>-tickets.md",
    label: "One actionable ticket per finding",
  },
]

const faqs = [
  {
    q: "Do I have to call the bugs skill separately?",
    a: "No. The api skill hands off to it as its final step, so a single call gives you the collection, the run results, the repro collection and the ticket file. Call /olivia-tools:bugs on its own when you already ran the suite in an earlier session and only want the write-up.",
  },
  {
    q: "What if the run finds nothing?",
    a: "Then there is no ticket file. The bugs skill only accepts findings confirmed in a real run, so a clean suite gives you the collection plus a summary — which is exactly the outcome you want.",
  },
  {
    q: "Does it work for APIs outside the Olivia suite?",
    a: "Yes. The workflow is written around Olivia endpoints, but nothing in the coverage matrix or the script standards is Olivia-specific. Any documented HTTP API works.",
  },
  {
    q: "Which Claude Code version do I need?",
    a: "Any version with plugin support. Run claude plugin list to confirm the plugin is installed and enabled; if /plugin is unavailable in your environment, the claude plugin CLI does the same job.",
  },
  {
    q: "How do I get updates?",
    a: "Run claude plugin marketplace update olivia-skils. The marketplace tracks the remote repo, so changes have to be pushed before an update picks them up.",
  },
]

const accentStyles = {
  sky: {
    card: "border-sky-300/15 bg-sky-400/[0.07]",
    chip: "border-sky-300/25 bg-sky-400/10 text-sky-100",
    icon: "text-sky-200",
    dot: "bg-sky-300/70",
  },
  rose: {
    card: "border-rose-300/15 bg-rose-400/[0.07]",
    chip: "border-rose-300/25 bg-rose-400/10 text-rose-100",
    icon: "text-rose-200",
    dot: "bg-rose-300/70",
  },
} as const

function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => setCopied(false)
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0d0e13] px-3 py-2.5",
        className
      )}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-[13px] leading-6 text-cyan-100/90">
        <span className="mr-2 select-none text-white/25">$</span>
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="shrink-0 rounded-md border border-white/10 p-1.5 text-white/40 transition-colors hover:border-white/25 hover:text-white/80"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-300" />
        ) : (
          <ClipboardCopy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
      {children}
    </p>
  )
}

export function meta() {
  return [
    { title: "Olivia Skills for Claude Code — API regression testing that finds real bugs" },
    {
      name: "description",
      content:
        "Install the olivia-tools plugin for Claude Code. Turn API docs into high-coverage Postman regression collections, run them, and get bug tickets with repros.",
    },
  ]
}

export default function ClaudeSkills() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090a0d]/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold">Olivia Tool</span>
              <span className="block text-[11px] text-white/45">
                Claude Code Skills
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            Back to home
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 md:px-8 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(56,189,248,0.10),transparent)]" />
          <div className="relative mx-auto max-w-5xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
              <Terminal className="h-3.5 w-3.5" />
              Claude Code plugin · {PLUGIN_NAME} v{PLUGIN_VERSION}
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Your API docs in. A regression suite that finds real bugs out.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/[0.66] md:text-lg">
              Two Claude Code skills that read your API documentation, build a
              high-coverage Postman collection, run it for real, and hand you bug
              tickets with minimal repros. Not one request per endpoint — the kind
              of coverage that fails loudly when someone changes behavior.
            </p>

            <div className="mt-7 max-w-xl space-y-2">
              <CodeBlock code={`claude plugin marketplace add ${MARKETPLACE_REPO}`} />
              <CodeBlock code={`claude plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                2 skills
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                3 deliverables per run
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                Postman v2.1 + Newman
              </span>
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="border-b border-white/10 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <SectionLabel>Install</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Three commands, and it is part of your workflow.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/55">
                Plugins come from marketplaces, so registering the source and
                installing the plugin are two separate steps. After that you call
                the skills like any other slash command.
              </p>
            </div>

            <div className="space-y-3">
              {installSteps.map((item) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.step}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-cyan-300/25"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="flex items-center gap-3 md:w-64 md:shrink-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold tracking-[0.2em] text-white/25">
                            {item.step}
                          </span>
                          <h3 className="text-sm font-semibold text-white">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-white/55">
                          {item.body}
                        </p>
                        <CodeBlock code={item.code} className="mt-3" />
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              <p className="text-sm leading-6 text-white/60">
                <span className="font-medium text-amber-100">
                  Repository access.
                </span>{" "}
                The marketplace clones{" "}
                <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px] text-cyan-100/90">
                  {MARKETPLACE_REPO}
                </code>
                . While that repo is private, only accounts with access can
                install — make it public, or invite the people who need it.
              </p>
            </div>
          </div>
        </section>

        {/* The two skills */}
        <section className="border-b border-white/10 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <SectionLabel>What you get</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Two skills, designed to chain.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/55">
                Calling{" "}
                <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px] text-cyan-100/90">
                  /{PLUGIN_NAME}:api
                </code>{" "}
                runs the whole pipeline — it hands off to the bugs skill as its
                final step. Call the bugs skill on its own only when the run
                already happened.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {skills.map((skill) => {
                const Icon = skill.icon
                const accent = accentStyles[skill.accent]
                return (
                  <article
                    key={skill.id}
                    className={cn("rounded-xl border p-6", accent.card)}
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <code
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[12px] font-medium",
                            accent.chip
                          )}
                        >
                          /{skill.id}
                        </code>
                        <h3 className="mt-3 text-xl font-semibold text-white">
                          {skill.tagline}
                        </h3>
                      </div>
                      <Icon className={cn("h-6 w-6 shrink-0", accent.icon)} />
                    </div>
                    <p className="text-sm leading-6 text-white/60">
                      {skill.body}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {skill.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2.5 text-sm leading-6 text-white/60"
                        >
                          <span
                            className={cn(
                              "mt-2.5 h-1 w-1 shrink-0 rounded-full",
                              accent.dot
                            )}
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="border-b border-white/10 bg-white/[0.02] px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <SectionLabel>How a run goes</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Docs in, tickets out — five stages.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {pipeline.map((item, i) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.title}
                    className="relative rounded-xl border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.07]">
                      <Icon className="h-4.5 w-4.5 text-cyan-200" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-6 text-white/50">
                      {item.body}
                    </p>
                    {i < pipeline.length - 1 && (
                      <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-white/15 lg:block" />
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Coverage */}
        <section className="border-b border-white/10 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <SectionLabel>Coverage floor</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Every applicable line, on every endpoint.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/55">
                This is the checklist the api skill works through per endpoint —
                not a menu it picks from.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {coverage.map((item) => (
                <article
                  key={item.title}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                >
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-6 text-white/50">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-5">
              <p className="text-sm leading-7 text-white/70">
                <span className="font-medium text-emerald-100">
                  The bar, stated plainly:
                </span>{" "}
                if your docs describe 8 endpoints, expect on the order of 15 to 30
                requests <em>per endpoint</em> — not 8 requests total. A short or
                shallow collection is treated as a failed deliverable.
              </p>
            </div>
          </div>
        </section>

        {/* Why it's great */}
        <section className="border-b border-white/10 px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <SectionLabel>Why this is different</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Anyone can generate requests. Finding bugs is the hard part.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {differentiators.map((item) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10">
                      <Icon className="h-5 w-5 text-cyan-200" />
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {item.body}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Deliverables + guardrails */}
        <section className="border-b border-white/10 bg-white/[0.02] px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-5 flex items-center gap-2">
                <Download className="h-5 w-5 text-cyan-200" />
                <h2 className="text-lg font-semibold text-white">
                  What lands in your repo
                </h2>
              </div>
              <div className="space-y-3">
                {deliverables.map((item) => (
                  <div key={item.path}>
                    <code className="block overflow-x-auto whitespace-pre rounded-md border border-white/10 bg-[#0d0e13] px-3 py-2 text-[12.5px] leading-6 text-cyan-100/90">
                      {item.path}
                    </code>
                    <p className="mt-1.5 pl-1 text-[13px] text-white/45">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-white/50">
                Plus a written summary: what was covered, what was run, pass and
                fail counts, and any data or coverage gap it could not close.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-200" />
                <h2 className="text-lg font-semibold text-white">
                  Safety rails, built in
                </h2>
              </div>
              <p className="text-sm leading-6 text-white/60">
                The skills run real requests against real systems with real
                credentials, so the boundaries are explicit:
              </p>
              <ul className="mt-4 space-y-2.5">
                {guardrails.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-sm leading-6 text-white/60"
                  >
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <SectionLabel>Questions</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Before you install.
              </h2>
            </div>

            <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.035]">
              {faqs.map((faq) => (
                <details key={faq.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white/85 marker:hidden hover:text-white">
                    {faq.q}
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-white/55">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-14 md:px-8 md:pb-20">
          <div className="mx-auto max-w-5xl rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-6 md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-100">
                <Terminal className="h-4 w-4" />
                Works alongside the rest of Olivia
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Point it at your docs and see what breaks.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Generate the docs in Olivia, then let the skills turn them into a
                regression suite that catches the next silent behavior change.
              </p>
            </div>
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-5 border-transparent bg-white text-slate-950 hover:bg-white/90 md:mt-0"
              )}
            >
              Get Olivia Tool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/[0.35] md:px-8">
        <p>
          Olivia Tool - API docs and QA for repositories. MCP docs and QA for live
          tool servers.
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <Link to="/" className="inline-block text-white/45 hover:text-white/70">
            Home
          </Link>
          <Link
            to="/terms"
            className="inline-block text-white/45 hover:text-white/70"
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy"
            className="inline-block text-white/45 hover:text-white/70"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
