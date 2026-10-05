import { useState } from "react"
import { getAuthToken } from "~/auth"

export interface DocParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface DocResponse {
  status: number
  description: string
  example: unknown
}

// An environment is a branch of a repo with its own docs: `main` is what ships,
// `dev` is what is about to. The tabs on the docs page are these.
export interface DocEnvironment {
  branch: string
  endpoints: number
  updatedAt?: string
}

export interface Doc {
  _id: string
  // The environment (branch) this doc describes.
  branch?: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  section?: string
  // Set by the watcher when this endpoint showed up in a merge that wasn't in
  // the previous scan. Cleared once someone has looked at it.
  isNewEndpoint?: boolean
  firstSeenAt?: string | null
  firstSeenPr?: number | null
  // Set by the watcher when a merge changed this endpoint's params or responses.
  lastEditedAt?: string | null
  lastEditedPr?: number | null
  description: string
  requestBody: DocParam[]
  queryParams: DocParam[]
  responses: DocResponse[]
  // Optional user-provided body the QA generator uses as the happy-path base.
  exampleBody?: unknown
  source?: string
  prNumber?: number
  sourceFile?: string
  sourceSha?: string
  repo: string
  owner: string
  updatedAt?: string
  createdAt?: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export function useDocsApi() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDocs = async (repo?: string, branch?: string) => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ _: String(Date.now()) })
      if (repo) q.set("repo", repo)
      // Without a branch the API returns every environment's endpoints mixed
      // together, which is never what a page wants.
      if (branch) q.set("branch", branch)
      const params = `?${q.toString()}`
      const res = await fetch(`${BASE_URL}/api/docs${params}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error(`Request failed with ${res.status}`)
      const data = await res.json()
      setDocs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading docs")
    } finally {
      setLoading(false)
    }
  }

  const deleteDoc = async (id: string) => {
    await fetch(`${BASE_URL}/api/docs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
    setDocs((prev) => prev.filter((d) => d._id !== id))
  }

  /** The environments this repo has docs for, for the tabs. */
  const getDocEnvironments = async (
    owner: string,
    repo: string
  ): Promise<DocEnvironment[]> => {
    try {
      const q = new URLSearchParams({ owner, repo })
      const res = await fetch(`${BASE_URL}/api/docs/environments?${q.toString()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) return []
      return (await res.json()) as DocEnvironment[]
    } catch {
      return []
    }
  }

  return { docs, loading, error, getDocs, getDocEnvironments, deleteDoc }
}
