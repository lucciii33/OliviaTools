import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  type AuthUser,
  clearWorkspaceCache,
  getAuthUser,
  setAuthUser,
  removeAuthUser,
} from "~/auth"
import { apiFetch } from "~/utils/api"

interface AuthContextValue {
  user: AuthUser | null
  login: (data: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())

  const login = (data: AuthUser) => {
    clearWorkspaceCache()
    setAuthUser(data)
    setUser(data)
  }

  const logout = () => {
    removeAuthUser()
    setUser(null)
  }

  // localStorage only tells us a token *exists*, not whether it's still valid.
  // On mount, validate the stored session against the backend so an expired
  // token doesn't leave the user stranded on the dashboard. apiFetch's 401
  // handler clears the session and redirects to /login when the token is
  // expired/invalid; a network error leaves the session untouched.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiFetch("/api/user/me/settings", { cache: "no-store" })
      .then((res) => {
        if (!cancelled && res.status === 401) setUser(null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
