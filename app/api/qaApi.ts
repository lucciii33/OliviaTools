import { useState } from "react"
import { apiFetch } from "~/utils/api"

export type QaAuthType = "none" | "bearer" | "apiKey" | "basic" | "custom"

export interface QaAuthConfig {
  type: QaAuthType
  value?: string
  headerName?: string
  username?: string
  password?: string
}

export interface QaConfig {
  baseUrl: string
  auth: QaAuthConfig
  defaultHeaders?: Record<string, string>
}

export type QaTestGroup = "happy" | "sad" | "boundary" | "security"

export interface QaExecution {
  name: string
  group: QaTestGroup
  category: string
  rationale: string
  expectedStatus: number[]
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body: unknown
  }
  response: {
    status: number
    durationMs: number
    body: unknown
    error?: string
  }
  isBug: boolean
  bugTitle?: string
  bugDescription?: string
  bugSeverity?: string
  bugCategory?: string
}

export interface QaRun {
  runId?: string
  _id?: string
  docId?: string
  totalTests: number
  bugCount: number
  executions: QaExecution[]
  postmanCollection?: unknown
  createdAt?: string
}

export interface QaRunSummary {
  _id: string
  totalTests: number
  bugCount: number
  createdAt: string
}

export function useQaApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getConfig = async (
    owner: string,
    repo: string
  ): Promise<QaConfig | null> => {
    setError(null)
    const res = await apiFetch(
      `/api/qa/config/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    )
    if (res.status === 404) return null
    if (!res.ok) {
      setError(`Failed to load config (${res.status})`)
      return null
    }
    return (await res.json()) as QaConfig
  }

  const saveConfig = async (
    owner: string,
    repo: string,
    config: QaConfig
  ): Promise<QaConfig | null> => {
    setError(null)
    const res = await apiFetch(
      `/api/qa/config/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        method: "PUT",
        body: JSON.stringify(config),
      }
    )
    if (!res.ok) {
      setError(`Failed to save config (${res.status})`)
      return null
    }
    return (await res.json()) as QaConfig
  }

  const runQa = async (docId: string): Promise<QaRun | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/qa/find-bugs/${docId}`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Run failed (${res.status})`)
        return null
      }
      return (await res.json()) as QaRun
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  const getRuns = async (docId: string): Promise<QaRunSummary[]> => {
    setError(null)
    const res = await apiFetch(`/api/qa/runs/${docId}`)
    if (!res.ok) {
      setError(`Failed to load runs (${res.status})`)
      return []
    }
    return (await res.json()) as QaRunSummary[]
  }

  const getRun = async (id: string): Promise<QaRun | null> => {
    setError(null)
    const res = await apiFetch(`/api/qa/run/${id}`)
    if (!res.ok) {
      setError(`Failed to load run (${res.status})`)
      return null
    }
    return (await res.json()) as QaRun
  }

  return {
    loading,
    error,
    getConfig,
    saveConfig,
    runQa,
    getRuns,
    getRun,
  }
}
