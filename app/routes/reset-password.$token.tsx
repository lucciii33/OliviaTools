import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "~/components/ui/button"
import { PasswordInput } from "~/components/ui/password-input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { resetPasswordApi } from "~/api/authApi"

interface PasswordChecks {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
  symbol: boolean
}

function evaluatePassword(password: string): PasswordChecks {
  return {
    length: password.length >= 12 && password.length <= 128,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(password),
  }
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-emerald-300" : "text-white/40"}>
      {ok ? "✓" : "○"} {label}
    </li>
  )
}

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const checks = useMemo(() => evaluatePassword(password), [password])
  const allOk = Object.values(checks).every(Boolean)
  const matches = password.length > 0 && password === confirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError("Missing reset token.")
      return
    }
    if (!allOk) {
      setError("Password doesn't meet the requirements.")
      return
    }
    if (!matches) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    try {
      await resetPasswordApi(token, password)
      setDone(true)
      setTimeout(() => navigate("/login", { replace: true }), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed")
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

      <Card className="w-full max-w-sm bg-white/5 border-white/10 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription className="text-white/50">
            Choose a strong password. It can&apos;t be one of your last 5.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-300 mb-2" />
                <p className="text-sm font-medium text-emerald-200">
                  Password updated
                </p>
                <p className="mt-1 text-xs text-emerald-300/70">
                  Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Confirm new password</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </div>

              <ul className="space-y-0.5 text-[11px]">
                <Check ok={checks.length} label="12–128 characters" />
                <Check ok={checks.upper} label="Uppercase letter" />
                <Check ok={checks.lower} label="Lowercase letter" />
                <Check ok={checks.number} label="Number" />
                <Check ok={checks.symbol} label="Symbol" />
                <Check ok={matches} label="Both fields match" />
              </ul>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !allOk || !matches}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading ? "Updating..." : "Update password"}
              </Button>

              <p className="text-center text-xs text-white/40">
                <Link to="/login" className="text-white/60 hover:text-white underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
