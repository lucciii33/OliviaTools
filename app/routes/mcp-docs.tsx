import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Flame,
  Loader2,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  WandSparkles,
  XCircle,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { useAuth } from "~/context/AuthContext"
import {
  createMcpProject,
  deleteMcpBug,
  deleteMcpDoc,
  generateMcpDocsForTool,
  generateMcpRegression,
  generateMcpSmoke,
  getMcpProject,
  getMcpRegression,
  getMcpSmoke,
  listMcpBugs,
  listMcpProjects,
  McpTrialLimitError,
  refineMcpRegressionCase,
  refineMcpSmokeCase,
  runMcpQa,
  runMcpRegression,
  runMcpSmoke,
  updateMcpBugStatus,
  type McpDoc,
  type McpProject,
  type McpProjectBug,
  type McpQaBug,
  type McpQaResult,
  type McpQaRunPayload,
  type McpQaRunResponse,
  type McpRegressionCase,
  type McpRegressionResult,
  type McpRegressionRunResponse,
  type McpRegressionSuite,
  type McpServerConfig,
  type McpSmokeCase,
  type McpSmokeResult,
  type McpSmokeRunResponse,
  type McpSmokeSuite,
  type McpTool,
  type McpTransport,
  type McpTrialLimitAction,
} from "~/api/mcpDocsApi"
import { cn } from "~/lib/utils"

const fieldClass =
  "bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
const selectClass =
  "h-8 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white outline-none transition-colors focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/50"
const textareaClass =
  "min-h-20 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/50"
const MCP_CONFIG_KEY = "mcp-docs-last-config"

