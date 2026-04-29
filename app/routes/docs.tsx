import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRight, Github, Rocket, X } from "lucide-react"
import { Button, buttonVariants } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Sidebar } from "~/components/Sidebar"
import { BackfillDialog } from "~/components/BackfillDialog"
import { useAuth } from "~/context/AuthContext"
import {
  addKnownRepo,
  getKnownRepos,
  removeKnownRepo,
  type KnownRepo,
} from "~/lib/knownRepos"
import { cn } from "~/lib/utils"

const GITHUB_APP_SLUG =
  import.meta.env.VITE_GITHUB_APP_SLUG ?? "your-app-slug"

export default function DocsIndex() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [repos, setRepos] = useState<KnownRepo[]>([])
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [quickOwner, setQuickOwner] = useState("")
  const [quickRepo, setQuickRepo] = useState("")

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    setRepos(getKnownRepos())
  }, [user, navigate])

  const connectUrl = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new?state=${user?._id ?? ""}`

  if (!user) return null

  function handleQuickGo(e: FormEvent) {
    e.preventDefault()
    const o = quickOwner.trim()
    const r = quickRepo.trim()
    if (!o || !r) return
    setRepos(addKnownRepo({ owner: o, repo: r }))
    navigate(`/docs/${o}/${r}`)
  }

  function handleRemove(e: React.MouseEvent, r: KnownRepo) {
    e.preventDefault()
    e.stopPropagation()
    setRepos(removeKnownRepo(r))
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Repositories</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {repos.length} repo{repos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {repos.length > 0 && (
              <a
                href={connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5"
                )}
              >
                <Github className="h-3.5 w-3.5" />
                Connect repo
              </a>
            )}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              onClick={() => setBackfillOpen(true)}
            >
              <Rocket className="h-3.5 w-3.5" />
              Generate docs
            </Button>
          </div>
        </div>

        {repos.length === 0 && (
          <EmptyState
            connectUrl={connectUrl}
            onBackfill={() => setBackfillOpen(true)}
          />
        )}

        {repos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {repos.map((r) => (
              <Link
                key={`${r.owner}/${r.repo}`}
                to={`/docs/${r.owner}/${r.repo}`}
                className="group relative rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-5 transition-colors"
              >
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, r)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-md text-white/30 hover:text-white/80 hover:bg-white/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from list"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div className="min-w-0">
                    <div className="text-xs text-white/40 truncate">
                      {r.owner}
                    </div>
                    <div className="text-sm font-medium text-white truncate">
                      {r.repo}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/70 shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Open a specific repo
          </p>
          <form onSubmit={handleQuickGo} className="flex flex-wrap gap-2">
            <Input
              value={quickOwner}
              onChange={(e) => setQuickOwner(e.target.value)}
              placeholder="owner"
              className="w-40 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
            />
            <Input
              value={quickRepo}
              onChange={(e) => setQuickRepo(e.target.value)}
              placeholder="repo"
              className="w-48 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
            >
              Open
            </Button>
          </form>
        </div>
      </main>

      <BackfillDialog
        open={backfillOpen}
        onOpenChange={setBackfillOpen}
        onCompleted={(payload) => {
          setBackfillOpen(false)
          setRepos(addKnownRepo(payload))
          navigate(`/docs/${payload.owner}/${payload.repo}`)
        }}
      />
    </div>
  )
}

function EmptyState({
  connectUrl,
  onBackfill,
}: {
  connectUrl: string
  onBackfill: () => void
}) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10 text-white text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
            <Github className="h-6 w-6 text-blue-400" />
          </div>
          <CardTitle className="text-base">No documentation yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="text-sm text-white/60 text-left space-y-3 list-none">
            {[
              "Install the GitHub App using the button below",
              "Open a Pull Request or run a backfill on an existing repo",
              "Docs appear here automatically — no extra steps",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="space-y-2">
            <a
              href={connectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants(),
                "w-full bg-blue-600 hover:bg-blue-500 text-white border-transparent inline-flex items-center justify-center gap-2"
              )}
            >
              <Github className="h-4 w-4" />
              Connect GitHub
            </a>
            <button
              type="button"
              onClick={onBackfill}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 inline-flex items-center justify-center gap-2"
              )}
            >
              <Rocket className="h-4 w-4" />
              Generate from existing repo
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
