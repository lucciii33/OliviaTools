import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, Navigate } from "react-router"
import {
  ArrowLeft,
  Bug,
  ChevronDown,
  FileJson,
  ListChecks,
  Loader2,
  PlayCircle,
  Server,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  deleteMcpQaRun,
  getMcpQaRun,
  listMcpQaRuns,
  type McpQaRunListItem,
  type McpQaRunResponse,
} from "~/api/mcpDocsApi"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { useAuth } from "~/context/AuthContext"
import { cn } from "~/lib/utils"

function getRunId(run: McpQaRunListItem | McpQaRunResponse) {
  return run._id ?? run.id ?? run.runId ?? ""
}

function formatDate(value?: string) {
  if (!value) return "Unknown date"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function valueOrZero(value: unknown) {
  return typeof value === "number" ? value : 0
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-md border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/60">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null
  if (typeof value === "object") {
    return (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-white/30">{label}</p>
        <JsonBlock value={value} />
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-1 text-sm text-white/70">{String(value)}</p>
    </div>
  )
}

function Panel({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-white/10 bg-white/[0.025]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
          {icon}
          {title}
        </span>
        <ChevronDown className="h-4 w-4 text-white/35 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 p-4">{children}</div>
    </details>
  )
}

function CollapsibleJsonItem({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <details className="group rounded-md border border-white/10 bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          {subtitle && <p className="truncate text-xs text-white/40">{subtitle}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/35 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-white/10 p-3">{children}</div>
    </details>
  )
}

function TestCases({ cases }: { cases: unknown[] }) {
  if (!cases.length) return <p className="text-sm text-white/40">No test cases saved.</p>
  return (
    <div className="space-y-2">
      {cases.map((item, index) => {
        const testCase = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        const title =
          String(testCase.name ?? testCase.title ?? `Test case ${index + 1}`)
        const toolName = testCase.toolName ?? testCase.tool ?? testCase.expectedTool
        return (
          <CollapsibleJsonItem
            key={index}
            title={title}
            subtitle={[toolName, testCase.category].filter(Boolean).map(String).join(" · ")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tool" value={toolName} />
              <Field label="Category" value={testCase.category} />
              <Field label="Args / input" value={testCase.args ?? testCase.input ?? testCase.sampleArgs ?? testCase.expectedArgs} />
              <Field label="Expected behavior" value={testCase.expected ?? testCase.expectedBehavior ?? testCase.expectedResult ?? testCase.assertions} />
            </div>
            <JsonBlock value={item} />
          </CollapsibleJsonItem>
        )
      })}
    </div>
  )
}

function Results({ results }: { results: unknown[] }) {
  if (!results.length) return <p className="text-sm text-white/40">No results saved.</p>
  return (
    <div className="space-y-2">
      {results.map((item, index) => {
        const result = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        const verdict = result.verdict ?? result.status ?? result.executionStatus
        const error =
          result.error ??
          (result.execution && typeof result.execution === "object"
            ? (result.execution as Record<string, unknown>).error
            : undefined)
        return (
          <CollapsibleJsonItem
            key={index}
            title={String(result.name ?? result.testName ?? `Result ${index + 1}`)}
            subtitle={[result.toolName, result.category, verdict].filter(Boolean).map(String).join(" · ")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tool" value={result.toolName} />
              <Field label="Category" value={result.category} />
              <Field label="Verdict / status" value={verdict} />
              <Field label="Error" value={error} />
              <Field label="Reasoning" value={result.reasoning} />
              <Field label="Execution" value={result.execution} />
            </div>
            <JsonBlock value={item} />
          </CollapsibleJsonItem>
        )
      })}
    </div>
  )
}

function Bugs({ bugs }: { bugs: unknown[] }) {
  if (!bugs.length) return <p className="text-sm text-white/40">No bugs saved.</p>
  return (
    <div className="space-y-2">
      {bugs.map((item, index) => {
        const bug = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        return (
          <CollapsibleJsonItem
            key={index}
            title={String(bug.title ?? `Bug ${index + 1}`)}
            subtitle={[bug.toolName, bug.severity, bug.category].filter(Boolean).map(String).join(" · ")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tool" value={bug.toolName} />
              <Field label="Severity" value={bug.severity} />
              <Field label="Category" value={bug.category} />
              <Field label="Description" value={bug.description} />
              <Field label="Expected" value={bug.expected} />
              <Field label="Actual" value={bug.actual} />
              <Field label="Evidence" value={bug.evidence} />
              <Field label="Recommendation" value={bug.recommendation} />
            </div>
            <JsonBlock value={item} />
          </CollapsibleJsonItem>
        )
      })}
    </div>
  )
}

export default function McpQaRunsPage() {
  const { user } = useAuth()
  const [runs, setRuns] = useState<McpQaRunListItem[]>([])
  const [detailsById, setDetailsById] = useState<Record<string, McpQaRunResponse>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null)
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<McpQaRunListItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    listMcpQaRuns()
      .then((data) => {
        if (cancelled) return
        const sorted = [...(data.runs ?? [])].sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime()
          const bTime = new Date(b.createdAt ?? 0).getTime()
          return bTime - aTime
        })
        setRuns(sorted)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error loading QA runs")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const runCount = useMemo(() => runs.length, [runs])

  if (!user) return <Navigate to="/login" replace />

  async function loadRunDetails(run: McpQaRunListItem) {
    const id = getRunId(run)
    if (!id || detailsById[id] || loadingRunId === id) return
    setLoadingRunId(id)
    setError(null)
    try {
      const data = await getMcpQaRun(id)
      setDetailsById((prev) => ({ ...prev, [id]: data.run }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading QA run")
    } finally {
      setLoadingRunId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const id = getRunId(deleteTarget)
    if (!id) return
    setDeletingRunId(id)
    setError(null)
    try {
      await deleteMcpQaRun(id)
      setRuns((prev) => prev.filter((run) => getRunId(run) !== id))
      setDetailsById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting QA run")
    } finally {
      setDeletingRunId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/mcp-docs" className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">MCP Docs</span>
          </Link>
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">MCP QA Runs</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Saved MCP QA
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">MCP QA Runs</h1>
          <p className="mt-1 text-sm text-white/50">
            {runCount} saved run{runCount === 1 ? "" : "s"} with generated cases, results, bugs, and raw JSON.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        )}

        {!loading && runs.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm text-white/45">No saved MCP QA runs yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {runs.map((run, index) => {
            const id = getRunId(run) || String(index)
            const fullRun = detailsById[id]
            const activeRun = fullRun ?? run
            const summary = activeRun.summary ?? {}
            const cases = Array.isArray(fullRun?.cases) ? fullRun.cases : []
            const results = Array.isArray(fullRun?.results) ? fullRun.results : []
            const bugs = Array.isArray(fullRun?.bugs) ? fullRun.bugs : []
            return (
              <details
                key={id}
                className="group rounded-lg border border-white/10 bg-white/[0.03]"
                onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open) {
                    void loadRunDetails(run)
                  }
                }}
              >
                <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-cyan-200" />
                      <h2 className="truncate text-sm font-semibold text-white">
                        {activeRun.serverName ?? "Unknown MCP server"}
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      {formatDate(activeRun.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge label="Total" value={valueOrZero(summary.total)} />
                    <Badge label="Passed" value={valueOrZero(summary.passed)} tone="text-emerald-200 bg-emerald-500/10" />
                    <Badge label="Failed" value={valueOrZero(summary.failed)} tone="text-red-200 bg-red-500/10" />
                    <Badge label="Warned" value={valueOrZero(summary.warned)} tone="text-amber-200 bg-amber-500/10" />
                    <Badge label="Bugs" value={valueOrZero(summary.bugs)} tone="text-rose-200 bg-rose-500/10" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-white/35 hover:text-red-300 hover:bg-red-500/10"
                      title="Delete QA run"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setDeleteTarget(run)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronDown className="h-4 w-4 text-white/35 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="space-y-3 border-t border-white/10 p-4">
                  {loadingRunId === getRunId(run) && (
                    <div className="flex items-center gap-2 text-sm text-white/45">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading full run...
                    </div>
                  )}

                  <Panel title="Summary" icon={<ListChecks className="h-4 w-4 text-cyan-200" />} defaultOpen>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Server" value={activeRun.serverName} />
                      <Field label="Server URL" value={activeRun.serverUrl} />
                      <Field label="Transport" value={activeRun.transport} />
                      <Field label="Created" value={formatDate(activeRun.createdAt)} />
                    </div>
                    <div className="mt-4">
                      <JsonBlock value={summary} />
                    </div>
                  </Panel>

                  <Panel title="AI-generated test cases" icon={<PlayCircle className="h-4 w-4 text-emerald-200" />}>
                    <TestCases cases={cases} />
                  </Panel>

                  <Panel title="Results" icon={<ListChecks className="h-4 w-4 text-blue-200" />}>
                    <Results results={results} />
                  </Panel>

                  <Panel title="Bugs" icon={<Bug className="h-4 w-4 text-rose-200" />}>
                    <Bugs bugs={bugs} />
                  </Panel>

                  <Panel title="Raw JSON" icon={<FileJson className="h-4 w-4 text-white/60" />}>
                    <JsonBlock value={fullRun ?? run} />
                  </Panel>
                </div>
              </details>
            )
          })}
        </div>
      </main>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#101217] text-white">
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete?</DialogTitle>
            <DialogDescription className="text-white/55 leading-relaxed">
              This will delete the QA run and its associated bugs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deleteTarget && deletingRunId === getRunId(deleteTarget))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={Boolean(deleteTarget && deletingRunId === getRunId(deleteTarget))}
            >
              {deleteTarget && deletingRunId === getRunId(deleteTarget) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Badge({
  label,
  value,
  tone = "text-white/70 bg-white/10",
}: {
  label: string
  value: number
  tone?: string
}) {
  return (
    <span className={cn("rounded-md px-2 py-1", tone)}>
      {label}: {value}
    </span>
  )
}
