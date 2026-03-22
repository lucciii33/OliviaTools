import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router"
import { BookOpen } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { loginApi } from "~/api/authApi"

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/docs" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await loginApi({ email, password })
      login(data)
      navigate("/docs", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2 mb-8 text-white/70 hover:text-white transition-colors">
        <BookOpen className="h-5 w-5 text-blue-400" />
        <span className="font-semibold text-sm">API Docs</span>
      </Link>

      <Card className="w-full max-w-sm bg-white/5 border-white/10 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription className="text-white/50">Log in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/60">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/60">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-white/40 mt-4">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
