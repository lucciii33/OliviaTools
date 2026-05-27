import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { Sparkles, Mail } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { forgotPasswordApi } from "~/api/authApi"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await forgotPasswordApi(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
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
          <CardTitle className="text-xl">Forgot password</CardTitle>
          <CardDescription className="text-white/50">
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <Mail className="mx-auto h-8 w-8 text-emerald-300 mb-2" />
                <p className="text-sm font-medium text-emerald-200">
                  Check your email
                </p>
                <p className="mt-1 text-xs text-emerald-300/70">
                  If an account exists for <span className="font-mono">{email}</span>, a reset link has been sent. It expires in 10 minutes.
                </p>
              </div>
              <Link
                to="/login"
                className="block text-center text-xs text-white/60 hover:text-white underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
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
                disabled={loading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <p className="text-center text-xs text-white/40">
                Remembered it?{" "}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
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
