import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getRunningJobs } from "~/api/jobsApi"
import { getAuthToken } from "~/auth"

// What this workspace is running right now.
//
// Suite runs and bug hunts moved to the background so several can go at once —
// but work you can't see is work you don't trust, and without this the product
// looks like nothing happened. Mounted once at the root, so it is on every page.
const KIND_LABELS: Record<string, string> = {
  api_suite_run: "Running tests",
  api_bug_hunt: "Hunting bugs",
  mcp_suite_run: "Running MCP tests",
  mcp_bug_hunt: "Hunting MCP bugs",
}

export function RunningJobs() {
  const [jobs, setJobs] = useState<
    { _id: string; kind: string; target?: Record<string, unknown> }[]
  >([])
  const [limit, setLimit] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      // Only ask when signed in: apiFetch sends a 401 to the login page, and a
      // poller must never be what logs someone out.
      if (!getAuthToken()) return
      try {
        const res = await getRunningJobs()
        if (cancelled) return
        setJobs(res.running || [])
        setLimit(res.limit || 1)
      } catch {
        /* a failed poll just keeps the last state */
      }
    }

    void tick()
    // Faster while something is running: the point is to see it finish.
    const id = setInterval(tick, jobs.length ? 2500 : 8000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length])

  if (!jobs.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border border-white/10 bg-[#101217]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
        <span className="text-xs font-medium text-white/85">
          {jobs.length} running
        </span>
        <span className="ml-auto text-[11px] text-white/30">
          {jobs.length} / {limit}
        </span>
      </div>

      <ul className="space-y-1">
        {jobs.map((job) => {
          const label = (job.target?.label as string) || ""
          return (
            <li key={job._id} className="text-[11px] leading-5">
              <span className="text-white/70">
                {KIND_LABELS[job.kind] || job.kind}
              </span>
              {label && (
                <span className="ml-1 font-mono text-white/35">{label}</span>
              )}
            </li>
          )
        })}
      </ul>

      {jobs.length >= limit && (
        <p className="mt-2 text-[11px] text-amber-300/80">
          All {limit} slots in use — the next one waits. More at a time on a
          higher plan.
        </p>
      )}
    </div>
  )
}
