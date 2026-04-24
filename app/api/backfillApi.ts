import { useCallback, useEffect, useRef, useState } from "react"
import { getAuthToken } from "~/auth"

export type BackfillState = "pending" | "running" | "completed" | "failed"

export interface BackfillJobStatus {
  status: BackfillState
  filesFound: number
  filesProcessed: number
  filesSkipped: number
  filesCached: number
  endpointsDetected: number
  zombieDocsRemoved: number
  tokensInput: number
  tokensOutput: number
  model: string
  error?: string
}

export interface StartBackfillPayload {
  installationId: number | string
  owner: string
  repo: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""
const POLL_INTERVAL_MS = 2000

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function startBackfill(
  payload: StartBackfillPayload
): Promise<{ jobId: string; status: BackfillState }> {
  const res = await fetch(`${BASE_URL}/api/github/docs/backfill`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Failed to start backfill (${res.status})`)
  }
  return res.json()
}

export async function getBackfillStatus(jobId: string): Promise<BackfillJobStatus> {
  const res = await fetch(`${BASE_URL}/api/github/docs/backfill/${jobId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to fetch backfill status (${res.status})`)
  return res.json()
}

const EMPTY_STATUS: BackfillJobStatus = {
  status: "pending",
  filesFound: 0,
  filesProcessed: 0,
  filesSkipped: 0,
  filesCached: 0,
  endpointsDetected: 0,
  zombieDocsRemoved: 0,
  tokensInput: 0,
  tokensOutput: 0,
  model: "",
}

export function useBackfillJob() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<BackfillJobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const poll = useCallback(
    async (id: string) => {
      if (cancelledRef.current) return
      try {
        const s = await getBackfillStatus(id)
        if (cancelledRef.current) return
        setStatus(s)
        if (s.status === "completed" || s.status === "failed") {
          clearTimer()
          if (s.status === "failed" && s.error) setError(s.error)
          return
        }
        timerRef.current = window.setTimeout(() => poll(id), POLL_INTERVAL_MS)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Polling failed")
        clearTimer()
      }
    },
    [clearTimer]
  )

  const start = useCallback(
    async (payload: StartBackfillPayload) => {
      clearTimer()
      cancelledRef.current = false
      setError(null)
      setStatus(null)
      setStarting(true)
      try {
        const { jobId: id, status: initialStatus } = await startBackfill(payload)
        setJobId(id)
        setStatus({ ...EMPTY_STATUS, status: initialStatus ?? "pending" })
        void poll(id)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start backfill")
      } finally {
        setStarting(false)
      }
    },
    [clearTimer, poll]
  )

  const reset = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    setJobId(null)
    setStatus(null)
    setError(null)
    setStarting(false)
  }, [clearTimer])

  useEffect(() => () => {
    cancelledRef.current = true
    clearTimer()
  }, [clearTimer])

  return { jobId, status, error, starting, start, reset }
}

const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
}

export function estimateCost(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number | null {
  const prices = PRICING_PER_MTOK[model]
  if (!prices) return null
  return (tokensInput * prices.input + tokensOutput * prices.output) / 1_000_000
}
