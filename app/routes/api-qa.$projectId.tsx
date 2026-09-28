import { useEffect, useMemo, useState } from "react"
import { Link, useParams, useNavigate } from "react-router"
import {
  ArrowLeft,
  Bug as BugIcon,
  ChevronRight,
  Loader2,
  PlayCircle,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Sidebar } from "~/components/Sidebar"
import { Button } from "~/components/ui/button"
import { MethodBadge } from "~/components/MethodBadge"
import { useAuth } from "~/context/AuthContext"
import { useQaApi, type BugStatus, type ScopedBug, type ScopedQaRun } from "~/api/qaApi"
import { cn } from "~/lib/utils"

// Where an API repo's bug hunter output lives: every bug it found and every run
// it made, for the whole repo. The MCP side has had these two pages since the
// beginning; on the API side the results existed in the database with no screen
// to read them from, so a watcher could report "3 bugs" that nobody could open.

type Tab = "bugs" | "runs"

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  low: "border-white/15 bg-white/5 text-white/50",
}

function formatDate(value?: string) {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function ApiQaPage() {
  // Two ways in, same as the tests page: a connected repo or an imported spec.
  const { projectId, owner, repo } = useParams()
  const isRepo = Boolean(owner && repo)
  const scope = useMemo(
    () => (isRepo ? { owner, repo } : { projectId }),
    [isRepo, owner, repo, projectId],
  )
  const { user } = useAuth()
  const navigate = useNavigate()
  const { listScopeBugs, listScopeQaRuns, setBugStatus, deleteBug, error } = useQaApi()

  const [tab, setTab] = useState<Tab>("bugs")
  const [bugs, setBugs] = useState<ScopedBug[]>([])
  const [runs, setRuns] = useState<ScopedQaRun[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BugStatus | "all">("open")

  async function refresh() {
    setLoading(true)
    const [b, r] = await Promise.all([listScopeBugs(scope), listScopeQaRuns(scope)])
    setBugs(b)
    setRuns(r)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, owner, repo, projectId])

  const shownBugs = useMemo(
    () =>
      statusFilter === "all" ? bugs : bugs.filter((b) => b.status === statusFilter),
    [bugs, statusFilter],
  )

  const openCount = bugs.filter((b) => b.status === "open").length
  const title = isRepo ? `${owner}/${repo}` : "API project"

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-5xl">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <Link
              to={isRepo ? `/docs/${owner}/${repo}` : "/swagger-qa"}
              className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-1"
            >
              <ArrowLeft className="h-3 w-3" /> Back to docs
            </Link>
            <h1 className="text-lg font-semibold truncate">
              <span className="text-white/50">Bug hunter · </span>
              {title}
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              {openCount} open bug{openCount === 1 ? "" : "s"} · {runs.length} run
              {runs.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <TabButton active={tab === "bugs"} onClick={() => setTab("bugs")}>
            <BugIcon className="h-3.5 w-3.5" />
            Bugs
          </TabButton>
          <TabButton active={tab === "runs"} onClick={() => setTab("runs")}>
            <PlayCircle className="h-3.5 w-3.5" />
            QA Runs
          </TabButton>

          {tab === "bugs" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BugStatus | "all")}
              className="ml-auto bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-white/25"
            >
              <option value="open" className="bg-[#0a0a0f]">Open</option>
              <option value="fixed" className="bg-[#0a0a0f]">Fixed</option>
              <option value="ignored" className="bg-[#0a0a0f]">Ignored</option>
              <option value="all" className="bg-[#0a0a0f]">All</option>
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : tab === "bugs" ? (
          shownBugs.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-10">
              {bugs.length === 0
                ? "The bug hunter hasn't reported anything here yet."
                : "Nothing with that status."}
            </p>
          ) : (
            <div className="space-y-2">
              {shownBugs.map((b) => (
                <BugRow
                  key={b._id}
                  bug={b}
                  onStatus={async (status) => {
                    await setBugStatus(b._id, status)
                    setBugs((prev) =>
                      prev.map((x) => (x._id === b._id ? { ...x, status } : x)),
                    )
                  }}
                  onDelete={async () => {
                    await deleteBug(b._id)
                    setBugs((prev) => prev.filter((x) => x._id !== b._id))
                  }}
                />
              ))}
            </div>
          )
        ) : runs.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-10">
            No bug hunter runs yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {runs.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5"
              >
                {r.method && <MethodBadge method={r.method as never} />}
                <span className="font-mono text-xs text-white/75 truncate">
                  {r.path || "—"}
                </span>
                <span className="text-[11px] text-white/40 ml-auto shrink-0">
                  {r.totalTests} test{r.totalTests === 1 ? "" : "s"}
                </span>
                <span
                  className={cn(
                    "text-[11px] shrink-0",
                    r.bugCount > 0 ? "text-red-400" : "text-emerald-400/70",
                  )}
                >
                  {r.bugCount > 0
                    ? `${r.bugCount} bug${r.bugCount === 1 ? "" : "s"}`
                    : "no bugs"}
                </span>
                <span className="text-[11px] text-white/25 shrink-0">
                  {formatDate(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs border",
        active
          ? "border-white/20 bg-white/[0.06] text-white"
          : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/80",
      )}
    >
      {children}
    </button>
  )
}

