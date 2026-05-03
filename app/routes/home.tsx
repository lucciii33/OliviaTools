import { Link } from "react-router"
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bug,
  CheckCircle2,
  FileJson,
  GitPullRequest,
  Github,
  ListChecks,
  PlayCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  TestTube2,
  Zap,
} from "lucide-react"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"

const apiOutputs = [
  "Endpoint documentation",
  "Methods, paths, params, bodies",
  "Responses and examples",
  "Repo backfills",
  "PR change updates",
  "Endpoint QA runs",
]

const mcpOutputs = [
  "Tool documentation",
  "Input schemas and required args",
  "Sample arguments",
  "Live tool responses",
  "Smoke suites per project",
  "Tool-level bug reports",
]

const qaOutputs = [
  {
    icon: PlayCircle,
    label: "Smoke",
    title: "Fast checks for the paths that must work",
    body: "For APIs, Olivia tests generated endpoint behavior. For MCP, Olivia generates and runs tool smoke suites with real arguments.",
  },
  {
    icon: ListChecks,
    label: "Regression",
    title: "Reusable coverage for behavior you already trust",
    body: "Turn documented behavior into repeatable checks so the next release does not quietly break what worked yesterday.",
  },
  {
    icon: Bug,
    label: "Bugs",
    title: "Failures written like engineering tickets",
    body: "Each issue includes the target, scenario, severity, evidence, and recommendation so a developer can fix it without decoding a vague report.",
  },
]

const workflow = [
  {
    icon: Github,
    title: "API source",
    body: "Connect GitHub, select a repository, run a backfill, or let pull request changes update endpoint docs.",
  },
  {
    icon: TerminalSquare,
    title: "MCP source",
    body: "Connect an MCP server over stdio, HTTP, or SSE and let Olivia inspect available tools and schemas.",
  },
  {
    icon: TestTube2,
    title: "QA source",
    body: "Run endpoint QA or MCP tool QA from the documentation Olivia generated, with bugs saved back to the project.",
  },
]

function CheckItem({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-white/62">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <span>{children}</span>
    </li>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090a0d]/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold">Olivia Tool</span>
              <span className="block text-[11px] text-white/45">API automation and MCP automation</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: "sm" }),
                "border-transparent bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                <Zap className="h-3.5 w-3.5" />
                Two automation workspaces. One product.
              </div>

              <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl md:text-6xl">
                Olivia Tool documents and tests your APIs and MCP servers.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/[0.66] md:text-lg">
                API automation turns repositories and endpoint changes into documentation and
                QA runs. MCP automation turns live servers into tool docs, smoke suites, and
                bug reports. They are different workflows, handled in one place.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "border-transparent bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  )}
                >
                  Start with Olivia <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-white/20 bg-white/[0.03] text-white/[0.85] hover:border-white/[0.35] hover:bg-white/10 hover:text-white"
                  )}
                >
                  Open workspace
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30">
              <div className="rounded-md border border-white/10 bg-[#101217]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    Olivia workspace
                  </div>
                  <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
                    Live outputs
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <div className="rounded-md border border-sky-300/15 bg-sky-400/10 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-sky-100">
                      <BookOpen className="h-4 w-4" />
                      API Docs + QA
                    </div>
                    <div className="space-y-2">
                      {["GET /users", "POST /orders", "QA run: 15 tests"].map((item) => (
                        <div key={item} className="rounded-md bg-white/[0.06] px-3 py-2 text-xs text-white/65">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-violet-300/15 bg-violet-400/10 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-violet-100">
                      <Server className="h-4 w-4" />
                      MCP Docs + QA
                    </div>
                    <div className="space-y-2">
                      {["search_docs", "create_ticket", "Smoke: 8 cases"].map((item) => (
                        <div key={item} className="rounded-md bg-white/[0.06] px-3 py-2 text-xs text-white/65">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 p-4">
                  <div className="flex items-center justify-between rounded-md border border-rose-300/15 bg-rose-400/10 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm text-rose-100">
                      <Bug className="h-4 w-4" />
                      2 bugs found with evidence
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 px-5 py-10 md:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-sky-300/15 bg-sky-400/10 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/75">
                    API Automation
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">For repositories, endpoints, and API QA.</h2>
                </div>
                <GitPullRequest className="h-6 w-6 text-sky-200" />
              </div>
              <p className="text-sm leading-6 text-white/60">
                This side of Olivia is built around code repositories. It scans API routes,
                generates endpoint documentation, keeps docs aligned with pull request changes,
                and runs QA against documented endpoints.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {apiOutputs.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-violet-300/15 bg-violet-400/10 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/75">
                    MCP Automation
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">For servers, tools, schemas, and tool QA.</h2>
                </div>
                <Server className="h-6 w-6 text-violet-200" />
              </div>
              <p className="text-sm leading-6 text-white/60">
                This side of Olivia is built around running MCP servers. It connects to the
                server, discovers tools, documents each tool, captures sample behavior, creates
                smoke suites, and tracks tool-level bugs.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {mcpOutputs.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 max-w-3xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                QA Layer
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Testing is not an afterthought. It is generated from what Olivia understands.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/56">
                API QA and MCP QA do not run the same way. Olivia keeps the workflows separate:
                endpoint tests for APIs, tool execution tests for MCP, shared reporting for bugs.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {qaOutputs.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                    <div className="mb-7 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        {item.label}
                      </span>
                      <Icon className="h-5 w-5 text-emerald-200" />
                    </div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">{item.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] px-5 py-12 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                Workflow
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Three sources. Three outputs. One review surface.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Olivia is not only a docs generator. It is a workspace for turning engineering
                systems into readable documentation, runnable checks, and actionable bug reports.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {workflow.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.07]">
                      <Icon className="h-5 w-5 text-cyan-200" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/50">{item.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["API docs", "Generated from repositories, endpoint scans, and pull request changes.", BookOpen],
              ["MCP docs", "Generated from connected servers, tools, schemas, and sample responses.", FileJson],
              ["Bug evidence", "Generated from QA runs with severity, evidence, and recommendations.", ShieldCheck],
            ].map(([title, body, Icon]) => (
              <article key={title as string} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <Icon className="mb-5 h-5 w-5 text-cyan-200" />
                <h3 className="text-base font-semibold text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{body as string}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-5 pb-14 md:px-8 md:pb-20">
          <div className="mx-auto max-w-7xl rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-6 md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-100">
                <BadgeCheck className="h-4 w-4" />
                Built for teams shipping APIs, MCP servers, and integrations
              </div>
              <h2 className="text-2xl font-semibold text-white">Separate workflows. Shared visibility.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                API teams get endpoint docs and API QA. MCP builders get tool docs and MCP QA.
                Engineering leaders get a single place to see documentation, test coverage, and bugs.
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
        Olivia Tool - API docs and QA for repositories. MCP docs and QA for live tool servers.
      </footer>
    </div>
  )
}
