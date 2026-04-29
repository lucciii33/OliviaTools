import { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  XCircle,
} from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import type { QaExecution, QaRun, QaTestGroup } from "~/api/qaApi"

interface QaRunViewProps {
  run: QaRun
  repoLabel?: string
}

const GROUP_STYLE: Record<QaTestGroup, string> = {
  happy: "bg-green-500/15 text-green-400 border-green-500/30",
  sad: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  boundary: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  security: "bg-red-500/15 text-red-400 border-red-500/30",
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

export function QaRunView({ run, repoLabel }: QaRunViewProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const passed = run.totalTests - run.bugCount

  function downloadPostman() {
    if (!run.postmanCollection) return
    const blob = new Blob([JSON.stringify(run.postmanCollection, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const stamp = run._id ?? run.runId ?? Date.now().toString()
    a.download = `qa-collection-${repoLabel ?? "run"}-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className="text-sm bg-white/5 text-white/85 border-white/20 font-mono"
          >
            {passed} / {run.totalTests} passed
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-mono",
              run.bugCount > 0
                ? "bg-red-500/15 text-red-400 border-red-500/30"
                : "bg-green-500/15 text-green-400 border-green-500/30"
            )}
          >
            {run.bugCount} {run.bugCount === 1 ? "bug" : "bugs"} found
          </Badge>
        </div>
        {run.postmanCollection && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadPostman}
            className="border-white/20 text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Postman collection
          </Button>
        )}
      </div>

      <div className="rounded-md border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 px-3 py-2 text-xs text-white/40 uppercase tracking-wider bg-white/[0.02] border-b border-white/10">
          <span>Test</span>
          <span>Group</span>
          <span>Status</span>
          <span>Result</span>
        </div>
        <div className="divide-y divide-white/10">
          {run.executions.map((ex, i) => (
            <ExecutionRow
              key={i}
              ex={ex}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
          {run.executions.length === 0 && (
            <p className="text-sm text-white/40 px-3 py-6 text-center">
              No executions in this run.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ExecutionRow({
  ex,
  open,
  onToggle,
}: {
  ex: QaExecution
  open: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 items-center px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/40 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
          )}
          <span className="text-sm text-white/85 truncate">{ex.name}</span>
        </div>
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase tracking-wider", GROUP_STYLE[ex.group])}
        >
          {ex.group}
        </Badge>
        <span
          className={cn(
            "text-xs font-mono px-2 py-0.5 rounded",
            ex.response.status >= 200 && ex.response.status < 300
              ? "bg-green-500/10 text-green-400"
              : ex.response.status >= 400
              ? "bg-red-500/10 text-red-400"
              : "bg-white/5 text-white/60"
          )}
        >
          {ex.response.status || "—"}
        </span>
        {ex.isBug ? (
          <XCircle className="h-4 w-4 text-red-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 space-y-3 bg-white/[0.02]">
          {ex.rationale && (
            <p className="text-xs text-white/60 italic">{ex.rationale}</p>
          )}

          {ex.isBug && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-sm font-medium text-red-300">
                  {ex.bugTitle ?? "Bug detected"}
                </span>
                {ex.bugSeverity && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase tracking-wider",
                      SEVERITY_STYLE[ex.bugSeverity.toLowerCase()] ??
                        "bg-white/5 text-white/60 border-white/15"
                    )}
                  >
                    {ex.bugSeverity}
                  </Badge>
                )}
                {ex.bugCategory && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider bg-white/5 text-white/60 border-white/15"
                  >
                    {ex.bugCategory}
                  </Badge>
                )}
              </div>
              {ex.bugDescription && (
                <p className="text-xs text-white/70 whitespace-pre-wrap">
                  {ex.bugDescription}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RequestBlock ex={ex} />
            <ResponseBlock ex={ex} />
          </div>
        </div>
      )}
    </div>
  )
}

function RequestBlock({ ex }: { ex: QaExecution }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
        <span>Request</span>
        <span className="font-mono text-white/60">
          {ex.request.method} · expects {ex.expectedStatus.join(", ")}
        </span>
      </div>
      <div className="p-3 space-y-2 text-xs">
        <div className="font-mono text-white/80 break-all">{ex.request.url}</div>
        {Object.keys(ex.request.headers ?? {}).length > 0 && (
          <details className="text-white/60">
            <summary className="cursor-pointer hover:text-white/80">
              Headers ({Object.keys(ex.request.headers).length})
            </summary>
            <pre className="mt-1.5 text-[11px] text-white/70 whitespace-pre-wrap break-all">
              {JSON.stringify(ex.request.headers, null, 2)}
            </pre>
          </details>
        )}
        {ex.request.body !== undefined && ex.request.body !== null && (
          <details open className="text-white/60">
            <summary className="cursor-pointer hover:text-white/80">Body</summary>
            <pre className="mt-1.5 text-[11px] text-white/80 whitespace-pre-wrap break-all">
              {typeof ex.request.body === "string"
                ? ex.request.body
                : JSON.stringify(ex.request.body, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

function ResponseBlock({ ex }: { ex: QaExecution }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
        <span>Response</span>
        <span className="font-mono text-white/60">
          {ex.response.status || "—"} · {ex.response.durationMs}ms
        </span>
      </div>
      <div className="p-3 space-y-2 text-xs">
        {ex.response.error && (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{ex.response.error}</span>
          </div>
        )}
        {ex.response.body !== undefined && ex.response.body !== null && (
          <pre className="text-[11px] text-white/80 whitespace-pre-wrap break-all">
            {typeof ex.response.body === "string"
              ? ex.response.body
              : JSON.stringify(ex.response.body, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
