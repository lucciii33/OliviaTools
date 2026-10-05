import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  Bug,
  FileBarChart,
  Loader2,
  RefreshCw,
  Rocket,
  FlaskConical,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Sidebar } from "~/components/Sidebar"
import { DocCard } from "~/components/DocCard"
import { BackfillDialog } from "~/components/BackfillDialog"
import { getRepoBranches } from "~/api/backfillApi"
import { WatcherRunningBanner } from "~/components/WatcherRunningBanner"
import { useAuth } from "~/context/AuthContext"
import { useDocsApi, type DocEnvironment } from "~/api/docsApi"
import { cn } from "~/lib/utils"
import { addKnownRepo } from "~/lib/knownRepos"

export default function DocsRepo() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const params = useParams<{ owner: string; repo: string }>()
  const owner = params.owner ?? ""
  const repo = params.repo ?? ""
  const { docs, loading, error, getDocs, getDocEnvironments, deleteDoc } =
    useDocsApi()
  const [backfillOpen, setBackfillOpen] = useState(false)
  // Environments: one repo, several branches, each with its own docs. `main` is
  // what ships; `dev` is what is about to. They must never be shown mixed.
  const [environments, setEnvironments] = useState<DocEnvironment[]>([])
  const [branch, setBranch] = useState<string>("")
  // Which branch the repo ships from. The tabs say "Production" and
  // "Development" rather than just a branch name, because "master vs dev" is
  // obvious to the person who set it up and to nobody else.
  const [defaultBranch, setDefaultBranch] = useState("")

  async function loadEnvironments(preferred?: string) {
    const envs = await getDocEnvironments(owner, repo)
    setEnvironments(envs)
    const wanted =
      (preferred && envs.some((e) => e.branch === preferred) && preferred) ||
      (branch && envs.some((e) => e.branch === branch) && branch) ||
      // Default to what ships, not to whatever was generated last.
      envs.find((e) => e.branch === "main" || e.branch === "master")?.branch ||
      envs[0]?.branch ||
      ""
    setBranch(wanted)
    return wanted
  }

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    if (!repo) return
    addKnownRepo({ owner, repo })
    void getRepoBranches(owner, repo).then((r) => setDefaultBranch(r.defaultBranch))
    void loadEnvironments().then((b) => getDocs(repo, b || undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, owner, repo])

  const repoDocs = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.repo === repo &&
          (!d.owner || d.owner === owner) &&
          (!branch || !d.branch || d.branch === branch)
      ),
    [docs, owner, repo, branch]
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <Link
              to="/docs"
              className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-1"
            >
              <ArrowLeft className="h-3 w-3" /> All repos
            </Link>
            <h1 className="text-lg font-semibold text-white truncate">
              <span className="text-white/50">{owner}/</span>
              {repo}
            </h1>
            {!loading && (
              <p className="text-xs text-white/40 mt-0.5">
                {repoDocs.length} endpoint{repoDocs.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Always reachable: the saved smoke/regression suites for this repo,
                grouped by section. Without a fixed entry point the tests page
                could only be reached right after generating something. */}
            {/* Where the bug hunter's output lives — the MCP side has had this
                since the beginning. */}
            {/* Coverage, tests and bugs in one page the customer can send on. */}
            <Link to={`/qa-report/repo/${owner}/${repo}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/70 hover:bg-white/10 gap-1.5"
                title="QA report: coverage, tests executed and bugs"
              >
                <FileBarChart className="h-3.5 w-3.5" />
                Report
              </Button>
            </Link>
            <Link to={`/api-qa/repo/${owner}/${repo}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/70 hover:bg-white/10 gap-1.5"
                title="Bugs found in this repo and every bug hunter run"
              >
                <Bug className="h-3.5 w-3.5" />
                Bugs
              </Button>
            </Link>
            <Link to={`/api-tests/repo/${owner}/${repo}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
                title="See every saved test for this repo, by section"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Tests
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              onClick={() => setBackfillOpen(true)}
            >
              <Rocket className="h-3.5 w-3.5" />
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/10"
              onClick={() => {
                void loadEnvironments(branch).then((b) =>
                  getDocs(repo, b || undefined),
                )
              }}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Environment tabs: the same repo, documented per branch. */}
        {environments.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {environments.map((e) => {
              const isProduction = !e.branch || e.branch === defaultBranch;
              const active = e.branch === branch;
              return (
                <button
                  key={e.branch || "default"}
                  type="button"
                  onClick={() => {
                    setBranch(e.branch)
                    getDocs(repo, e.branch || undefined)
                  }}
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
                    {e.branch || "default"} · {e.endpoints} endpoint
                    {e.endpoints === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {owner && repo && (
          <WatcherRunningBanner
            kind="api"
            owner={owner}
            repo={repo}
            onFinished={() => {
              void loadEnvironments(branch).then((b) =>
                getDocs(repo, b || undefined),
              )
            }}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {!loading && !error && repoDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <p className="text-sm text-white/60">
              No docs for{" "}
              <span className="text-white/90">
                {owner}/{repo}
              </span>{" "}
              yet.
            </p>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              onClick={() => setBackfillOpen(true)}
            >
              <Rocket className="h-3.5 w-3.5" />
              Generate docs
            </Button>
          </div>
        )}

        {!loading && !error && repoDocs.length > 0 && (
          <div className="space-y-3">
            {repoDocs.map((doc) => (
              <DocCard key={doc._id} doc={doc} onDelete={deleteDoc} />
            ))}
          </div>
        )}
      </main>

      <BackfillDialog
        open={backfillOpen}
        onOpenChange={setBackfillOpen}
        // Opens on the environment you're looking at. Defaulting to the repo's
        // main branch while the Development tab is on screen is how someone
        // regenerates production by accident.
        defaults={{ owner, repo, branch }}
        lockRepo
        onCompleted={(payload) => {
          setBackfillOpen(false)
          addKnownRepo(payload)
          if (payload.owner !== owner || payload.repo !== repo) {
            navigate(`/docs/${payload.owner}/${payload.repo}`)
          } else {
            // Land on whatever environment was generated, with fresh counts.
            void loadEnvironments(payload.branch ?? branch).then((b) =>
              getDocs(repo, b || undefined),
            )
          }
        }}
      />
    </div>
  )
}