function parseArgs(value: string) {
  return value
    .split(/\s+/)
    .map((arg) => arg.trim())
    .filter(Boolean)
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "None"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function getToolName(tool: McpTool) {
  return tool.name ?? tool.toolName ?? tool.title ?? "unnamed_tool"
}

function getBugToolName(bug: McpProjectBug) {
  if (bug.toolName) return bug.toolName
  if (typeof bug.tool === "string") return bug.tool
  if (bug.tool) return getToolName(bug.tool)
  return "Unknown tool"
}

function getBugToolId(bug: McpProjectBug) {
  if (bug.toolId) return bug.toolId
  if (bug.tool && typeof bug.tool === "object") return bug.tool._id
  return undefined
}

function isOpenBug(bug: McpProjectBug) {
  return !["fixed", "closed", "resolved"].includes(
    (bug.status ?? "open").toLowerCase()
  )
}

function getOpenBugCountForDoc(
  doc: McpDoc,
  tools: McpTool[],
  bugs: McpProjectBug[]
) {
  const tool = tools.find((item) => getToolName(item) === doc.toolName)
  return bugs.filter((bug) => {
    if (!isOpenBug(bug)) return false
    const bugToolId = getBugToolId(bug)
    if (tool?._id && bugToolId === tool._id) return true
    return getBugToolName(bug) === (tool ? getToolName(tool) : doc.toolName)
  }).length
}

function getSchemaProperties(schema: Record<string, unknown> | undefined) {
  const properties =
    schema && typeof schema.properties === "object" && schema.properties
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : {}
  const required = Array.isArray(schema?.required)
    ? (schema.required as string[])
    : []

  return Object.entries(properties).map(([name, value]) => ({
    name,
    type: typeof value?.type === "string" ? value.type : "string",
    description:
      typeof value?.description === "string" ? value.description : "",
    required: required.includes(name),
  }))
}

function parseSampleValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (trimmed === "null") return null
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") return Number(trimmed)
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

export default function McpDocs() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ projectId: string }>()
  const routeProjectId = params.projectId ?? null
  const isBugsRoute = Boolean(routeProjectId && location.pathname.endsWith("/bugs"))
  const isSmokeRoute = Boolean(routeProjectId && location.pathname.endsWith("/smoke"))
  const isRegressionRoute = Boolean(
    routeProjectId && location.pathname.endsWith("/regression")
  )
  const [projects, setProjects] = useState<McpProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("montemauro")
  const [docs, setDocs] = useState<McpDoc[]>([])
  const [name, setName] = useState("montemauro")
  const [transport, setTransport] = useState<McpTransport>("stdio")
  const [url, setUrl] = useState("")
  const [command, setCommand] = useState("node")
  const [args, setArgs] = useState(
    "/Users/angelo/montemauro/backend/mcp-server.js"
  )
  const [bearerToken, setBearerToken] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiKeyHeader, setApiKeyHeader] = useState("")
  const [headers, setHeaders] = useState("")
  const [maxCasesPerTool, setMaxCasesPerTool] = useState(3)
  const [tools, setTools] = useState<McpTool[]>([])
  const [bugs, setBugs] = useState<McpProjectBug[]>([])
  const [sampleArgsByTool, setSampleArgsByTool] = useState<
    Record<string, Record<string, string>>
  >({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const [save, setSave] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [projectLoading, setProjectLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<McpDoc | null>(null)
  const [creatingDocForTool, setCreatingDocForTool] = useState<string | null>(null)
  const [bugDeleteTarget, setBugDeleteTarget] = useState<McpProjectBug | null>(null)
  const [deletingBugId, setDeletingBugId] = useState<string | null>(null)
  const [qaRunningTool, setQaRunningTool] = useState<string | null>(null)
  const [qaRun, setQaRun] = useState<McpQaRunResponse | null>(null)
  const [smokeSuite, setSmokeSuite] = useState<McpSmokeSuite | null>(null)
  const [smokeRun, setSmokeRun] = useState<McpSmokeRunResponse | null>(null)
  const [smokeLoading, setSmokeLoading] = useState(false)
  const [smokeGenerating, setSmokeGenerating] = useState(false)
  const [smokeRunning, setSmokeRunning] = useState(false)
  const [refiningSmokeCaseId, setRefiningSmokeCaseId] = useState<string | null>(
    null
  )
  const [regressionSuite, setRegressionSuite] =
    useState<McpRegressionSuite | null>(null)
  const [regressionRun, setRegressionRun] =
    useState<McpRegressionRunResponse | null>(null)
  const [regressionLoading, setRegressionLoading] = useState(false)
  const [regressionGenerating, setRegressionGenerating] = useState(false)
  const [regressionRunning, setRegressionRunning] = useState(false)
  const [refiningCaseId, setRefiningCaseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [trialLimits, setTrialLimits] = useState<
    Partial<Record<McpTrialLimitAction, { message: string; used?: number; limit?: number }>>
  >({})

  const isStdio = transport === "stdio"
  const hasTools = tools.length > 0

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    refreshDocs(routeProjectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, routeProjectId])

  useEffect(() => {
    if (!isSmokeRoute || !routeProjectId) {
      setSmokeRun(null)
      return
    }
    let cancelled = false
    setSmokeLoading(true)
    setError(null)
    getMcpSmoke(routeProjectId)
      .then((data) => {
        if (cancelled) return
        setSmokeSuite(data.suite ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Error loading smoke suite")
      })
      .finally(() => {
        if (cancelled) return
        setSmokeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSmokeRoute, routeProjectId])

  useEffect(() => {
    if (!isRegressionRoute || !routeProjectId) {
      setRegressionRun(null)
      return
    }
    let cancelled = false
    setRegressionLoading(true)
    setError(null)
    getMcpRegression(routeProjectId)
      .then((data) => {
        if (cancelled) return
        setRegressionSuite(data.suite ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Error loading regression suite"
        )
      })
      .finally(() => {
        if (cancelled) return
        setRegressionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isRegressionRoute, routeProjectId])

  const docCount = useMemo(() => docs.length, [docs])

  if (!user) return null

  function handleError(err: unknown, fallback: string) {
    if (err instanceof McpTrialLimitError) {
      if (err.action) {
        setTrialLimits((prev) => ({
          ...prev,
          [err.action as McpTrialLimitAction]: {
            message: err.message,
            used: err.used,
            limit: err.limit,
          },
        }))
      }
      const usage =
        typeof err.used === "number" && typeof err.limit === "number"
          ? ` (${err.used}/${err.limit})`
          : ""
      setError(`${err.message}${usage}`)
      return
    }
    setError(err instanceof Error ? err.message : fallback)
  }

  async function refreshDocs(projectId = routeProjectId) {
    setRefreshing(true)
    setError(null)
    try {
      await refreshProjects(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading MCP docs")
    } finally {
      setRefreshing(false)
    }
  }

  async function refreshProjects(preferredProjectId?: string | null) {
    const data = await listMcpProjects()
    const nextProjects = data.projects ?? []
    setProjects(nextProjects)

    if (preferredProjectId) {
      await loadProject(preferredProjectId)
    } else {
      setActiveProjectId(null)
      setDocs([])
      setTools([])
      setBugs([])
      setQaRun(null)
    }
  }

  function applyProject(project: McpProject) {
    setProjectName(project.projectName ?? project.name ?? "")
    applyConfig(project.config)
  }

  function initializeSampleArgs(nextTools: McpTool[]) {
    setSampleArgsByTool(
      nextTools.reduce<Record<string, Record<string, string>>>((acc, tool) => {
        const toolName = getToolName(tool)
        const fields = getSchemaProperties(tool.inputSchema)
        const suggested =
          tool.suggestedArgs && typeof tool.suggestedArgs === "object"
            ? (tool.suggestedArgs as Record<string, unknown>)
            : {}
        acc[toolName] = fields.reduce<Record<string, string>>((fieldAcc, field) => {
          const value = suggested[field.name]
          if (value === undefined || value === null) {
            fieldAcc[field.name] = ""
          } else if (typeof value === "string") {
            fieldAcc[field.name] = value
          } else {
            fieldAcc[field.name] = JSON.stringify(value)
          }
          return fieldAcc
        }, {})
        return acc
      }, {})
    )
  }

  async function loadProject(id: string) {
    setProjectLoading(true)
    setError(null)
    try {
      const data = await getMcpProject(id)
      setActiveProjectId(data.project._id)
      setDocs(data.docs ?? [])
      setTools(data.tools ?? [])
      setBugs(data.bugs ?? [])
      applyProject(data.project)
      initializeSampleArgs(data.tools ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading MCP project")
    } finally {
      setProjectLoading(false)
    }
  }

  function applyConfig(config: McpServerConfig) {
    setName(config.name ?? "")
    setTransport(config.transport)
    if (config.transport === "stdio") {
      setCommand(config.command ?? "")
      setArgs(config.args?.join(" ") ?? "")
      setUrl("")
    } else {
      setUrl(config.url ?? "")
      setCommand("")
      setArgs("")
    }
    setBearerToken(config.bearerToken ?? "")
    setApiKey(config.apiKey ?? "")
    setApiKeyHeader(config.apiKeyHeader ?? "")
    setHeaders(config.headers ? JSON.stringify(config.headers, null, 2) : "")
  }

  function saveConfig(config: McpServerConfig) {
    localStorage.setItem(MCP_CONFIG_KEY, JSON.stringify(config))
  }

  function buildConfig(): McpServerConfig | null {
    const serverName = name.trim()
    if (!serverName) {
      setError("Server name is required")
      return null
    }

    let extraHeaders: Record<string, string> | undefined
    if (headers.trim()) {
      try {
        const parsed = JSON.parse(headers)
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setError("Headers must be a JSON object")
          return null
        }
        extraHeaders = parsed as Record<string, string>
      } catch {
        setError("Headers must be valid JSON")
        return null
      }
    }

    const auth = {
      ...(bearerToken.trim() ? { bearerToken: bearerToken.trim() } : {}),
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(apiKeyHeader.trim() ? { apiKeyHeader: apiKeyHeader.trim() } : {}),
      ...(extraHeaders ? { headers: extraHeaders } : {}),
    }

    if (isStdio) {
      const serverCommand = command.trim()
      if (!serverCommand) {
        setError("Command is required for stdio transport")
        return null
      }
      const parsedArgs = parseArgs(args)
      return {
        name: serverName,
        transport: "stdio",
        command: serverCommand,
        ...(parsedArgs.length ? { args: parsedArgs } : {}),
        ...auth,
      }
    }

    const serverUrl = url.trim()
    if (!serverUrl) {
      setError("URL is required for http and sse transport")
      return null
    }

    return {
      name: serverName,
      transport,
      url: serverUrl,
      ...auth,
    }
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const nextProjectName = projectName.trim()
    if (!nextProjectName) {
      setError("Project name is required")
      return
    }

    const config = buildConfig()
    if (!config) return

    setConnecting(true)
    try {
      const data = await createMcpProject({
        projectName: nextProjectName,
        config,
        save,
        sampleArgsByTool: buildSampleArgsPayload(),
      })
      saveConfig(config)
      setActiveProjectId(data.projectId ?? data.project._id)
      setDocs(data.docs ?? data.docsResult?.docs ?? [])
      setTools(data.tools ?? [])
      setBugs(data.bugs ?? [])
      initializeSampleArgs(data.tools ?? [])
      await refreshProjects(data.projectId ?? data.project._id)
      navigate(`/mcp-docs/${data.projectId ?? data.project._id}`, {
        replace: true,
      })
      setSuccess(
        `Created ${nextProjectName} with ${(data.docs ?? data.docsResult?.docs ?? []).length} doc${
          (data.docs ?? data.docsResult?.docs ?? []).length === 1 ? "" : "s"
        }`
      )
    } catch (err) {
      handleError(err, "Error creating MCP project")
    } finally {
      setConnecting(false)
    }
  }

  function updateSampleArg(toolName: string, field: string, value: string) {
    setSampleArgsByTool((prev) => ({
      ...prev,
      [toolName]: {
        ...(prev[toolName] ?? {}),
        [field]: value,
      }
    }))
  }

  async function handleDelete(doc: McpDoc) {
    if (!doc._id) return
    setDeletingId(doc._id)
    setError(null)
    try {
      await deleteMcpDoc(doc._id)
      setDocs((prev) => prev.filter((item) => item._id !== doc._id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting MCP doc")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    await handleDelete(deleteTarget)
    setDeleteTarget(null)
  }

  function buildSampleArgsPayload() {
    return Object.entries(sampleArgsByTool).reduce<
      Record<string, Record<string, unknown>>
    >((acc, [toolName, values]) => {
      acc[toolName] = Object.entries(values).reduce<Record<string, unknown>>(
        (valueAcc, [key, value]) => {
          valueAcc[key] = parseSampleValue(value)
          return valueAcc
        },
        {}
      )
      return acc
    }, {})
  }

  async function handleCreateDocForTool(toolName: string) {
    if (!activeProjectId) {
      setError("Select or create a project first")
      return
    }
    setError(null)
    setSuccess(null)
    setCreatingDocForTool(toolName)
    try {
      const argsForTool = buildSampleArgsPayload()[toolName]
      const data = await generateMcpDocsForTool(activeProjectId, toolName, {
        sampleArgs: argsForTool && Object.keys(argsForTool).length ? argsForTool : undefined,
      })
      if (data.doc) {
        setDocs((prev) => {
          const filtered = prev.filter((item) => item.toolName !== toolName)
          return [data.doc as McpDoc, ...filtered]
        })
      }
      setSuccess(
        data.generationError
          ? `Doc created for ${toolName} (with warnings: ${data.generationError})`
          : `Doc created for ${toolName}`
      )
    } catch (err) {
      handleError(err, `Error creating doc for ${toolName}`)
    } finally {
      setCreatingDocForTool(null)
    }
  }

  async function handleRunQa(toolName: string) {
    setError(null)
    setSuccess(null)

    if (!activeProjectId) {
      setError("Select or create a project before running QA")
      return
    }

    setQaRunningTool(toolName)
    try {
      const payload: McpQaRunPayload = {
        projectId: activeProjectId,
        toolName,
        save,
        maxCasesPerTool,
        sampleArgsByTool: buildSampleArgsPayload(),
      }
      const data = await runMcpQa(payload)
      const results = Array.isArray(data.results) ? data.results : []
      const bugs = Array.isArray(data.bugs) ? data.bugs : []
      const summary =
        data.summary ?? {
          total: results.length,
          passed: results.filter((result) => result.verdict === "pass").length,
          failed: results.filter((result) => result.verdict === "fail").length,
          warned: results.filter((result) => result.verdict === "warn").length,
          bugs: bugs.length,
        }
      const normalizedRun = { ...data, summary, results, bugs }
      setQaRun(normalizedRun)
      const bugData = await listMcpBugs(activeProjectId).catch(() => null)
      if (bugData) setBugs(bugData.bugs ?? [])
      setSuccess(
        `QA completed: ${summary.passed}/${summary.total} passed, ${summary.bugs} bug${
          summary.bugs === 1 ? "" : "s"
        }`
      )
    } catch (err) {
      handleError(err, "Error running MCP QA")
    } finally {
      setQaRunningTool(null)
    }
  }

  async function handleGenerateSmoke() {
    if (!routeProjectId) return
    setError(null)
    setSuccess(null)
    setSmokeGenerating(true)
    try {
      const data = await generateMcpSmoke(routeProjectId, {})
      setSmokeSuite(data.suite ?? null)
      setSuccess(
        `Smoke suite generated with ${data.suite?.cases?.length ?? 0} case${
          (data.suite?.cases?.length ?? 0) === 1 ? "" : "s"
        }`
      )
    } catch (err) {
      handleError(err, "Error generating smoke suite")
    } finally {
      setSmokeGenerating(false)
    }
  }

  async function handleRunSmoke() {
    if (!routeProjectId) return
    setError(null)
    setSuccess(null)
    setSmokeRunning(true)
    try {
      const data = await runMcpSmoke(routeProjectId)
      setSmokeRun(data)
      setSuccess(
        `Smoke run: ${data.summary.ok}/${data.summary.total} ok, ${data.summary.broken} broken`
      )
    } catch (err) {
      handleError(err, "Error running smoke suite")
    } finally {
      setSmokeRunning(false)
    }
  }

  async function handleRefineSmokeCase(caseId: string, instruction: string) {
    if (!routeProjectId || !caseId) return
    setError(null)
    setSuccess(null)
    setRefiningSmokeCaseId(caseId)
    try {
      const data = await refineMcpSmokeCase(routeProjectId, caseId, instruction)
      setSmokeSuite(data.suite ?? null)
      setSuccess("Case updated by AI.")
    } catch (err) {
      handleError(err, "Error refining case")
    } finally {
      setRefiningSmokeCaseId(null)
    }
  }

  async function handleGenerateRegression() {
    if (!routeProjectId) return
    setError(null)
    setSuccess(null)
    setRegressionGenerating(true)
    try {
      const data = await generateMcpRegression(routeProjectId, {})
      setRegressionSuite(data.suite ?? null)
      setRegressionRun(null)
      setSuccess(
        `Regression suite generated with ${data.suite?.cases?.length ?? 0} case${
          (data.suite?.cases?.length ?? 0) === 1 ? "" : "s"
        }`
      )
    } catch (err) {
      handleError(err, "Error generating regression suite")
    } finally {
      setRegressionGenerating(false)
    }
  }

  async function handleRunRegression() {
    if (!routeProjectId) return
    setError(null)
    setSuccess(null)
    setRegressionRunning(true)
    try {
      const data = await runMcpRegression(routeProjectId)
      setRegressionRun(data)
      setSuccess(
        `Regression run: ${data.summary.ok}/${data.summary.total} ok, ${data.summary.regression} regression${
          data.summary.regression === 1 ? "" : "s"
        }`
      )
    } catch (err) {
      handleError(err, "Error running regression suite")
    } finally {
      setRegressionRunning(false)
    }
  }

  async function handleRefineCase(caseId: string, instruction: string) {
    if (!routeProjectId || !caseId) return
    setError(null)
    setSuccess(null)
    setRefiningCaseId(caseId)
    try {
      const data = await refineMcpRegressionCase(
        routeProjectId,
        caseId,
        instruction
      )
      setRegressionSuite(data.suite ?? null)
      setSuccess("Case updated by AI.")
    } catch (err) {
      handleError(err, "Error refining case")
    } finally {
      setRefiningCaseId(null)
    }
  }

  async function handleBugStatus(id: string, status: string) {
    setError(null)
    try {
      await updateMcpBugStatus(id, status)
      if (activeProjectId) {
        const data = await listMcpBugs(activeProjectId)
        setBugs(data.bugs ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating bug status")
    }
  }

  async function handleConfirmBugDelete() {
    if (!bugDeleteTarget) return
    setDeletingBugId(bugDeleteTarget._id)
    setError(null)
    try {
      await deleteMcpBug(bugDeleteTarget._id)
      setBugs((prev) => prev.filter((bug) => bug._id !== bugDeleteTarget._id))
      setBugDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting bug")
    } finally {
      setDeletingBugId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white/[0.03] border-r border-white/10 min-h-screen">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-white text-sm">API Docs</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-xs text-white/30 uppercase tracking-wider px-2 mb-2">
            Workspace
          </p>
          <Link
            to="/dashboard"
            className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Selector
          </Link>
          <Link
            to="/mcp-docs"
            className="w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md bg-white/10 text-white transition-colors"
          >
            <span>MCP Docs</span>
          </Link>
          <Link
            to="/mcp-qa-runs"
            className="w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span>MCP QA Runs</span>
          </Link>
          <div className="pt-4">
            <p className="text-xs text-white/30 uppercase tracking-wider px-2 mb-2">
              MCP Projects
            </p>
            <Link
              to="/mcp-docs"
              className={cn(
                "w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md transition-colors",
                !activeProjectId
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <span>New project</span>
            </Link>
            {projects.map((project) => (
              <Link
                key={project._id}
                to={`/mcp-docs/${project._id}`}
                className={cn(
                  "w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md transition-colors text-left",
                  activeProjectId === project._id
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="truncate">
                  {project.projectName ?? project.name}
                </span>
              </Link>
            ))}
            {projects.length === 0 && (
              <p className="px-2 py-2 text-xs text-white/35">
                No MCP projects yet.
              </p>
            )}
          </div>
        </nav>
        <div className="px-3 pb-4 border-t border-white/10 pt-4 space-y-2">
          <p className="text-xs text-white/40 px-2 truncate">
            {user.firstName} {user.lastName}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10"
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-1"
            >
              <ArrowLeft className="h-3 w-3" /> Docs workspace
            </Link>
            <h1 className="text-lg font-semibold text-white">MCP Docs</h1>
            <p className="text-xs text-white/40 mt-0.5">
              Create MCP projects, review generated docs, and track bugs.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => refreshDocs()}
            disabled={refreshing || connecting}
            title="Refresh docs"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 items-start",
            !isSmokeRoute && !isBugsRoute && !isRegressionRoute && "xl:grid-cols-[minmax(320px,420px)_1fr]"
          )}
        >
          {!isSmokeRoute && !isBugsRoute && !isRegressionRoute && (
          <Card className="bg-white/[0.03] border-white/10 text-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Server className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Generate MCP docs</CardTitle>
                  <p className="text-xs text-white/40 mt-0.5">
                    HTTP, SSE, or stdio server connection.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Project name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Server name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Transport</label>
                  <select
                    value={transport}
                    onChange={(e) => setTransport(e.target.value as McpTransport)}
                    className={selectClass}
                  >
                    <option value="http">http</option>
                    <option value="sse">sse</option>
                    <option value="stdio">stdio</option>
                  </select>
                </div>

                {isStdio ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/60">Command</label>
                    <Input
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      required
                      className={fieldClass}
                    />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/60">Args</label>
                      <textarea
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        className={textareaClass}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/60">URL</label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                )}

                <label className="h-8 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={save}
                    onChange={(e) => setSave(e.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Save
                </label>

                <details className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <summary className="cursor-pointer text-xs text-white/60">
                    Optional auth
                  </summary>
                  <div className="mt-3 space-y-3">
                    <Input
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="Bearer token"
                      className={fieldClass}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="API key"
                        className={fieldClass}
                      />
                      <Input
                        value={apiKeyHeader}
                        onChange={(e) => setApiKeyHeader(e.target.value)}
                        placeholder="API key header"
                        className={fieldClass}
                      />
                    </div>
                    <textarea
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      placeholder='{"x-custom-header":"value"}'
                      className={textareaClass}
                    />
                  </div>
                </details>

                <details className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <summary className="cursor-pointer text-xs text-white/60">
                    QA settings
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    <label className="text-xs text-white/60">
                      Max cases per tool
                    </label>
                    <div
                      className="group relative"
                      title="Contact your provider so you can get into a pay plan and have unlimited."
                    >
                      <div className="flex h-8 w-full items-center rounded-lg border border-white/15 bg-white/[0.035] px-2.5 text-sm text-white/45">
                        {maxCasesPerTool}
                      </div>
                      <div className="absolute inset-0 cursor-not-allowed rounded-lg bg-black/20 ring-1 ring-white/5" />
                      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 rounded-md border border-white/10 bg-[#151821] px-3 py-2 text-xs leading-5 text-white/70 shadow-xl group-hover:block">
                        Contact your provider so you can get into a pay plan
                        and have unlimited.
                      </div>
                    </div>
                  </div>
                </details>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 inline-flex items-center gap-2 w-full">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={
                    connecting ||
                    Boolean(trialLimits.projects || trialLimits.docs_generate)
                  }
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                  {connecting ? "Creating..." : "Create project"}
                </Button>
              </form>

            </CardContent>
          </Card>
          )}

          <section className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-white">
                  {projectName ? projectName : "Generated tools"}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {docCount} doc{docCount !== 1 ? "s" : ""} · {tools.length} tool{tools.length !== 1 ? "s" : ""} · {bugs.length} bug{bugs.length !== 1 ? "s" : ""}
                </p>
              </div>
              {activeProjectId && (
                <div className="flex items-center gap-3">
                  <Link
                    to={`/mcp-docs/${activeProjectId}/smoke`}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Smoke
                  </Link>
                  <Link
                    to={`/mcp-docs/${activeProjectId}/regression`}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Regression
                  </Link>
                  <Link
                    to={`/mcp-docs/${activeProjectId}/bugs`}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    Project Bugs
                  </Link>
                  <Link
                    to="/mcp-qa-runs"
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    QA Runs
                  </Link>
                </div>
              )}
            </div>

            {(refreshing || projectLoading) && docs.length === 0 && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            )}

            {!refreshing && !projectLoading && !isBugsRoute && !isSmokeRoute && !isRegressionRoute && docs.length === 0 && tools.length === 0 && (
              <EmptyState onGenerateFocus={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            )}

            {!projectLoading && isBugsRoute && (
              <ProjectBugs
                bugs={bugs}
                deletingBugId={deletingBugId}
                onStatusChange={handleBugStatus}
                onDeleteBug={setBugDeleteTarget}
              />
            )}

            {!projectLoading && isSmokeRoute && (
              <SmokeSuitePanel
                suite={smokeSuite}
                run={smokeRun}
                loading={smokeLoading}
                generating={smokeGenerating}
                running={smokeRunning}
                refiningCaseId={refiningSmokeCaseId}
                generateLimited={Boolean(trialLimits.smoke_generate)}
                runLimited={Boolean(trialLimits.smoke_run)}
                onGenerate={handleGenerateSmoke}
                onRun={handleRunSmoke}
                onRefineCase={handleRefineSmokeCase}
              />
            )}

            {!projectLoading && isRegressionRoute && (
              <RegressionSuitePanel
                suite={regressionSuite}
                run={regressionRun}
                loading={regressionLoading}
                generating={regressionGenerating}
                running={regressionRunning}
                refiningCaseId={refiningCaseId}
                generateLimited={Boolean(trialLimits.regression_generate)}
                runLimited={Boolean(trialLimits.regression_run)}
                onGenerate={handleGenerateRegression}
                onRun={handleRunRegression}
                onRefineCase={handleRefineCase}
              />
            )}

            {!projectLoading && !isBugsRoute && !isSmokeRoute && !isRegressionRoute && tools.length > 0 && (
              <div className="space-y-2">
                {tools.map((tool) => {
                  const toolName = getToolName(tool)
                  const fields = getSchemaProperties(tool.inputSchema)
                  const busy = creatingDocForTool === toolName
                  const doc = docs.find((d) => d.toolName === toolName) || null
                  const hasDoc = Boolean(doc)
                  const argsKey = `${toolName}::args`
                  const docKey = `${toolName}::doc`
                  const argsOpen = expandedSections.has(argsKey)
                  const docOpen = expandedSections.has(docKey)
                  return (
                    <div
                      key={toolName}
                      className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {toolName}
                          </p>
                          {tool.description && (
                            <p className="text-xs text-white/45 mt-1 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shrink-0"
                          disabled={busy || Boolean(trialLimits.docs_generate)}
                          onClick={() => void handleCreateDocForTool(toolName)}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <WandSparkles className="h-3.5 w-3.5" />
                          )}
                          {busy
                            ? hasDoc
                              ? "Regenerating..."
                              : "Creating..."
                            : hasDoc
                              ? "Regenerate docs"
                              : "Create docs"}
                        </Button>
                      </div>

                      {fields.length > 0 && (
                        <div className="border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => toggleSection(argsKey)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.02]"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                              Arguments
                            </span>
                            {argsOpen ? (
                              <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                            )}
                          </button>
                          {argsOpen && (
                            <div className="space-y-2 px-3 pb-3">
                              {fields.map((field) => (
                                <div key={field.name} className="space-y-1">
                                  <label className="text-xs text-white/60">
                                    {field.name}
                                    {field.required ? " *" : ""}
                                  </label>
                                  <Input
                                    value={sampleArgsByTool[toolName]?.[field.name] ?? ""}
                                    onChange={(e) =>
                                      updateSampleArg(toolName, field.name, e.target.value)
                                    }
                                    placeholder={field.type}
                                    className={fieldClass}
                                  />
                                  {field.description && (
                                    <p className="text-xs text-white/35">{field.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {hasDoc && doc && (
                        <div className="border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => toggleSection(docKey)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.02]"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                              Documentation
                            </span>
                            {docOpen ? (
                              <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                            )}
                          </button>
                          {docOpen && (
                            <McpDocCard
                              doc={doc}
                              openBugCount={getOpenBugCountForDoc(doc, tools, bugs)}
                              deleting={deletingId === doc._id}
                              qaRun={qaRun}
                              qaRunning={qaRunningTool === doc.toolName}
                              qaLimited={Boolean(trialLimits.qa_run)}
                              onRunQa={() => handleRunQa(doc.toolName)}
                              onDelete={() => setDeleteTarget(doc)}
                              embedded
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#101217] text-white">
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete?</DialogTitle>
            <DialogDescription className="text-white/55 leading-relaxed">
              This will remove{" "}
              <span className="font-medium text-white">
                {deleteTarget?.toolName ?? "this tool doc"}
              </span>{" "}
              from this MCP project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deleteTarget?._id && deletingId === deleteTarget._id)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={Boolean(deleteTarget?._id && deletingId === deleteTarget._id)}
            >
              {deleteTarget?._id && deletingId === deleteTarget._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(bugDeleteTarget)} onOpenChange={(open) => !open && setBugDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-[#101217] text-white">
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete?</DialogTitle>
            <DialogDescription className="text-white/55 leading-relaxed">
              This will permanently delete this bug from the project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setBugDeleteTarget(null)}
              disabled={Boolean(bugDeleteTarget && deletingBugId === bugDeleteTarget._id)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmBugDelete()}
              disabled={Boolean(bugDeleteTarget && deletingBugId === bugDeleteTarget._id)}
            >
              {bugDeleteTarget && deletingBugId === bugDeleteTarget._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ onGenerateFocus }: { onGenerateFocus: () => void }) {
  return (
    <div className="flex items-center justify-center py-16 px-4 rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
          <Server className="h-6 w-6 text-blue-400" />
        </div>
        <h3 className="text-base font-medium text-white">No MCP docs yet</h3>
        <p className="text-sm text-white/50 mt-2 leading-relaxed">
          Configure a server and generate docs to see MCP tools, arguments,
          examples, risks, and response notes here.
        </p>
        <Button
          size="sm"
          className="mt-5 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
          onClick={onGenerateFocus}
        >
          <WandSparkles className="h-3.5 w-3.5" />
          Configure server
        </Button>
      </div>
    </div>
  )
}

function SmokeSuitePanel({
  suite,
  run,
  loading,
  generating,
  running,
  refiningCaseId,
  generateLimited,
  runLimited,
  onGenerate,
  onRun,
  onRefineCase,
}: {
  suite: McpSmokeSuite | null
  run: McpSmokeRunResponse | null
  loading: boolean
  generating: boolean
  running: boolean
  refiningCaseId: string | null
  generateLimited: boolean
  runLimited: boolean
  onGenerate: () => void
  onRun: () => void
  onRefineCase: (caseId: string, instruction: string) => void
}) {
  if (loading && !suite) {
    return (
      <div className="flex items-center justify-center py-24 rounded-xl border border-white/10 bg-white/[0.03]">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    )
  }

  const cases = suite?.cases ?? []
  const results = run?.results ?? []
  const summary = run?.summary

  return (
    <section
      id="smoke-suite"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 scroll-mt-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-300" />
            <h3 className="text-sm font-medium text-white">Smoke suite</h3>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {suite
              ? `${cases.length} case${cases.length !== 1 ? "s" : ""}`
              : "No suite generated yet."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {suite ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onGenerate}
                disabled={generating || running || generateLimited}
                className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onRun}
                disabled={running || generating || runLimited}
                className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              >
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Run smoke
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onGenerate}
              disabled={generating || generateLimited}
              className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <WandSparkles className="h-3.5 w-3.5" />
              )}
              Create smoke
            </Button>
          )}
        </div>
      </div>

      {summary && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 font-mono">
            {summary.ok}/{summary.total} ok
          </span>
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-mono",
              summary.broken > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            )}
          >
            {summary.broken} broken
          </span>
        </div>
      )}

      {!suite && !loading && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-sm text-white/60">
            No smoke suite for this project yet.
          </p>
          <p className="text-xs text-white/40 mt-1">
            Click <span className="text-white/70">Create smoke</span> to
            generate one.
          </p>
        </div>
      )}

      {suite && results.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-white/45 uppercase tracking-wider">
              Preview · {cases.length} case{cases.length !== 1 ? "s" : ""}
            </h4>
            <span className="text-[11px] text-white/35">
              Run smoke to execute
            </span>
          </div>
          {cases.length === 0 ? (
            <p className="text-sm text-white/40 rounded-md border border-white/10 bg-white/[0.02] px-3 py-6 text-center">
              Suite has no cases.
            </p>
          ) : (
            <div className="space-y-2">
              {cases.map((c, index) => (
                <SmokeCaseCard
                  key={c._id ?? `${c.name}-${index}`}
                  testCase={c}
                  refining={refiningCaseId === c._id}
                  onRefine={onRefineCase}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {suite && results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-white/45 uppercase tracking-wider">
            Results · {results.length}
          </h4>
          <div className="space-y-2">
            {results.map((result, index) => (
              <SmokeResultCard
                key={`${result.caseName}-${index}`}
                result={result}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// One editable smoke case in the preview: shows args/assertions and a small
// input to ask the AI to change it. Mirrors RegressionCaseCard.
function SmokeCaseCard({
  testCase,
  refining,
  onRefine,
}: {
  testCase: McpSmokeCase
  refining: boolean
  onRefine: (caseId: string, instruction: string) => void
}) {
  const [instruction, setInstruction] = useState("")
  const canRefine = Boolean(testCase._id)

  function submit() {
    if (!testCase._id || !instruction.trim() || refining) return
    onRefine(testCase._id, instruction.trim())
    setInstruction("")
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium text-white truncate">{testCase.name}</p>
        <span className="rounded border border-blue-500/25 bg-blue-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-blue-200 font-mono">
          {testCase.expectedTool}
        </span>
      </div>

      {testCase.expectedArgs &&
      Object.keys(testCase.expectedArgs).length > 0 ? (
        <div className="mt-2">
          <h5 className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
            Expected args
          </h5>
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
            {JSON.stringify(testCase.expectedArgs, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-white/35 italic">No args</p>
      )}

      {testCase.assertions && testCase.assertions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-white/55 list-disc list-inside">
          {testCase.assertions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      )}

      {canRefine && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
            disabled={refining}
            placeholder="Tell the AI how to change this test…"
            className={cn(fieldClass, "h-8 text-xs")}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={submit}
            disabled={refining || !instruction.trim()}
            className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5 shrink-0"
          >
            {refining ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
            Ask AI
          </Button>
        </div>
      )}
    </div>
  )
}

function SmokeResultCard({ result }: { result: McpSmokeResult }) {
  const isOk = result.status === "ok"
  const accent = isOk ? "border-green-500/20" : "border-red-500/25"
  const statusPill = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider",
    isOk ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"
  )

  return (
    <details
      className={cn("group rounded-lg border bg-white/[0.02]", accent)}
      open={!isOk}
    >
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isOk ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <p className="text-sm font-medium text-white truncate">
                {result.caseName}
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {result.toolName && (
                <span className="text-[11px] text-white/45 font-mono truncate">
                  {result.toolName}
                </span>
              )}
              {typeof result.latencyMs === "number" && (
                <span className="text-[11px] text-white/40 font-mono">
                  {result.latencyMs}ms
                </span>
              )}
            </div>
          </div>
          <span className={statusPill}>{result.status}</span>
        </div>
      </summary>

      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
        {result.error && (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2">
            <h5 className="text-[10px] text-red-300/80 uppercase tracking-wider mb-1">
              Error
            </h5>
            <p className="text-sm text-red-200 leading-relaxed">{result.error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CodePanel title="Args" value={result.args ?? {}} empty="No args" />
          <CodePanel title="Response" value={result.response} empty="No response" />
        </div>

        {result.assertions && result.assertions.length > 0 && (
          <div>
            <h5 className="text-[10px] text-white/45 uppercase tracking-wider mb-1.5">
              Assertions
            </h5>
            <ul className="space-y-0.5 text-xs text-white/65 list-disc list-inside">
              {result.assertions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}

function RegressionSuitePanel({
  suite,
  run,
  loading,
  generating,
  running,
  refiningCaseId,
  generateLimited,
  runLimited,
  onGenerate,
  onRun,
  onRefineCase,
}: {
  suite: McpRegressionSuite | null
  run: McpRegressionRunResponse | null
  loading: boolean
  generating: boolean
  running: boolean
  refiningCaseId: string | null
  generateLimited: boolean
  runLimited: boolean
  onGenerate: () => void
  onRun: () => void
  onRefineCase: (caseId: string, instruction: string) => void
}) {
  if (loading && !suite) {
    return (
      <div className="flex items-center justify-center py-24 rounded-xl border border-white/10 bg-white/[0.03]">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    )
  }

  const cases = suite?.cases ?? []
  const results = run?.results ?? []
  const summary = run?.summary

  return (
    <section
      id="regression-suite"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 scroll-mt-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <h3 className="text-sm font-medium text-white">Regression suite</h3>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {suite
              ? `${cases.length} case${cases.length !== 1 ? "s" : ""} across your tools`
              : "No suite generated yet."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {suite ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onGenerate}
                disabled={generating || running || generateLimited}
                className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onRun}
                disabled={running || generating || runLimited}
                className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              >
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Run regression
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onGenerate}
              disabled={generating || generateLimited}
              className="h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <WandSparkles className="h-3.5 w-3.5" />
              )}
              Create regression
            </Button>
          )}
        </div>
      </div>

      {summary && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 font-mono">
            {summary.ok}/{summary.total} ok
          </span>
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-mono",
              summary.regression > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            )}
          >
            {summary.regression} regression{summary.regression !== 1 ? "s" : ""}
          </span>
          {summary.warn > 0 && (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-mono text-amber-300">
              {summary.warn} warn
            </span>
          )}
        </div>
      )}

      {!suite && !loading && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-sm text-white/60">
            No regression suite for this project yet.
          </p>
          <p className="text-xs text-white/40 mt-1">
            Click <span className="text-white/70">Create regression</span> to
            generate one — the AI writes several cases per tool.
          </p>
        </div>
      )}

      {suite && results.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-white/45 uppercase tracking-wider">
              Preview · {cases.length} case{cases.length !== 1 ? "s" : ""}
            </h4>
            <span className="text-[11px] text-white/35">
              Run regression to execute
            </span>
          </div>
          {cases.length === 0 ? (
            <p className="text-sm text-white/40 rounded-md border border-white/10 bg-white/[0.02] px-3 py-6 text-center">
              Suite has no cases.
            </p>
          ) : (
            <div className="space-y-2">
              {cases.map((c, index) => (
                <RegressionCaseCard
                  key={c._id ?? `${c.name}-${index}`}
                  testCase={c}
                  refining={refiningCaseId === c._id}
                  onRefine={onRefineCase}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {suite && results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-white/45 uppercase tracking-wider">
            Results · {results.length}
          </h4>
          <div className="space-y-2">
            {results.map((result, index) => (
              <RegressionResultCard
                key={`${result.caseName}-${index}`}
                result={result}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// One editable case in the preview: shows what it covers, its args/assertions,
// and a small input to ask the AI to change it.
function RegressionCaseCard({
  testCase,
  refining,
  onRefine,
}: {
  testCase: McpRegressionCase
  refining: boolean
  onRefine: (caseId: string, instruction: string) => void
}) {
  const [instruction, setInstruction] = useState("")
  const canRefine = Boolean(testCase._id)

  function submit() {
    if (!testCase._id || !instruction.trim() || refining) return
    onRefine(testCase._id, instruction.trim())
    setInstruction("")
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium text-white truncate">{testCase.name}</p>
        <span className="rounded border border-blue-500/25 bg-blue-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-blue-200 font-mono">
          {testCase.expectedTool}
        </span>
      </div>

      {testCase.covers && (
        <div className="mt-2 flex items-start gap-1.5">
          <span className="text-[10px] text-emerald-300/80 uppercase tracking-wider mt-0.5 shrink-0">
            Covers
          </span>
          <p className="text-xs text-white/70 leading-relaxed">
            {testCase.covers}
          </p>
        </div>
      )}

      {testCase.expectedArgs &&
      Object.keys(testCase.expectedArgs).length > 0 ? (
        <div className="mt-2">
          <h5 className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
            Args
          </h5>
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
            {JSON.stringify(testCase.expectedArgs, null, 2)}
          </pre>
        </div>
      ) : null}

      {testCase.assertions && testCase.assertions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-white/55 list-disc list-inside">
          {testCase.assertions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      )}

      {canRefine && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
            disabled={refining}
            placeholder="Tell the AI how to change this test…"
            className={cn(fieldClass, "h-8 text-xs")}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={submit}
            disabled={refining || !instruction.trim()}
            className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5 shrink-0"
          >
            {refining ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
            Ask AI
          </Button>
        </div>
      )}
    </div>
  )
}

function RegressionResultCard({ result }: { result: McpRegressionResult }) {
  const isOk = result.status === "ok"
  const isWarn = result.status === "warn"
  const accent = isOk
    ? "border-green-500/20"
    : isWarn
      ? "border-amber-500/25"
      : "border-red-500/25"
  const statusPill = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider",
    isOk
      ? "bg-green-500/10 text-green-300"
      : isWarn
        ? "bg-amber-500/10 text-amber-300"
        : "bg-red-500/10 text-red-300"
  )

  return (
    <details
      className={cn("group rounded-lg border bg-white/[0.02]", accent)}
      open={!isOk}
    >
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isOk ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              ) : isWarn ? (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <p className="text-sm font-medium text-white truncate">
                {result.caseName}
              </p>
            </div>
            {result.covers && (
              <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                {result.covers}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {result.toolName && (
                <span className="text-[11px] text-white/45 font-mono truncate">
                  {result.toolName}
                </span>
              )}
              {typeof result.latencyMs === "number" && (
                <span className="text-[11px] text-white/40 font-mono">
                  {result.latencyMs}ms
                </span>
              )}
            </div>
          </div>
          <span className={statusPill}>{result.status}</span>
        </div>
      </summary>

      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
        {result.error && (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2">
            <h5 className="text-[10px] text-red-300/80 uppercase tracking-wider mb-1">
              Error
            </h5>
            <p className="text-sm text-red-200 leading-relaxed">
              {result.error}
            </p>
          </div>
        )}

        {result.reasoning && (
          <div className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
            <h5 className="text-[10px] text-white/45 uppercase tracking-wider mb-1">
              Judge
            </h5>
            <p className="text-xs text-white/65 leading-relaxed">
              {result.reasoning}
            </p>
          </div>
        )}

        {result.assertionResults && result.assertionResults.length > 0 && (
          <div>
            <h5 className="text-[10px] text-white/45 uppercase tracking-wider mb-1.5">
              Assertions
            </h5>
            <ul className="space-y-1">
              {result.assertionResults.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {a.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span className="text-white/70 leading-relaxed">
                    {a.assertion}
                    {a.note ? (
                      <span className="text-white/40"> — {a.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CodePanel title="Args" value={result.args ?? {}} empty="No args" />
          <CodePanel
            title="Response"
            value={result.response}
            empty="No response"
          />
        </div>
      </div>
    </details>
  )
}

function ProjectBugs({
  bugs,
  deletingBugId,
  onStatusChange,
  onDeleteBug,
}: {
  bugs: McpProjectBug[]
  deletingBugId: string | null
  onStatusChange: (id: string, status: string) => void
  onDeleteBug: (bug: McpProjectBug) => void
}) {
  return (
    <section
      id="project-bugs"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5 scroll-mt-6"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-medium text-white">Project bugs</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {bugs.length} bug{bugs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {bugs.map((bug) => {
          const toolName = getBugToolName(bug)
          return (
            <div
              key={bug._id}
              className="rounded-lg border border-red-500/20 bg-red-500/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <h4 className="text-base font-semibold text-white truncate">
                      {toolName}
                    </h4>
                    <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                      {bug.severity}
                    </span>
                    <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                      {bug.status ?? "open"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-red-300">
                    {bug.title}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {bug.category}
                    {bug.testCaseName ? ` · ${bug.testCaseName}` : ""}
                  </p>
                  {bug.description && (
                    <p className="text-xs text-white/65 mt-2">
                      {bug.description}
                    </p>
                  )}
                  {bug.evidence && (
                    <p className="text-xs text-white/45 mt-2">
                      Evidence: {bug.evidence}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => onStatusChange(bug._id, "fixed")}
                    disabled={bug.status === "fixed"}
                  >
                    Mark fixed
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-white/35 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => onDeleteBug(bug)}
                    disabled={deletingBugId === bug._id}
                    title="Delete bug"
                  >
                    {deletingBugId === bug._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function McpDocCard({
  doc,
  openBugCount,
  deleting,
  qaRun,
  qaRunning,
  qaLimited,
  onRunQa,
  onDelete,
  embedded = false,
}: {
  doc: McpDoc
  openBugCount: number
  deleting: boolean
  qaRun: McpQaRunResponse | null
  qaRunning: boolean
  qaLimited: boolean
  onRunQa: () => void
  onDelete: () => void
  embedded?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isOpen = embedded || expanded
  const args = doc.arguments ?? []
  const examples = doc.examples ?? []
  const risks = doc.risks ?? []
  const qaResults = (qaRun?.results ?? []).filter((r) => r.toolName === doc.toolName)
  const responseToShow = doc.sampleResponse ?? doc.responseExample
  const hasResponseToShow = responseToShow !== undefined && responseToShow !== null
  const hasRawResponse =
    doc.rawToolResponse !== undefined && doc.rawToolResponse !== null
  const hasResponseSchema =
    doc.responseSchema !== undefined && doc.responseSchema !== null

  return (
    <article className={embedded ? "" : "rounded-xl border border-white/10 bg-white/[0.03]"}>
      {!embedded && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-medium text-white truncate">
                {doc.toolName}
              </h3>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  openBugCount > 0
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-white/5 text-white/45"
              )}
              >
                {openBugCount} open bug{openBugCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
          )}
        </button>
      )}

      {isOpen && (
        <div className={embedded ? "px-3 pb-3" : "px-5 pb-5 border-t border-white/10"}>
          <div className="flex items-start justify-between gap-4 pt-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {doc.title && doc.title !== doc.toolName && (
                  <h3 className="text-base font-medium text-white truncate">
                    {doc.title}
                  </h3>
                )}
                {doc.transport && (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50">
                    {doc.transport}
                  </span>
                )}
                {doc.responseVerified === true &&
                  doc.responseStatus === "final" && (
                    <span className="rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
                      Final response
                    </span>
                  )}
              </div>
              <p className="text-xs text-blue-300 mt-1">{doc.toolName}</p>
          {doc.summary && (
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              {doc.summary}
            </p>
          )}
          {doc.responseVerified === false &&
            doc.responseStatus === "unverified" && (
              <div className="mt-3 inline-flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Response unverified
                  {doc.responseError ? `: ${doc.responseError}` : ""}
                </span>
              </div>
            )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunQa}
          disabled={qaRunning || qaLimited}
          className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5 shrink-0"
        >
          {qaRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          )}
          Run QA
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-white/35 hover:text-red-300 hover:bg-red-500/10 shrink-0"
          onClick={onDelete}
          disabled={deleting || !doc._id}
          title="Delete doc"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
          </div>

      {(doc.serverName || doc.serverUrl) && (
        <div className="mt-4">
          <InfoBlock title="Server">
            {doc.serverName && <p>{doc.serverName}</p>}
            {doc.serverUrl && <p className="text-white/40 break-all">{doc.serverUrl}</p>}
          </InfoBlock>
        </div>
      )}

      {doc.description && (
        <InfoBlock title="Description" className="mt-3">
          <p className="leading-relaxed">{doc.description}</p>
        </InfoBlock>
      )}

      {doc.sampleArgs && Object.keys(doc.sampleArgs).length > 0 && (
        <JsonBlock title="Sample args" value={doc.sampleArgs} />
      )}

      {hasResponseToShow && (
        <CollapsibleJsonBlock title="Tool response" value={responseToShow} />
      )}

      {hasResponseSchema && (
        <CollapsibleJsonBlock title="Response schema" value={doc.responseSchema} />
      )}

      {hasRawResponse && (
        <CollapsibleJsonBlock
          title="Raw MCP response"
          value={doc.rawToolResponse}
        />
      )}

      {qaRun && (
        <McpQaPanel summary={qaRun.summary} results={qaResults} />
      )}

      <div className="mt-3">
        <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">
          Arguments
        </h4>
        {args.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2">Type</th>
                  <th className="text-left font-medium px-3 py-2">Required</th>
                  <th className="text-left font-medium px-3 py-2">Default</th>
                  <th className="text-left font-medium px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {args.map((arg) => (
                  <tr key={arg.name}>
                    <td className="px-3 py-2 text-white/80">{arg.name}</td>
                    <td className="px-3 py-2 text-white/60">{arg.type}</td>
                    <td className="px-3 py-2 text-white/60">
                      {arg.required ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2 text-white/50">
                      {formatValue(arg.default)}
                    </td>
                    <td className="px-3 py-2 text-white/60 min-w-56">
                      {arg.description || "None"}
                      {arg.enum?.length ? (
                        <span className="block text-white/35 mt-1">
                          Enum: {formatValue(arg.enum)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-white/40 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            No arguments documented.
          </p>
        )}
      </div>

      {examples.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Examples
          </h4>
          <div className="space-y-2">
            {examples.map((example, index) => (
              <details
                key={`${example.title ?? "example"}-${index}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
                  <p className="text-sm font-medium text-white/80">
                    {example.title || `Example ${index + 1}`}
                  </p>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/35 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/10 p-3">
                  {example.prompt && (
                    <p className="text-sm text-white/60">{example.prompt}</p>
                  )}
                  {example.args && Object.keys(example.args).length > 0 && (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-black/20 px-3 py-2 text-xs text-white/60">
                      {JSON.stringify(example.args, null, 2)}
                    </pre>
                  )}
                  {example.expectedResult && (
                    <p className="text-xs text-white/40 mt-2">
                      Expected: {example.expectedResult}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {doc.responseNotes && (
        <InfoBlock title="Response notes" className="mt-3">
          <p className="leading-relaxed">{doc.responseNotes}</p>
        </InfoBlock>
      )}

      {risks.length > 0 && (
        <InfoBlock title="Risks" className="mt-3">
          <ul className="space-y-1">
            {risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </InfoBlock>
      )}
        </div>
      )}
    </article>
  )
}

function McpQaPanel({
  summary,
  results,
}: {
  summary: NonNullable<McpQaRunResponse["summary"]> | undefined
  results: NonNullable<McpQaRunResponse["results"]>
}) {
  const safeSummary =
    summary ?? {
      total: results.length,
      passed: results.filter((result) => result.verdict === "pass").length,
      failed: results.filter((result) => result.verdict === "fail").length,
      warned: results.filter((result) => result.verdict === "warn").length,
      bugs: results.filter((result) => result.verdict === "fail").length,
    }

  return (
    <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="text-xs text-white/40 uppercase tracking-wider">
          QA Run
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 font-mono">
            {safeSummary.passed}/{safeSummary.total} passed
          </span>
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-mono",
              safeSummary.bugs > 0
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            )}
          >
            {safeSummary.bugs} bug{safeSummary.bugs === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-sm text-white/40">No QA results for this tool.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((result, index) => (
            <QaResultCard key={`${result.name}-${index}`} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}

function QaResultCard({ result }: { result: McpQaResult }) {
  const verdict = (result.verdict ?? "unknown").toLowerCase()
  const isFail = verdict === "fail"
  const isWarn = verdict === "warn"
  const isPass = verdict === "pass"
  const accent = isFail
    ? "border-red-500/25"
    : isWarn
    ? "border-yellow-500/25"
    : isPass
    ? "border-green-500/20"
    : "border-white/10"
  const verdictPill = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider",
    isFail
      ? "bg-red-500/10 text-red-300"
      : isWarn
      ? "bg-yellow-500/10 text-yellow-200"
      : isPass
      ? "bg-green-500/10 text-green-300"
      : "bg-white/5 text-white/50"
  )
  const bug =
    result.bug && typeof result.bug === "object"
      ? (result.bug as McpQaBug)
      : null
  const latency = result.execution?.latencyMs
  const error = result.execution?.error
  const response = result.execution?.response

  return (
    <details className={cn("group rounded-lg border bg-white/[0.02]", accent)} open={isFail}>
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isFail ? (
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              ) : isWarn ? (
                <AlertTriangle className="h-4 w-4 text-yellow-300 shrink-0" />
              ) : isPass ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              ) : null}
              <p className="text-sm font-medium text-white truncate">
                {result.name}
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
                {result.category}
              </span>
              {result.toolName && (
                <span className="text-[11px] text-white/45 font-mono truncate">
                  {result.toolName}
                </span>
              )}
              {typeof latency === "number" && (
                <span className="text-[11px] text-white/40 font-mono">
                  {latency}ms
                </span>
              )}
            </div>
          </div>
          <span className={verdictPill}>{verdict}</span>
        </div>
      </summary>

      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
        {result.reasoning && (
          <div>
            <h5 className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
              Why
            </h5>
            <p className="text-sm text-white/75 leading-relaxed">
              {result.reasoning}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2">
            <h5 className="text-[10px] text-red-300/80 uppercase tracking-wider mb-1">
              Error
            </h5>
            <p className="text-sm text-red-200 leading-relaxed">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CodePanel title="Args" value={result.args ?? {}} empty="No args" />
          <CodePanel title="Response" value={response} empty="No response" />
        </div>

        {bug && <BugCard bug={bug} />}
      </div>
    </details>
  )
}

function BugCard({ bug }: { bug: McpQaBug }) {
  const severity = (bug.severity ?? "").toLowerCase()
  const severityClass =
    severity === "critical" || severity === "high"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : severity === "medium"
      ? "border-orange-500/35 bg-orange-500/10 text-orange-200"
      : severity === "low"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
      : "border-white/15 bg-white/5 text-white/60"

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <h5 className="text-sm font-semibold text-red-200 truncate">
            {bug.title || "Bug"}
          </h5>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {bug.severity && (
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                severityClass
              )}
            >
              {bug.severity}
            </span>
          )}
          {bug.category && (
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
              {bug.category}
            </span>
          )}
        </div>
      </div>
      {bug.description && (
        <p className="mt-2 text-sm text-white/75 leading-relaxed">
          {bug.description}
        </p>
      )}
      {bug.recommendation && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <h6 className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
            Recommendation
          </h6>
          <p className="text-sm text-white/75 leading-relaxed">
            {bug.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}

function CodePanel({
  title,
  value,
  empty,
}: {
  title: string
  value: unknown
  empty?: string
}) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0)
  return (
    <div className="rounded-md border border-white/10 bg-black/20">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <h5 className="text-[10px] text-white/45 uppercase tracking-wider">
          {title}
        </h5>
      </div>
      {isEmpty ? (
        <p className="px-3 py-3 text-xs text-white/35 italic">
          {empty ?? "—"}
        </p>
      ) : (
        <pre className="overflow-x-auto px-3 py-2.5 text-xs text-white/70 leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  )
}

function InfoBlock({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/[0.02] p-3", className)}>
      <h4 className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
        {title}
      </h4>
      <div className="text-sm text-white/60">{children}</div>
    </div>
  )
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="mt-3">
      <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">
        {title}
      </h4>
      <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/65">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function CollapsibleJsonBlock({
  title,
  value,
}: {
  title: string
  value: unknown
}) {
  return (
    <details className="group mt-3 rounded-lg border border-white/10 bg-white/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <h4 className="text-xs text-white/40 uppercase tracking-wider">
          {title}
        </h4>
        <ChevronDown className="h-4 w-4 text-white/35 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 p-3">
        <pre className="max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/65">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </details>
  )
}
