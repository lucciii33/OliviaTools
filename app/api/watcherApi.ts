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
  actions: { regenerateDocs: boolean; generateTests: boolean }
  lastRun?: {
    at: string | null
    status: string
    newEndpoints: number
    testsCreated: number
  }
  updatedAt?: string
}

export interface WatcherRunEndpoint {
  docId: string
  method: string
  path: string
  testsCreated: number
  testError: string
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
