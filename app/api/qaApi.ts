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

export interface ProjectGithubLink {
  owner?: string
  repo?: string
  specPath?: string
  installationId?: number
  defaultBranch?: string
  lastSyncedAt?: string
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
  github?: ProjectGithubLink
  updatedAt?: string
}

// One spec file found in a connected repo.
export interface SpecCandidate {
  path: string
  sha: string
  size: number
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

  // Connected-repo flow: scan a repo for spec files matching the name the
  // user typed. Returns the candidates so the user confirms the right file.
  const discoverGithubSpec = async (payload: {
    installationId: number
    owner: string
    repo: string
    filename: string
  }): Promise<SpecCandidate[]> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/qa/projects/github/discover`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Scan failed (${res.status})`)
        return []
      }
      const data = (await res.json()) as { candidates: SpecCandidate[] }
      return data.candidates ?? []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
      return []
    } finally {
      setLoading(false)
    }
  }

  // Import a confirmed spec file from the repo → creates/updates the project
  // and stamps the GitHub link so it can be re-synced.
  const importGithubSpec = async (payload: {
    installationId: number
    owner: string
    repo: string
    specPath: string
    projectId?: string
  }): Promise<ImportResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/qa/projects/github/import`, {
        method: "POST",
        body: JSON.stringify(payload),
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

  // "Sync" button: re-fetch the linked spec from the repo and re-import it.
  const syncGithubSpec = async (
    projectId: string
  ): Promise<ImportResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/qa/projects/${projectId}/sync`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Sync failed (${res.status})`)
        return null
      }
      return (await res.json()) as ImportResult
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
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

  // Set (or clear) a custom happy-path body for one endpoint. Pass null/{} to
  // clear it and fall back to schema-driven generation.
  const saveDocBody = async (
    docId: string,
    exampleBody: unknown
  ): Promise<Doc | null> => {
    setError(null)
    const res = await apiFetch(`/api/qa/docs/${docId}/body`, {
      method: "PUT",
      body: JSON.stringify({ exampleBody }),
    })
    if (!res.ok) {
      setError(`Failed to save custom body (${res.status})`)
      return null
    }
    return (await res.json()) as Doc
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
    discoverGithubSpec,
    importGithubSpec,
    syncGithubSpec,
    listProjects,
    getProjectDocs,
    saveDocBody,
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
