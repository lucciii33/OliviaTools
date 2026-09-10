import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  Eye,
  Loader2,
  Play,
  Trash2,
  GitMerge,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { Sidebar } from "~/components/Sidebar"
import { Button } from "~/components/ui/button"
import { useAuth } from "~/context/AuthContext"
import {
  useInstallationsApi,
  type Installation,
} from "~/api/installationsApi"
import {
  listWatchers,
  createWatcher,
  updateWatcher,
  deleteWatcher,
  runWatcherNow,
  listWatcherRuns,
  listNewEndpoints,
  acknowledgeNewEndpoints,
  type Watcher,
  type WatcherRun,
  type NewEndpoint,
} from "~/api/watcherApi"
import { cn } from "~/lib/utils"

// Watchers.
//
// Put a watch on a connected repo and Olivia does after every merge what
// someone otherwise has to remember to do by hand: regenerate the docs, notice
// which endpoints are new, and generate QA for them. The value is that an
// endpoint shipped on Friday is documented and covered by Monday.
export default function WatchersPage() {
  const { user } = useAuth()
  const { installations, getInstallations } = useInstallationsApi()

  const [watchers, setWatchers] = useState<Watcher[]>([])
  const [runs, setRuns] = useState<WatcherRun[]>([])
  const [fresh, setFresh] = useState<NewEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickRepo, setPickRepo] = useState("")
  const [pickBranch, setPickBranch] = useState("main")

  async function refresh() {
    try {
      const [w, r, n] = await Promise.all([
        listWatchers(),
        listWatcherRuns(),
        listNewEndpoints(),
      ])
      setWatchers(w)
      setRuns(r)
      setFresh(n)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getInstallations()
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A repo already watched on that branch shouldn't be offered again.
  const available = useMemo(() => {
    const taken = new Set(watchers.map((w) => `${w.owner}/${w.repo}`))
    const seen = new Set<string>()
    return (installations || []).filter((r: Installation) => {
      const full = r.fullName || `${r.owner}/${r.repo}`
      if (taken.has(full) || seen.has(full)) return false
      seen.add(full)
      return true
    })
  }, [installations, watchers])

  async function handleAdd() {
    if (!pickRepo) return
    const [owner, repo] = pickRepo.split("/")
    setAdding(true)
    try {
      await createWatcher({ owner, repo, branch: pickBranch || "main" })
      setPickRepo("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the watcher")
    } finally {
      setAdding(false)
    }
  }

  // A run takes minutes and the POST returns as soon as it has STARTED, so
  // local button state says nothing about whether work is happening. The
  // server marks lastRun.status = "running", and that's what the UI follows.
  const anyRunning = useMemo(
    () =>
      watchers.some((w) => w.lastRun?.status === "running") ||
      runs.some((r) => r.status === "running"),
    [watchers, runs]
  )

  // Poll always, faster while something is running.
  //
  // Polling ONLY when a run is already in flight looked cheaper but broke the
  // main case: a watcher is triggered by a merge, so the page is sitting idle
  // when the work starts. With no timer running, nothing ever noticed it began
  // and the user saw a static page until they refreshed by hand — which defeats
  // the point of watching.
  useEffect(() => {
    const id = setInterval(refresh, anyRunning ? 5000 : 20000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyRunning])

  // Still here so uncommenting the button above is the only change needed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleRun(id: string) {
    setBusyId(id)
    try {
      await runWatcherNow(id)
      // Pull once so lastRun flips to "running" and the poll above takes over.
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the run")
    } finally {
      setBusyId(null)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-5xl">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-5 w-5 text-cyan-400" />
          <h1 className="text-lg font-semibold">Watchers</h1>
        </div>
        <p className="text-sm text-white/40 mb-2">
          Watch a repo. When something merges, Olivia regenerates the docs, flags
          endpoints that weren&apos;t there before, and writes QA for them.
        </p>
        <p className="text-xs text-white/25 mb-6">
          Nothing to press — a watch runs itself, triggered by GitHub when a pull
          request is merged into the branch you name.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* What shipped since anyone last looked — the reason to open this page. */}
        {fresh.length > 0 && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  {fresh.length} new endpoint{fresh.length === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-white/15"
                onClick={async () => {
                  await acknowledgeNewEndpoints()
                  refresh()
                }}
              >
                Mark all reviewed
              </Button>
            </div>
            <div className="space-y-1">
              {fresh.map((d) => (
                <Link
                  key={d._id}
                  to={`/docs/${d.owner}/${d.repo}`}
                  className="flex items-center gap-2 text-xs hover:bg-white/5 rounded px-1.5 py-1"
                >
                  <span className="font-mono text-emerald-300/80 w-14 shrink-0">
                    {d.method}
                  </span>
                  <span className="font-mono text-white/70 truncate">{d.path}</span>
                  <span className="text-white/30 shrink-0">
                    {d.owner}/{d.repo}
                  </span>
                  {d.firstSeenPr && (
                    <span className="text-white/25 shrink-0">#{d.firstSeenPr}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Add */}
        <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Watch a repo
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={pickRepo}
              onChange={(e) => setPickRepo(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/25"
            >
              <option value="">
                {available.length ? "Pick a connected repo…" : "No repos available"}
              </option>
              {available.map((r: Installation) => {
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
              className="w-32 bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-sm font-mono text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
            />
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleAdd}
              disabled={adding || !pickRepo}
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

        {/* Watchers */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : watchers.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">
            Nothing watched yet.
          </p>
        ) : (
          <div className="space-y-2 mb-8">
            {watchers.map((w) => (
              <div
                key={w._id}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                <button
                  type="button"
                  onClick={async () => {
                    await updateWatcher(w._id, { enabled: !w.enabled })
                    refresh()
                  }}
                  title={w.enabled ? "Pause" : "Resume"}
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    w.enabled ? "bg-emerald-400" : "bg-white/20"
                  )}
                />
                <span className="font-mono text-sm text-white/85">
                  {w.owner}/{w.repo}
                </span>
                <span className="text-[11px] text-white/35 font-mono">
                  {w.branch}
                </span>

                {w.lastRun?.at ? (
                  <span className="text-[11px] text-white/40">
                    {w.lastRun.status === "failed" ? (
                      <span className="text-red-400">last run failed</span>
                    ) : w.lastRun.status === "running" ? (
                      <span className="text-amber-400">running…</span>
                    ) : (
                      <>
                        {w.lastRun.newEndpoints} new · {w.lastRun.testsCreated} tests
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/25">
                    watching · waiting for a merge to {w.branch}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                  {/* A watcher is passive by definition: it fires on a merge,
                      it isn't something you invoke. A "Run now" button framed it
                      as a manual tool and invited people to press it instead of
                      trusting the watch. The endpoint still exists
                      (POST /api/watchers/:id/run) for debugging when the GitHub
                      webhook isn't reachable — uncomment to bring the button
                      back. */}
                  {/* {(() => {
                    const running =
                      w.lastRun?.status === "running" || busyId === w._id
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-white/15"
                        onClick={() => handleRun(w._id)}
                        disabled={running}
                      >
                        {running ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {running ? "Running…" : "Run now"}
                      </Button>
                    )
                  })()} */}
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteWatcher(w._id)
                      refresh()
                    }}
                    className="text-white/25 hover:text-red-400 p-1"
                    title="Stop watching"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {runs.length > 0 && (
          <>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
              Recent runs
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
                    <span className="font-mono text-white/70">
                      {r.owner}/{r.repo}
                    </span>
                    {r.trigger.kind === "merge" ? (
                      <span className="inline-flex items-center gap-1 text-white/40">
                        <GitMerge className="h-3 w-3" />
                        #{r.trigger.prNumber} {r.trigger.prTitle}
                      </span>
                    ) : (
                      <span className="text-white/30">manual</span>
                    )}
                    <span className="ml-auto text-white/25">
                      {new Date(r.startedAt).toLocaleString()}
                    </span>
                  </div>

                  {r.error && (
                    <p className="mt-1.5 text-[11px] text-red-400/80">{r.error}</p>
                  )}

                  {r.newEndpoints.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {r.newEndpoints.map((e) => (
                        <div
                          key={`${e.method}${e.path}`}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span className="font-mono text-emerald-300/70 w-12 shrink-0">
                            {e.method}
                          </span>
                          <span className="font-mono text-white/60 truncate">
                            {e.path}
                          </span>
                          <span className="text-white/30 shrink-0">
                            {e.testsCreated} tests
                          </span>
                          {e.testError && (
                            <span className="text-red-400/60 truncate">
                              {e.testError}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {r.status === "success" && r.newEndpoints.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-white/30">
                      No new endpoints ({r.docsAfter} total).
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
