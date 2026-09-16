import { useState } from "react"
import { cn } from "~/lib/utils"

// What a watcher does when a merge lands. Every step is optional — a team may
// want the docs refreshed without spending model calls on tests, or the bug
// hunter without the saved suites — so each one is a switch, not a setting page.
export interface ToggleSpec<K extends string> {
  key: K
  label: string
  title: string
}

export function WatcherActionToggles<K extends string>({
  actions,
  specs,
  onToggle,
}: {
  actions: Partial<Record<K, boolean>>
  specs: ToggleSpec<K>[]
  onToggle: (key: K, value: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState<K | null>(null)

  return (
    <div className="w-full flex flex-wrap items-center gap-1.5 pt-1">
      {specs.map((s) => {
        const on = actions?.[s.key] === true
        return (
          <button
            key={s.key}
            type="button"
            title={s.title}
            disabled={busy === s.key}
            onClick={async () => {
              setBusy(s.key)
              try {
                await onToggle(s.key, !on)
              } finally {
                setBusy(null)
              }
            }}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors disabled:opacity-50",
              on
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-white/10 bg-white/[0.03] text-white/35 hover:text-white/60",
            )}
          >
            {on ? "✓ " : ""}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
