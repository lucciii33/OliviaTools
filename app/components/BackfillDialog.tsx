import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Rocket,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { useInstallationsApi } from "~/api/installationsApi"
import { getRepoBranches } from "~/api/backfillApi"
import { Input } from "~/components/ui/input"
import { Badge } from "~/components/ui/badge"
import {
  estimateCost,
  useBackfillJob,
  type BackfillJobStatus,
  type BackfillState,
} from "~/api/backfillApi"

interface BackfillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: (payload: { owner: string; repo: string; branch?: string }) => void
  defaults?: { owner?: string; repo?: string; branch?: string }
  lockRepo?: boolean
}

const STORAGE_KEY = "backfill-last-form"

export function BackfillDialog({
  open,
  onOpenChange,
  onCompleted,
  defaults,
  lockRepo,
}: BackfillDialogProps) {
  const [installationId, setInstallationId] = useState("")
  const [owner, setOwner] = useState(defaults?.owner ?? "")
  const [repo, setRepo] = useState(defaults?.repo ?? "")
  // The connected repos, so this is a choice instead of three fields to type.
  // Typing them by hand (and remembering the last values in localStorage) is
  // how a stale "admin" got submitted and came back as a GitHub 404.
  const { installations, getInstallations } = useInstallationsApi()
  const { status, error, starting, start, reset } = useBackfillJob()
  const submittedRef = useRef<{
    owner: string
    repo: string
    branch?: string
  } | null>(null)
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (open) void getInstallations()
    // Re-sync with the page every time it opens: the environment tab may have
    // changed since the last time this dialog was used.
    if (open && defaults?.branch !== undefined) setBranch(defaults.branch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults?.branch])

  // Read the branches whenever the chosen repo changes.
  useEffect(() => {
    if (!open || !owner || !repo) return
    let cancelled = false
    void getRepoBranches(owner, repo).then((res) => {
      if (cancelled) return
      setBranches(res.branches)
      setDefaultBranch(res.defaultBranch)
    })
    return () => {
      cancelled = true
    }
  }, [open, owner, repo])

  // A repo that isn't connected any more must not survive in the form.
  useEffect(() => {
    if (!installations.length || lockRepo) return
    const known = installations.some((i) => i.owner === owner && i.repo === repo)
    if (known) return
    const first = installations[0]
    setOwner(first.owner)
    setRepo(first.repo)
    setInstallationId(String(first.installationId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installations, lockRepo])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<{
        installationId: string
        owner: string
        repo: string
      }>
      if (saved.installationId) setInstallationId(saved.installationId)
      if (!defaults?.owner && saved.owner) setOwner(saved.owner)
      if (!defaults?.repo && saved.repo) setRepo(saved.repo)
    } catch {}
  }, [defaults?.owner, defaults?.repo])

  useEffect(() => {
    if (status?.status === "completed" && !notifiedRef.current && submittedRef.current) {
      notifiedRef.current = true
      onCompleted?.(submittedRef.current)
    }
  }, [status?.status, onCompleted])

  useEffect(() => {
    if (!open) {
      reset()
      submittedRef.current = null
      notifiedRef.current = false
    }
  }, [open, reset])

  const inProgress =
    starting || status?.status === "pending" || status?.status === "running"
  const finished =
    status?.status === "completed" || status?.status === "failed"

  // Off by default: only files that changed are re-documented. On re-reads
  // every file — for when the docs look wrong even though the code didn't move.
  const [force, setForce] = useState(false)
  // Which environment is being documented. Empty = the repo's default branch
  // (main or master), which the backend resolves and stores by name.
  const [branch, setBranch] = useState(defaults?.branch ?? "")
  // Branch names are not guessable (dev, develop, development, staging), so the
  // real ones come from GitHub and the customer picks.
  const [branches, setBranches] = useState<string[]>([])
  const [defaultBranch, setDefaultBranch] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      installationId: installationId.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {}
    submittedRef.current = {
      owner: payload.owner,
      repo: payload.repo,
      branch: branch.trim(),
    }
    notifiedRef.current = false
    await start({ ...payload, force, branch: branch.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0d0d14] border border-white/10 text-white ring-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Rocket className="h-4 w-4 text-blue-400" />
            Generate docs from repo
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Scans every endpoint in the repo and writes docs with AI.
          </DialogDescription>
        </DialogHeader>

        {!status && !error && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {installations.length > 0 && !lockRepo ? (
              <div className="space-y-1">
                <label className="text-xs text-white/60">Repository</label>
                <select
                  value={`${owner}/${repo}`}
                  onChange={(e) => {
                    const picked = installations.find(
                      (i) => `${i.owner}/${i.repo}` === e.target.value,
                    )
                    if (!picked) return
                    setOwner(picked.owner)
                    setRepo(picked.repo)
                    setInstallationId(String(picked.installationId))
                  }}
                  className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                >
                  {installations.map((i) => (
                    <option
                      key={`${i.installationId}-${i.owner}/${i.repo}`}
                      value={`${i.owner}/${i.repo}`}
                      className="bg-[#0d0d14]"
                    >
                      {i.owner}/{i.repo}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/35">
                  Only repos connected through GitHub are listed.
                </p>
              </div>
            ) : (
              <>
                <Field
                  label="Installation ID"
                  value={installationId}
                  onChange={setInstallationId}
                  placeholder="12345678"
                  required
                  inputMode="numeric"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Owner"
                    value={owner}
                    onChange={setOwner}
                    placeholder="my-org"
                    required
                    disabled={lockRepo}
                  />
                  <Field
                    label="Repo"
                    value={repo}
                    onChange={setRepo}
                    placeholder="my-repo"
                    required
                    disabled={lockRepo}
                  />
                </div>
              </>
            )}
            {/* Environment. A team merges into its development branch first, so
                "the API" is two things: what ships, and what is about to. Each
                gets its own docs, and the tabs on the docs page switch between
                them. The branch is PICKED, not typed — dev, develop and
                development are all real names and nobody should have to guess. */}
            <div className="space-y-1">
              <label className="text-xs text-white/60">Environment (branch)</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={starting || !branches.length}
                className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-[#0d0d14]">
                  {defaultBranch
                    ? `${defaultBranch} — what ships today`
                    : "default branch"}
                </option>
                {branches
                  .filter((b) => b !== defaultBranch)
                  .map((b) => (
                    <option key={b} value={b} className="bg-[#0d0d14]">
                      {b}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-white/35">
                A repo can have two environments: the one that ships, and the branch
                you develop on.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                disabled={starting}
              />
              <span>
                Regenerate everything
                <span className="block text-[11px] text-white/35">
                  Re-reads every file, not only the ones that changed. Slower and
                  uses more tokens. Tests and variables are kept.
                </span>
              </span>
            </label>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              disabled={starting}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Starting…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" /> Start backfill
                </>
              )}
            </Button>
          </form>
        )}

        {status && !error && (
          <ProgressView
            status={status}
            inProgress={!!inProgress}
            finished={!!finished}
            onClose={() => onOpenChange(false)}
            onRestart={reset}
          />
        )}

        {error && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/5"
              onClick={reset}
            >
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  inputMode?: "text" | "numeric"
  disabled?: boolean
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
  disabled,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/60">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        disabled={disabled}
        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50"
      />
    </div>
  )
}

interface ProgressViewProps {
  status: BackfillJobStatus
  inProgress: boolean
  finished: boolean
  onClose: () => void
  onRestart: () => void
}

function ProgressView({
  status,
  inProgress,
  finished,
  onClose,
  onRestart,
}: ProgressViewProps) {
  const done =
    status.filesProcessed + status.filesSkipped + status.filesCached
  const pct =
    status.filesFound > 0
      ? Math.min(100, Math.round((done / status.filesFound) * 100))
      : status.status === "completed"
      ? 100
      : 0

  // Still computed so re-enabling the box above is a one-line change.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cost = estimateCost(status.model, status.tokensInput, status.tokensOutput)

  const barColor =
    status.status === "failed"
      ? "bg-red-500"
      : status.status === "completed"
      ? "bg-green-500"
      : "bg-blue-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={status.status} />
        {/* HIDDEN: which model ran is internal — the customer has no use for
            "claude-opus-4-7" and it leaks an implementation detail. Uncomment to
            bring it back. */}
        {/* {status.model && (
          <Badge
            variant="outline"
            className="text-xs font-mono text-white/60 border-white/20"
          >
            {status.model}
          </Badge>
        )} */}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {done.toLocaleString()} / {status.filesFound > 0 ? status.filesFound.toLocaleString() : "?"} files
          </span>
          <span>
            {status.filesFound > 0
              ? `${pct}%`
              : inProgress
              ? "Scanning…"
              : ""}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Processed" value={status.filesProcessed} />
        <Metric label="Cached" value={status.filesCached} />
        <Metric label="Skipped" value={status.filesSkipped} />
        <Metric label="Endpoints" value={status.endpointsDetected} accent="blue" />
        {status.zombieDocsRemoved > 0 && (
          <Metric
            label="Zombies removed"
            value={status.zombieDocsRemoved}
            accent="amber"
          />
        )}
      </div>

      {/* Cost was hidden alongside the model: it showed OUR spend ($0.0000),
          which means nothing to the customer and reads like a broken number.
          Restore the grid-cols-2 wrapper and the InfoBox below together. */}
      <div className="grid grid-cols-1 gap-2">
        <InfoBox label="Tokens">
          <span className="font-mono">
            {status.tokensInput.toLocaleString()} in
            <span className="text-white/40"> / </span>
            {status.tokensOutput.toLocaleString()} out
          </span>
        </InfoBox>
        {/* <InfoBox label="Est. cost">
          <span className="font-mono">
            {cost !== null ? `$${cost.toFixed(4)}` : "—"}
          </span>
        </InfoBox> */}
      </div>

      {status.status === "failed" && status.error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{status.error}</span>
        </div>
      )}

      {finished && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/5"
            onClick={onRestart}
          >
            Run another
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            onClick={onClose}
          >
            {status.status === "completed" ? "View docs" : "Close"}
          </Button>
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "blue" | "amber"
}) {
  const color =
    accent === "blue"
      ? "text-blue-400"
      : accent === "amber"
      ? "text-amber-400"
      : "text-white/85"
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs text-white/40">{label}</div>
      <div className={`font-mono text-sm ${color}`}>{value.toLocaleString()}</div>
    </div>
  )
}

function InfoBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs text-white/40">{label}</div>
      <div className="text-xs text-white/85 mt-0.5">{children}</div>
    </div>
  )
}

const STATUS_META: Record<
  BackfillState,
  { label: string; cls: string; icon: ReactNode }
> = {
  pending: {
    label: "Pending",
    cls: "bg-white/5 text-white/60 border-white/15",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  running: {
    label: "Running",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Completed",
    cls: "bg-green-500/15 text-green-400 border-green-500/25",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    cls: "bg-red-500/15 text-red-400 border-red-500/25",
    icon: <AlertCircle className="h-3 w-3" />,
  },
}

function StatusBadge({ status }: { status: BackfillState }) {
  const s = STATUS_META[status]
  return (
    <Badge variant="outline" className={`gap-1.5 ${s.cls}`}>
      {s.icon}
      {s.label}
    </Badge>
  )
}
