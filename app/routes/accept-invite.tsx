import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ArrowRight, Sparkles } from "lucide-react"
import {
  acceptCompanyInvite,
  getInvitePreview,
  type InvitePreview,
} from "~/api/companyApi"
import { Button, buttonVariants } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { cn } from "~/lib/utils"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function AcceptInvite() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setError("Invalid or expired invitation.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getInvitePreview(token)
      .then((data) => {
        if (!cancelled) setInvite(data)
      })
      .catch(() => {
        if (!cancelled) setError("Invalid or expired invitation.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleAcceptExisting() {
    if (!token) return
    if (!user) {
      navigate(`/login?token=${encodeURIComponent(token)}`)
      return
    }
    setAccepting(true)
    setError(null)
    try {
      const accepted = await acceptCompanyInvite(token)
      login({ ...user, ...accepted, token: accepted.token ?? user.token })
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite")
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 text-white">
      <Link to="/" className="flex items-center gap-2 mb-8 text-white/70 hover:text-white transition-colors">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <span className="font-semibold text-sm">Olivia Tool</span>
      </Link>

      <Card className="w-full max-w-md bg-white/5 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="text-xl">Workspace invitation</CardTitle>
          <CardDescription className="text-white/50">
            Review your invitation before joining the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading && <p className="text-sm text-white/50">Loading invitation...</p>}

          {!loading && error && (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {!loading && invite && (
            <>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm leading-6 text-white/70">
                  You have been invited to join{" "}
                  <span className="font-medium text-white">{invite.company.name}</span>{" "}
                  as <span className="font-medium text-white">{invite.role}</span>.
                </p>
                <p className="mt-2 text-xs text-white/40">
                  Invite for {invite.email} expires {formatDate(invite.expiresAt)}.
                </p>
              </div>

              <div className="grid gap-2">
                <Link
                  to={`/signup?token=${encodeURIComponent(token)}`}
                  onClick={() => {
                    if (user) logout()
                  }}
                  className={cn(
                    buttonVariants(),
                    "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  )}
                >
                  Create new account <ArrowRight className="h-4 w-4" />
                </Link>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
                  disabled={accepting}
                  onClick={() => void handleAcceptExisting()}
                >
                  {accepting ? "Accepting..." : "I already have an account"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
