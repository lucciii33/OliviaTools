import { getAuthToken, removeAuthUser } from "~/auth"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401 && typeof window !== "undefined") {
    removeAuthUser()
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
  }

  return res
}
