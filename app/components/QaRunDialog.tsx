import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, Play, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { useQaApi, type QaRun } from "~/api/qaApi"
import { QaRunView } from "./QaRunView"

interface QaRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docId: string
  endpointLabel: string
  repoLabel?: string
  onCompleted?: () => void
}

export function QaRunDialog({
  open,
  onOpenChange,
  docId,
  endpointLabel,
  repoLabel,
  onCompleted,
}: QaRunDialogProps) {
  const { runQa, error } = useQaApi()
  const [run, setRun] = useState<QaRun | null>(null)
  const [running, setRunning] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (!open) {
      triggeredRef.current = false
      setRun(null)
      setRunning(false)
      return
    }
    if (triggeredRef.current) return
    triggeredRef.current = true
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docId])

  async function start() {
    setRunning(true)
    setRun(null)
    const result = await runQa(docId)
    setRunning(false)
    if (result) {
      setRun(result)
      onCompleted?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-[#0d0d14] border border-white/10 text-white ring-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            QA Run · {endpointLabel}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Runs 15 tests against the real API and reports any bugs found.
          </DialogDescription>
        </DialogHeader>

        {running && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-white/70">Running 15 tests…</p>
            <p className="text-xs text-white/40">
              This usually takes 30–60 seconds.
            </p>
          </div>
        )}

        {!running && error && !run && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/5"
              onClick={start}
            >
              <Play className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        )}

        {!running && run && <QaRunView run={run} repoLabel={repoLabel} />}

        {!running && run && (
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={start}
              className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Run again
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
