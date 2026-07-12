import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileCode,
  Info,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  X,
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
  type SpecCandidate,
  type SuiteRun,
} from "~/api/qaApi"
import { useInstallationsApi } from "~/api/installationsApi"
import { cn } from "~/lib/utils"

// Standalone product: paste a Swagger/OpenAPI spec → it becomes an API project
// with endpoints grouped by section → run the bug-hunting agent + download one
// Postman collection per section. Decoupled from the GitHub-docs flow.
export default function SwaggerQa() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    importProjectSpec,
    discoverGithubSpec,
    importGithubSpec,
    syncGithubSpec,
    listProjects,
    getProjectDocs,
    getSectionCollection,
    deleteProject,
    runSuiteQa,
    loading,
    error,
  } = useQaApi()
  const { installations, getInstallations } = useInstallationsApi()

  const [projects, setProjects] = useState<ApiProject[]>([])
  const [specText, setSpecText] = useState("")
  const [importing, setImporting] = useState(false)

  // Import mode: paste a spec, or connect a repo and let Olivia find the file.
  const [importMode, setImportMode] = useState<"paste" | "github">("paste")
  const [ghRepo, setGhRepo] = useState("") // "owner/repo" from the dropdown
  const [ghFilename, setGhFilename] = useState("")
  const [ghCandidates, setGhCandidates] = useState<SpecCandidate[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // selected project view
  const [project, setProject] = useState<ApiProject | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [search, setSearch] = useState("")
  const [authOpen, setAuthOpen] = useState(false)

  // suite run state lifted here so "Run All" can drive all sections
  const [suiteRuns, setSuiteRuns] = useState<Record<string, SuiteRun>>({})
  const [suiteRunningMap, setSuiteRunningMap] = useState<Record<string, boolean>>({})
  const [suiteErrorMap, setSuiteErrorMap] = useState<Record<string, string | null>>({})
  const [allRunning, setAllRunning] = useState(false)
  const [allProgress, setAllProgress] = useState<{ done: number; total: number } | null>(null)

  // Post-import hint: what Olivia auto-filled vs. what the user still needs to enter
  const [importHint, setImportHint] = useState<{
    autoFilled: string[]
    required: string[]
  } | null>(null)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    listProjects().then(setProjects)
    getInstallations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function openProject(id: string) {
    const data = await getProjectDocs(id)
    if (data) {
      setProject(data.project)
      setDocs(data.docs)
      setSuiteRuns({})
      setSuiteRunningMap({})
      setSuiteErrorMap({})
    }
  }

  async function runSection(name: string, proj = project): Promise<SuiteRun | null> {
    if (!proj) return null
    setSuiteRunningMap(m => ({ ...m, [name]: true }))
    setSuiteErrorMap(m => ({ ...m, [name]: null }))
    const result = await runSuiteQa(proj._id, name)
    setSuiteRunningMap(m => ({ ...m, [name]: false }))
    if (result) {
      setSuiteRuns(r => ({ ...r, [name]: result }))
    } else {
      setSuiteErrorMap(m => ({ ...m, [name]: error ?? "Run failed — check auth in Target & auth settings." }))
    }
    return result
  }

  async function handleRunAll() {
    if (!project || allRunning) return
    setAllRunning(true)
    setSuiteRuns({})
    setSuiteErrorMap({})
    // auth/oauth sections first so token is available, then the rest alphabetically
    const ordered = [...sections].sort(([a], [b]) => {
      const isAuth = (n: string) => /oauth|auth|token/i.test(n)
      if (isAuth(a) && !isAuth(b)) return -1
      if (!isAuth(a) && isAuth(b)) return 1
      return a.localeCompare(b)
    })
    setAllProgress({ done: 0, total: ordered.length })
    for (let i = 0; i < ordered.length; i++) {
      await runSection(ordered[i][0], project)
      setAllProgress({ done: i + 1, total: ordered.length })
    }
    setAllProgress(null)
    setAllRunning(false)
  }

  async function handleGenerate() {
    setImporting(true)
    const res = await importProjectSpec(specText)
    setImporting(false)
    if (res) {
      setSpecText("")
      if (res.requiredVariables?.length || res.autoFilledVariables?.length) {
        setImportHint({
          autoFilled: res.autoFilledVariables ?? [],
          required: res.requiredVariables ?? [],
        })
      }
      await listProjects().then(setProjects)
      await openProject(res.projectId)
    }
  }

  // Split "owner/repo" back into its installation + parts.
  function selectedInstallation() {
    return installations.find((i) => `${i.owner}/${i.repo}` === ghRepo) ?? null
  }

  // Scan the connected repo for spec files matching the typed name.
  async function handleScanRepo() {
    const inst = selectedInstallation()
    if (!inst) return
    setScanning(true)
    setGhCandidates(null)
    const found = await discoverGithubSpec({
      installationId: inst.installationId,
      owner: inst.owner,
      repo: inst.repo,
      filename: ghFilename.trim(),
    })
    setGhCandidates(found)
    setScanning(false)
  }

  // Import a confirmed candidate file from the repo.
  async function handleImportFromRepo(specPath: string) {
    const inst = selectedInstallation()
    if (!inst) return
    setImporting(true)
    const res = await importGithubSpec({
      installationId: inst.installationId,
      owner: inst.owner,
      repo: inst.repo,
      specPath,
    })
    setImporting(false)
    if (res) {
      setGhCandidates(null)
      setGhFilename("")
      if (res.requiredVariables?.length || res.autoFilledVariables?.length) {
        setImportHint({
          autoFilled: res.autoFilledVariables ?? [],
          required: res.requiredVariables ?? [],
        })
      }
      await listProjects().then(setProjects)
      await openProject(res.projectId)
    }
  }

  // "Sync" button on a repo-linked project: re-pull the spec and refresh.
  async function handleSync() {
    if (!project) return
    setSyncing(true)
    const res = await syncGithubSpec(project._id)
    setSyncing(false)
    if (res) {
      await openProject(project._id)
      await listProjects().then(setProjects)
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
                  <div
                    key={p._id}
                    className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3"
                  >
                    <button
                      onClick={() => openProject(p._id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <FileCode className="h-4 w-4 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-white/40">
                          {p.baseUrl || "no base URL set"} · auth: {p.auth.type}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm(`Delete "${p.title}"?`)) return
                        await deleteProject(p._id)
                        setProjects((prev) => prev.filter((x) => x._id !== p._id))
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-opacity shrink-0"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                Import a spec
              </p>

              {/* Mode toggle: paste vs. connect a repo */}
              <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
                <button
                  onClick={() => setImportMode("paste")}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-colors",
                    importMode === "paste"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  Paste spec
                </button>
                <button
                  onClick={() => setImportMode("github")}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5",
                    importMode === "github"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  From a repo
                </button>
              </div>

              {importMode === "paste" && (
                <>
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
                </>
              )}

              {importMode === "github" && (
                <div className="space-y-3">
                  {installations.length === 0 ? (
                    <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-3">
                      No connected repos yet. Connect a repo from the GitHub app
                      first, then come back.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                        <div>
                          <label className="text-xs text-white/40 block mb-1">
                            Repository
                          </label>
                          <select
                            value={ghRepo}
                            onChange={(e) => {
                              setGhRepo(e.target.value)
                              setGhCandidates(null)
                            }}
                            className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                          >
                            <option value="">Select a repo…</option>
                            {installations.map((i) => (
                              <option
                                key={`${i.owner}/${i.repo}`}
                                value={`${i.owner}/${i.repo}`}
                              >
                                {i.owner}/{i.repo}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-white/40 block mb-1">
                            Spec file name
                          </label>
                          <input
                            value={ghFilename}
                            onChange={(e) => setGhFilename(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && ghRepo) handleScanRepo()
                            }}
                            placeholder="openapi.yml"
                            className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                          />
                        </div>
                        <Button
                          onClick={handleScanRepo}
                          disabled={!ghRepo || scanning}
                          variant="outline"
                          className="border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
                        >
                          {scanning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Find
                        </Button>
                      </div>
                      <p className="text-xs text-white/30">
                        Tell Olivia the file name (e.g. <code>openapi.yml</code>)
                        and she'll scan the repo for it. Leave it blank to list
                        every spec-looking file.
                      </p>

                      {error && <p className="text-sm text-red-400">{error}</p>}

                      {ghCandidates && (
                        <div className="space-y-2">
                          {ghCandidates.length === 0 ? (
                            <p className="text-sm text-white/40">
                              No matching spec files found. Try a different name.
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-white/40 uppercase tracking-wider">
                                {ghCandidates.length} match
                                {ghCandidates.length === 1 ? "" : "es"} — pick one
                              </p>
                              {ghCandidates.map((c) => (
                                <div
                                  key={c.path}
                                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5"
                                >
                                  <FileCode className="h-4 w-4 text-blue-400 shrink-0" />
                                  <span className="font-mono text-sm text-white/80 truncate flex-1">
                                    {c.path}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleImportFromRepo(c.path)}
                                    disabled={importing}
                                    className="bg-blue-600 hover:bg-blue-500 gap-1.5 shrink-0"
                                  >
                                    {importing && (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    Import
                                  </Button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
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
                setImportHint(null)
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
              <div className="ml-auto flex items-center gap-2">
                {allProgress && (
                  <span className="text-xs text-violet-400">
                    {allProgress.done}/{allProgress.total} sections…
                  </span>
                )}
                {project.source === "github" && project.github?.specPath && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
                    onClick={handleSync}
                    disabled={syncing}
                    title={`Re-pull ${project.github.specPath} from ${project.github.owner}/${project.github.repo}`}
                  >
                    {syncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Sync
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-violet-600/90 hover:bg-violet-500 text-white gap-1.5"
                  onClick={handleRunAll}
                  disabled={allRunning || !project.baseUrl}
                  title={project.baseUrl ? "Run all sections in order (auth first)" : "Set base URL & auth first"}
                >
                  {allRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 text-white/80 hover:bg-white/10 gap-1.5"
                  onClick={() => setAuthOpen(true)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Target &amp; auth
                </Button>
              </div>
            </div>

            {/* Post-import credentials hint */}
            {importHint && (
              <div className="rounded-md border border-blue-500/25 bg-blue-500/8 px-4 py-3 mb-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1 text-sm">
                  {importHint.autoFilled.length > 0 && (
                    <p className="text-green-400">
                      <span className="font-medium">Auto-filled from spec:</span>{" "}
                      {importHint.autoFilled.join(", ")}
                    </p>
                  )}
                  {importHint.required.length > 0 && (
                    <p className="text-amber-300">
                      <span className="font-medium">Still needed in Target &amp; auth:</span>{" "}
                      {importHint.required.join(", ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setImportHint(null)}
                  className="text-white/30 hover:text-white/60 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints…"
              className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-white/20"
            />

            {!project.baseUrl && (
              <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-3 mb-4">
                Set the base URL &amp; auth before running QA. Click "Target
                &amp; auth".
              </p>
            )}

            {sections.map(([name, secDocs]) => (
              <SectionCard
                key={name}
                section={name}
                docs={secDocs}
                canRun={Boolean(project.baseUrl)}
                suiteRun={suiteRuns[name] ?? null}
                suiteRunning={suiteRunningMap[name] ?? false}
                suiteError={suiteErrorMap[name] ?? null}
                onDownload={async () => {
                  const col = await getSectionCollection(project._id, name)
                  if (col) downloadJson(col, `postman-${name}.json`)
                }}
                onRunSuite={() => runSection(name)}
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
          onSaved={(p) => { setProject(p); setImportHint(null) }}
          suggestedVariables={importHint?.required.map((key) => ({
            key,
            value: importHint.autoFilled.includes(key)
              ? (project.variables?.find((v) => v.key === key)?.value ?? "")
              : "",
            secret: key.toLowerCase().includes("secret") || key.toLowerCase().includes("password"),
          }))}
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
  suiteRun,
  suiteRunning,
  suiteError,
  onDownload,
  onRunSuite,
}: {
  section: string
  docs: Doc[]
  canRun: boolean
  suiteRun: SuiteRun | null
  suiteRunning: boolean
  suiteError: string | null
  onDownload: () => void
  onRunSuite: () => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.015] mb-3 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
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

        <div className="ml-auto flex items-center gap-2">
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
            className="bg-violet-600/90 hover:bg-violet-500 text-white gap-1.5"
            onClick={onRunSuite}
            disabled={suiteRunning || !canRun}
            title={canRun ? `Run all ${docs.length} endpoints as a chained suite` : "Set base URL & auth first"}
          >
            {suiteRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run Suite
          </Button>
        </div>
      </div>

      {suiteError && (
        <div className="px-4 py-2.5 text-sm text-red-400 border-t border-red-500/20 bg-red-500/[0.03]">
          {suiteError}
        </div>
      )}

      {suiteRun && (
        <div className="border-t border-violet-500/20 bg-violet-500/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-violet-400 font-medium uppercase tracking-wider">
              Suite run · {suiteRun.totalTests} tests · {suiteRun.bugCount} bugs
            </span>
          </div>
          <QaRunView run={{ ...suiteRun, runId: suiteRun.runId, _id: suiteRun.suiteRunId }} repoLabel={section} />
        </div>
      )}

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
          {doc.method !== "GET" && <CustomBodyEditor doc={doc} />}
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

// Optional per-endpoint body the QA generator uses as the happy-path base.
// Empty → the AI builds the body from the schema + discovery data as before.
function CustomBodyEditor({ doc }: { doc: Doc }) {
  const { saveDocBody } = useQaApi()
  const initial =
    doc.exampleBody != null &&
    !(
      typeof doc.exampleBody === "object" &&
      !Array.isArray(doc.exampleBody) &&
      Object.keys(doc.exampleBody).length === 0
    )
      ? JSON.stringify(doc.exampleBody, null, 2)
      : ""
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = text.trim() !== initial.trim()

  async function save() {
    setErr(null)
    let parsed: unknown = {}
    if (text.trim()) {
      try {
        parsed = JSON.parse(text)
      } catch {
        setErr("Invalid JSON — check quotes, commas and braces.")
        return
      }
    }
    setSaving(true)
    const updated = await saveDocBody(doc._id, parsed)
    setSaving(false)
    if (updated) {
      // Keep the local doc in sync so re-expanding shows the saved value.
      doc.exampleBody = updated.exampleBody
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } else {
      setErr("Could not save. Try again.")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-white/40 uppercase tracking-wider text-[10px]">
          Custom body <span className="lowercase text-white/25">(optional)</span>
        </div>
        {initial && (
          <span className="text-[10px] text-emerald-400/80">override active</span>
        )}
      </div>
      <p className="text-white/30 mb-1.5 text-[11px]">
        Paste a JSON body to force the happy-path payload. Supports{" "}
        <code className="text-white/50">{"{{variables}}"}</code>. Leave empty and
        the AI generates one from the schema.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setErr(null)
        }}
        spellCheck={false}
        placeholder={'{\n  "email": "{{email}}",\n  "amount": 100\n}'}
        className="w-full min-h-[96px] rounded bg-black/40 border border-white/10 p-2 font-mono text-[11px] text-white/80 outline-none focus:border-white/25 resize-y"
      />
      {err && <p className="text-red-400 mt-1 text-[11px]">{err}</p>}
      <div className="flex items-center gap-2 mt-1.5">
        <Button
          size="sm"
          className="h-7 bg-white/10 hover:bg-white/20 text-white text-xs"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save body"}
        </Button>
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("")
              setErr(null)
            }}
            className="text-[11px] text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
        {saved && <span className="text-[11px] text-emerald-400">Saved ✓</span>}
      </div>
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
