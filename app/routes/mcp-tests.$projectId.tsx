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
import { useAuth } from "~/context/AuthContext"
import {
  listMcpToolSuites,
  runMcpToolSuite,
  refineMcpToolSuiteCase,
  generateMcpProjectSuites,
  type McpToolSuite,
  type McpToolTestCase,
  type McpSuiteRunResult,
  type McpSuiteCaseResult,
} from "~/api/mcpDocsApi"
import { cn } from "~/lib/utils"

// Every saved test of one MCP project, organised the way the API tests page is:
// pick a group, see its tools, and under each tool the tests with the plain
// sentence saying what they cover — editable in place.
//
// Deliberately the same shape as /api-tests/:projectId. The two halves of the
// product test different things but a QA lead reads them the same way.
export default function McpTestsPage() {
  const { projectId } = useParams()
  const { user } = useAuth()

  const [suites, setSuites] = useState<McpToolSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState("")
  const [runs, setRuns] = useState<Record<string, McpSuiteRunResult>>({})
  const [runningId, setRunningId] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  async function refresh() {
    if (!projectId) return
    setLoading(true)
    try {
      setSuites(await listMcpToolSuites(projectId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // group -> tool -> the suites of that tool
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, McpToolSuite[]>>()
    for (const s of suites) {
      const g = s.group || "general"
      if (!map.has(g)) map.set(g, new Map())
      const tools = map.get(g)!
      if (!tools.has(s.toolName)) tools.set(s.toolName, [])
      tools.get(s.toolName)!.push(s)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [suites])

  useEffect(() => {
    if (!activeGroup && groups.length) setActiveGroup(groups[0][0])
  }, [groups, activeGroup])

  const tools = useMemo(() => {
    const found = groups.find(([name]) => name === activeGroup)
    return found ? Array.from(found[1].entries()) : []
  }, [groups, activeGroup])

  const totals = useMemo(() => {
    const seen = new Set<string>()
    let tests = 0
    for (const s of suites) {
      tests += s.cases.length
      seen.add(s.toolName)
    }
    return { tests, tools: seen.size }
  }, [suites])

  async function handleRun(suiteId: string) {
    setRunningId(suiteId)
    try {
      const res = await runMcpToolSuite(suiteId)
      setRuns((r) => ({ ...r, [suiteId]: res }))
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed")
    } finally {
      setRunningId(null)
    }
  }

  async function handleGenerateAll() {
    if (!projectId) return
    setGeneratingAll(true)
    setGenResult(null)
    try {
      const res = await generateMcpProjectSuites(projectId)
      setGenResult(
        `${res.created.length} created across ${res.tools} tools` +
          (res.failed.length ? ` · ${res.failed.length} failed` : "")
      )
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tests")
    } finally {
      setGeneratingAll(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-5xl">
        <Link
          to={`/mcp-docs/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to MCP docs
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-semibold">MCP tests</h1>
        </div>
        <p className="text-sm text-white/40 mb-6">
          {loading
            ? "Loading…"
            : `${totals.tests} test${totals.tests === 1 ? "" : "s"} across ${
                totals.tools
              } tool${totals.tools === 1 ? "" : "s"}`}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && suites.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center space-y-3">
            <p className="text-sm text-white/60">No tests yet.</p>
            <p className="text-xs text-white/40">
              Hit <span className="text-white/70">Create test</span> on a tool in
              the MCP docs, or generate them for every tool at once.
            </p>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleGenerateAll}
              disabled={generatingAll}
            >
              {generatingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              Create tests for every tool
            </Button>
          </div>
        )}

        {groups.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {groups.map(([name, toolMap]) => {
                const count = Array.from(toolMap.values())
                  .flat()
                  .reduce((n, s) => n + s.cases.length, 0)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveGroup(name)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      name === activeGroup
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
                {activeGroup} · {tools.length} tool{tools.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                {genResult && (
                  <span className="text-[11px] text-emerald-400">{genResult}</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs"
                  onClick={handleGenerateAll}
                  disabled={generatingAll}
                  title="Regenerate smoke + regression for every tool, one at a time"
                >
                  {generatingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Regenerate all
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {tools.map(([toolName, toolSuites]) => (
                <ToolCard
                  key={toolName}
                  toolName={toolName}
                  suites={toolSuites}
                  runs={runs}
                  runningId={runningId}
                  onRun={handleRun}
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

function ToolCard({
  toolName,
  suites,
  runs,
  runningId,
  onRun,
  onRefined,
}: {
  toolName: string
  suites: McpToolSuite[]
  runs: Record<string, McpSuiteRunResult>
  runningId: string | null
  onRun: (suiteId: string) => void
  onRefined: () => void
}) {
  const [open, setOpen] = useState(false)
  const totalCases = suites.reduce((n, s) => n + s.cases.length, 0)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-white/30 transition-transform shrink-0",
              open && "rotate-90"
            )}
          />
          <span className="font-mono text-sm text-white/85 truncate">
            {toolName}
          </span>
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
  onRefined,
}: {
  suite: McpToolSuite
  run?: McpSuiteRunResult
  running: boolean
  onRun: () => void
  onRefined: () => void
}) {
  const last = suite.lastRun
  const byCase = useMemo(() => {
    const m = new Map<string, McpSuiteCaseResult>()
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
          type="button"
          className="ml-auto h-7 bg-emerald-600/80 hover:bg-emerald-500 text-white gap-1.5 text-xs"
          onClick={onRun}
          disabled={running}
          title="Runs the tool for real — a tool that writes or deletes will do so"
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
  onRefined,
}: {
  suiteId: string
  testCase: McpToolTestCase
  result?: McpSuiteCaseResult
  onRefined: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!instruction.trim()) return
    setSaving(true)
    try {
      await refineMcpToolSuiteCase(suiteId, c._id, instruction)
      setInstruction("")
      setEditing(false)
      onRefined()
    } catch {
      /* surfaced by the page-level error state on the next load */
    } finally {
      setSaving(false)
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
            {/* An error-handling case passes when the tool REJECTS the input —
                without saying so, a red ✗ next to "expects error" reads backwards. */}
            {c.expectError && (
              <span className="text-[10px] text-amber-400/70 border border-amber-500/30 rounded-full px-1.5">
                expects rejection
              </span>
            )}
            {result?.isRegression && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                regression
              </span>
            )}
          </div>

          {c.covers && (
            <p className="text-[11px] text-white/45 mt-0.5">{c.covers}</p>
          )}

          {Object.keys(c.args || {}).length > 0 && (
            <pre className="mt-1 text-[10px] text-white/30 font-mono overflow-x-auto">
              {JSON.stringify(c.args)}
            </pre>
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
              {result.errored ? "tool errored" : "tool responded"}
              {result.latencyMs != null && ` · ${result.latencyMs}ms`}
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
                placeholder="e.g. also check that it returns a total count"
                className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
              />
              <Button
                size="sm"
                type="button"
                className="h-6 text-[11px] px-2"
                onClick={submit}
                disabled={saving || !instruction.trim()}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
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
