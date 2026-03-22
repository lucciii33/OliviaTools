import { createContext, useContext, useState, type ReactNode } from "react"
import { type AuthUser, getAuthUser, setAuthUser, removeAuthUser } from "~/auth"

interface AuthContextValue {
  user: AuthUser | null
  login: (data: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())

  const login = (data: AuthUser) => {
    setAuthUser(data)
    setUser(data)
  }

  const logout = () => {
    removeAuthUser()
    setUser(null)
  }

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
