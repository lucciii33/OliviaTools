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
  serverName: string
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
  name?: string
  toolName?: string
  title?: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface ListMcpToolsPayload {
  config: McpServerConfig
}

export interface ListMcpToolsResponse {
  tools: McpTool[]
}

export interface GenerateMcpDocsPayload {
  config: McpServerConfig
  save: boolean
  sampleArgsByTool?: Record<string, Record<string, unknown>>
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

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with ${res.status}`
    throw new Error(message)
  }
  return data as T
}

export async function generateMcpDocs(payload: GenerateMcpDocsPayload) {
  const res = await apiFetch("/api/mcp-lab/docs/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return readJson<GenerateMcpDocsResponse>(res)
}

export async function listMcpTools(payload: ListMcpToolsPayload) {
  const res = await apiFetch("/api/mcp-lab/tools", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return readJson<ListMcpToolsResponse>(res)
}

export async function listMcpDocs(params: {
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
