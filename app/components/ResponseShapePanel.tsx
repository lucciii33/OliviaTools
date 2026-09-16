import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

// What the thing under test answers with, next to its tests.
//
// Writing a check like "the product_id is the one I asked for" means knowing
// the field is called product_id. That lived only in the docs, one page away,
// so this shows it where the tests are written.
export function ResponseShapePanel({
  title = "Response",
  subtitle = "",
  value,
}: {
  title?: string
  subtitle?: string
  value: unknown
}) {
  const [open, setOpen] = useState(false)
  if (value === null || value === undefined) return null

  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2)
  if (!text || text === "{}" || text === "[]") return null

  return (
    <div className="rounded-md border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-white/30 transition-transform shrink-0",
            open && "rotate-90",
          )}
        />
        <span className="text-[11px] uppercase tracking-wider text-white/40">
          {title}
        </span>
        {subtitle && (
          <span className="text-[11px] text-white/30 truncate">{subtitle}</span>
        )}
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto border-t border-white/10 px-3 py-2 text-[11px] leading-relaxed text-white/60 font-mono whitespace-pre">
          {text}
        </pre>
      )}
    </div>
  )
}
