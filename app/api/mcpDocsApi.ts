import { apiFetch } from "~/utils/api"

export type McpTransport = "http" | "sse" | "stdio"

export interface McpAuthConfig {
  bearerToken?: string
  apiKey?: string
  apiKeyHeader?: string
  headers?: Record<string, string>
}

export type McpServerConfig =
  | ({
      name: string
      transport: "http" | "sse"
      url: string
    } & McpAuthConfig)
  | ({
      name: string
      transport: "stdio"
      command: string
      args?: string[]
    } & McpAuthConfig)

export interface McpArgument {
  name: string
  type: string
  required: boolean
  description?: string
  default?: unknown
  enum?: unknown[]
}

export interface McpExample {
  title?: string
  prompt?: string
  args?: Record<string, unknown>
  expectedResult?: string
}

export interface McpDoc {
  _id?: string
  projectId?: string
  serverName?: string
  serverUrl?: string
  transport?: McpTransport
  toolName: string
  title?: string
  summary?: string
  description?: string
  inputSchema?: Record<string, unknown>
  arguments?: McpArgument[]
  sampleArgs?: Record<string, unknown>
  sampleResponse?: unknown
  rawToolResponse?: unknown
  responseExample?: unknown
  responseSchema?: Record<string, unknown>
  responseNotes?: string
  examples?: McpExample[]
  risks?: string[]
  responseVerified?: boolean
  responseStatus?: "final" | "unverified" | string
  responseError?: string | null
}

export interface McpToolResponse {
  responseVerified?: boolean
  responseStatus?: "final" | "unverified" | string
  sampleArgs?: Record<string, unknown>
  response?: unknown
  rawToolResponse?: unknown
  responseSchema?: Record<string, unknown>
  responseError?: string | null
}

export interface McpTool {
  _id?: string
  name?: string
  toolName?: string
  title?: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpQaRunPayload {
  projectId: string
  toolName?: string
  save: boolean
  maxCasesPerTool: number
  sampleArgsByTool?: Record<string, Record<string, unknown>>
}

export interface McpSmokeCase {
  name: string
  expectedTool: string
  expectedArgs?: Record<string, unknown>
  assertions?: string[]
}

export interface McpSmokeSuite {
  _id: string
  projectId?: string
  kind?: string
  name?: string
  cases: McpSmokeCase[]
  generatedBy?: { provider?: string; model?: string }
}

export interface McpSmokeResult {
  caseName: string
  toolName: string
  status: "ok" | "broken" | string
  latencyMs?: number
  error?: string | null
  args?: Record<string, unknown>
  response?: unknown
  assertions?: string[]
}

export interface McpSmokeRunResponse {
  suiteId: string
  projectId: string
  summary: { total: number; ok: number; broken: number }
  results: McpSmokeResult[]
}

export interface McpSmokeGenerateResponse {
  suite: McpSmokeSuite
  generatedBy?: { provider?: string; model?: string }
}

export interface McpQaBug {
  toolName?: string
  tool?: McpTool | string
  toolId?: string
  testCaseName: string
  severity: string
  category: string
  title: string
  description?: string
  expected?: string
  actual?: string
  evidence?: string
  recommendation?: string
  args?: Record<string, unknown>
  response?: unknown
  rawToolResponse?: unknown
}

export interface McpQaResult {
  name: string
  category: string
  toolName: string
  args?: Record<string, unknown>
  execution?: {
    status?: string
    error?: string | null
    latencyMs?: number
    response?: unknown
    rawToolResponse?: unknown
    responseSchema?: Record<string, unknown>
  }
  verdict?: "pass" | "fail" | "warn" | string
  bug?: McpQaBug | Record<string, unknown> | null
  reasoning?: string
}

export interface McpQaRunResponse {
  runId?: string
  _id?: string
  id?: string
  serverName?: string
  serverUrl?: string
  transport?: McpTransport | string
  createdAt?: string
  generatedBy?: { provider?: string; model?: string }
  summary?: {
    total: number
    passed: number
    failed: number
    warned: number
    bugs: number
  }
  cases?: unknown[]
  results?: McpQaResult[]
  bugs?: McpQaBug[]
}

export interface McpQaRunListItem {
  _id?: string
  id?: string
  runId?: string
  serverName?: string
  serverUrl?: string
  transport?: McpTransport | string
  createdAt?: string
  generatedBy?: { provider?: string; model?: string }
  summary?: {
    total?: number
    passed?: number
    failed?: number
    warned?: number
    bugs?: number
  }
}

export interface GenerateMcpDocsResponse {
  docs: McpDoc[]
  toolResponses?: Record<string, McpToolResponse>
  savedCount?: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  curated?: boolean
  generationError?: string | null
}

export interface McpProject {
  _id: string
  projectName: string
  name?: string
  config: McpServerConfig
  createdAt?: string
  updatedAt?: string
}

export interface McpProjectBug extends McpQaBug {
  _id: string
  toolId?: string
  status?: string
  projectId?: string
  createdAt?: string
  updatedAt?: string
}

export interface McpProjectDetailResponse {
  project: McpProject
  tools: McpTool[]
  docs: McpDoc[]
  bugs: McpProjectBug[]
}

export interface CreateMcpProjectPayload {
  projectName: string
  config: McpServerConfig
  save: boolean
  sampleArgsByTool?: Record<string, Record<string, unknown>>
}

export interface CreateMcpProjectResponse extends McpProjectDetailResponse {
  projectId: string
  docsResult?: GenerateMcpDocsResponse
}

export type McpTrialLimitAction =
  | "projects"
  | "docs_generate"
  | "qa_run"
  | "smoke_generate"
  | "smoke_run"

export class McpTrialLimitError extends Error {
  action?: McpTrialLimitAction | string
  limit?: number
  used?: number

