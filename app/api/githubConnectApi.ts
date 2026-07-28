import { useState } from "react"
import { getAuthToken } from "~/auth"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export function useGithubConnectLink() {
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getConnectLink = async (): Promise<string | null> => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/github/connect-link`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      const url = data?.url ?? null
      setConnectUrl(url)
      return url
    } catch {
      setConnectUrl(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { connectUrl, loading, getConnectLink }
}
