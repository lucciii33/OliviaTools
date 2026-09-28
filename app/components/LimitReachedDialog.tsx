import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "~/components/ui/button"

// What a customer sees when the workspace runs out of its monthly AI budget, or
// a free-trial counter is spent.
//
// Mounted once at the root and fed by the event apiFetch raises, so every button
// in the product gets the same clear explanation instead of a raw status code —
// without each page having to know that limits exist.
export function LimitReachedDialog() {
  const [limit, setLimit] = useState<{ code: string; message: string } | null>(null)

  useEffect(() => {
    function onLimit(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.message) setLimit(detail)
    }
    window.addEventListener("olivia:limit-reached", onLimit)
    return () => window.removeEventListener("olivia:limit-reached", onLimit)
  }, [])

  if (!limit) return null

  const isBudget = limit.code === "AI_BUDGET_EXCEEDED"
  const notIncluded = limit.code === "PLAN_SURFACE_NOT_INCLUDED"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
      <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-[#101217] p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-base font-semibold">
            {isBudget
              ? "Monthly limit reached"
              : notIncluded
              ? "Not included in your plan"
              : "Trial limit reached"}
          </h2>
        </div>
        <p className="text-sm text-white/60">{limit.message}</p>
        {isBudget && (
          <p className="mt-2 text-xs text-white/40">
            Everything already generated stays as it is — docs, tests and bugs.
            Only new AI work is paused until the limit resets.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setLimit(null)}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  )
}