  constructor({
    message,
    action,
    limit,
    used,
  }: {
    message: string
    action?: McpTrialLimitAction | string
    limit?: number
    used?: number
  }) {
    super(message)
    this.name = "McpTrialLimitError"
    this.action = action
    this.limit = limit
    this.used = used
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with ${res.status}`
    if (res.status === 403 && data && typeof data === "object") {
      throw new McpTrialLimitError({
        message,
        action: "action" in data ? String(data.action) : undefined,
        limit: "limit" in data && typeof data.limit === "number" ? data.limit : undefined,
        used: "used" in data && typeof data.used === "number" ? data.used : undefined,
      })
    }
    throw new Error(message)
  }
  return data as T
}

export async function listMcpProjects() {
  const res = await apiFetch("/api/mcp-lab/projects", { cache: "no-store" })
  return readJson<{ projects: McpProject[] }>(res)
}

export async function createMcpProject(payload: CreateMcpProjectPayload) {
  const res = await apiFetch("/api/mcp-lab/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return readJson<CreateMcpProjectResponse>(res)
}

export async function getMcpProject(id: string) {
  const res = await apiFetch(`/api/mcp-lab/projects/${id}`, {
    cache: "no-store",
  })
  return readJson<McpProjectDetailResponse>(res)
}

export async function getMcpProjectTools(id: string) {
  const res = await apiFetch(`/api/mcp-lab/projects/${id}/tools`, {
    cache: "no-store",
  })
  return readJson<{ tools: McpTool[] }>(res)
}

export async function runMcpQa(payload: McpQaRunPayload) {
  const res = await apiFetch("/api/mcp-lab/qa/run", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return readJson<McpQaRunResponse>(res)
}

export async function listMcpQaRuns() {
  const res = await apiFetch("/api/mcp-lab/qa/runs", { cache: "no-store" })
  return readJson<{ runs: McpQaRunListItem[] }>(res)
}

export async function getMcpQaRun(id: string) {
  const res = await apiFetch(`/api/mcp-lab/qa/runs/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
  return readJson<{ run: McpQaRunResponse }>(res)
}

export async function deleteMcpQaRun(id: string) {
  const res = await apiFetch(`/api/mcp-lab/qa/runs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return readJson<{ ok?: boolean; message?: string }>(res)
}

export async function getMcpSmoke(projectId: string) {
  const res = await apiFetch(`/api/mcp-lab/projects/${projectId}/smoke`, {
    cache: "no-store",
  })
  return readJson<{ suite: McpSmokeSuite | null }>(res)
}

export async function generateMcpSmoke(
  projectId: string,
  payload: { provider?: "anthropic" | "openai"; model?: string } = {}
) {
  const res = await apiFetch(
    `/api/mcp-lab/projects/${projectId}/smoke/generate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
  return readJson<McpSmokeGenerateResponse>(res)
}

export async function runMcpSmoke(projectId: string) {
  const res = await apiFetch(
    `/api/mcp-lab/projects/${projectId}/smoke/run`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  )
  return readJson<McpSmokeRunResponse>(res)
}

export async function listMcpBugs(projectId: string) {
  const query = new URLSearchParams({ projectId })
  const res = await apiFetch(`/api/mcp-lab/bugs?${query.toString()}`, {
    cache: "no-store",
  })
  return readJson<{ bugs: McpProjectBug[] }>(res)
}

export async function updateMcpBugStatus(id: string, status: string) {
  const res = await apiFetch(`/api/mcp-lab/bugs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return readJson<{ bug?: McpProjectBug; ok?: boolean }>(res)
}

export async function deleteMcpBug(id: string) {
  const res = await apiFetch(`/api/mcp-lab/bugs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return readJson<{ ok?: boolean; message?: string }>(res)
}

export async function listMcpDocs(params: {
  projectId?: string
  serverName?: string
  serverUrl?: string
  toolName?: string
  limit?: number
} = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value))
  })
  const res = await apiFetch(
    `/api/mcp-lab/docs${query.size ? `?${query.toString()}` : ""}`,
    { cache: "no-store" }
  )
  return readJson<{ docs: McpDoc[] }>(res)
}

export async function deleteMcpDoc(id: string) {
  const res = await apiFetch(`/api/mcp-lab/docs/${id}`, { method: "DELETE" })
  return readJson<{ ok: boolean }>(res)
}
