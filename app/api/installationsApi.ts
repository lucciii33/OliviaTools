import { useState } from "react"
import { getAuthToken } from "~/auth"

// An install request waiting on an organisation owner. GitHub does not tell us
// which org was picked on a pending request, so there is no name to show — only
// when it was asked for.
export interface PendingRequest {
  id: string
  requestedAt: string
  githubUsername: string
  linkable: boolean
}

// An installation nobody owns, on a GitHub account this user belongs to. These
// come from installs done straight on GitHub, where nothing identifies the
// requester — claiming is how they reach a workspace.
export interface UnclaimedInstallation {
  installationId: number
  owner: string
  accountType?: string
  repos: string[]
}

export interface Installation {
  installationId: number
  owner: string
  repo: string
  fullName?: string
  accountType?: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export function useInstallationsApi() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [unclaimed, setUnclaimed] = useState<UnclaimedInstallation[]>([])
  const [needsGithubConnect, setNeedsGithubConnect] = useState(false)
  const [claiming, setClaiming] = useState<number | null>(null)

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

  const getPendingRequests = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/installations/pending`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      setPending(await res.json())
    } catch {
      // A pending list that fails to load must not blank the repo list next to
      // it — leave whatever was there and stay quiet.
    }
  }

  const getUnclaimed = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/installations/unclaimed`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setUnclaimed(data.installations ?? [])
      setNeedsGithubConnect(Boolean(data.needsGithubConnect))
    } catch {
      // Same reasoning as the pending list: never let this blank the sidebar.
    }
  }

  const claimInstallation = async (installationId: number) => {
    setClaiming(installationId)
    try {
      const res = await fetch(
        `${BASE_URL}/api/installations/${installationId}/claim`,
        { method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` } }
      )
      if (!res.ok) throw new Error("Request failed")
      await Promise.all([getInstallations(), getUnclaimed()])
      return true
    } catch {
      setError("Could not claim this installation")
      return false
    } finally {
      setClaiming(null)
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

  return {
    installations,
    loading,
    error,
    getInstallations,
    pending,
    getPendingRequests,
    unclaimed,
    needsGithubConnect,
    getUnclaimed,
    claimInstallation,
    claiming,
    syncInstallations,
    syncing,
    disconnectInstallation,
    disconnecting,
  }
}
