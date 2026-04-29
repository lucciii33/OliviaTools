import { useEffect, useState, type FormEvent } from "react"
import { AlertCircle, Loader2, Plus, Save, ShieldCheck, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { useQaApi, type QaAuthType, type QaConfig } from "~/api/qaApi"

interface QaConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner: string
  repo: string
  onSaved?: (config: QaConfig) => void
}

interface HeaderRow {
  key: string
  value: string
}

const AUTH_OPTIONS: { value: QaAuthType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "bearer", label: "Bearer token" },
  { value: "apiKey", label: "API Key (custom header)" },
  { value: "basic", label: "Basic auth" },
  { value: "custom", label: "Custom header" },
]

export function QaConfigDialog({
  open,
  onOpenChange,
  owner,
  repo,
  onSaved,
}: QaConfigDialogProps) {
  const { getConfig, saveConfig, error } = useQaApi()
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [authType, setAuthType] = useState<QaAuthType>("none")
  const [authValue, setAuthValue] = useState("")
  const [headerName, setHeaderName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [headers, setHeaders] = useState<HeaderRow[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingExisting(true)
    getConfig(owner, repo)
      .then((cfg) => {
        if (cancelled || !cfg) return
        setBaseUrl(cfg.baseUrl ?? "")
        setAuthType(cfg.auth?.type ?? "none")
        setAuthValue(cfg.auth?.value ?? "")
        setHeaderName(cfg.auth?.headerName ?? "")
        setUsername(cfg.auth?.username ?? "")
        setPassword(cfg.auth?.password ?? "")
        if (cfg.defaultHeaders) {
          setHeaders(
            Object.entries(cfg.defaultHeaders).map(([key, value]) => ({
              key,
              value,
            }))
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, owner, repo])

  function addHeader() {
    setHeaders((h) => [...h, { key: "", value: "" }])
  }

  function updateHeader(i: number, patch: Partial<HeaderRow>) {
    setHeaders((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }

  function removeHeader(i: number) {
    setHeaders((h) => h.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const defaultHeaders = headers
      .filter((h) => h.key.trim() && h.value.trim())
      .reduce<Record<string, string>>((acc, h) => {
        acc[h.key.trim()] = h.value.trim()
        return acc
      }, {})

    const config: QaConfig = {
      baseUrl: baseUrl.trim(),
      auth: {
        type: authType,
        ...(authType === "bearer" ? { value: authValue.trim() } : {}),
        ...(authType === "apiKey" || authType === "custom"
          ? { headerName: headerName.trim(), value: authValue.trim() }
          : {}),
        ...(authType === "basic"
          ? { username: username.trim(), password }
          : {}),
      },
      ...(Object.keys(defaultHeaders).length > 0 ? { defaultHeaders } : {}),
    }

    const saved = await saveConfig(owner, repo, config)
    setSaving(false)
    if (saved) {
      onSaved?.(saved)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0d0d14] border border-white/10 text-white ring-white/10 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            QA configuration
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Set how the QA agent should reach the API of {owner}/{repo}.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Base URL" required>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.cliente.com"
                required
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
              />
            </Field>

            <Field label="Authentication">
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as QaAuthType)}
                className="w-full h-9 rounded-md bg-white/5 border border-white/15 text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {AUTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0d0d14]">
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            {authType === "bearer" && (
              <Field label="Token">
                <Input
                  value={authValue}
                  onChange={(e) => setAuthValue(e.target.value)}
                  placeholder="eyJhbGciOi…"
                  type="password"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                />
              </Field>
            )}

            {(authType === "apiKey" || authType === "custom") && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Header name">
                  <Input
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="X-API-Key"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                  />
                </Field>
                <Field label="Value">
                  <Input
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    placeholder="sk_live_…"
                    type="password"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                  />
                </Field>
              </div>
            )}

            {authType === "basic" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                  />
                </Field>
                <Field label="Password">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    type="password"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                  />
                </Field>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60">
                  Default headers <span className="text-white/30">(optional)</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addHeader}
                  className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
              {headers.length === 0 ? (
                <p className="text-xs text-white/30">
                  None. Headers added here go on every test request.
                </p>
              ) : (
                <div className="space-y-2">
                  {headers.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => updateHeader(i, { key: e.target.value })}
                        placeholder="Header name"
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          updateHeader(i, { value: e.target.value })
                        }
                        placeholder="Value"
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHeader(i)}
                        className="h-9 w-9 shrink-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save configuration
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/60">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
