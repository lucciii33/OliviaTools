import { useState } from "react"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { MethodBadge } from "./MethodBadge"
import type { Doc } from "~/api/docsApi"

interface DocCardProps {
  doc: Doc
  onDelete: (id: string) => void
}

export function DocCard({ doc, onDelete }: DocCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasDetails =
    doc.requestBody?.length > 0 ||
    doc.queryParams?.length > 0 ||
    doc.responses?.length > 0

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <MethodBadge method={doc.method} />
            <code className="text-sm font-mono text-white/90 break-all">{doc.path}</code>
            {doc.prNumber ? (
              <Badge
                variant="outline"
                className="text-xs text-white/50 border-white/20 shrink-0"
              >
                PR #{doc.prNumber}
              </Badge>
            ) : doc.source ? (
              <Badge
                variant="outline"
                className="text-xs text-white/50 border-white/20 shrink-0"
              >
                {doc.source}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDetails && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onDelete(doc._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {doc.description && (
          <p className="text-sm text-white/60 mt-2">{doc.description}</p>
        )}
      </CardHeader>

      {expanded && hasDetails && (
        <CardContent className="pt-0 space-y-5 border-t border-white/10 mt-2">
          {doc.requestBody?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Request Body
              </h4>
              <ParamTable params={doc.requestBody} />
            </div>
          )}

          {doc.queryParams?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Query Parameters
              </h4>
              <ParamTable params={doc.queryParams} />
            </div>
          )}

          {doc.responses?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                Responses
              </h4>
              <div className="space-y-3">
                {doc.responses.map((r, i) => (
                  <div key={i} className="rounded-md bg-white/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-sm text-white/70">{r.description}</span>
                    </div>
                    {r.example !== undefined && r.example !== null && (
                      <pre className="text-xs text-white/60 bg-black/30 rounded p-2 overflow-x-auto">
                        {typeof r.example === "string"
                          ? r.example
                          : JSON.stringify(r.example, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function ParamTable({
  params,
}: {
  params: { name: string; type: string; required: boolean; description: string }[]
}) {
  return (
    <div className="rounded-md border border-white/10 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/40 text-xs h-8">Name</TableHead>
            <TableHead className="text-white/40 text-xs h-8">Type</TableHead>
            <TableHead className="text-white/40 text-xs h-8">Required</TableHead>
            <TableHead className="text-white/40 text-xs h-8">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((p, i) => (
            <TableRow key={i} className="border-white/10 hover:bg-white/5">
              <TableCell className="font-mono text-xs text-white/80 py-2">{p.name}</TableCell>
              <TableCell className="font-mono text-xs text-purple-400 py-2">{p.type}</TableCell>
              <TableCell className="text-xs py-2">
                {p.required ? (
                  <span className="text-amber-400">yes</span>
                ) : (
                  <span className="text-white/30">no</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-white/60 py-2">{p.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status < 300
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : status < 400
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : status < 500
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30"

  return (
    <Badge variant="outline" className={`font-mono text-xs ${color}`}>
      {status}
    </Badge>
  )
}
