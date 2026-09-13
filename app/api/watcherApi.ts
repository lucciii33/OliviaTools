import { apiFetch } from "~/utils/api"

// Watchers: a standing watch on a connected repo. When something lands on the
// watched branch, that repo's docs are regenerated, endpoints that weren't
// there before are flagged, and QA is generated for them.

export interface Watcher {
  _id: string
  owner: string
  repo: string
  branch: string
  enabled: boolean
  installationId: number
  actions: {
    regenerateDocs: boolean
    generateTests: boolean
    runTests: boolean
    runQa: boolean
  }
  lastRun?: {
    at: string | null
    status: string
    newEndpoints: number
    testsCreated: number
    testsPassed: number
    testsFailed: number
    bugsFound: number
  }
  updatedAt?: string
}

export interface WatcherRunEndpoint {
  docId: string
  method: string
  path: string
  // Saved suites written for this endpoint.
  testsCreated: number
  testsPassed: number
  testsFailed: number
  testError: string
  runError: string
  // Bug hunter — a different thing from the suites: throwaway cases run to find
  // what is actually wrong with the endpoint that just shipped.
  bugsFound: number
  qaRunId: string
  qaError: string
}

export interface WatcherRun {
  _id: string
  owner: string
  repo: string
  trigger: {
    kind: string
    prNumber: number | null
    prTitle: string
    author: string
    branch: string
  }
  status: "running" | "success" | "failed"
  // Existing endpoints whose params or responses changed in this merge.
  editedEndpoints?: { docId: string; method: string; path: string; changes: string[] }[]
  newEndpoints: WatcherRunEndpoint[]
  docsBefore: number
  docsAfter: number
  error: string
  startedAt: string
  finishedAt: string | null
}

export interface NewEndpoint {
  _id: string
  method: string
  path: string
  owner: string
  repo: string
  firstSeenAt: string | null
  firstSeenPr: number | null
}

// The backend answers errors as {message}; surface that sentence, not raw JSON.
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      msg = JSON.parse(text)?.message || text
    } catch {
      /* keep the raw text */
    }
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}

export async function listWatchers() {
  return readJson<Watcher[]>(
    await apiFetch("/api/watchers", { cache: "no-store" })
  )
}

export async function createWatcher(payload: {
  owner: string
  repo: string
  branch?: string
}) {
  return readJson<Watcher>(
    await apiFetch("/api/watchers", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  )
}

export async function updateWatcher(
  id: string,
  payload: {
    enabled?: boolean
    branch?: string
    actions?: { regenerateDocs?: boolean; generateTests?: boolean }
  }
) {
  return readJson<Watcher>(
    await apiFetch(`/api/watchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  )
}

export async function deleteWatcher(id: string) {
  return readJson<{ success: boolean }>(
    await apiFetch(`/api/watchers/${id}`, { method: "DELETE" })
  )
}

/** Runs the same work a merge triggers. Returns as soon as it has started. */
export async function runWatcherNow(id: string) {
  return readJson<{ started: boolean }>(
    await apiFetch(`/api/watchers/${id}/run`, { method: "POST" })
  )
}

export async function listWatcherRuns(watcherId?: string) {
  const url = watcherId
    ? `/api/watchers/${watcherId}/runs`
    : "/api/watchers/runs/all"
  return readJson<WatcherRun[]>(await apiFetch(url, { cache: "no-store" }))
}

export async function listNewEndpoints() {
  return readJson<NewEndpoint[]>(
    await apiFetch("/api/watchers/new-endpoints/all", { cache: "no-store" })
  )
}

/** Clear the "new" flag once reviewed. No ids → clears everything flagged. */
export async function acknowledgeNewEndpoints(docIds?: string[]) {
  return readJson<{ cleared: number }>(
    await apiFetch("/api/watchers/new-endpoints/acknowledge", {
      method: "POST",
      body: JSON.stringify(docIds?.length ? { docIds } : {}),
    })
  )
}

// ---- MCP watchers ----
//
// Same trigger as the API watchers (a merge into the watched branch), different
// source of truth: MCP tools come from the LIVE server, which is still running
// the old build when the merge lands. So a run waits — re-reading the server's
// tools on an interval — until the new ones appear or the wait runs out.

export interface McpWatcher {
  _id: string
  mcpProjectId: string
  projectName: string
  owner: string
  repo: string
  branch: string
  enabled: boolean
  installationId: number
  actions: { generateTests: boolean; runTests: boolean; runQa: boolean }
  wait: { intervalSec: number; maxMinutes: number }
  lastRun?: {
    at: string | null
    status: string
    newTools: number
    testsCreated: number
    bugsFound: number
  }
}

export interface McpWatcherRunTool {
  name: string
  testsCreated: number
  testsPassed: number
  testsFailed: number
  testError: string
  bugsFound: number
  qaRunId: string
  qaError: string
}

export interface McpWatcherRun {
  _id: string
  projectName: string
  owner: string
  repo: string
  trigger: {
    kind: string
    prNumber: number | null
    prTitle: string
    author: string
    branch: string
  }
  status: "pending" | "running" | "success" | "failed"
  // How many times the live server was asked before the new tools showed up.
  checks: number
  note: string
  toolsAfter: number
  // Existing tools whose schema changed in this merge.
  editedTools?: { name: string; changes: string[] }[]
  newTools: McpWatcherRunTool[]
  error: string
  startedAt: string
  finishedAt: string | null
}

export interface NewTool {
  _id: string
  name: string
  projectId: string
  projectName: string
  firstSeenAt: string | null
  firstSeenPr: number | null
}

export async function listMcpWatchers() {
  return readJson<McpWatcher[]>(
    await apiFetch("/api/mcp-watchers", { cache: "no-store" })
  )
}

export async function createMcpWatcher(payload: {
  mcpProjectId: string
  owner: string
  repo: string
  branch?: string
}) {
  return readJson<McpWatcher>(
    await apiFetch("/api/mcp-watchers", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  )
}

export async function updateMcpWatcher(
  id: string,
  payload: {
    enabled?: boolean
    branch?: string
    actions?: Partial<McpWatcher["actions"]>
    wait?: Partial<McpWatcher["wait"]>
  }
) {
  return readJson<McpWatcher>(
    await apiFetch(`/api/mcp-watchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  )
}

export async function deleteMcpWatcher(id: string) {
  return readJson<{ success: boolean }>(
    await apiFetch(`/api/mcp-watchers/${id}`, { method: "DELETE" })
  )
}

export async function listMcpWatcherRuns() {
  return readJson<McpWatcherRun[]>(
    await apiFetch("/api/mcp-watchers/runs/all", { cache: "no-store" })
  )
}

export async function listNewTools() {
  return readJson<NewTool[]>(
    await apiFetch("/api/mcp-watchers/new-tools/all", { cache: "no-store" })
  )
}

export async function acknowledgeNewTools(toolIds?: string[]) {
  return readJson<{ cleared: number }>(
    await apiFetch("/api/mcp-watchers/new-tools/acknowledge", {
      method: "POST",
      body: JSON.stringify(toolIds?.length ? { toolIds } : {}),
    })
  )
}
