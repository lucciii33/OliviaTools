import { Badge } from "~/components/ui/badge"
import type { Doc } from "~/api/docsApi"

const METHOD_STYLES: Record<Doc["method"], string> = {
  GET: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
  PATCH: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
}

export function MethodBadge({ method }: { method: Doc["method"] }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs font-bold px-2 py-0.5 ${METHOD_STYLES[method]}`}
    >
      {method}
    </Badge>
  )
}
