import { KeyRound } from "lucide-react"
import type { AuthScheme } from "~/api/qaApi"
import { cn } from "~/lib/utils"

// Which auth method a run should use.
//
// An API commonly accepts more than one (an API key AND a bearer token). Before
// this existed the runner always sent whichever single credential was
// configured, so a request meant to test the OTHER path authenticated through
// the first one anyway — a bogus token came back 200 and got filed as a
// critical auth bypass that never happened.
//
// Testing them one at a time is also where real holes show up: an endpoint that
// validates the API key properly but accepts any bearer token looks perfectly
// fine as long as both are sent together.
export function AuthSchemePicker({
  schemes,
  value,
  onChange,
  className,
}: {
  schemes: AuthScheme[]
  /** "" = the project's default scheme. */
  value: string
  onChange: (name: string) => void
  className?: string
}) {
  // One scheme is the normal case — no choice to offer, so don't clutter the UI.
  if (!schemes || schemes.length < 2) return null

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs text-white/60 flex items-center gap-1.5">
        <KeyRound className="h-3 w-3 text-amber-400" />
        Which auth to test
      </label>
      <p className="text-xs text-white/30">
        This API accepts {schemes.length} methods. Running them separately is how
        you catch one that validates properly while the other lets anything
        through.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs border transition-colors",
            value === ""
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.06]"
          )}
        >
          Default
        </button>
        {schemes.map((sc) => (
          <button
            key={sc.name}
            type="button"
            onClick={() => onChange(sc.name)}
            title={
              sc.headerName
                ? `${sc.type} · ${sc.headerName}`
                : `${sc.type} · Authorization`
            }
            className={cn(
              "px-2.5 py-1 rounded-full text-xs border transition-colors",
              value === sc.name
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.06]"
            )}
          >
            {sc.name}
            {/* A scheme with no credential saved will fail every authenticated
                case — say so before the run rather than after. */}
            {!sc.configured && (
              <span className="ml-1 text-red-400/70" title="No credential saved">
                !
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
