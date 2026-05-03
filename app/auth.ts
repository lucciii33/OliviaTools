const USER_KEY = "user"

export interface AuthUser {
  token: string
  _id: string
  email: string
  firstName: string
  lastName: string
  pais?: string
  edad?: number
  terms?: boolean
  companyId?: string
  role?: "owner" | "member" | string
}

const WORKSPACE_CACHE_KEYS = [
  "mcp-docs-last-config",
  "known-repos",
  "backfill-last-form",
]

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (typeof parsed.token !== "string" || !parsed.token) {
      removeAuthUser()
      return null
    }
    return parsed as AuthUser
  } catch {
    removeAuthUser()
    return null
  }
}

export function getAuthToken(): string | null {
  return getAuthUser()?.token ?? null
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return
  const current = getAuthUser()
  if (
    current &&
    (current._id !== user._id || current.companyId !== user.companyId)
  ) {
    clearWorkspaceCache()
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeAuthUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(USER_KEY)
  clearWorkspaceCache()
}

export function clearWorkspaceCache(): void {
  if (typeof window === "undefined") return
  for (const key of WORKSPACE_CACHE_KEYS) {
    localStorage.removeItem(key)
  }
}
