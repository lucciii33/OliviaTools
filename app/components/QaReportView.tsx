import type { QaReport } from "~/api/qaReportApi"
import { cn } from "~/lib/utils"

// The report itself, with no page furniture around it: the same markup is shown
// inside Olivia and on the public share link, so what the customer sends is
// exactly what they reviewed.

function formatPeriod(r: QaReport) {
  if (!r.period.from && !r.period.to) return "All time"
  const from = r.period.from ? new Date(r.period.from).toLocaleDateString() : "start"
  const to = r.period.to ? new Date(r.period.to).toLocaleDateString() : "today"
  return `${from} — ${to}`
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "neutral" | "good" | "bad" | "warn"
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-white/35">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold mt-1",
          tone === "good" && "text-emerald-300",
          tone === "bad" && "text-red-300",
          tone === "warn" && "text-amber-300",
          tone === "neutral" && "text-white",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-white/35 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium text-white/70 mb-2">{title}</h2>
      {children}
    </section>
  )
}

export function QaReportView({ report: r }: { report: QaReport }) {
  const coverageTone =
    r.coverage.percent >= 80 ? "good" : r.coverage.percent >= 40 ? "warn" : "bad"

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">QA report · {r.subject}</h1>
        <p className="text-xs text-white/40 mt-0.5">
          {formatPeriod(r)} · generated {new Date(r.generatedAt).toLocaleString()}
        </p>
      </div>

      <Section title="Coverage">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat
            label="Coverage"
            value={`${r.coverage.percent}%`}
            hint={`${r.coverage.withTests} of ${r.coverage.units} ${r.unitLabel}`}
            tone={coverageTone}
          />
          <Stat label={r.unitLabel} value={r.coverage.units} />
          <Stat
            label="Test cases"
            value={r.coverage.testCases}
            hint={`${r.coverage.withSmoke} smoke · ${r.coverage.withRegression} regression`}
          />
          <Stat
            label="Without tests"
            value={r.coverage.units - r.coverage.withTests}
            tone={r.coverage.units === r.coverage.withTests ? "good" : "warn"}
          />
        </div>
      </Section>

      <Section title="Tests executed">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Executed" value={r.tests.executed} />
          <Stat label="Passed" value={r.tests.passed} tone="good" />
          <Stat
            label="Failed"
            value={r.tests.failed}
            tone={r.tests.failed ? "bad" : "neutral"}
          />
          <Stat
            label="Pass rate"
            value={`${r.tests.passRate}%`}
            hint={
              r.tests.lastAt
                ? `last run ${new Date(r.tests.lastAt).toLocaleDateString()}`
                : "never run"
            }
            tone={r.tests.passRate >= 90 ? "good" : r.tests.executed ? "warn" : "neutral"}
          />
        </div>
        {r.tests.regressions > 0 && (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {r.tests.regressions} regression
            {r.tests.regressions === 1 ? "" : "s"}: behaviour that used to pass and
            doesn&apos;t any more.
          </p>
        )}
      </Section>

      <Section title="Bugs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat
            label="Open"
            value={r.bugs.open}
            tone={r.bugs.open ? "bad" : "good"}
            hint={
              Object.entries(r.bugs.openBySeverity)
                .map(([k, v]) => `${v} ${k}`)
                .join(" · ") || undefined
            }
          />
          <Stat label="Fixed" value={r.bugs.fixed} tone="good" />
          <Stat label="Ignored" value={r.bugs.ignored} />
          <Stat
            label="Found in period"
            value={r.bugs.foundInPeriod}
            hint={`${r.bugHunter.runs} bug hunter run${r.bugHunter.runs === 1 ? "" : "s"}`}
          />
        </div>
      </Section>

      {r.coverage.uncovered.length > 0 && (
        <Section title={`Without tests (${r.coverage.uncovered.length})`}>
          <ul className="rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {r.coverage.uncovered.map((u) => (
              <li key={u} className="px-3 py-1.5 font-mono text-[11px] text-white/55">
                {u}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
