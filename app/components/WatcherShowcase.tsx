import { GitMerge, FileText, Sparkles, FlaskConical, Bug } from "lucide-react"
import { cn } from "~/lib/utils"

// The watcher, as a thing you can watch.
//
// "An agent that documents and tests your API after every merge" is abstract
// until you see the sequence: a pull request lands, and four things happen on
// their own. The steps light up in turn (CSS, see app.css), so the page shows
// the product working instead of describing it.
const STEPS = [
  {
    icon: GitMerge,
    title: "A pull request is merged",
    body: "GitHub tells Olivia. Nobody presses anything.",
  },
  {
    icon: FileText,
    title: "The docs catch up",
    body: "Only the files that changed are re-read, so a one-file fix costs a one-file fix.",
  },
  {
    icon: Sparkles,
    title: "What's new is flagged",
    body: "New endpoints marked NEW, changed ones Edited, with the PR that did it.",
  },
  {
    icon: FlaskConical,
    title: "Tests are written and bugs hunted",
    body: "Smoke and regression suites for every new endpoint, then real requests to find what's broken.",
  },
]

export function WatcherShowcase() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-emerald-300">
          Watching main · olivia-demo
        </span>
      </div>

      <ol className="grid gap-3 md:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative">
            {/* The connector, drawn left to right as the sequence advances. */}
            {i < STEPS.length - 1 && (
              <span
                className="olivia-trace absolute left-full top-7 hidden h-px w-3 bg-cyan-300/40 md:block"
                style={{ animationDelay: `${i * 1.6}s` }}
              />
            )}
            <div
              className="olivia-step h-full rounded-lg border border-white/10 bg-white/[0.02] p-3"
              style={{ animationDelay: `${i * 1.6}s` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <step.icon className="h-4 w-4 text-cyan-300" />
                <span className="text-[11px] font-mono text-white/30">
                  0{i + 1}
                </span>
              </div>
              <p className="text-sm font-medium text-white/90">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* What the team actually reads the next morning. */}
      <div className="mt-5 rounded-lg border border-white/10 bg-[#0d0f14] p-3 font-mono text-[11px] leading-6">
        <p className="text-white/35">
          <span className="text-cyan-300">#18</span> Add /stats/inventory-value
          and api_health
        </p>
        <p className="text-emerald-300">
          + GET /stats/inventory-value <span className="text-white/30">· 7 tests · no bugs</span>
        </p>
        <p className="text-amber-300">
          ~ GET /stats/sales-by-month{" "}
          <span className="text-white/30">· response now includes best_month</span>
        </p>
        <p className="text-white/35">
          <Bug className="mr-1 inline h-3 w-3 text-red-400" />
          1 bug found on POST /orders{" "}
          <span className="olivia-caret text-cyan-300">▌</span>
        </p>
      </div>
    </div>
  )
}

/** Small labelled badge used by the landing to list what a plan unlocks. */
export function Pill({
  children,
  tone = "cyan",
}: {
  children: string
  tone?: "cyan" | "emerald" | "amber"
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px]",
        tone === "cyan" && "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
        tone === "emerald" &&
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
        tone === "amber" && "border-amber-400/30 bg-amber-400/10 text-amber-100",
      )}
    >
      {children}
    </span>
  )
}
