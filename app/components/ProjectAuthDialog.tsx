import { useEffect, useState } from "react"
import { Loader2, Plus, ShieldCheck, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  useQaApi,
  type ApiProject,
  type ProjectVariable,
  type QaAuthType,
} from "~/api/qaApi"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ApiProject
  onSaved?: (p: ApiProject) => void
}

const AUTH_LABEL: Record<QaAuthType, string> = {
  none: "No auth",
  bearer: "Bearer token",
  apiKey: "API key (header)",
  basic: "Basic auth",
  custom: "Custom header",
}

// baseUrl + auth TYPE come from the spec; the user only supplies the secret.
export function ProjectAuthDialog({ open, onOpenChange, project, onSaved }: Props) {
  const { saveProjectAuth, loading, error } = useQaApi()
  const [baseUrl, setBaseUrl] = useState("")
  const [authType, setAuthType] = useState<QaAuthType>("none")
  const [headerName, setHeaderName] = useState("")
  const [username, setUsername] = useState("")
  const [value, setValue] = useState("")
  const [password, setPassword] = useState("")
  const [vars, setVars] = useState<ProjectVariable[]>([])

  useEffect(() => {
    if (!open) return
    setBaseUrl(project.baseUrl ?? "")
    setAuthType(project.auth?.type ?? "none")
    setHeaderName(project.auth?.headerName ?? "")
    setUsername(project.auth?.username ?? "")
    setValue("")
    setPassword("")
    setVars(project.variables?.length ? project.variables : [])
  }, [open, project])

  function updateVar(i: number, patch: Partial<ProjectVariable>) {
    setVars((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function addVar() {
    setVars((rows) => [...rows, { key: "", value: "", secret: false }])
  }
  function removeVar(i: number) {
    setVars((rows) => rows.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    const saved = await saveProjectAuth(project._id, {
      baseUrl,
      auth: { type: authType, headerName, username, value, password },
      variables: vars.filter((v) => v.key.trim()),
    })
    if (saved) {
      onSaved?.(saved)
      onOpenChange(false)
    }
  }

  const masked = project.auth?.valueMasked

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0e0e15] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Target &amp; auth
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Base URL and auth type are read from the spec. You only paste the
            secret — it&apos;s encrypted at rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.staging.example.com"
              className="bg-black/30 border-white/10 font-mono text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-white/50">
              Auth type{" "}
              <span className="text-white/30">(detected from spec)</span>
            </label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value as QaAuthType)}
              className="w-full mt-1 rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm"
            >
              {(Object.keys(AUTH_LABEL) as QaAuthType[]).map((t) => (
                <option key={t} value={t} className="bg-[#0e0e15]">
                  {AUTH_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          {(authType === "apiKey" || authType === "custom") && (
            <div>
              <label className="text-xs text-white/50">Header name</label>
              <Input
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                placeholder="X-API-Key"
                className="bg-black/30 border-white/10 font-mono text-sm mt-1"
              />
            </div>
          )}

          {authType === "basic" && (
            <div>
              <label className="text-xs text-white/50">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/30 border-white/10 text-sm mt-1"
              />
            </div>
          )}

          {authType !== "none" && (
            <div>
              <label className="text-xs text-white/50">
                {authType === "basic" ? "Password" : "Token / key value"}
                {masked && (
                  <span className="text-white/30">
                    {" "}
                    · saved: {masked} (leave blank to keep)
                  </span>
                )}
              </label>
              <Input
                type="password"
                value={authType === "basic" ? password : value}
                onChange={(e) =>
                  authType === "basic"
                    ? setPassword(e.target.value)
                    : setValue(e.target.value)
                }
                placeholder="paste once…"
                className="bg-black/30 border-white/10 font-mono text-sm mt-1"
              />
            </div>
          )}

          {/* Environment variables */}
          <div className="pt-1 border-t border-white/10">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-white/50">
                Environment variables{" "}
                <span className="text-white/30">
                  (fill {"{{key}}"} & path params like {"{userId}"})
                </span>
              </label>
              <button
                type="button"
                onClick={addVar}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {vars.length === 0 && (
                <p className="text-[11px] text-white/30">
                  e.g. userId = 7654321 · providerId = krypton
                </p>
              )}
              {vars.map((v, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={v.key}
                    onChange={(e) => updateVar(i, { key: e.target.value })}
                    placeholder="key"
                    className="bg-black/30 border-white/10 font-mono text-xs h-8 flex-1"
                  />
                  <Input
                    value={v.value}
                    onChange={(e) => updateVar(i, { value: e.target.value })}
                    placeholder={v.secret ? "secret value" : "value"}
                    type={v.secret ? "password" : "text"}
                    className="bg-black/30 border-white/10 font-mono text-xs h-8 flex-1"
                  />
                  <button
                    type="button"
                    title="secret"
                    onClick={() => updateVar(i, { secret: !v.secret })}
                    className={`text-[10px] px-1.5 h-8 rounded border ${
                      v.secret
                        ? "border-amber-500/40 text-amber-400"
                        : "border-white/15 text-white/40"
                    }`}
                  >
                    🔒
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVar(i)}
                    className="text-white/30 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/15 text-white/70 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