function BugRow({
  bug,
  onStatus,
  onDelete,
}: {
  bug: ScopedBug
  onStatus: (status: BugStatus) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-start gap-2 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-white/30 transition-transform shrink-0 mt-0.5",
              open && "rotate-90",
            )}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider rounded-full border px-1.5",
                  SEVERITY_STYLE[bug.severity] || SEVERITY_STYLE.low,
                )}
              >
                {bug.severity}
              </span>
              {bug.method && <MethodBadge method={bug.method as never} />}
              <span className="font-mono text-[11px] text-white/45 truncate">
                {bug.path}
              </span>
              {bug.status !== "open" && (
                <span className="text-[10px] text-white/35 uppercase tracking-wider">
                  {bug.status}
                </span>
              )}
            </div>
            <p className="text-sm text-white/85 mt-1">{bug.title}</p>
          </div>
        </button>
        <span className="text-[11px] text-white/25 shrink-0">
          {formatDate(bug.createdAt)}
        </span>
      </div>

      {open && (
        <div className="px-4 pb-4 pl-10 space-y-3">
          {bug.description && (
            <p className="text-xs text-white/55 whitespace-pre-wrap">
              {bug.description}
            </p>
          )}
          {/* The request that produced it — a ticket nobody can reproduce is
              worth nothing. */}
          {bug.request?.url && (
            <div className="rounded-md border border-white/10 bg-black/25 p-3 space-y-1">
              <p className="font-mono text-[11px] text-white/60 break-all">
                {bug.request.method} {bug.request.url}
              </p>
              {bug.request.body != null && (
                <pre className="max-h-40 overflow-auto text-[11px] text-white/45">
                  {JSON.stringify(bug.request.body, null, 2)}
                </pre>
              )}
              <p className="text-[11px] text-white/40">
                → {bug.response?.status}
                {bug.expectedStatus?.length
                  ? ` (expected ${bug.expectedStatus.join(", ")})`
                  : ""}
              </p>
              {bug.response?.body != null && (
                <pre className="max-h-40 overflow-auto text-[11px] text-white/45">
                  {JSON.stringify(bug.response.body, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {bug.status !== "fixed" && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-[11px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => onStatus("fixed")}
              >
                Mark fixed
              </Button>
            )}
            {bug.status !== "ignored" && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-[11px] border-white/15 text-white/60"
                onClick={() => onStatus("ignored")}
              >
                Ignore
              </Button>
            )}
            {bug.status !== "open" && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-[11px] border-white/15 text-white/60"
                onClick={() => onStatus("open")}
              >
                Reopen
              </Button>
            )}
            <button
              type="button"
              onClick={onDelete}
              title="Delete this bug"
              className="ml-auto text-white/25 hover:text-red-400 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
