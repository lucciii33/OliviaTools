import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { Sparkles } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { registerApi } from "~/api/authApi"

export default function Register() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get("token")?.trim()

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    pais: "",
    edad: "" as number | "",
    terms: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user && !inviteToken) return <Navigate to="/dashboard" replace />

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value =
      e.target.type === "checkbox"
        ? e.target.checked
        : e.target.name === "edad"
          ? e.target.value === ""
            ? ""
            : e.target.valueAsNumber
          : e.target.value
    setForm((prev) => ({ ...prev, [e.target.name]: value }))
  }

  function validatePassword(password: string) {
    if (password.length < 9) return "Password must be at least 9 characters."
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter."
    if (!/[0-9]/.test(password)) return "Password must contain at least one number."
    if (!/[!@#$%^&*]/.test(password)) {
      return "Password must contain at least one symbol: ! @ # $ % ^ & *."
    }
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const passwordError = validatePassword(form.password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (typeof form.edad !== "number" || !Number.isFinite(form.edad) || form.edad < 1) {
      setError("Age must be a valid number.")
      return
    }
    if (!form.terms) {
      setError("You must accept the terms to create an account.")
      return
    }
    setLoading(true)
    try {
      await registerApi({
        ...form,
        ...(inviteToken ? { inviteToken } : {}),
      })
      navigate(
        inviteToken
          ? `/login?token=${encodeURIComponent(inviteToken)}`
          : "/login",
        { replace: true }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2 mb-8 text-white/70 hover:text-white transition-colors">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <span className="font-semibold text-sm">Olivia Tool</span>
      </Link>

      <Card className="w-full max-w-md bg-white/5 border-white/10 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription className="text-white/50">
            {inviteToken
              ? "Create your account to join the invited workspace."
              : "Create a private workspace for your APIs and MCP servers."}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Country</label>
                <Input
                  name="pais"
                  placeholder="Spain"
                  value={form.pais}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Age</label>
                <Input
                  name="edad"
                  type="number"
                  min={1}
                  placeholder="28"
                  value={form.edad}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-white/60">
              <input
                name="terms"
                type="checkbox"
                checked={form.terms}
                onChange={handleChange}
                required
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10"
              />
              <span>I accept the terms and workspace membership rules.</span>
            </label>

            {error && (
              <p className="whitespace-pre-line text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
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
