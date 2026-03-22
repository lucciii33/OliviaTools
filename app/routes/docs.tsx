import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Github, Loader2, RefreshCw } from "lucide-react"
import { Button } from "~/components/ui/button"
import { buttonVariants } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Sidebar } from "~/components/Sidebar"
import { DocCard } from "~/components/DocCard"
import { useAuth } from "~/context/AuthContext"
import { useDocsApi } from "~/api/docsApi"
import { cn } from "~/lib/utils"

const GITHUB_APP_SLUG = import.meta.env.VITE_GITHUB_APP_SLUG ?? "your-app-slug"

export default function Docs() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { docs, loading, error, getDocs, deleteDoc } = useDocsApi()
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    getDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const repos = useMemo(
    () => Array.from(new Set(docs.map((d) => d.repo))).sort(),
    [docs]
  )

  const visibleDocs = useMemo(
    () => (selectedRepo ? docs.filter((d) => d.repo === selectedRepo) : docs),
    [docs, selectedRepo]
  )

  const connectUrl = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new?state=${user?._id ?? ""}`

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar repos={repos} selected={selectedRepo} onSelect={setSelectedRepo} />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">
              {selectedRepo ?? "All documentation"}
            </h1>
            {!loading && (
              <p className="text-xs text-white/40 mt-0.5">
                {visibleDocs.length} endpoint{visibleDocs.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => getDocs(selectedRepo ?? undefined)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {/* Empty state */}
        {!loading && !error && docs.length === 0 && (
          <EmptyState connectUrl={connectUrl} />
        )}

        {/* Docs list */}
        {!loading && !error && visibleDocs.length > 0 && (
          <div className="space-y-3">
            {visibleDocs.map((doc) => (
              <DocCard key={doc._id} doc={doc} onDelete={deleteDoc} />
            ))}
          </div>
        )}

        {/* Selected repo empty */}
        {!loading && !error && docs.length > 0 && visibleDocs.length === 0 && (
          <p className="text-sm text-white/40 py-12 text-center">
            No docs found for <span className="text-white/60">{selectedRepo}</span>
          </p>
        )}
      </main>
    </div>
  )
}

function EmptyState({ connectUrl }: { connectUrl: string }) {
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
              "Open a Pull Request in any connected repository",
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
        </CardContent>
      </Card>
    </div>
  )
}
