import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router"
import { ArrowLeft, HeartHandshake, KeyRound, MailPlus, MessageSquare, RefreshCw, Sparkles, Trash2, UserMinus } from "lucide-react"
import {
  cancelCompanyInvite,
  deleteSlackConfig,
  getCompany,
  getCompanyMembers,
  getSlackConfig,
  inviteCompanyMember,
  removeCompanyMember,
  saveSlackConfig,
  type Company,
  type CompanyMember,
  type PendingInvite,
  type SlackConfig,
} from "~/api/companyApi"
import {
  deleteAnthropicKey,
  getMySettings,
  saveAnthropicKey,
  type UserSettings,
} from "~/api/userSettingsApi"
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
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("")
  const [keySaving, setKeySaving] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [keySuccess, setKeySuccess] = useState<string | null>(null)
  const [slack, setSlack] = useState<SlackConfig | null>(null)
  const [slackChannelInput, setSlackChannelInput] = useState("")
  const [slackTokenInput, setSlackTokenInput] = useState("")
  const [slackSaving, setSlackSaving] = useState(false)
  const [slackError, setSlackError] = useState<string | null>(null)
  const [slackSuccess, setSlackSuccess] = useState<string | null>(null)

  const isOwner = user?.role === "owner"

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [nextCompany, nextMembers, nextSettings, nextSlack] = await Promise.all([
        getCompany(),
        getCompanyMembers(),
        getMySettings().catch(() => null),
        getSlackConfig().catch(() => null),
      ])
      setCompany(nextCompany)
      setMembers(nextMembers.members ?? [])
      setPendingInvites(nextMembers.pendingInvites ?? [])
      if (nextSettings) setSettings(nextSettings)
      if (nextSlack) setSlack(nextSlack)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveKey(e: FormEvent) {
    e.preventDefault()
    const trimmed = anthropicKeyInput.trim()
    if (!trimmed) return
    setKeySaving(true)
    setKeyError(null)
    setKeySuccess(null)
    try {
      const next = await saveAnthropicKey(trimmed)
      setSettings(next)
      setAnthropicKeyInput("")
      setKeySuccess("Your key was saved. Generations will now run on your friend's account.")
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Failed to save key")
    } finally {
      setKeySaving(false)
    }
  }

  async function handleRemoveKey() {
    setKeySaving(true)
    setKeyError(null)
    setKeySuccess(null)
    try {
      const next = await deleteAnthropicKey()
      setSettings(next)
      setKeySuccess("Key removed. Falling back to the default key.")
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Failed to remove key")
    } finally {
      setKeySaving(false)
    }
  }

  async function handleSaveSlack(e: FormEvent) {
    e.preventDefault()
    const channelId = slackChannelInput.trim()
    const botToken = slackTokenInput.trim()
    if (!channelId || !botToken) return
    setSlackSaving(true)
    setSlackError(null)
    setSlackSuccess(null)
    try {
      const next = await saveSlackConfig(channelId, botToken)
      setSlack(next)
      setSlackChannelInput("")
      setSlackTokenInput("")
      setSlackSuccess("Slack notifications saved. Merged PRs to main/dev will post to this channel.")
    } catch (err) {
      setSlackError(err instanceof Error ? err.message : "Failed to save Slack config")
    } finally {
      setSlackSaving(false)
    }
  }

  async function handleRemoveSlack() {
    setSlackSaving(true)
    setSlackError(null)
    setSlackSuccess(null)
    try {
      const next = await deleteSlackConfig()
      setSlack(next)
      setSlackSuccess("Slack config removed.")
    } catch (err) {
      setSlackError(err instanceof Error ? err.message : "Failed to remove Slack config")
    } finally {
      setSlackSaving(false)
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

        <Card className="mt-4 border-white/10 bg-white/[0.03] text-white">
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-cyan-300" />
              I know a friend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/55 leading-relaxed">
              Have a colleague test the product without burning my tokens? Paste
              their Anthropic API key here and all of your doc/QA generations
              will run on their account. If empty, we fall back to the default
              key. The key is encrypted at rest.
            </p>
            {keyError && (
              <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {keyError}
              </p>
            )}
            {keySuccess && (
              <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {keySuccess}
              </p>
            )}
            {settings?.hasAnthropicKey && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="inline-flex items-center gap-2 text-sm text-white/75">
                  <KeyRound className="h-4 w-4 text-cyan-300" />
                  Current key:{" "}
                  <span className="font-mono text-white/55">
                    {settings.anthropicKeyMask || "***"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:bg-white/10 hover:text-white"
                  disabled={keySaving}
                  onClick={() => void handleRemoveKey()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            )}
            <form onSubmit={handleSaveKey} className="space-y-2">
              <label className="text-xs text-white/60">Anthropic API key</label>
              <Input
                type="password"
                value={anthropicKeyInput}
                onChange={(e) => setAnthropicKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-cyan-500/50 font-mono"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={keySaving || !anthropicKeyInput.trim()}
                  className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {keySaving ? "Saving..." : settings?.hasAnthropicKey ? "Replace key" : "Save key"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-4 border-white/10 bg-white/[0.03] text-white">
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-300" />
              Slack notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/55 leading-relaxed">
              When a PR is merged into <span className="font-mono text-white/70">main</span> or{" "}
              <span className="font-mono text-white/70">dev</span>, Olivia will summarize what shipped
              with Claude and post it to your Slack channel. Bot token is encrypted at rest. Only
              the company owner can change these settings.
            </p>
            {!isOwner && (
              <p className="text-xs text-white/40">
                Only owners can configure Slack notifications.
              </p>
            )}
            {slackError && (
              <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {slackError}
              </p>
            )}
            {slackSuccess && (
              <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {slackSuccess}
              </p>
            )}
            {slack?.hasSlackBotToken && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="min-w-0 space-y-0.5 text-sm text-white/75">
                  <div className="inline-flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-300" />
                    Channel:{" "}
                    <span className="font-mono text-white/55">{slack.slackChannelId || "—"}</span>
                  </div>
                  <div className="text-xs text-white/45">
                    Bot token: <span className="font-mono">{slack.slackBotTokenMask || "***"}</span>
                  </div>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:bg-white/10 hover:text-white"
                    disabled={slackSaving}
                    onClick={() => void handleRemoveSlack()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            )}
            <form onSubmit={handleSaveSlack} className="space-y-2" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Slack channel ID</label>
                <Input
                  name="slack-channel-id"
                  value={slackChannelInput}
                  onChange={(e) => setSlackChannelInput(e.target.value)}
                  placeholder="C0123456789"
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  disabled={!isOwner}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/50 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Slack bot token</label>
                <Input
                  type="password"
                  name="slack-bot-token"
                  value={slackTokenInput}
                  onChange={(e) => setSlackTokenInput(e.target.value)}
                  placeholder="xoxb-..."
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  disabled={!isOwner}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/50 font-mono"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !isOwner ||
                    slackSaving ||
                    !slackChannelInput.trim() ||
                    !slackTokenInput.trim()
                  }
                  className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {slackSaving
                    ? "Saving..."
                    : slack?.hasSlackBotToken
                      ? "Replace config"
                      : "Save Slack config"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
