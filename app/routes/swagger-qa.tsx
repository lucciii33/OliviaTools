import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileCode,
  Loader2,
  Play,
  Settings2,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Sidebar } from "~/components/Sidebar"
import { MethodBadge } from "~/components/MethodBadge"
import { ProjectAuthDialog } from "~/components/ProjectAuthDialog"
import { QaRunView } from "~/components/QaRunView"
import { useAuth } from "~/context/AuthContext"
import { type Doc } from "~/api/docsApi"
import {
  useQaApi,
  type ApiProject,
  type QaExecution,
  type QaRun,
} from "~/api/qaApi"
import { cn } from "~/lib/utils"

// Standalone product: paste a Swagger/OpenAPI spec → it becomes an API project
// with endpoints grouped by section → run the bug-hunting agent + download one
// Postman collection per section. Decoupled from the GitHub-docs flow.
export default function SwaggerQa() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    importProjectSpec,
    listProjects,
    getProjectDocs,
    getSectionCollection,
    loading,
    error,
  } = useQaApi()

  const [projects, setProjects] = useState<ApiProject[]>([])
  const [specText, setSpecText] = useState("")
  const [importing, setImporting] = useState(false)

  // selected project view
  const [project, setProject] = useState<ApiProject | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [search, setSearch] = useState("")
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    listProjects().then(setProjects)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function openProject(id: string) {
    const data = await getProjectDocs(id)
    if (data) {
      setProject(data.project)
      setDocs(data.docs)
    }
  }

  async function handleGenerate() {
    setImporting(true)
    const res = await importProjectSpec(specText)
    setImporting(false)
    if (res) {
      setSpecText("")
      await listProjects().then(setProjects)
      await openProject(res.projectId)
    }
  }

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? docs.filter(
          (d) =>
            d.path.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q)
        )
      : docs
    const map = new Map<string, Doc[]>()
    for (const d of filtered) {
      const key = d.section || "default"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [docs, search])

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar />

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-5xl">
        <div className="flex items-center gap-2 mb-1">
          <FileCode className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Olivia + Swagger</h1>
        </div>
        <p className="text-sm text-white/40 mb-6">
          Paste an OpenAPI/Swagger spec. The agent hunts bugs per section — no
          code, no GitHub connection.
        </p>

        {/* ---- Project list + paste (home) ---- */}
        {!project && (
          <div className="space-y-6">
            {projects.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  Your APIs
                </p>
                {projects.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => openProject(p._id)}
                    className="w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 text-left"
                  >
                    <FileCode className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-xs text-white/40">
                        {p.baseUrl || "no base URL set"} · auth: {p.auth.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                Import a spec
              </p>
              <textarea
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                placeholder={"Paste your spec here (YAML or JSON)…\n\nopenapi: 3.0.0\ninfo:\n  title: My API"}
                rows={12}
                className="w-full rounded-lg bg-black/30 border border-white/10 p-3.5 font-mono text-xs text-white/85 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button
                onClick={handleGenerate}
                disabled={importing || !specText.trim()}
                className="bg-blue-600 hover:bg-blue-500 gap-1.5"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
          </div>
        )}

        {/* ---- Selected project: sections ---- */}
        {project && (
          <>
            <button
              onClick={() => {
                setProject(null)
                setDocs([])
                setSearch("")
              }}
              className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-3"
            >
              <ArrowLeft className="h-3 w-3" /> All APIs
            </button>

            <div className="flex items-center gap-3 flex-wrap rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 mb-4">
              <span className="font-semibold">{project.title}</span>
              <span className="text-xs text-white/40">
                {docs.length} endpoints · {sections.length} sections
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  project.baseUrl
                    ? "bg-green-500/10 text-green-400"
                    : "bg-amber-500/10 text-amber-400"
                )}
              >
                {project.baseUrl ? project.baseUrl : "set base URL →"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
                onClick={() => setAuthOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Target &amp; auth
              </Button>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints…"
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-white/20"
            />

            {!project.baseUrl && (
              <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-3 mb-4">
                Set the base URL &amp; auth before running QA. Click “Target
                &amp; auth”.
              </p>
            )}

            {sections.map(([name, secDocs]) => (
              <SectionCard
                key={name}
                section={name}
                docs={secDocs}
                canRun={Boolean(project.baseUrl)}
                onDownload={async () => {
                  const col = await getSectionCollection(project._id, name)
                  if (col) downloadJson(col, `postman-${name}.json`)
                }}
              />
            ))}
          </>
        )}

        {loading && !project && projects.length === 0 && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        )}
      </main>

      {project && (
        <ProjectAuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          project={project}
          onSaved={(p) => setProject(p)}
        />
      )}
    </div>
  )
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function SectionCard({
  section,
  docs,
  canRun,
  onDownload,
}: {
  section: string
  docs: Doc[]
  canRun: boolean
  onDownload: () => void
}) {
  const { runQa } = useQaApi()
  const [open, setOpen] = useState(true)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<QaRun | null>(null)

  // Run the agent against every endpoint in the section, then merge results.
  async function runSection() {
    setRunning(true)
    setRun(null)
    const allExec: QaExecution[] = []
    let bugCount = 0
    for (const doc of docs) {
      const r = await runQa(doc._id)
      if (r) {
        allExec.push(...r.executions)
        bugCount += r.bugCount
      }
    }
    setRun({ totalTests: allExec.length, bugCount, executions: allExec })
    setRunning(false)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.015] mb-3 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 min-w-0"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/40 transition-transform",
              !open && "-rotate-90"
            )}
          />
          <span className="font-medium truncate">{section}</span>
        </button>
        <span className="text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
          {docs.length}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5" />
            Postman
          </Button>
          <Button
            size="sm"
            className="bg-red-600/90 hover:bg-red-500 text-white gap-1.5"
            onClick={runSection}
            disabled={running || !canRun}
            title={canRun ? "" : "Set base URL first"}
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run QA
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {docs.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center gap-3 px-4 py-2.5 pl-10"
            >
              <MethodBadge method={doc.method} />
              <div className="min-w-0">
                <div className="font-mono text-sm text-white/85 truncate">
                  {doc.path}
                </div>
                {doc.description && (
                  <div className="text-xs text-white/40 truncate">
                    {doc.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {run && (
        <div className="border-t border-white/8 p-4 bg-black/20">
          <QaRunView run={run} repoLabel={section} />
        </div>
      )}
    </div>
  )
}
