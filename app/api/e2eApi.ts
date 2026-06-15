import { useState } from "react"
import { apiFetch } from "~/utils/api"
import { getAuthToken } from "~/auth"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export interface Gherkin {
  feature: string
  scenario: string
  given: string[]
  when: string[]
  then: string[]
}

export type E2eTestKind = "smoke" | "regression" | "bughunt"
export type E2eTestStatus =
  | "draft"
  | "recording"
  | "generating"
  | "passing"
  | "failing"
  | "committed"
  | "error"

export interface E2eTest {
  _id: string
  projectId: string
  name: string
  source: "video" | "recording"
  kind: E2eTestKind
  gherkin: Gherkin
  transcript?: string
  videoUrl?: string
  specCode?: string
  status: E2eTestStatus
  createdAt: string
}

export interface E2eProjectLogin {
  url: string
  username: string
  passwordMasked: string
  usernameSelector: string
  passwordSelector: string
  submitSelector: string
  authReady: boolean
  authSavedAt: string | null
}

export interface E2eProjectGithub {
  owner: string
  repo: string
  branch: string
  testDir: string
}

export interface E2eProject {
  _id: string
  name: string
  title: string
  baseUrl: string
  login: E2eProjectLogin
  github: E2eProjectGithub
  variables: { key: string; value: string; secret: boolean }[]
  updatedAt?: string
}

export interface GenerateFromVideoResult {
  transcript: string
  tests: E2eTest[]
  count: number
}

export function useE2eApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listProjects = async (): Promise<E2eProject[]> => {
    setError(null)
    const res = await apiFetch(`/api/e2e/projects`)
    if (!res.ok) {
      setError(`Failed to load projects (${res.status})`)
      return []
    }
    return (await res.json()) as E2eProject[]
  }

  const createProject = async (payload: {
    name: string
    title?: string
    baseUrl?: string
  }): Promise<E2eProject | null> => {
    setError(null)
    const res = await apiFetch(`/api/e2e/projects`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text()
      setError(body || `Failed to create project (${res.status})`)
      return null
    }
    return (await res.json()) as E2eProject
  }

  const updateProject = async (
    id: string,
    payload: Partial<{
      title: string
      baseUrl: string
      login: Partial<E2eProjectLogin> & { password?: string }
      github: Partial<E2eProjectGithub>
      variables: { key: string; value: string; secret: boolean }[]
    }>
  ): Promise<E2eProject | null> => {
    setError(null)
    const res = await apiFetch(`/api/e2e/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setError(`Failed to save (${res.status})`)
      return null
    }
    return (await res.json()) as E2eProject
  }

  const deleteProject = async (id: string): Promise<boolean> => {
    const res = await apiFetch(`/api/e2e/projects/${id}`, { method: "DELETE" })
    return res.ok
  }

  // Multipart upload — uses raw fetch so the browser sets the multipart
  // boundary itself (apiFetch forces application/json, which would break it).
  const generateFromVideo = async (
    projectId: string,
    file: File
  ): Promise<GenerateFromVideoResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("video", file)
      const token = getAuthToken()
      const res = await fetch(
        `${BASE_URL}/api/e2e/projects/${projectId}/from-video`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        }
      )
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Generation failed (${res.status})`)
        return null
      }
      return (await res.json()) as GenerateFromVideoResult
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  const listTests = async (projectId: string): Promise<E2eTest[]> => {
    setError(null)
    const res = await apiFetch(`/api/e2e/projects/${projectId}/tests`)
    if (!res.ok) {
      setError(`Failed to load tests (${res.status})`)
      return []
    }
    return (await res.json()) as E2eTest[]
  }

  const deleteTest = async (testId: string): Promise<boolean> => {
    const res = await apiFetch(`/api/e2e/tests/${testId}`, { method: "DELETE" })
    return res.ok
  }

  // Feature 2: capture the login session ONCE. Opens the recorder at the login
  // page; the user logs in by hand and the session is saved for the project.
  const recordLogin = async (
    projectId: string
  ): Promise<{ authReady: boolean; authSavedAt: string } | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/e2e/projects/${projectId}/record-login`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Login capture failed (${res.status})`)
        return null
      }
      return (await res.json()) as { authReady: boolean; authSavedAt: string }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login capture failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  // Feature 2: launches the Playwright recorder on the project's baseUrl. The
  // request stays open until the user closes the recorder window, then returns
  // the generated spec.
  const recordTest = async (
    testId: string
  ): Promise<{ specCode: string; status: string } | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/e2e/tests/${testId}/record`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.text()
        setError(body || `Recording failed (${res.status})`)
        return null
      }
      return (await res.json()) as { specCode: string; status: string }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    generateFromVideo,
    listTests,
    recordLogin,
    recordTest,
    deleteTest,
  }
}
