import { useState } from "react"
import { apiFetch } from "~/utils/api"
import type { Doc } from "./docsApi"

export type QaAuthType = "none" | "bearer" | "apiKey" | "basic" | "custom" | "oauth2_client_credentials"

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

export type QaTestGroup = "happy" | "sad" | "boundary" | "security" | "chain"

export interface QaExecution {
  name: string
  group: QaTestGroup
  category: string
  rationale: string
  expectedStatus: number[]
  // Present on suite executions — undefined on single-endpoint runs
  stepIndex?: number
  targetMethod?: string
  targetPath?: string
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

export type BugStatus = "open" | "fixed" | "ignored"

export interface BugRecord {
  _id: string
  severity: string
  category: string
  title: string
  description: string
  testCaseName: string
  expectedStatus: number[]
  request: { method: string; url: string; body: unknown }
  response: { status: number; body: unknown }
  status: BugStatus
  createdAt: string
}

export interface QaRunSummary {
  _id: string
  totalTests: number
  bugCount: number
  createdAt: string
}

export interface SuiteRun {
  runId: string
  suiteRunId: string
  _id?: string
  section: string
  totalTests: number
  bugCount: number
  executions: QaExecution[]
  createdAt?: string
}

export type DetectedAuth = { type: QaAuthType; headerName: string }

export interface ImportResult {
  projectId: string
  title: string
  version: string
  detectedAuth: DetectedAuth
  totalEndpoints: number
  created: number
  updated: number
  baseUrl: string | null
  autoFilledVariables: string[]
  requiredVariables: string[]
  endpoints: { method: string; path: string; section: string }[]
}

export interface ProjectAuth {
  type: QaAuthType
  headerName: string
  username: string
  valueMasked: string
  passwordMasked: string
}

export interface ProjectVariable {
  key: string
  value: string
  secret: boolean
}

export interface ApiProject {
  _id: string
  name: string
  title: string
  version: string
  source: "manual" | "github"
  baseUrl: string
  auth: ProjectAuth
  variables: ProjectVariable[]
  updatedAt?: string
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

  // Paste a spec → creates/updates an API project + its endpoints.
  const importProjectSpec = async (
    specText: string,
    projectId?: string
  ): Promise<ImportResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/qa/projects/import`, {
        method: "POST",
        body: JSON.stringify({ specText, projectId }),
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Import failed (${res.status})`)
        return null
      }
      return (await res.json()) as ImportResult
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  const listProjects = async (): Promise<ApiProject[]> => {
    setError(null)
    const res = await apiFetch(`/api/qa/projects`)
    if (!res.ok) {
      setError(`Failed to load projects (${res.status})`)
      return []
    }
    return (await res.json()) as ApiProject[]
  }

  const getProjectDocs = async (
    projectId: string
  ): Promise<{ project: ApiProject; docs: Doc[] } | null> => {
    setError(null)
    const res = await apiFetch(`/api/qa/projects/${projectId}/docs`)
    if (!res.ok) {
      setError(`Failed to load endpoints (${res.status})`)
      return null
    }
    return (await res.json()) as { project: ApiProject; docs: Doc[] }
  }

  const saveProjectAuth = async (
    projectId: string,
    payload: {
      baseUrl: string
      auth: QaAuthConfig
      variables?: ProjectVariable[]
    }
  ): Promise<ApiProject | null> => {
    setError(null)
    const res = await apiFetch(`/api/qa/projects/${projectId}/auth`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setError(`Failed to save (${res.status})`)
      return null
    }
    return (await res.json()) as ApiProject
  }

  // Fetch the Postman collection for one whole section of a project.
  const getSectionCollection = async (
    projectId: string,
    section: string
  ): Promise<unknown | null> => {
    setError(null)
    const res = await apiFetch(
      `/api/qa/projects/${projectId}/section-collection?section=${encodeURIComponent(
        section
      )}`
    )
    if (!res.ok) {
      setError(`Failed to build collection (${res.status})`)
      return null
    }
    return await res.json()
  }

  // Saved bugs for one endpoint (doc).
  const getBugs = async (docId: string): Promise<BugRecord[]> => {
    setError(null)
    const res = await apiFetch(`/api/qa/bugs/${docId}`)
    if (!res.ok) {
      setError(`Failed to load bugs (${res.status})`)
      return []
    }
    return (await res.json()) as BugRecord[]
  }

  const setBugStatus = async (
    bugId: string,
    status: BugStatus
  ): Promise<boolean> => {
    const res = await apiFetch(`/api/qa/bugs/${bugId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    return res.ok
  }

  const deleteBug = async (bugId: string): Promise<boolean> => {
    const res = await apiFetch(`/api/qa/bugs/${bugId}`, { method: "DELETE" })
    return res.ok
  }

  const deleteProject = async (projectId: string): Promise<boolean> => {
    const res = await apiFetch(`/api/qa/projects/${projectId}`, { method: "DELETE" })
    return res.ok
  }

  const runSuiteQa = async (projectId: string, section: string): Promise<SuiteRun | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(
        `/api/qa/projects/${projectId}/suite/${encodeURIComponent(section)}`,
        { method: "POST" }
      )
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Suite run failed (${res.status})`)
        return null
      }
      return (await res.json()) as SuiteRun
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suite run failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  const getSuiteRuns = async (projectId: string, section?: string): Promise<QaRunSummary[]> => {
    const qs = section ? `?section=${encodeURIComponent(section)}` : ""
    const res = await apiFetch(`/api/qa/projects/${projectId}/suite-runs${qs}`)
    if (!res.ok) return []
    return (await res.json()) as QaRunSummary[]
  }

  const getSuiteRun = async (id: string): Promise<SuiteRun | null> => {
    const res = await apiFetch(`/api/qa/suite-run/${id}`)
    if (!res.ok) return null
    return (await res.json()) as SuiteRun
  }

  return {
    loading,
    error,
    getConfig,
    saveConfig,
    runQa,
    getRuns,
    getRun,
    importProjectSpec,
    listProjects,
    getProjectDocs,
    saveProjectAuth,
    getSectionCollection,
    getBugs,
    setBugStatus,
    deleteBug,
    deleteProject,
    runSuiteQa,
    getSuiteRuns,
    getSuiteRun,
  }
}
