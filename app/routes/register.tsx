import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router"
import { BookOpen } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { registerApi } from "~/api/authApi"

export default function Register() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/docs" replace />

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await registerApi(form)
      login(data)
      navigate("/docs", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
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
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription className="text-white/50">
            Start generating docs from your PRs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">First name</label>
                <Input
                  name="firstName"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Last name</label>
                <Input
                  name="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/60">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/60">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
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
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-xs text-white/40 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
