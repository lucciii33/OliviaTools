import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, LogOut, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "~/components/ui/button"
import {
  clearSimulatedSpend,
  getAdminKey,
  getCompanyUsage,
  listCompanies,
  pingAdmin,
  setAdminKey,
  simulateSpend,
  updateCompanyPlan,
  type AdminCompany,
  type AdminCompanyUsage,
} from "~/api/adminApi"
import { cn } from "~/lib/utils"

// Operator back office: every workspace, what it's spending on Claude this
// month, and its plan — changed by hand until billing exists.
//
// No sidebar and no Olivia session: this page belongs to whoever holds the
// admin key, and it shouldn't look like part of the product.

// "test" is MCP-only — the API side is refused for it (see usageLimitService).
const PLANS = ["free", "test", "mcp", "api", "pro", "enterprise"] as const

function usd(n: number) {
  return `$${(n || 0).toFixed(2)}`
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [keyInput, setKeyInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [usage, setUsage] = useState<AdminCompanyUsage | null>(null)

  async function loadCompanies() {
    setLoading(true)
    setError(null)
    try {
      setCompanies(await listCompanies())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspaces")
    } finally {
      setLoading(false)
    }
  }

  // A stored key is checked before anything is rendered, so a stale one asks
  // for a new key instead of showing an empty page full of errors.
  useEffect(() => {
    if (!getAdminKey()) {
      setChecking(false)
      return
    }
    pingAdmin()
      .then(() => {
        setAuthed(true)
        void loadCompanies()
      })
      .catch(() => setAdminKey(""))
      .finally(() => setChecking(false))
  }, [])

  async function signIn() {
    setError(null)
    setAdminKey(keyInput.trim())
    try {
      await pingAdmin()
      setAuthed(true)
      setKeyInput("")
      await loadCompanies()
    } catch (err) {
      setAdminKey("")
      setError(err instanceof Error ? err.message : "Invalid key")
    }
  }

  async function openUsage(id: string) {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    setUsage(null)
    try {
      setUsage(await getCompanyUsage(id))
    } catch {
      setUsage(null)
    }
  }

  async function save(
    id: string,
    payload: { plan?: string; aiBudgetUsd?: number | null; planNote?: string }
  ) {
    try {
      const updated = await updateCompanyPlan(id, payload)
      setCompanies((prev) =>
        prev.map((c) =>
          c._id === id
            ? {
                ...c,
                plan: updated.plan,
                aiBudgetUsd: updated.aiBudgetUsd,
                planNote: updated.planNote,
              }
            : c
        )
      )
      // The budget shown per row comes from the server's own rules, so re-read
      // rather than recomputing the tier maths in two places.
      await loadCompanies()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save")
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <h1 className="text-base font-semibold">Olivia admin</h1>
          </div>
          <p className="text-xs text-white/40 mb-4">
            Enter the admin key. It stays in this tab only.
          </p>
          <input
            type="password"
            autoFocus
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void signIn()
            }}
            placeholder="Admin key"
            className="w-full bg-white/[0.04] border border-white/10 rounded px-3 py-2 text-sm text-white/85 placeholder:text-white/25 focus:outline-none focus:border-white/25"
          />
          {error && (
            <p className="mt-2 text-xs text-red-300">{error}</p>
          )}
          <Button className="w-full mt-3" onClick={signIn} disabled={!keyInput.trim()}>
            Open
          </Button>
        </div>
      </div>
    )
  }

  const totalSpend = companies.reduce((n, c) => n + c.spentUsd, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <main className="mx-auto max-w-5xl px-5 md:px-8 py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <h1 className="text-lg font-semibold">Workspaces</h1>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {companies.length} workspace{companies.length === 1 ? "" : "s"} ·{" "}
              {usd(totalSpend)} spent on Claude this month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/10"
              onClick={loadCompanies}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/15 text-white/60 gap-1.5"
              onClick={() => {
                setAdminKey("")
                setAuthed(false)
                setCompanies([])
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Lock
            </Button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {loading && companies.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map((c) => (
              <CompanyRow
                key={c._id}
                company={c}
                open={openId === c._id}
                usage={openId === c._id ? usage : null}
                onToggle={() => openUsage(c._id)}
                onSave={(payload) => save(c._id, payload)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function CompanyRow({
  company: c,
  open,
  usage,
  onToggle,
  onSave,
}: {
  company: AdminCompany
  open: boolean
  usage: AdminCompanyUsage | null
  onToggle: () => void
  onSave: (payload: {
    plan?: string
    aiBudgetUsd?: number | null
    planNote?: string
  }) => Promise<void>
}) {
  const [budget, setBudget] = useState(
    c.aiBudgetUsd === null ? "" : String(c.aiBudgetUsd)
  )
  const [note, setNote] = useState(c.planNote)
  const [saving, setSaving] = useState(false)

  const over = c.spentUsd >= c.limitUsd

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm text-white/85 truncate">{c.name}</p>
          <p className="text-[11px] text-white/35 truncate">
            {c.ownerEmail || "no owner email"} · {c.members} member
            {c.members === 1 ? "" : "s"}
            {c.hasOwnKey && " · own Anthropic key"}
          </p>
          {/* Own key AND spending ours: a key was revoked, or some path never
              got it. Looks free on the plan, isn't. */}
          {c.spendingOursAnyway && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              has own key but still spending ours ({usd(c.spentUsd)})
            </p>
          )}
        </button>

        {/* Spend against budget — the number this page exists for. */}
        {/* What the plan includes. Reading this is the whole point of the row:
            "why can't this customer use watchers?" */}
        <div className="flex flex-wrap gap-1 shrink-0">
          {["api", "mcp", "automation", "watchers"].map((f) => {
            const on = c.features?.includes(f)
            return (
              <span
                key={f}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px]",
                  on
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.02] text-white/20 line-through"
                )}
              >
                {f}
              </span>
            )
          })}
        </div>

        <div className="text-right shrink-0">
          <p className={cn("text-sm", over ? "text-red-300" : "text-white/80")}>
            {usd(c.spentUsd)}{" "}
            <span className="text-white/30">/ {usd(c.limitUsd)}</span>
          </p>
          <p className="text-[11px] text-white/30">
            {c.percent}%{c.ownKeyUsd > 0 && ` · ${usd(c.ownKeyUsd)} own key`}
          </p>
        </div>

        <select
          value={c.plan}
          onChange={async (e) => {
            setSaving(true)
            await onSave({ plan: e.target.value })
            setSaving(false)
          }}
          disabled={saving}
          className="bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/25"
        >
          {PLANS.map((p) => (
            <option key={p} value={p} className="bg-[#0a0a0f]">
              {p}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-white/40">
              Budget override (USD/month)
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={`tier default: ${c.limitUsd}`}
                className="block w-44 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
              />
            </label>
            <label className="text-[11px] text-white/40 flex-1 min-w-[12rem]">
              Note (why)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="paid Sept invoice / trial extended"
                className="block w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
              />
            </label>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                await onSave({
                  aiBudgetUsd: budget.trim() === "" ? null : Number(budget),
                  planNote: note,
                })
                setSaving(false)
              }}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          </div>

          {/* Push a workspace to its ceiling with fake rows, to see the stop
              without paying for it. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/40">Test the limit:</span>
            {[1, 5].map((usd) => (
              <Button
                key={usd}
                size="sm"
                type="button"
                variant="outline"
                className="h-7 text-[11px] border-white/15 text-white/60"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  await simulateSpend(c._id, usd)
                  setSaving(false)
                  await onSave({})
                }}
              >
                +${usd} fake
              </Button>
            ))}
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="h-7 text-[11px] border-white/15 text-white/60"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                await clearSimulatedSpend(c._id)
                setSaving(false)
                await onSave({})
              }}
            >
              Clear fake
            </Button>
          </div>

          {usage ? (
            usage.byAction.length === 0 ? (
              <p className="text-[11px] text-white/30">No AI spend this month.</p>
            ) : (
              <div className="rounded-md border border-white/10 bg-black/20 divide-y divide-white/5">
                {usage.byAction.map((a) => (
                  <div
                    key={a.action}
                    className="flex items-center gap-3 px-3 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-white/60">{a.action}</span>
                    <span className="text-white/25">{a.calls} calls</span>
                    <span className="ml-auto text-white/70">{usd(a.costUsd)}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
          )}
        </div>
      )}
    </div>
  )
}
