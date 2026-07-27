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

export function useInstallationsApi() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

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
    disconnectInstallation,
    disconnecting,
  }
}
