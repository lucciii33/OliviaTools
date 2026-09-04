import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useNavigate } from "react-router"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileVideo,
  GitCommitHorizontal,
  Globe2,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Sidebar } from "~/components/Sidebar"
import { useAuth } from "~/context/AuthContext"
import {
  useE2eApi,
  type E2eProject,
  type E2eFeature,
  type E2eTest,
  type E2eTestKind,
  type Gherkin,
} from "~/api/e2eApi"
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
    updateProject,
    deleteProject,
    listFeatures,
    createFeature,
    deleteFeature,
    generateFromVideo,
    listTests,
    createTest,
    updateTest,
    startCloudLogin,
    finishCloudLogin,
    recordTest,
    improveTest,
    commitTest,
    deleteTest,
    startClientRecording,
    finishClientRecording,
    loading,
    error,
  } = useE2eApi()
  // Reuse the existing connected-repos list (GitHub App installations) — same
  // source the Docs/API feature uses. We don't touch that code.
  const { installations, getInstallations } = useInstallationsApi()

  const [projects, setProjects] = useState<E2eProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [project, setProject] = useState<E2eProject | null>(null)
  // Middle level: the features of the open project. `feature` is the one being
  // viewed (its video upload + test cases). null → showing the features list.
  const [features, setFeatures] = useState<E2eFeature[]>([])
  const [feature, setFeature] = useState<E2eFeature | null>(null)
  const [newFeatureName, setNewFeatureName] = useState("")
  const [creatingFeature, setCreatingFeature] = useState(false)
  const [tests, setTests] = useState<E2eTest[]>([])
  // Inline Gherkin editor. `editingCaseId` is the test being edited, or the
  // NEW_CASE sentinel for the blank card at the top of the list — one editor
  // serves both so a hand-written case and a video-generated one are edited
  // exactly the same way.
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [caseDraft, setCaseDraft] = useState<TestDraft | null>(null)
  const [savingCase, setSavingCase] = useState(false)

  // new-project inline form
  const [newName, setNewName] = useState("")
  const [newBaseUrl, setNewBaseUrl] = useState("")
  const [newRepo, setNewRepo] = useState("") // "owner/repo" from the dropdown
  const [creating, setCreating] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [videoName, setVideoName] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  // Cloud recorder: the active session the customer is driving in the embedded
  // browser (null when no cloud recording is open).
  const [cloudRec, setCloudRec] = useState<{
    // "record" captures a flow for one test; "login" captures the project's
    // session. Same embedded browser, different thing saved on finish.
    mode: "record" | "login"
    testId: string | null
    recordingId: string
    liveViewUrl: string
  } | null>(null)
  const [startingCloud, setStartingCloud] = useState<string | null>(null)
  const [finishingCloud, setFinishingCloud] = useState(false)
  const [improvingId, setImprovingId] = useState<string | null>(null)
  const [committingId, setCommittingId] = useState<string | null>(null)
  const [authing, setAuthing] = useState(false)
  const [selectedEnv, setSelectedEnv] = useState("")
  const [envDrafts, setEnvDrafts] = useState<
    { name: string; baseUrl: string; loginUrl?: string }[]
  >([{ name: "staging", baseUrl: "", loginUrl: "" }])
  const [savingEnvs, setSavingEnvs] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    setProjectsLoading(true)
    listProjects()
      .then(setProjects)
      .finally(() => setProjectsLoading(false))
    getInstallations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function openProject(p: E2eProject) {
    setProject(p)
    setFeature(null)
    setTests([])
    setFeatures(await listFeatures(p._id))
  }

  async function openFeature(f: E2eFeature) {
    setFeature(f)
    setVideoName(null)
    setTests(await listTests(f._id))
  }

  async function refreshFeatures(projectId: string) {
    setFeatures(await listFeatures(projectId))
  }

  async function handleCreateFeature() {
    if (!project || !newFeatureName.trim()) return
    setCreatingFeature(true)
    const f = await createFeature(project._id, { name: newFeatureName.trim() })
    setCreatingFeature(false)
    if (f) {
      setNewFeatureName("")
      await refreshFeatures(project._id)
    }
  }

  async function handleDeleteFeature(id: string) {
    if (!project) return
    if (!window.confirm("Delete this feature and all its test cases?")) return
    if (await deleteFeature(id)) {
      if (feature?._id === id) setFeature(null)
      await refreshFeatures(project._id)
    }
  }

  async function handleDeleteProject(id: string) {
    if (
      !window.confirm(
        "Delete this project and all its features, tests and login session?"
      )
    )
      return
    if (await deleteProject(id)) {
      if (project?._id === id) setProject(null)
      setProjects(await listProjects())
    }
  }

  useEffect(() => {
    if (!project) return
    const envs = project.environments || []
    setEnvDrafts(
      envs.length
        ? envs.map((e) => ({
            name: e.name,
            baseUrl: e.baseUrl,
            loginUrl: e.loginUrl || "",
          }))
        : [{ name: "staging", baseUrl: project.baseUrl || "", loginUrl: project.login?.url || "" }]
    )
    if (envs.length && !envs.some((e) => e.name === selectedEnv)) {
      setSelectedEnv(envs[0].name)
    }
    if (!envs.length) setSelectedEnv("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?._id, project?.updatedAt])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const [owner, repo] = newRepo.split("/")
    const p = await createProject({
      name: newName.trim(),
      baseUrl: newBaseUrl.trim(),
      // ONE LOGIN PER PROJECT: don't auto-create a "staging" environment. The
      // project's baseUrl + single login session is the only target. Keeping
      // this empty makes login/record use the project-level session.
      // (Was: environments: newBaseUrl.trim() ? [{ name: "staging", baseUrl: newBaseUrl.trim() }] : [])
      environments: [],
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
    if (!feature || uploadingVideo) return
    setUploadingVideo(true)
    setVideoName(file.name)
    try {
      const res = await generateFromVideo(feature._id, file)
      if (res) {
        setTests(await listTests(feature._id))
        if (project) refreshFeatures(project._id) // update the feature's test count
      }
    } finally {
      setUploadingVideo(false)
    }
  }

  // Opens the login in the embedded cloud browser. The old flow called
  // recordLogin, which launches Playwright's recorder on the BACKEND machine —
  // that only ever opened a window when the backend ran on your own laptop, and
  // silently did nothing in production. This is the same browser the recorder
  // already uses, so it behaves identically locally and deployed.
  async function handleSetupLogin() {
    if (!project) return
    setAuthing(true)
    const res = await startCloudLogin(project._id, activeEnvName)
    setAuthing(false)
    if (res) {
      setCloudRec({
        mode: "login",
        testId: null,
        recordingId: res.recordingId,
        liveViewUrl: res.liveViewUrl,
      })
    }
  }

  async function handleImprove(id: string) {
    if (!project) return
    setImprovingId(id)
    const res = await improveTest(id, activeEnvName)
    setImprovingId(null)
    if (res && "loginRequired" in res) {
      const label = activeEnvName || "this project"
      const ok = window.confirm(
        `You need to capture the login for ${label} before improving. Open the login recorder now?`
      )
      if (ok) await handleSetupLogin()
      return
    }
    if (res && feature) setTests(await listTests(feature._id))
  }

  // Cloud recorder: open a Browserbase browser the customer drives from the
  // embedded live view — no install, no changes to their app.
  async function handleCloudRecord(id: string) {
    if (!project) return
    setStartingCloud(id)
    const res = await startClientRecording(id, activeEnvName)
    setStartingCloud(null)
    if (res && "loginRequired" in res) {
      const label = activeEnvName || "this project"
      const ok = window.confirm(
        `You need to capture the login for ${label} first. Open the login recorder now?`
      )
      if (!ok) return
      await handleSetupLogin()
      return
    }
    if (res && "liveViewUrl" in res) {
      setCloudRec({
        mode: "record",
        testId: id,
        recordingId: res.recordingId,
        liveViewUrl: res.liveViewUrl,
      })
    }
  }

  async function handleFinishCloud() {
    if (!cloudRec) return
    setFinishingCloud(true)

    if (cloudRec.mode === "login") {
      const res = await finishCloudLogin(cloudRec.recordingId)
      setFinishingCloud(false)
      // The backend tears the browser down either way, so close the overlay
      // even on failure — a 422 ("you never logged in") surfaces through the
      // shared `error` banner and they can start a fresh capture.
      setCloudRec(null)
      if (res && project) await refreshProject(project._id)
      return
    }

    const res = await finishClientRecording(cloudRec.recordingId)
    setFinishingCloud(false)
    setCloudRec(null)
    if (res && feature) setTests(await listTests(feature._id))
  }

  function startNewCase() {
    setEditingCaseId(NEW_CASE)
    setCaseDraft(emptyDraft())
  }

  function startEditCase(t: E2eTest) {
    setEditingCaseId(t._id)
    setCaseDraft(draftFromTest(t))
  }

  function cancelEditCase() {
    setEditingCaseId(null)
    setCaseDraft(null)
  }

  // The scenario travels as one block of text, exactly as typed. The backend
  // stores it verbatim and derives the given/when/then arrays from it, so the
  // step ORDER the user wrote (interleaved When/Then/And) survives.
  async function handleSaveCase() {
    if (!feature || !caseDraft || !caseDraft.name.trim() || savingCase) return
    const payload = {
      name: caseDraft.name.trim(),
      kind: caseDraft.kind,
      gherkinText: caseDraft.gherkinText,
    }
    setSavingCase(true)
    const saved =
      editingCaseId === NEW_CASE
        ? await createTest(feature._id, payload)
        : await updateTest(editingCaseId as string, payload)
    setSavingCase(false)
    if (!saved) return
    setTests((prev) =>
      editingCaseId === NEW_CASE
        ? [saved, ...prev]
        : prev.map((t) => (t._id === saved._id ? saved : t))
    )
    // A new case changes the feature's test count on the features grid.
    if (editingCaseId === NEW_CASE && project) refreshFeatures(project._id)
    cancelEditCase()
  }

  async function handleDeleteTest(id: string) {
    if (await deleteTest(id)) {
      setTests((t) => t.filter((x) => x._id !== id))
      if (editingCaseId === id) cancelEditCase()
    }
  }

  async function handleCommit(id: string) {
    if (!feature) return
    setCommittingId(id)
    const res = await commitTest(id)
    setCommittingId(null)
    if (res) {
      setTests(await listTests(feature._id))
      window.open(res.commit.url, "_blank", "noopener")
    }
  }

  async function refreshProject(projectId: string) {
    const all = await listProjects()
    setProjects(all)
    const fresh = all.find((p) => p._id === projectId)
    if (fresh) setProject(fresh)
    return fresh
  }

  async function handleSaveEnvs() {
    if (!project) return
    const environments = envDrafts
      .map((e) => ({
        name: e.name.trim(),
        baseUrl: e.baseUrl.trim(),
        loginUrl: (e.loginUrl || "").trim(),
      }))
      .filter((e) => e.name)
    setSavingEnvs(true)
    const saved = await updateProject(project._id, { environments })
    setSavingEnvs(false)
    if (saved) {
      setProject(saved)
      setProjects(await listProjects())
      if (environments.length && !environments.some((e) => e.name === selectedEnv)) {
        setSelectedEnv(environments[0].name)
      }
    }
  }

  const kindColor: Record<string, string> = {
    smoke: "bg-emerald-100 text-emerald-700",
    regression: "bg-blue-100 text-blue-700",
    bughunt: "bg-amber-100 text-amber-700",
  }

  const envs = project?.environments || []
  // ONE LOGIN PER PROJECT: always use the project-level session, never per-env.
  // Sending an env name routes login/record to a per-environment storageState,
  // which is what kept booting the user back to /login. Force undefined so every
  // recordLogin/recordTest/improve call hits the legacy project-level login.
  // (Was: const activeEnvName = envs.length ? selectedEnv || envs[0]?.name || "" : undefined)
  const activeEnvName = undefined
  const activeEnv = envs.find((e) => e.name === activeEnvName)
  const activeBaseUrl = activeEnv?.baseUrl || project?.baseUrl || ""
  const activeAuthReady = activeEnv ? activeEnv.authReady : !!project?.login?.authReady

  return (
    <div className="flex min-h-screen bg-background">
      {/* Cloud recorder: the customer drives a real browser (running in the
          cloud) from this embedded live view. Olivia injects the recorder +
          their logged-in session — they install nothing, change nothing in
          their app. Clicks are captured and become a Playwright spec on Finish. */}
      {cloudRec && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                {cloudRec.mode === "login" ? (
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {cloudRec.mode === "login"
                    ? "Log in inside this browser, then click Save session"
                    : "Recording — click through your flow, then Finish"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={finishingCloud}
                  onClick={() => {
                    // Cancel: tear the cloud browser down without saving. For a
                    // login that's the same call — it just won't persist a
                    // session, since nothing was confirmed.
                    if (cloudRec.mode === "login") {
                      finishCloudLogin(cloudRec.recordingId)
                    } else {
                      finishClientRecording(cloudRec.recordingId)
                    }
                    setCloudRec(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={finishingCloud}
                  onClick={handleFinishCloud}
                >
                  {finishingCloud ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {cloudRec.mode === "login" ? "Saving…" : "Generating…"}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {cloudRec.mode === "login"
                        ? "Save session"
                        : "Finish & generate"}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <iframe
              title={cloudRec.mode === "login" ? "Login capture" : "Cloud recorder"}
              src={cloudRec.liveViewUrl}
              className="h-full w-full flex-1 bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
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
            {projectsLoading && projects.length === 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading automation projects...
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={projectsLoading}>
              {projects.map((p) => (
                <div
                  key={p._id}
                  className="group relative rounded-lg border p-4 hover:border-foreground/40 transition-colors"
                >
                  <button
                    onClick={() => openProject(p)}
                    className="w-full text-left"
                  >
                    <div className="font-medium pr-6">{p.title || p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.environments?.length
                        ? `${p.environments.length} environment${p.environments.length > 1 ? "s" : ""}`
                        : p.baseUrl || "no base URL set"}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(p._id)}
                    className="absolute right-3 top-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : !feature ? (
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
              {activeBaseUrl || "no base URL set"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {project.github?.owner && project.github?.repo
                ? `repo: ${project.github.owner}/${project.github.repo}`
                : "no repo connected — improve runs without repo context"}
            </p>

            {/* Login — ONE per project, reused by every feature & test */}
            <div className="mb-6 rounded-lg border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Project login</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {activeBaseUrl || "No base URL configured"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={activeAuthReady ? "outline" : "default"}
                    onClick={handleSetupLogin}
                    disabled={authing || !activeBaseUrl}
                  >
                    {authing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Opening browser
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        {activeAuthReady ? "Re-capture login" : "Set up login"}
                      </>
                    )}
                  </Button>
                  <span
                    className={cn(
                      "text-xs",
                      activeAuthReady ? "text-emerald-600" : "text-muted-foreground"
                    )}
                  >
                    {activeAuthReady ? "Session saved" : "Login required before recording"}
                  </span>
                </div>
              </div>

            </div>

            {/* Features — group test cases inside the project. Drop a video
                inside a feature to generate its cases. */}
            <div className="mb-3 flex items-center gap-2">
              <input
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="New feature name (e.g. Checkout, Dashboard)"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFeature()
                }}
              />
              <Button
                onClick={handleCreateFeature}
                disabled={creatingFeature || !newFeatureName.trim()}
              >
                {creatingFeature ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add feature
              </Button>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {features.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No features yet — add one, then drop a demo video inside it to
                generate its test cases.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                  <div
                    key={f._id}
                    className="group relative rounded-lg border p-4 hover:border-foreground/40 transition-colors"
                  >
                    <button
                      onClick={() => openFeature(f)}
                      className="w-full text-left"
                    >
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.testCount ?? 0} test case
                        {(f.testCount ?? 0) === 1 ? "" : "s"}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteFeature(f._id)}
                      className="absolute right-3 top-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                      title="Delete feature"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFeature(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All features
            </button>

            <h1 className="text-2xl font-semibold mb-1">{feature.name}</h1>
            <p className="text-muted-foreground mb-4">
              {project.title || project.name}
              {activeBaseUrl ? ` · ${activeBaseUrl}` : ""}
            </p>

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
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingVideo}>
                {uploadingVideo ? (
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
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={startNewCase}
                disabled={editingCaseId !== null}
                title="Write a test case by hand instead of generating it from a video"
              >
                <Plus className="h-4 w-4" /> Add test case
              </Button>
            </div>

            {/* Blank card at the top — the same editor used for edits. */}
            {editingCaseId === NEW_CASE && caseDraft && (
              <div className="rounded-lg border p-4 mb-3">
                <TestCaseEditor
                  draft={caseDraft}
                  onChange={setCaseDraft}
                  onSave={handleSaveCase}
                  onCancel={cancelEditCase}
                  saving={savingCase}
                  isNew
                />
              </div>
            )}

            {tests.length === 0 ? (
              editingCaseId === NEW_CASE ? null : (
                <p className="text-sm text-muted-foreground">
                  No test cases yet — upload a demo video to generate them, or
                  add one by hand.
                </p>
              )
            ) : (
              <div className="flex flex-col gap-3">
                {tests.map((t) => (
                  <div key={t._id} className="rounded-lg border p-4">
                  {editingCaseId === t._id && caseDraft ? (
                    <TestCaseEditor
                      draft={caseDraft}
                      onChange={setCaseDraft}
                      onSave={handleSaveCase}
                      onCancel={cancelEditCase}
                      saving={savingCase}
                    />
                  ) : (
                   <>
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
                          type="button"
                          onClick={() => handleCloudRecord(t._id)}
                          disabled={
                            startingCloud !== null ||
                            cloudRec !== null ||
                            improvingId !== null
                          }
                          title="Record in a cloud browser — nothing to install"
                        >
                          {startingCloud === t._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Opening…
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
                          type="button"
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
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => handleCommit(t._id)}
                          disabled={
                            !t.specCode ||
                            committingId !== null ||
                            improvingId !== null ||
                            recordingId !== null
                          }
                          title={
                            t.specCode
                              ? "Commit & push this spec to the connected repo"
                              : "Record & improve the test first"
                          }
                        >
                          {committingId === t._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Pushing…
                            </>
                          ) : (
                            <>
                              <GitCommitHorizontal className="h-4 w-4" />
                              {t.commit?.sha ? "Re-push" : "Commit & Push"}
                            </>
                          )}
                        </Button>
                        {t.commit?.url && (
                          <a
                            href={t.commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                            title={`Committed to ${t.commit.branch}`}
                          >
                            {t.commit.sha?.slice(0, 7)}
                          </a>
                        )}
                        <button
                          onClick={() => startEditCase(t)}
                          disabled={editingCaseId !== null}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                          title="Edit name, kind & Given/When/Then"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(t._id)}
                          className="text-muted-foreground hover:text-red-600"
                          title="Delete test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Render the scenario as written when we have the raw
                        text — that's the only view that keeps the real step
                        order. Cases saved before gherkinText existed fall back
                        to the grouped arrays. */}
                    <div className="mt-3 text-sm space-y-1.5 font-mono">
                      {t.gherkinText ? (
                        t.gherkinText.split("\n").map((line, i) => (
                          <GherkinLine key={i} line={line} />
                        ))
                      ) : (
                        <>
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
                        </>
                      )}
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
                   </>
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

// --------------------------- Inline case editor ---------------------------
// Sentinel for "the blank card at the top of the list" — lets one editor and
// one draft serve both creating a case and editing an existing one.
const NEW_CASE = "__new__"

type TestDraft = {
  name: string
  kind: E2eTestKind
  // The whole scenario as one block of text. Deliberately NOT three lists of
  // steps: a real scenario interleaves them (When → Then → And → When …) and
  // separate lists can't hold that order — and you can't paste into them.
  gherkinText: string
}

const KINDS: E2eTestKind[] = ["smoke", "regression", "bughunt"]

const GHERKIN_PLACEHOLDER = `Feature: Login
Scenario: Wrong password shows an error
  Given the user is on the login page
  When they submit a wrong password
  Then an error message is shown
  And the password field is highlighted
  When they fix the password
  Then they land on the dashboard`

function emptyDraft(): TestDraft {
  return { name: "", kind: "regression", gherkinText: "" }
}

// Cases created before gherkinText existed only have the grouped arrays — turn
// them back into text so the editor always opens on something editable.
function draftFromTest(t: E2eTest): TestDraft {
  return {
    name: t.name,
    kind: t.kind,
    gherkinText: t.gherkinText || gherkinToText(t.gherkin),
  }
}

function gherkinToText(g?: Gherkin): string {
  if (!g) return ""
  const lines: string[] = []
  if (g.feature) lines.push(`Feature: ${g.feature}`)
  if (g.scenario) lines.push(`Scenario: ${g.scenario}`)
  g.given?.forEach((x) => lines.push(`  Given ${x}`))
  g.when?.forEach((x) => lines.push(`  When ${x}`))
  g.then?.forEach((x) => lines.push(`  Then ${x}`))
  return lines.join("\n")
}

// One line of a saved scenario, with its leading keyword tinted. Purely
// cosmetic — the line is shown exactly as stored, keyword included.
const KEYWORD_COLOR: Record<string, string> = {
  given: "text-emerald-600",
  when: "text-blue-600",
  then: "text-amber-600",
  and: "text-muted-foreground",
  but: "text-muted-foreground",
  feature: "text-foreground",
  scenario: "text-foreground",
}

function GherkinLine({ line }: { line: string }) {
  const trimmed = line.trim()
  if (!trimmed) return <div className="h-2" />
  const m = trimmed.match(/^([a-zA-Z]+)(:?)(\s+|$)([\s\S]*)$/)
  const color = m ? KEYWORD_COLOR[m[1].toLowerCase()] : undefined
  if (!m || !color) return <div>{trimmed}</div>
  return (
    <div>
      <span className={cn("font-semibold", color)}>
        {m[1]}
        {m[2]}{" "}
      </span>
      {m[4]}
    </div>
  )
}

// Name + kind + ONE textarea for the scenario. Module-level (not nested inside
// E2eQa) so typing doesn't remount the inputs and steal focus on every
// keystroke.
function TestCaseEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew = false,
}: {
  draft: TestDraft
  onChange: (d: TestDraft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          placeholder="Test case name (e.g. Login with a wrong password)"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
        <select
          className="rounded-md border px-2 py-2 text-sm"
          value={draft.kind}
          onChange={(e) =>
            onChange({ ...draft, kind: e.target.value as E2eTestKind })
          }
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="min-h-56 w-full resize-y rounded-md border px-3 py-2 font-mono text-sm leading-relaxed"
        placeholder={GHERKIN_PLACEHOLDER}
        spellCheck={false}
        value={draft.gherkinText}
        onChange={(e) => onChange({ ...draft, gherkinText: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">
        Paste or write the scenario as plain Gherkin — Given / When / Then /
        And / But, in any order. It's stored exactly as you type it.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          type="button"
          onClick={onSave}
          disabled={saving || !draft.name.trim()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isNew ? "Create case" : "Save"}
        </Button>
      </div>
    </div>
  )
}
