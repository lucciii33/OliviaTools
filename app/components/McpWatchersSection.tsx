import { useEffect, useMemo, useState } from "react"
import {
  Server,
  Loader2,
  Trash2,
  GitMerge,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import {
  useInstallationsApi,
  type Installation,
} from "~/api/installationsApi"
import { listMcpProjects, type McpProject } from "~/api/mcpDocsApi"
import {
  listMcpWatchers,
  createMcpWatcher,
  updateMcpWatcher,
  deleteMcpWatcher,
  listMcpWatcherRuns,
  listNewTools,
  acknowledgeNewTools,
  type McpWatcher,
  type McpWatcherRun,
  type NewTool,
} from "~/api/watcherApi"
import { cn } from "~/lib/utils"
import { WatcherName } from "~/components/WatcherName"

// MCP watchers — the MCP half of the Watchers page.
//
// Links an MCP project to the repo its server is built from. A merge there
// means the server is about to change, but the live server is still on the old
// build at that moment — so each run keeps re-reading the server's tools until
// the new ones appear, then flags, tests and bug-hunts them.
//
// Self-contained (own state and polling) so the API section above it doesn't
// have to know MCP exists.
export function McpWatchersSection() {
  const { installations, getInstallations } = useInstallationsApi()

  const [watchers, setWatchers] = useState<McpWatcher[]>([])
  const [runs, setRuns] = useState<McpWatcherRun[]>([])
  const [fresh, setFresh] = useState<NewTool[]>([])
  const [projects, setProjects] = useState<McpProject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickProject, setPickProject] = useState("")
  const [pickRepo, setPickRepo] = useState("")
  const [pickBranch, setPickBranch] = useState("main")
  const [pickName, setPickName] = useState("")

  async function refresh() {
    try {
      const [w, r, n] = await Promise.all([
        listMcpWatchers(),
        listMcpWatcherRuns(),
        listNewTools(),
      ])
      setWatchers(w)
      setRuns(r)
      setFresh(n)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP watchers")
    }
  }

  useEffect(() => {
    getInstallations()
    listMcpProjects()
      .then((res) => setProjects(res.projects || []))
      .catch(() => {})
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A run can sit in "pending"/"running" for many minutes while it waits for
  // the deploy, so poll faster while anything is in flight.
  const anyRunning = useMemo(
    () =>
      watchers.some((w) => w.lastRun?.status === "running") ||
      runs.some((r) => r.status === "running" || r.status === "pending"),
    [watchers, runs]
  )
  useEffect(() => {
    const id = setInterval(refresh, anyRunning ? 5000 : 20000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyRunning])

  const repoOptions = useMemo(() => {
    const seen = new Set<string>()
    return (installations || []).filter((r: Installation) => {
      const full = r.fullName || `${r.owner}/${r.repo}`
      if (seen.has(full)) return false
      seen.add(full)
      return true
    })
  }, [installations])

  async function handleAdd() {
    if (!pickProject || !pickRepo || !pickName.trim()) return
    const [owner, repo] = pickRepo.split("/")
    setAdding(true)
    try {
      await createMcpWatcher({
        name: pickName.trim(),
        mcpProjectId: pickProject,
        owner,
        repo,
        branch: pickBranch || "main",
      })
      setPickProject("")
      setPickRepo("")
      setPickName("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the watcher")
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="mt-10 pt-8 border-t border-white/10">
      <div className="flex items-center gap-2 mb-1">
        <Server className="h-4 w-4 text-purple-300" />
        <h2 className="text-base font-semibold">MCP servers</h2>
      </div>
      <p className="text-sm text-white/40 mb-2">
        Link an MCP project to the repo its server is built from. When something
        merges, Olivia waits for the deploy, re-reads the server&apos;s tools,
        flags the new ones, and tests them.
      </p>
      <p className="text-xs text-white/25 mb-5">
        The server has to be reachable from Olivia — a server on localhost works
        only while Olivia runs on the same machine.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {fresh.length > 0 && (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                {fresh.length} new tool{fresh.length === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="h-7 text-xs border-white/15"
              onClick={async () => {
                await acknowledgeNewTools()
                refresh()
              }}
            >
              Mark all reviewed
            </Button>
          </div>
          <div className="space-y-1">
            {fresh.map((t) => (
              <div key={t._id} className="flex items-center gap-2 text-xs px-1.5 py-1">
                <span className="font-mono text-emerald-300/80">{t.name}</span>
                <span className="text-white/30">{t.projectName}</span>
                {t.firstSeenPr && (
                  <span className="text-white/25">#{t.firstSeenPr}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
          Watch an MCP server
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={pickName}
            onChange={(e) => setPickName(e.target.value)}
            placeholder="Name (e.g. Inventory MCP)"
            maxLength={80}
            className="sm:w-44 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
          />
          <select
            value={pickProject}
            onChange={(e) => setPickProject(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/25"
          >
            <option value="">MCP project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id} className="bg-[#0a0a0f]">
                {p.projectName}
              </option>
            ))}
          </select>
          <select
            value={pickRepo}
            onChange={(e) => setPickRepo(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/25"
          >
            <option value="">…built from repo</option>
            {repoOptions.map((r: Installation) => {
              const full = r.fullName || `${r.owner}/${r.repo}`
              return (
                <option key={full} value={full} className="bg-[#0a0a0f]">
                  {full}
                </option>
              )
            })}
          </select>
          <input
            value={pickBranch}
            onChange={(e) => setPickBranch(e.target.value)}
            placeholder="main"
            className="w-28 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm font-mono text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
          />
          <Button
            size="sm"
            type="button"
            className="gap-1.5"
            onClick={handleAdd}
            disabled={adding || !pickProject || !pickRepo || !pickName.trim()}
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Watch
          </Button>
        </div>
      </div>

      {watchers.length > 0 && (
        <div className="space-y-2 mb-6">
          {watchers.map((w) => {
            const running = w.lastRun?.status === "running"
            return (
              <div
                key={w._id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                <button
                  type="button"
                  onClick={async () => {
                    await updateMcpWatcher(w._id, { enabled: !w.enabled })
                    refresh()
                  }}
                  title={w.enabled ? "Pause" : "Resume"}
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    w.enabled ? "bg-emerald-400" : "bg-white/20"
                  )}
                />
                <WatcherName
                  name={w.name}
                  fallback={w.projectName}
                  onRename={async (name) => {
                    await updateMcpWatcher(w._id, { name })
                    refresh()
                  }}
                />
                {w.name && (
                  <span className="text-[11px] text-white/45">{w.projectName}</span>
                )}
                <span className="text-[11px] text-white/35 font-mono">
                  ← {w.owner}/{w.repo} · {w.branch}
                </span>
                <span className="text-[11px] text-white/40">
                  {running ? (
                    <span
                      className="text-amber-400"
                      title="Waiting for the deploy, then re-reading the server's tools"
                    >
                      running…
                    </span>
                  ) : w.lastRun?.status === "failed" ? (
                    <span className="text-red-400">last run failed</span>
                  ) : w.lastRun?.at ? (
                    <>
                      {w.lastRun.newTools} new · {w.lastRun.testsCreated} tests
                      {w.lastRun.bugsFound > 0 && (
                        <span className="text-red-400">
                          {" "}
                          · {w.lastRun.bugsFound} bug
                          {w.lastRun.bugsFound === 1 ? "" : "s"}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-white/25">
                      watching · waiting for a merge to {w.branch}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMcpWatcher(w._id)
                    refresh()
                  }}
                  className="ml-auto text-white/25 hover:text-red-400 p-1"
                  title="Stop watching"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {runs.length > 0 && (
        <>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Recent MCP runs
          </p>
          <div className="space-y-2">
            {runs.map((r) => (
              <div
                key={r._id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {r.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : r.status === "failed" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  )}
                  <span className="text-white/70">{r.projectName}</span>
                  {r.trigger.kind === "merge" && (
                    <span className="inline-flex items-center gap-1 text-white/40">
                      <GitMerge className="h-3 w-3" />#{r.trigger.prNumber}{" "}
                      {r.trigger.prTitle}
                    </span>
                  )}
                  {r.status === "running" || r.status === "pending" ? (
                    <span className="text-amber-400/80">
                      running… check {r.checks || 0}
                    </span>
                  ) : (
                    r.checks > 0 && (
                      <span className="text-white/30">
                        {r.checks} check{r.checks === 1 ? "" : "s"}
                      </span>
                    )
                  )}
                  <span className="ml-auto text-white/25">
                    {new Date(r.startedAt).toLocaleString()}
                  </span>
                </div>
                {r.error && (
                  <p className="mt-1.5 text-[11px] text-red-400/80">{r.error}</p>
                )}
                {r.note && !r.error && (
                  <p className="mt-1.5 text-[11px] text-white/35">{r.note}</p>
                )}
                {(r.editedTools?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {r.editedTools!.map((t) => (
                      <div key={`edited-${t.name}`} className="flex items-center gap-2 text-[11px]">
                        <span className="text-amber-300/80 shrink-0">edited</span>
                        <span className="font-mono text-white/60 truncate">{t.name}</span>
                        <span className="text-white/30 truncate">{t.changes.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {r.newTools.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {r.newTools.map((t) => (
                      <div key={t.name} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-emerald-300/70 truncate">
                          {t.name}
                        </span>
                        <span className="text-white/30 shrink-0">
                          {t.testsCreated} tests
                        </span>
                        {t.bugsFound > 0 ? (
                          <span className="text-red-400 shrink-0">
                            {t.bugsFound} bug{t.bugsFound === 1 ? "" : "s"}
                          </span>
                        ) : !t.qaError ? (
                          <span className="text-emerald-400/60 shrink-0">no bugs</span>
                        ) : null}
                        {(t.testError || t.qaError) && (
                          <span className="text-amber-400/60 truncate">
                            {t.testError || t.qaError}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
