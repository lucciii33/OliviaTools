import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router"
import { ArrowLeft, MailPlus, RefreshCw, Sparkles, Trash2, UserMinus } from "lucide-react"
import {
  cancelCompanyInvite,
  getCompany,
  getCompanyMembers,
  inviteCompanyMember,
  removeCompanyMember,
  type Company,
  type CompanyMember,
  type PendingInvite,
} from "~/api/companyApi"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { useAuth } from "~/context/AuthContext"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function Workspace() {
  const { user } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isOwner = user?.role === "owner"

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [nextCompany, nextMembers] = await Promise.all([
        getCompany(),
        getCompanyMembers(),
      ])
      setCompany(nextCompany)
      setMembers(nextMembers.members ?? [])
      setPendingInvites(nextMembers.pendingInvites ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.companyId])

  if (!user) return <Navigate to="/login" replace />

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await inviteCompanyMember(email.trim())
      setEmail("")
      setInviteOpen(false)
      setSuccess("Invitation sent.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(member: CompanyMember) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await removeCompanyMember(member._id)
      setSuccess("Member removed.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(invite: PendingInvite) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await cancelCompanyInvite(invite._id)
      setSuccess("Invitation cancelled.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel invite")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">Olivia Tool</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
              Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {company?.name ?? "Workspace members"}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Manage members, roles, and pending invitations for this workspace.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            {isOwner && (
              <Button
                size="sm"
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                onClick={() => setInviteOpen(true)}
              >
                <MailPlus className="h-3.5 w-3.5" />
                Invite member
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-white/40">Loading members...</p>}
              {!loading && members.length === 0 && (
                <p className="text-sm text-white/40">No members found.</p>
              )}
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}
                    </p>
                    <p className="truncate text-xs text-white/45">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/60">
                      {member.role}
                    </span>
                    {isOwner && member._id !== user._id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={saving}
                        onClick={() => void handleRemove(member)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle className="text-base">Pending invites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-white/40">Loading invites...</p>}
              {!loading && pendingInvites.length === 0 && (
                <p className="text-sm text-white/40">No pending invites.</p>
              )}
              {pendingInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{invite.email}</p>
                      <p className="text-xs text-white/45">
                        Expires {formatDate(invite.expiresAt)}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-white/45 hover:bg-white/10 hover:text-white"
                        disabled={saving}
                        onClick={() => void handleCancel(invite)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-white/10 bg-[#101217] text-white">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription className="text-white/50">
              Send an invitation to join this workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/60">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                required
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-white/60 hover:bg-white/10 hover:text-white"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                {saving ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
