import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Server,
  Trash2,
  WandSparkles,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { useAuth } from "~/context/AuthContext"
import {
  deleteMcpDoc,
  generateMcpDocs,
  listMcpDocs,
  listMcpTools,
  type GenerateMcpDocsPayload,
  type McpDoc,
  type McpServerConfig,
  type McpTool,
  type McpTransport,
} from "~/api/mcpDocsApi"
import { cn } from "~/lib/utils"

const fieldClass =
  "bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
const selectClass =
  "h-8 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm text-white outline-none transition-colors focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/50"
const textareaClass =
  "min-h-20 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/50"

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
  const [docs, setDocs] = useState<McpDoc[]>([])
  const [name, setName] = useState("mi-mcp-local")
  const [transport, setTransport] = useState<McpTransport>("http")
  const [url, setUrl] = useState("http://localhost:3001/mcp")
  const [command, setCommand] = useState("node")
  const [args, setArgs] = useState("./server.js")
  const [bearerToken, setBearerToken] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiKeyHeader, setApiKeyHeader] = useState("")
  const [headers, setHeaders] = useState("")
  const [tools, setTools] = useState<McpTool[]>([])
  const [sampleArgsByTool, setSampleArgsByTool] = useState<
    Record<string, Record<string, string>>
  >({})
  const [save, setSave] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isStdio = transport === "stdio"
  const hasTools = tools.length > 0

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    refreshDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  const docCount = useMemo(() => docs.length, [docs])

  if (!user) return null

  async function refreshDocs() {
    setRefreshing(true)
    setError(null)
    try {
      const data = await listMcpDocs()
      setDocs(data.docs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading MCP docs")
    } finally {
      setRefreshing(false)
    }
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

  async function handleConnect(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const config = buildConfig()
    if (!config) return

    setConnecting(true)
    try {
      const data = await listMcpTools({ config })
      const nextTools = data.tools ?? []
      setTools(nextTools)
      setSampleArgsByTool(
        nextTools.reduce<Record<string, Record<string, string>>>((acc, tool) => {
          const toolName = getToolName(tool)
          const fields = getSchemaProperties(tool.inputSchema)
          acc[toolName] = fields.reduce<Record<string, string>>((fieldAcc, field) => {
            fieldAcc[field.name] = ""
            return fieldAcc
          }, {})
          return acc
        }, {})
      )
      setSuccess(
        `Connected ${nextTools.length} tool${nextTools.length === 1 ? "" : "s"}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting MCP tools")
    } finally {
      setConnecting(false)
    }
  }

  async function handleGenerate() {
    setError(null)
    setSuccess(null)

    const config = buildConfig()
    if (!config) return

    const payload: GenerateMcpDocsPayload = {
      config,
      save,
      sampleArgsByTool: tools.reduce<Record<string, Record<string, unknown>>>(
        (acc, tool) => {
          const toolName = getToolName(tool)
          const values = sampleArgsByTool[toolName] ?? {}
          acc[toolName] = Object.entries(values).reduce<Record<string, unknown>>(
            (valueAcc, [key, value]) => {
              valueAcc[key] = parseSampleValue(value)
              return valueAcc
            },
            {}
          )
          return acc
        },
        {}
      ),
    }

    setGenerating(true)
    try {
      const data = await generateMcpDocs(payload)
      const toolResponses = data.toolResponses ?? {}
      setDocs(
        (data.docs ?? []).map((doc) => {
          const toolResponse = toolResponses[doc.toolName]
          if (!toolResponse) return doc
          return {
            ...doc,
            sampleArgs: doc.sampleArgs ?? toolResponse.sampleArgs,
            sampleResponse: doc.sampleResponse ?? toolResponse.response,
            rawToolResponse: doc.rawToolResponse ?? toolResponse.rawToolResponse,
            responseSchema: doc.responseSchema ?? toolResponse.responseSchema,
            responseVerified:
              doc.responseVerified ?? toolResponse.responseVerified,
            responseStatus: doc.responseStatus ?? toolResponse.responseStatus,
            responseError: doc.responseError ?? toolResponse.responseError,
          }
        })
      )
      setSuccess(
        `Generated ${data.docs?.length ?? 0} doc${
          data.docs?.length === 1 ? "" : "s"
        }${data.savedCount !== undefined ? `, saved ${data.savedCount}` : ""}`
      )
      if (data.generationError) setError(data.generationError)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating MCP docs")
    } finally {
      setGenerating(false)
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
            to="/docs"
            className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            API Docs
          </Link>
          <Link
            to="/mcp-docs"
            className="w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md bg-white/10 text-white transition-colors"
          >
            <span>MCP Docs</span>
          </Link>
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
              Configure an MCP server, generate docs, and review saved tools.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/40 hover:text-white hover:bg-white/10"
            onClick={refreshDocs}
            disabled={refreshing || connecting || generating}
            title="Refresh docs"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-4 items-start">
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
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60">Server name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="mi-mcp-local"
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
                        placeholder="node"
                        required
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/60">Args</label>
                      <textarea
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        placeholder="./server.js"
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
                      placeholder="http://localhost:3001/mcp"
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
                  disabled={connecting || generating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Server className="h-4 w-4" />
                  )}
                  {connecting ? "Connecting..." : "Connect tools"}
                </Button>
              </form>

              {hasTools && (
                <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">Sample args</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      Add real values for tools that need inputs.
                    </p>
                  </div>
                  {tools.map((tool) => {
                    const toolName = getToolName(tool)
                    const fields = getSchemaProperties(tool.inputSchema)
                    return (
                      <div
                        key={toolName}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                      >
                        <p className="text-sm font-medium text-white/80">
                          {toolName}
                        </p>
                        {tool.description && (
                          <p className="text-xs text-white/45 mt-1">
                            {tool.description}
                          </p>
                        )}
                        {fields.length === 0 ? (
                          <p className="text-xs text-white/35 mt-2">
                            No args required.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {fields.map((field) => (
                              <div key={field.name} className="space-y-1.5">
                                <label className="text-xs text-white/60">
                                  {field.name}
                                  {field.required ? " *" : ""}
                                </label>
                                <Input
                                  value={sampleArgsByTool[toolName]?.[field.name] ?? ""}
                                  onChange={(e) =>
                                    updateSampleArg(
                                      toolName,
                                      field.name,
                                      e.target.value
                                    )
                                  }
                                  placeholder={field.type}
                                  className={fieldClass}
                                />
                                {field.description && (
                                  <p className="text-xs text-white/35">
                                    {field.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    disabled={generating || connecting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                    onClick={handleGenerate}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <WandSparkles className="h-4 w-4" />
                    )}
                    {generating ? "Generating..." : "Generate docs"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-white">Generated tools</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {docCount} doc{docCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {refreshing && docs.length === 0 && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            )}

            {!refreshing && docs.length === 0 && (
              <EmptyState onGenerateFocus={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            )}

            {docs.length > 0 && (
              <div className="space-y-3">
                {docs.map((doc) => (
                  <McpDocCard
                    key={doc._id ?? doc.toolName}
                    doc={doc}
                    deleting={deletingId === doc._id}
                    onDelete={() => handleDelete(doc)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
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

function McpDocCard({
  doc,
  deleting,
  onDelete,
}: {
  doc: McpDoc
  deleting: boolean
  onDelete: () => void
}) {
  const args = doc.arguments ?? []
  const examples = doc.examples ?? []
  const risks = doc.risks ?? []
  const responseToShow = doc.sampleResponse ?? doc.responseExample
  const hasResponseToShow = responseToShow !== undefined && responseToShow !== null
  const hasRawResponse =
    doc.rawToolResponse !== undefined && doc.rawToolResponse !== null
  const hasResponseSchema =
    doc.responseSchema !== undefined && doc.responseSchema !== null

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-white truncate">
              {doc.title || doc.toolName}
            </h3>
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
        <JsonBlock title="Tool response" value={responseToShow} />
      )}

      {hasResponseSchema && (
        <JsonBlock title="Response schema" value={doc.responseSchema} />
      )}

      {hasRawResponse && (
        <JsonBlock title="Raw MCP response" value={doc.rawToolResponse} />
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
              <div
                key={`${example.title ?? "example"}-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <p className="text-sm font-medium text-white/80">
                  {example.title || `Example ${index + 1}`}
                </p>
                {example.prompt && (
                  <p className="text-sm text-white/60 mt-1">{example.prompt}</p>
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
    </article>
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
