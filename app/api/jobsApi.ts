import { apiFetch } from "~/utils/api"

// Long work (suite runs, bug hunts) no longer holds the HTTP request open: the
// server answers with a job id and the work continues in the background. That is
// what lets a customer start several at once.
//
// This waits for one, so the call sites that used to await a result still get a
// result and keep working. A page that wants to show progress can use
// `getJob` directly instead.

export interface Job<T = unknown> {
  _id: string
  kind: string
  status: "pending" | "running" | "success" | "failed"
  target?: Record<string, unknown>
  result?: T | null
  error?: string
}

export async function getJob<T>(jobId: string): Promise<Job<T>> {
  const res = await apiFetch(`/api/jobs/${jobId}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Could not read the job (${res.status})`)
  return (await res.json()) as Job<T>
}

/** Everything this workspace is running, and how many it may run at once. */
export async function getRunningJobs() {
  const res = await apiFetch("/api/jobs/running", { cache: "no-store" })
  if (!res.ok) return { running: [], limit: 1 }
  return (await res.json()) as {
    running: { _id: string; kind: string; target?: Record<string, unknown> }[]
    limit: number
  }
}

/**
 * Wait for a job and return its result.
 *
 * Polls every 2s with no deadline of its own: a bug hunt on a slow API can take
 * minutes, and a timeout here would report a failure for work that is still
 * running fine. The server decides when a job is over.
 */
export async function waitForJob<T>(
  jobId: string,
  { intervalMs = 2000, onTick }: { intervalMs?: number; onTick?: (job: Job<T>) => void } = {}
): Promise<T> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getJob<T>(jobId)
    onTick?.(job)
    if (job.status === "success") return (job.result ?? null) as T
    if (job.status === "failed") throw new Error(job.error || "The run failed.")
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

/**
 * Start-and-wait for the endpoints that answer 202 { jobId }.
 *
 * Accepts the old shape too: if a route still answers with the result itself,
 * that result is returned unchanged — so this can be adopted one endpoint at a
 * time without a flag day.
 */
export async function runAsJob<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let message = text
    try {
      message = JSON.parse(text)?.message || text
    } catch {
      /* keep the raw text */
    }
    throw new Error(message || `Request failed (${res.status})`)
  }
  const body = text ? JSON.parse(text) : {}
  if (body?.jobId) return waitForJob<T>(body.jobId)
  return body as T
}
