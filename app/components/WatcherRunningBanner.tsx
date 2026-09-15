import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Loader2 } from "lucide-react"
import {
  listActiveMcpWatcherRuns,
  listActiveWatcherRuns,
  type ActiveWatcherRun,
} from "~/api/watcherApi"

type Props =
  | { kind: "api"; owner: string; repo: string; onFinished?: () => void }
  | { kind: "mcp"; projectId: string; onFinished?: () => void }

// Tells whoever is looking at a repo's docs (or an MCP project) that a watcher
// is working on it right now, so they don't read docs that are about to change.
// Polls on its own; when the last run finishes it calls onFinished so the page
// can reload what the run just changed.
export function WatcherRunningBanner(props: Props) {
  const [runs, setRuns] = useState<ActiveWatcherRun[]>([])
  const hadRuns = useRef(false)
  const onFinished = useRef(props.onFinished)
  onFinished.current = props.onFinished

  const key = props.kind === "api" ? `${props.owner}/${props.repo}` : props.projectId

  useEffect(() => {
    let cancelled = false
    hadRuns.current = false
    setRuns([])

    async function load() {
      try {
        const next =
          props.kind === "api"
            ? await listActiveWatcherRuns(props.owner, props.repo)
            : await listActiveMcpWatcherRuns(props.projectId)
        if (cancelled) return
        if (hadRuns.current && next.length === 0) onFinished.current?.()
        hadRuns.current = next.length > 0
        setRuns(next)
      } catch {
        /* a failed poll just keeps the last state */
      }
    }

    void load()
    const id = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.kind, key])

  if (runs.length === 0) return null

  return (
    <div className="mb-4 space-y-1.5">
      {runs.map((r) => (
        <Link
          key={r._id}
          to="/watchers"
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/[0.12]"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span className="font-medium truncate">
            {r.watcherName || "Watcher"} {r.status === "pending" ? "starting…" : "running…"}
          </span>
          {r.prNumber != null && (
            <span className="text-amber-200/60 truncate">
              PR #{r.prNumber}
              {r.prTitle ? ` · ${r.prTitle}` : ""}
            </span>
          )}
          {r.branch && (
            <span className="ml-auto font-mono text-amber-200/40 shrink-0">{r.branch}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
