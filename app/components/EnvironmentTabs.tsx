import { useEffect, useState } from "react"
import { getRepoBranches } from "~/api/backfillApi"
import { useDocsApi, type DocEnvironment } from "~/api/docsApi"
import { cn } from "~/lib/utils"

// The same repo, documented and tested per branch: what ships (Production) and
// what is about to (Development).
//
// Shared by Docs, Tests and Bugs so the three pages agree on what an
// environment is called and which one is selected — three copies of this would
// drift the moment one of them learned something the others didn't.
export function EnvironmentTabs({
  owner,
  repo,
  value,
  onChange,
}: {
  owner: string
  repo: string
  value: string
  onChange: (branch: string) => void
}) {
  const { getDocEnvironments } = useDocsApi()
  const [environments, setEnvironments] = useState<DocEnvironment[]>([])
  const [defaultBranch, setDefaultBranch] = useState("")

  useEffect(() => {
    if (!owner || !repo) return
    let cancelled = false

    void getRepoBranches(owner, repo).then((r) => {
      if (!cancelled) setDefaultBranch(r.defaultBranch)
    })
    void getDocEnvironments(owner, repo).then((envs) => {
      if (cancelled) return
      setEnvironments(envs)
      // Nothing chosen yet: open on what ships, not on whatever was generated
      // last.
      if (!value && envs.length) {
        const ships =
          envs.find((e) => e.branch === "main" || e.branch === "master")?.branch ||
          envs[0].branch
        onChange(ships)
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo])

  // One environment is the normal case — no tabs needed to choose between one.
  if (environments.length < 2) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {environments.map((e) => {
        const isProduction = !e.branch || e.branch === defaultBranch
        const active = e.branch === value
        return (
          <button
            key={e.branch || "default"}
            type="button"
            onClick={() => onChange(e.branch)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-left",
              active
                ? "border-white/25 bg-white/[0.08]"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                active ? "text-white" : "text-white/60",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isProduction ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              {isProduction ? "Production" : "Development"}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] text-white/35">
              {e.branch || "default"}
            </span>
          </button>
        )
      })}
    </div>
  )
}
