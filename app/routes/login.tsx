import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { loginApi, loginVerifyTwoFactorApi, isTwoFactorChallenge, googleLoginApi } from "~/api/authApi"
import { GoogleSignInButton } from "~/components/GoogleSignInButton"

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get("token")?.trim()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState("")

  if (user) {
    return (
      <Navigate
        to={
          inviteToken
            ? `/accept-invite?token=${encodeURIComponent(inviteToken)}`
            : "/dashboard"
        }
        replace
      />
    )
  }

  function redirectAfterLogin() {
    navigate(
      inviteToken
        ? `/accept-invite?token=${encodeURIComponent(inviteToken)}`
        : "/dashboard",
      { replace: true }
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await loginApi({ email, password })
      if (isTwoFactorChallenge(data)) {
        setTwoFactorToken(data.twoFactorToken)
        return
      }
      login(data)
      redirectAfterLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle(credential: string) {
    setError(null)
    setLoading(true)
    try {
      const data = await googleLoginApi(credential)
      login(data)
      redirectAfterLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2FA(e: FormEvent) {
    e.preventDefault()
    if (!twoFactorToken) return
    setError(null)
    setLoading(true)
    try {
      const data = await loginVerifyTwoFactorApi({
        twoFactorToken,
        code: twoFactorCode.trim(),
      })
      login(data)
      redirectAfterLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : "2FA verification failed")
    } finally {
      setLoading(false)
    }
  }

  function cancelTwoFactor() {
    setTwoFactorToken(null)
    setTwoFactorCode("")
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2 mb-8 text-white/70 hover:text-white transition-colors">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <span className="font-semibold text-sm">Olivia Tool</span>
      </Link>

      <Card className="w-full max-w-sm bg-white/5 border-white/10 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            {twoFactorToken ? (
              <>
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                Two-factor authentication
              </>
            ) : (
              "Welcome back"
            )}
          </CardTitle>
          <CardDescription className="text-white/50">
            {twoFactorToken
              ? "Enter the 6-digit code from your authenticator app, or a backup code."
              : inviteToken
                ? "Log in to accept your workspace invite"
                : "Log in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!twoFactorToken && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="mb-4 space-y-3">
              <GoogleSignInButton onCredential={handleGoogle} />
              <div className="flex items-center gap-3 text-[11px] text-white/30">
                <div className="h-px flex-1 bg-white/10" />
                or
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          )}
          {!twoFactorToken ? (
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
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Authentication code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  autoFocus
                  maxLength={32}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 tracking-widest text-center"
                />
                <p className="text-[10px] text-white/40">
                  Lost your device? Use one of your backup codes instead.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || twoFactorCode.trim().length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelTwoFactor}
                className="w-full text-white/60 hover:text-white hover:bg-white/10"
              >
                Use a different account
              </Button>
            </form>
          )}

          {!twoFactorToken && (
            <div className="mt-4 space-y-2 text-center text-xs text-white/40">
              <p>
                <Link
                  to="/forgot-password"
                  className="text-white/60 hover:text-white underline"
                >
                  Forgot your password?
                </Link>
              </p>
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  to={inviteToken ? `/signup?token=${encodeURIComponent(inviteToken)}` : "/signup"}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Register
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
