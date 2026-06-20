import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileVideo,
  Loader2,
  LogIn,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Sidebar } from "~/components/Sidebar"
import { useAuth } from "~/context/AuthContext"
import { useE2eApi, type E2eProject, type E2eTest } from "~/api/e2eApi"
import { useInstallationsApi } from "~/api/installationsApi"
import { cn } from "~/lib/utils"

// Feature 1 — E2E QA assistant: upload a demo video → Whisper transcribes it →
// Claude turns it into BDD test cases (Given/When/Then). Each case is saved as a
// draft test on the project, ready for the recorder + heal loop (Feature 2).
export default function E2eQa() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    listProjects,
    createProject,
    generateFromVideo,
    listTests,
    recordLogin,
    recordTest,
    improveTest,
    deleteTest,
    loading,
    error,
  } = useE2eApi()
  // Reuse the existing connected-repos list (GitHub App installations) — same
  // source the Docs/API feature uses. We don't touch that code.
  const { installations, getInstallations } = useInstallationsApi()

  const [projects, setProjects] = useState<E2eProject[]>([])
  const [project, setProject] = useState<E2eProject | null>(null)
  const [tests, setTests] = useState<E2eTest[]>([])

  // new-project inline form
  const [newName, setNewName] = useState("")
  const [newBaseUrl, setNewBaseUrl] = useState("")
  const [newRepo, setNewRepo] = useState("") // "owner/repo" from the dropdown
  const [creating, setCreating] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [videoName, setVideoName] = useState<string | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [improvingId, setImprovingId] = useState<string | null>(null)
  const [authing, setAuthing] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    listProjects().then(setProjects)
    getInstallations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function openProject(p: E2eProject) {
    setProject(p)
    setTests(await listTests(p._id))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const [owner, repo] = newRepo.split("/")
    const p = await createProject({
      name: newName.trim(),
      baseUrl: newBaseUrl.trim(),
      github: owner && repo ? { owner, repo } : undefined,
    })
    setCreating(false)
    if (p) {
      setNewName("")
      setNewBaseUrl("")
      setNewRepo("")
      setProjects(await listProjects())
      openProject(p)
    }
  }

  async function handleUpload(file: File) {
    if (!project) return
    setVideoName(file.name)
    const res = await generateFromVideo(project._id, file)
    if (res) {
      setTests(await listTests(project._id))
    }
  }

  async function handleSetupLogin() {
    if (!project) return
    setAuthing(true)
    const res = await recordLogin(project._id)
    setAuthing(false)
    if (res) {
      // refresh the selected project so the "login ready" status updates
      const all = await listProjects()
      setProjects(all)
      const fresh = all.find((p) => p._id === project._id)
      if (fresh) setProject(fresh)
    }
  }

  async function handleRecord(id: string) {
    setRecordingId(id)
    const res = await recordTest(id)
    setRecordingId(null)
    if (res) {
      // refresh so the saved spec + new status show up
      if (project) setTests(await listTests(project._id))
    }
  }

  async function handleImprove(id: string) {
    setImprovingId(id)
    const res = await improveTest(id)
    setImprovingId(null)
    if (res && project) setTests(await listTests(project._id))
  }

  async function handleDeleteTest(id: string) {
    if (await deleteTest(id)) {
      setTests((t) => t.filter((x) => x._id !== id))
    }
  }

  const kindColor: Record<string, string> = {
    smoke: "bg-emerald-100 text-emerald-700",
    regression: "bg-blue-100 text-blue-700",
    bughunt: "bg-amber-100 text-amber-700",
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {!project ? (
          <>
            <h1 className="text-2xl font-semibold mb-1">E2E QA Assistant</h1>
            <p className="text-muted-foreground mb-6">
              Upload a demo video → get BDD test cases written for you.
            </p>

            {/* New project */}
            <div className="rounded-lg border p-4 mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Project name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="oliviatools-web"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Base URL (app under test)</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="https://app.oliviatools.com"
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">
                  Repo (so the AI can reuse your helpers)
                </label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                >
                  <option value="">No repo (improve without repo context)</option>
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
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create
              </Button>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {/* Project grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => openProject(p)}
                  className="rounded-lg border p-4 text-left hover:border-foreground/40 transition-colors"
                >
                  <div className="font-medium">{p.title || p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.baseUrl || "no base URL set"}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setProject(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All projects
            </button>

            <h1 className="text-2xl font-semibold mb-1">
              {project.title || project.name}
            </h1>
            <p className="text-muted-foreground mb-1">
              {project.baseUrl || "no base URL set"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {project.github?.owner && project.github?.repo
                ? `🔗 repo: ${project.github.owner}/${project.github.repo}`
                : "no repo connected — improve runs without repo context"}
            </p>

            {/* One-time login capture — every recording/run starts logged in */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                size="sm"
                variant={project.login?.authReady ? "outline" : "default"}
                onClick={handleSetupLogin}
                disabled={authing}
              >
                {authing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Waiting for login…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {project.login?.authReady ? "Re-capture login" : "Set up login"}
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                {project.login?.authReady
                  ? "✓ Logged-in session saved — recordings start authenticated"
                  : "Capture your login once so tests don't re-record it"}
              </span>
            </div>

            {/* Upload */}
            <div className="rounded-lg border border-dashed p-6 mb-8 text-center">
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
              />
              <FileVideo className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {videoName ? videoName : "Upload a screen recording of your demo (max 25MB)"}
              </p>
              <Button onClick={() => fileRef.current?.click()} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Transcribing & generating…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Choose video
                  </>
                )}
              </Button>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>

            {/* Test cases */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">
                Test cases {tests.length > 0 && `(${tests.length})`}
              </h2>
            </div>

            {tests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No test cases yet — upload a demo video to generate them.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {tests.map((t) => (
                  <div key={t._id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={cn(
                            "inline-block rounded px-2 py-0.5 text-xs font-medium mb-1",
                            kindColor[t.kind] || "bg-gray-100 text-gray-700"
                          )}
                        >
                          {t.kind}
                        </span>
                        <div className="font-medium">{t.name}</div>
                        {t.gherkin?.feature && (
                          <div className="text-xs text-muted-foreground">
                            {t.gherkin.feature}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.status === "passing" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Passing
                          </span>
                        )}
                        {t.status === "failing" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle className="h-4 w-4" /> Failing
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecord(t._id)}
                          disabled={recordingId !== null || improvingId !== null}
                        >
                          {recordingId === t._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Recording…
                            </>
                          ) : (
                            <>
                              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
                              {t.specCode ? "Re-record" : "Record"}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleImprove(t._id)}
                          disabled={
                            !t.specCode ||
                            improvingId !== null ||
                            recordingId !== null
                          }
                          title={
                            t.specCode
                              ? "Read the repo, rewrite senior-quality & self-heal until green"
                              : "Record the test first"
                          }
                        >
                          {improvingId === t._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Improving &
                              healing…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" /> Improve
                            </>
                          )}
                        </Button>
                        <button
                          onClick={() => handleDeleteTest(t._id)}
                          className="text-muted-foreground hover:text-red-600"
                          title="Delete test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm space-y-1.5 font-mono">
                      {t.gherkin?.given?.map((g, i) => (
                        <div key={`g${i}`}>
                          <span className="text-emerald-600 font-semibold">Given </span>
                          {g}
                        </div>
                      ))}
                      {t.gherkin?.when?.map((w, i) => (
                        <div key={`w${i}`}>
                          <span className="text-blue-600 font-semibold">When </span>
                          {w}
                        </div>
                      ))}
                      {t.gherkin?.then?.map((th, i) => (
                        <div key={`t${i}`}>
                          <span className="text-amber-600 font-semibold">Then </span>
                          {th}
                        </div>
                      ))}
                    </div>

                    {t.specCode && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Playwright spec
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {t.specCode}
                        </pre>
                      </details>
                    )}

                    {t.heal && t.heal.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Heal log ({t.heal.length} attempt
                          {t.heal.length > 1 ? "s" : ""})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {t.heal.map((h) => (
                            <div
                              key={h.attempt}
                              className="rounded-md border p-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  Attempt {h.attempt}
                                </span>
                                {h.passed ? (
                                  <span className="text-emerald-600">✓ passed</span>
                                ) : (
                                  <span className="text-red-600">✗ failed</span>
                                )}
                                <span className="text-muted-foreground">
                                  {(h.durationMs / 1000).toFixed(1)}s
                                </span>
                              </div>
                              {!h.passed && h.error && (
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-red-700">
                                  {h.error}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
