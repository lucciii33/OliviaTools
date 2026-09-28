import { apiFetch } from "~/utils/api"

// The QA report a customer sends to their own customer: coverage, what ran,
// what's broken. Read signed in, or through a share link with no account.

export interface QaReport {
  kind: "api" | "mcp"
  subject: string
  owner?: string
  repo?: string
  projectId?: string
  period: { from: string | null; to: string | null }
  generatedAt: string
  unitLabel: string
  coverage: {
    units: number
    withTests: number
    withSmoke: number
    withRegression: number
    percent: number
    testCases: number
    uncovered: string[]
  }
  tests: {
    suitesRun: number
    executed: number
    passed: number
    failed: number
    regressions: number
    passRate: number
    lastAt: string | null
  }
  bugs: {
    open: number
    fixed: number
    ignored: number
    openBySeverity: Record<string, number>
    foundInPeriod: number
  }
  bugHunter: { runs: number; testsRun: number; bugsFound: number }
  shared?: boolean
  label?: string
}

export interface ShareLinkRow {
  token: string
  label: string
  period: { from: string | null; to: string | null }
  expiresAt: string | null
  views: number
  lastViewedAt: string | null
  createdAt: string
}

export interface ReportScope {
  owner?: string
  repo?: string
  projectId?: string
  surface?: "api" | "mcp"
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

function scopePath(scope: ReportScope) {
  return scope.owner && scope.repo
    ? `/api/qa-report/repos/${scope.owner}/${scope.repo}`
    : `/api/qa-report/projects/${scope.projectId}`
}

function query(scope: ReportScope, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams()
  if (scope.surface === "mcp") params.set("surface", "mcp")
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      msg = JSON.parse(text)?.message || text
    } catch {
      /* keep the raw text */
    }
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return JSON.parse(text) as T
}

export async function getQaReport(
  scope: ReportScope,
  range: { from?: string; to?: string } = {}
) {
  const res = await apiFetch(
    `${scopePath(scope)}${query(scope, { from: range.from, to: range.to })}`,
    { cache: "no-store" }
  )
  return readJson<QaReport>(res)
}

export async function listReportLinks(scope: ReportScope) {
  const res = await apiFetch(`${scopePath(scope)}/links${query(scope)}`, {
    cache: "no-store",
  })
  return readJson<ShareLinkRow[]>(res)
}

export async function createReportLink(
  scope: ReportScope,
  payload: { from?: string; to?: string; label?: string; expiresAt?: string }
) {
  const res = await apiFetch(`${scopePath(scope)}/links${query(scope)}`, {
    method: "POST",
    body: JSON.stringify({ ...payload, surface: scope.surface }),
  })
  return readJson<{ token: string; expiresAt: string | null }>(res)
}

export async function revokeReportLink(token: string) {
  const res = await apiFetch(`/api/qa-report/links/${token}`, { method: "DELETE" })
  return readJson<{ success: boolean }>(res)
}

/** The public read: no token of ours, no session — just the share token. */
export async function getSharedQaReport(token: string) {
  const res = await fetch(`${BASE_URL}/api/qa-report/shared/${token}`, {
    cache: "no-store",
  })
  return readJson<QaReport>(res)
}

/** The report as Markdown, for the download button. */
export function reportToMarkdown(r: QaReport): string {
  const period =
    r.period.from || r.period.to
      ? `${r.period.from ? new Date(r.period.from).toLocaleDateString() : "start"} — ${
          r.period.to ? new Date(r.period.to).toLocaleDateString() : "today"
        }`
      : "All time"
  const sev = Object.entries(r.bugs.openBySeverity)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")

  return [
    `# QA report — ${r.subject}`,
    "",
    `Period: ${period}`,
    `Generated: ${new Date(r.generatedAt).toLocaleString()}`,
    "",
    "## Coverage",
    `- ${r.unitLabel}: ${r.coverage.units}`,
    `- With tests: ${r.coverage.withTests} (${r.coverage.percent}%)`,
    `- With smoke: ${r.coverage.withSmoke}`,
    `- With regression: ${r.coverage.withRegression}`,
    `- Saved test cases: ${r.coverage.testCases}`,
    "",
    "## Tests",
    `- Executed: ${r.tests.executed}`,
    `- Passed: ${r.tests.passed}`,
    `- Failed: ${r.tests.failed}`,
    `- Regressions: ${r.tests.regressions}`,
    `- Pass rate: ${r.tests.passRate}%`,
    `- Last run: ${r.tests.lastAt ? new Date(r.tests.lastAt).toLocaleString() : "never"}`,
    "",
    "## Bugs",
    `- Open: ${r.bugs.open}`,
    `- Fixed: ${r.bugs.fixed}`,
    `- Ignored: ${r.bugs.ignored}`,
    `- Found in this period: ${r.bugs.foundInPeriod}`,
    sev ? "\nOpen by severity:\n" + sev : "",
    "",
    "## Bug hunter",
    `- Runs: ${r.bugHunter.runs}`,
    `- Tests run: ${r.bugHunter.testsRun}`,
    `- Bugs found: ${r.bugHunter.bugsFound}`,
    "",
    r.coverage.uncovered.length
      ? `## Without tests (${r.coverage.uncovered.length})\n` +
        r.coverage.uncovered.map((u) => `- ${u}`).join("\n")
      : "",
    "",
  ].join("\n")
}
