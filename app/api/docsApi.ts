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

export interface Doc {
  _id: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  description: string
  requestBody: DocParam[]
  queryParams: DocParam[]
  responses: DocResponse[]
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

  const getDocs = async (repo?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = repo
        ? `?repo=${encodeURIComponent(repo)}&_=${Date.now()}`
        : `?_=${Date.now()}`
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

  return { docs, loading, error, getDocs, deleteDoc }
}
