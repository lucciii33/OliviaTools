import { apiFetch } from "~/utils/api"

export interface UserSettings {
  anthropicKeyMask: string | null
  hasAnthropicKey: boolean
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed with ${res.status}`
    throw new Error(message)
  }
  return data as T
}

export async function getMySettings(): Promise<UserSettings> {
  const res = await apiFetch("/api/user/me/settings")
  return readJson<UserSettings>(res)
}

export async function saveAnthropicKey(apiKey: string): Promise<UserSettings> {
  const res = await apiFetch("/api/user/me/anthropic-key", {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  })
  return readJson<UserSettings>(res)
}

export async function deleteAnthropicKey(): Promise<UserSettings> {
  const res = await apiFetch("/api/user/me/anthropic-key", {
    method: "DELETE",
  })
  return readJson<UserSettings>(res)
}
