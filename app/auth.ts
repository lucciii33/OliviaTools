const USER_KEY = "user"

export interface AuthUser {
  token: string
  _id: string
  email: string
  firstName: string
  lastName: string
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  return getAuthUser()?.token ?? null
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeAuthUser(): void {
  localStorage.removeItem(USER_KEY)
}
