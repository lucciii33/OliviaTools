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
  onCompleted?: (payload: { owner: string; repo: string }) => void
  defaults?: { owner?: string; repo?: string }
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
  const { status, error, starting, start, reset } = useBackfillJob()
  const submittedRef = useRef<{ owner: string; repo: string } | null>(null)
  const notifiedRef = useRef(false)

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
    submittedRef.current = { owner: payload.owner, repo: payload.repo }
    notifiedRef.current = false
    await start(payload)
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
        {status.model && (
          <Badge
            variant="outline"
            className="text-xs font-mono text-white/60 border-white/20"
          >
            {status.model}
          </Badge>
        )}
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

      <div className="grid grid-cols-2 gap-2">
        <InfoBox label="Tokens">
          <span className="font-mono">
            {status.tokensInput.toLocaleString()} in
            <span className="text-white/40"> / </span>
            {status.tokensOutput.toLocaleString()} out
          </span>
        </InfoBox>
        <InfoBox label="Est. cost">
          <span className="font-mono">
            {cost !== null ? `$${cost.toFixed(4)}` : "—"}
          </span>
        </InfoBox>
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
