import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileCode,
  Loader2,
  Play,
  RotateCcw,
  Settings2,
  Trash2,
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
  type BugRecord,
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
  const [open, setOpen] = useState(true)

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
        <Button
          size="sm"
          variant="outline"
          className="ml-auto border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
          Postman
        </Button>
      </div>

      {open && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {docs.map((doc) => (
            <EndpointRow key={doc._id} doc={doc} canRun={canRun} />
          ))}
        </div>
      )}
    </div>
  )
}

// One endpoint: expand to read its docs (request + response), see saved bugs
// (mark done / delete), or Run QA on it.
function EndpointRow({ doc, canRun }: { doc: Doc; canRun: boolean }) {
  const { runQa, getBugs, setBugStatus, deleteBug } = useQaApi()
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<QaRun | null>(null)
  const [bugs, setBugs] = useState<BugRecord[]>([])
  const [bugsLoaded, setBugsLoaded] = useState(false)

  async function loadBugs() {
    const b = await getBugs(doc._id)
    setBugs(b)
    setBugsLoaded(true)
  }

  useEffect(() => {
    if (open && !bugsLoaded) loadBugs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function runOne() {
    setRunning(true)
    const r = await runQa(doc._id)
    setRunning(false)
    if (r) {
      setRun(r)
      loadBugs() // refresh saved bugs after a run
    }
  }

  async function toggleDone(b: BugRecord) {
    const next: BugRecord["status"] = b.status === "fixed" ? "open" : "fixed"
    if (await setBugStatus(b._id, next)) {
      setBugs((rows) =>
        rows.map((x) => (x._id === b._id ? { ...x, status: next } : x))
      )
    }
  }
  async function removeBug(id: string) {
    if (await deleteBug(id)) {
      setBugs((rows) => rows.filter((x) => x._id !== id))
    }
  }

  const openBugs = bugs.filter((b) => b.status !== "fixed").length

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2.5 pl-8">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-white/30 transition-transform shrink-0",
              !open && "-rotate-90"
            )}
          />
          <MethodBadge method={doc.method} />
          <span className="font-mono text-sm text-white/85 truncate">
            {doc.path}
          </span>
        </button>
        {openBugs > 0 && (
          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full shrink-0">
            {openBugs} bug{openBugs === 1 ? "" : "s"}
          </span>
        )}
        <Button
          size="sm"
          className="bg-red-600/90 hover:bg-red-500 text-white gap-1.5 shrink-0"
          onClick={runOne}
          disabled={running || !canRun}
          title={canRun ? "" : "Set base URL & auth first"}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run QA
        </Button>
      </div>

      {open && (
        <div className="px-4 pb-3 pl-12 space-y-3 text-xs">
          {doc.description && <p className="text-white/50">{doc.description}</p>}
          {doc.requestBody?.length > 0 && (
            <DocFields title="Request body" fields={doc.requestBody} />
          )}
          {doc.queryParams?.length > 0 && (
            <DocFields title="Query params" fields={doc.queryParams} />
          )}
          {doc.responses?.length > 0 && (
            <div>
              <div className="text-white/40 uppercase tracking-wider text-[10px] mb-1">
                Responses
              </div>
              <div className="space-y-1">
                {doc.responses.map((r, i) => (
                  <div
                    key={i}
                    className="rounded bg-black/30 border border-white/10 p-2"
                  >
                    <div className="font-mono text-white/70">
                      {r.status} · {r.description}
                    </div>
                    {r.example != null &&
                      !(
                        typeof r.example === "object" &&
                        Object.keys(r.example).length === 0
                      ) && (
                        <pre className="mt-1 text-[11px] text-white/55 whitespace-pre-wrap break-all">
                          {typeof r.example === "string"
                            ? r.example
                            : JSON.stringify(r.example, null, 2)}
                        </pre>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved bugs for this endpoint — persist across reloads */}
          <div>
            <div className="text-white/40 uppercase tracking-wider text-[10px] mb-1">
              Saved bugs {bugsLoaded ? `(${bugs.length})` : "…"}
            </div>
            {bugsLoaded && bugs.length === 0 && (
              <p className="text-white/30">
                No saved bugs yet. Run QA to find some.
              </p>
            )}
            <div className="space-y-1.5">
              {bugs.map((b) => (
                <BugItem
                  key={b._id}
                  bug={b}
                  onToggleDone={() => toggleDone(b)}
                  onDelete={() => removeBug(b._id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {run && (
        <div className="border-t border-white/8 p-4 pl-8 bg-black/20">
          <QaRunView run={run} repoLabel={doc.path} />
        </div>
      )}
    </div>
  )
}

function DocFields({
  title,
  fields,
}: {
  title: string
  fields: { name: string; type: string; required: boolean; description?: string }[]
}) {
  return (
    <div>
      <div className="text-white/40 uppercase tracking-wider text-[10px] mb-1">
        {title}
      </div>
      <div className="space-y-0.5">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2 font-mono">
            <span className="text-white/80">{f.name}</span>
            <span className="text-white/40">{f.type}</span>
            {f.required && (
              <span className="text-amber-400/70 text-[10px]">required</span>
            )}
            {f.description && (
              <span className="font-sans text-white/30 truncate">
                — {f.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const SEV_STYLE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

// A single saved bug: title + severity, expand for repro (request/response),
// mark done (open ↔ fixed), or delete.
function BugItem({
  bug,
  onToggleDone,
  onDelete,
}: {
  bug: BugRecord
  onToggleDone: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const done = bug.status === "fixed"
  return (
    <div
      className={cn(
        "rounded-md border p-2",
        done
          ? "border-green-500/20 bg-green-500/[0.04]"
          : "border-red-500/20 bg-red-500/[0.04]"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
        >
          <span
            className={cn(
              "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
              SEV_STYLE[bug.severity] ?? "bg-white/5 text-white/60 border-white/15"
            )}
          >
            {bug.severity}
          </span>
          <span
            className={cn(
              "text-xs truncate",
              done ? "text-white/40 line-through" : "text-white/85"
            )}
          >
            {bug.title}
          </span>
        </button>
        <button
          onClick={onToggleDone}
          title={done ? "Reopen" : "Mark as done"}
          className={cn(
            "p-1 rounded shrink-0",
            done
              ? "text-white/40 hover:text-white/70"
              : "text-green-400 hover:bg-green-500/10"
          )}
        >
          {done ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={onDelete}
          title="Delete bug"
          className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 text-[11px]">
          {bug.description && (
            <p className="text-white/60">{bug.description}</p>
          )}
          <div className="font-mono text-white/70 break-all">
            {bug.request?.method} {bug.request?.url}
          </div>
          <div className="text-white/40">
            expected {JSON.stringify(bug.expectedStatus)} · got{" "}
            <span className="text-red-400">{bug.response?.status}</span>
          </div>
          {bug.request?.body != null && (
            <pre className="rounded bg-black/40 p-2 text-white/60 whitespace-pre-wrap break-all">
              req: {typeof bug.request.body === "string"
                ? bug.request.body
                : JSON.stringify(bug.request.body, null, 2)}
            </pre>
          )}
          {bug.response?.body != null && (
            <pre className="rounded bg-black/40 p-2 text-white/60 whitespace-pre-wrap break-all">
              res: {typeof bug.response.body === "string"
                ? bug.response.body
                : JSON.stringify(bug.response.body, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
