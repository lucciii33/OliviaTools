import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ArrowLeft, Loader2, RefreshCw, Rocket } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Sidebar } from "~/components/Sidebar"
import { DocCard } from "~/components/DocCard"
import { BackfillDialog } from "~/components/BackfillDialog"
import { useAuth } from "~/context/AuthContext"
import { useDocsApi } from "~/api/docsApi"
import { addKnownRepo } from "~/lib/knownRepos"

export default function DocsRepo() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const params = useParams<{ owner: string; repo: string }>()
  const owner = params.owner ?? ""
  const repo = params.repo ?? ""
  const { docs, loading, error, getDocs, deleteDoc } = useDocsApi()
  const [backfillOpen, setBackfillOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    if (!repo) return
    addKnownRepo({ owner, repo })
    getDocs(repo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, owner, repo])

  const repoDocs = useMemo(
    () =>
      docs.filter(
        (d) => d.repo === repo && (!d.owner || d.owner === owner)
      ),
    [docs, owner, repo]
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
              onClick={() => getDocs(repo)}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

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
        defaults={{ owner, repo }}
        lockRepo
        onCompleted={(payload) => {
          setBackfillOpen(false)
          addKnownRepo(payload)
          if (payload.owner !== owner || payload.repo !== repo) {
            navigate(`/docs/${payload.owner}/${payload.repo}`)
          } else {
            getDocs(repo)
          }
        }}
      />
    </div>
  )
}
