import { getAuthToken } from "~/auth"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  return fetch(`${BASE_URL}${path}`, { ...options, headers })
}
