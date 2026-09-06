import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router"
import {
  FlaskConical,
  Loader2,
  Play,
  ChevronRight,
  ArrowLeft,
  Wand2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Sidebar } from "~/components/Sidebar"
import { Button } from "~/components/ui/button"
import { MethodBadge } from "~/components/MethodBadge"
import { useAuth } from "~/context/AuthContext"
import {
  useQaApi,
  type ApiSuite,
  type ApiTestCase,
  type SuiteRunResult,
  type SuiteCaseResult,
} from "~/api/qaApi"
import { cn } from "~/lib/utils"

// Every saved test of one API project, organised the way a QA lead reads them:
// pick a section (Users, Posts…), see its endpoints, and under each endpoint the
// tests with the plain sentence saying what they cover — editable in place.
//
// Separate from /swagger-qa on purpose: that page is for hunting bugs on one
// endpoint at a time, this one is the standing suite for the whole project.
export default function ApiTestsPage() {
  // Two ways in: /api-tests/:projectId for an imported spec, and
  // /api-tests/repo/:owner/:repo for a connected GitHub repo. Same page, the
  // scope just decides which endpoint the suites are loaded from.
  const { projectId, owner, repo } = useParams()
  const isRepo = Boolean(owner && repo)
  const { user } = useAuth()
  const {
    listSuites,
    listRepoSuites,
    runSuite,
    refineSuiteCase,
    generateSectionSuites,
    generateRepoSectionSuites,
    error,
  } = useQaApi()

  const [suites, setSuites] = useState<ApiSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string>("")
  const [runs, setRuns] = useState<Record<string, SuiteRunResult>>({})
  const [runningId, setRunningId] = useState<string | null>(null)
  const [generatingSection, setGeneratingSection] = useState(false)

  async function refresh() {
    setLoading(true)
    const data = isRepo
      ? await listRepoSuites(owner!, repo!)
      : projectId
        ? await listSuites(projectId)
        : []
    setSuites(data)
    setLoading(false)
    return data
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, owner, repo])

  // section -> endpoint -> the suites of that endpoint
  const sections = useMemo(() => {
    const map = new Map<string, Map<string, ApiSuite[]>>()
    for (const s of suites) {
      const sec = s.section || "default"
      if (!map.has(sec)) map.set(sec, new Map())
      const endpointKey = `${s.method} ${s.path}`
      const endpoints = map.get(sec)!
      if (!endpoints.has(endpointKey)) endpoints.set(endpointKey, [])
      endpoints.get(endpointKey)!.push(s)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [suites])

  // Land on the first section rather than an empty pane, but never fight a
  // choice the user already made.
  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0][0])
  }, [sections, activeSection])

  const endpoints = useMemo(() => {
    const found = sections.find(([name]) => name === activeSection)
    return found ? Array.from(found[1].entries()) : []
  }, [sections, activeSection])

  const totals = useMemo(() => {
    const t = { tests: 0, endpoints: new Set<string>() }
    for (const s of suites) {
      t.tests += s.cases.length
      t.endpoints.add(String(s.docId))
    }
    return { tests: t.tests, endpoints: t.endpoints.size }
  }, [suites])

  async function handleRun(suiteId: string) {
    setRunningId(suiteId)
    const res = await runSuite(suiteId)
    setRunningId(null)
    if (res) {
      setRuns((r) => ({ ...r, [suiteId]: res }))
      // lastRun changed on the server; pull the fresh counters
      refresh()
    }
  }

  async function handleGenerateSection() {
    if (!activeSection) return
    setGeneratingSection(true)
    const res = isRepo
      ? await generateRepoSectionSuites(owner!, repo!, activeSection)
      : projectId
        ? await generateSectionSuites(projectId, activeSection)
        : null
    setGeneratingSection(false)
    if (res) await refresh()
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-5xl">
        <Link
          to={isRepo ? `/docs/${owner}/${repo}` : "/swagger-qa"}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isRepo ? `Back to ${owner}/${repo}` : "Back to Olivia + Swagger"}
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-semibold">API tests</h1>
        </div>
        <p className="text-sm text-white/40 mb-6">
          {loading
            ? "Loading…"
            : `${totals.tests} test${totals.tests === 1 ? "" : "s"} across ${
                totals.endpoints
              } endpoint${totals.endpoints === 1 ? "" : "s"}`}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && suites.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/60 mb-1">No tests yet.</p>
            <p className="text-xs text-white/40">
              Open{" "}
              <span className="text-white/70">
                {isRepo ? `${owner}/${repo}` : "this API"}
              </span>{" "}
              and hit <span className="text-white/70">Create test</span> on an
              endpoint.
            </p>
          </div>
        )}

        {sections.length > 0 && (
          <>
            {/* ---- Section picker ---- */}
            <div className="flex flex-wrap gap-2 mb-5">
              {sections.map(([name, endpointMap]) => {
                const count = Array.from(endpointMap.values())
                  .flat()
                  .reduce((n, s) => n + s.cases.length, 0)
                return (
                  <button
                    key={name}
                    onClick={() => setActiveSection(name)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      name === activeSection
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.06]"
                    )}
                  >
                    {name}
                    <span className="ml-1.5 text-white/30">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {activeSection} · {endpoints.length} endpoint
                {endpoints.length === 1 ? "" : "s"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs"
                onClick={handleGenerateSection}
                disabled={generatingSection}
                title="Regenerate smoke + regression for every endpoint in this section"
              >
                {generatingSection ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Regenerate section
              </Button>
            </div>

            <div className="space-y-3">
              {endpoints.map(([endpointKey, endpointSuites]) => (
                <EndpointCard
                  key={endpointKey}
                  endpointKey={endpointKey}
                  suites={endpointSuites}
                  runs={runs}
                  runningId={runningId}
                  onRun={handleRun}
                  onRefine={refineSuiteCase}
                  onRefined={refresh}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function EndpointCard({
  endpointKey,
  suites,
  runs,
  runningId,
  onRun,
  onRefine,
  onRefined,
}: {
  endpointKey: string
  suites: ApiSuite[]
  runs: Record<string, SuiteRunResult>
  runningId: string | null
  onRun: (suiteId: string) => void
  onRefine: (
    suiteId: string,
    caseId: string,
    instruction: string
  ) => Promise<ApiTestCase | null>
  onRefined: () => void
}) {
  const [open, setOpen] = useState(false)
  // Read the endpoint off the suites themselves rather than re-parsing the
  // grouping key, so the method keeps its literal type.
  const method = suites[0]?.method || "GET"
  const path = suites[0]?.path || endpointKey
  const totalCases = suites.reduce((n, s) => n + s.cases.length, 0)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-white/30 transition-transform shrink-0",
              open && "rotate-90"
            )}
          />
          <MethodBadge method={method} />
          <span className="font-mono text-sm text-white/85 truncate">{path}</span>
        </button>
        <span className="text-[10px] text-white/40 shrink-0">
          {totalCases} test{totalCases === 1 ? "" : "s"}
        </span>
      </div>

      {open && (
        <div className="px-4 pb-4 pl-11 space-y-4">
          {suites.map((suite) => (
            <SuiteBlock
              key={suite._id}
              suite={suite}
              run={runs[suite._id]}
              running={runningId === suite._id}
              onRun={() => onRun(suite._id)}
              onRefine={onRefine}
              onRefined={onRefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuiteBlock({
  suite,
  run,
  running,
  onRun,
  onRefine,
  onRefined,
}: {
  suite: ApiSuite
  run?: SuiteRunResult
  running: boolean
  onRun: () => void
  onRefine: (
    suiteId: string,
    caseId: string,
    instruction: string
  ) => Promise<ApiTestCase | null>
  onRefined: () => void
}) {
  const last = suite.lastRun
  const byCase = useMemo(() => {
    const m = new Map<string, SuiteCaseResult>()
    for (const r of run?.results || []) m.set(r.caseId, r)
    return m
  }, [run])

  return (
    <div className="rounded-md border border-white/10 bg-black/20">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
            suite.kind === "smoke"
              ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
              : "bg-purple-500/10 border-purple-500/30 text-purple-300"
          )}
        >
          {suite.kind}
        </span>
        <span className="text-xs text-white/40">
          {suite.cases.length} test{suite.cases.length === 1 ? "" : "s"}
        </span>

        {last?.at && !run && (
          <span className="text-[10px] text-white/30">
            last: {last.passed} ok · {last.failed} failed
            {last.regressions ? ` · ${last.regressions} regression` : ""}
          </span>
        )}
        {run && (
          <span className="text-[10px]">
            <span className="text-emerald-400">{run.summary.passed} ok</span>
            <span className="text-white/30"> · </span>
            <span className={run.summary.failed ? "text-red-400" : "text-white/30"}>
              {run.summary.failed} failed
            </span>
            {run.summary.regressions > 0 && (
              <>
                <span className="text-white/30"> · </span>
                <span className="text-amber-400">
                  {run.summary.regressions} regression
                  {run.summary.regressions === 1 ? "" : "s"}
                </span>
              </>
            )}
          </span>
        )}

        <Button
          size="sm"
          className="ml-auto h-7 bg-emerald-600/80 hover:bg-emerald-500 text-white gap-1.5 text-xs"
          onClick={onRun}
          disabled={running}
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Run
        </Button>
      </div>

      <div className="divide-y divide-white/5">
        {suite.cases.map((c) => (
          <CaseRow
            key={c._id}
            suiteId={suite._id}
            testCase={c}
            result={byCase.get(c._id)}
            onRefine={onRefine}
            onRefined={onRefined}
          />
        ))}
      </div>
    </div>
  )
}

function CaseRow({
  suiteId,
  testCase: c,
  result,
  onRefine,
  onRefined,
}: {
  suiteId: string
  testCase: ApiTestCase
  result?: SuiteCaseResult
  onRefine: (
    suiteId: string,
    caseId: string,
    instruction: string
  ) => Promise<ApiTestCase | null>
  onRefined: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!instruction.trim()) return
    setSaving(true)
    const updated = await onRefine(suiteId, c._id, instruction)
    setSaving(false)
    if (updated) {
      setInstruction("")
      setEditing(false)
      onRefined()
    }
  }

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        {result ? (
          result.passed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          )
        ) : (
          <span className="h-3.5 w-3.5 mt-0.5 shrink-0 rounded-full border border-white/15" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/80">{c.name}</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              {c.category}
            </span>
            {result?.isRegression && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                regression
              </span>
            )}
          </div>

          {/* The point of the page: what this test covers, in plain language. */}
          {c.covers && (
            <p className="text-[11px] text-white/45 mt-0.5">{c.covers}</p>
          )}

          {c.assertions.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {c.assertions.map((a, i) => {
                const verdict = result?.assertions.find((x) => x.assertion === a)
                return (
                  <li
                    key={i}
                    className={cn(
                      "text-[11px] flex items-start gap-1.5",
                      verdict
                        ? verdict.passed
                          ? "text-emerald-300/70"
                          : "text-red-300/80"
                        : "text-white/35"
                    )}
                  >
                    <span className="shrink-0">
                      {verdict ? (verdict.passed ? "✓" : "✗") : "·"}
                    </span>
                    <span>
                      {a}
                      {verdict && !verdict.passed && verdict.reason && (
                        <span className="text-red-400/60"> — {verdict.reason}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {result && (
            <p className="text-[10px] text-white/30 mt-1">
              HTTP {result.status}
              {result.expectedStatus.length > 0 &&
                ` (expected ${result.expectedStatus.join(" or ")})`}
              {" · "}
              {result.durationMs}ms
              {result.regressionDetail && (
                <span className="text-amber-400/70"> — {result.regressionDetail}</span>
              )}
              {result.error && (
                <span className="text-red-400/70"> — {result.error}</span>
              )}
            </p>
          )}

          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                autoFocus
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                  if (e.key === "Escape") setEditing(false)
                }}
                placeholder="e.g. also check that each user has a valid email"
                className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
              />
              <Button
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={submit}
                disabled={saving || !instruction.trim()}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60"
            >
              <Wand2 className="h-2.5 w-2.5" />
              change what this covers
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
