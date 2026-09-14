import { useState } from "react"
import { getAuthToken } from "~/auth"

export interface Installation {
  installationId: number
  owner: string
  repo: string
  fullName?: string
  accountType?: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export interface RemovedRepo {
  installationId: number
  owner: string
  repo: string
  fullName?: string
  removedAt?: string
}

export function useInstallationsApi() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const getInstallations = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/installations`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setInstallations(data)
    } catch {
      setError("Error loading installations")
    } finally {
      setLoading(false)
    }
  }

  // Force a re-read of the repo list from GitHub, then show the result.
  //
  // The list normally stays current via the installation_repositories webhook.
  // This is for when it didn't: an org approval whose webhook never landed
  // leaves a stale list that no amount of reloading the page can fix, because
  // the staleness is in our database, not in the browser.
  const syncInstallations = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/installations/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setInstallations(data.repos ?? [])
      return true
    } catch {
      setError("Error refreshing repositories")
      return false
    } finally {
      setSyncing(false)
    }
  }

  const disconnectInstallation = async (installationId: number | string) => {
    setDisconnecting(true)
    try {
      const res = await fetch(`${BASE_URL}/api/installations/${installationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      return true
    } catch {
      return false
    } finally {
      setDisconnecting(false)
    }
  }

  // Remove ONE repo from Olivia: GitHub access + everything stored for it. The
  // connection and the other repos stay. `authRequired` means the user has to
  // sign in with GitHub once — GitHub only lets a user remove a repo.
  const removeRepo = async (
    installationId: number | string,
    repo: string,
    deleteMcpProjects: boolean
  ): Promise<
    | { ok: true; mcpProjectsDeleted: number }
    | { authRequired: true }
    | { error: string }
  > => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/installations/${installationId}/repos/${encodeURIComponent(repo)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deleteMcpProjects }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (res.status === 409 && body?.code === "GITHUB_AUTH_REQUIRED") {
        return { authRequired: true }
      }
      if (!res.ok) return { error: body?.message || "Could not remove the repo." }
      return { ok: true, mcpProjectsDeleted: body?.mcpProjectsDeleted ?? 0 }
    } catch {
      return { error: "Could not remove the repo." }
    }
  }

  // Repos removed inside Olivia (they can be reconnected, empty).
  const getRemovedRepos = async (): Promise<RemovedRepo[]> => {
    try {
      const res = await fetch(`${BASE_URL}/api/installations/removed`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }

  const restoreRepo = async (
    installationId: number | string,
    repo: string
  ): Promise<{ ok: true } | { error: string }> => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/installations/${installationId}/repos/${encodeURIComponent(repo)}/restore`,
        { method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` } }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { error: body?.message || "Could not reconnect the repo." }
      return { ok: true }
    } catch {
      return { error: "Could not reconnect the repo." }
    }
  }

  return {
    removeRepo,
    getRemovedRepos,
    restoreRepo,
    installations,
    loading,
    error,
    getInstallations,
    syncInstallations,
    syncing,
    disconnectInstallation,
    disconnecting,
  }
}
