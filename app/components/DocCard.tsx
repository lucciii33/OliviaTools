import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
} from "lucide-react"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs"
import { MethodBadge } from "./MethodBadge"
import { QaConfigDialog } from "./QaConfigDialog"
import { QaRunDialog } from "./QaRunDialog"
import { QaRunView } from "./QaRunView"
import {
  useQaApi,
  type QaRun,
  type QaRunSummary,
} from "~/api/qaApi"
import type { Doc } from "~/api/docsApi"

interface DocCardProps {
  doc: Doc
  onDelete: (id: string) => void
}

export function DocCard({ doc, onDelete }: DocCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<"details" | "history">("details")
  const [configOpen, setConfigOpen] = useState(false)
  const [runOpen, setRunOpen] = useState(false)
  const [checkingConfig, setCheckingConfig] = useState(false)
  const [pendingRun, setPendingRun] = useState(false)

  const { getConfig } = useQaApi()

  const hasDetails =
    doc.requestBody?.length > 0 ||
    doc.queryParams?.length > 0 ||
    doc.responses?.length > 0

  async function handleRunQa() {
    if (checkingConfig) return
    setCheckingConfig(true)
    const cfg = await getConfig(doc.owner, doc.repo)
    setCheckingConfig(false)
    if (!cfg) {
      setPendingRun(true)
      setConfigOpen(true)
      return
    }
    setRunOpen(true)
  }

  return (
    <>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunQa}
                disabled={checkingConfig}
                className="h-8 border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30 gap-1.5"
              >
                {checkingConfig ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                )}
                Run QA
              </Button>
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
          <CardContent className="pt-0 border-t border-white/10 mt-2">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "details" | "history")}
              className="mt-4"
            >
              <TabsList variant="line" className="border-b border-white/10 w-full justify-start gap-4 h-auto">
                <TabsTrigger value="details" className="text-white/60 data-active:text-white">
                  Details
                </TabsTrigger>
                <TabsTrigger value="history" className="text-white/60 data-active:text-white">
                  QA History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-5 pt-4">
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
              </TabsContent>

              <TabsContent value="history" className="pt-4">
                <QaHistoryTab
                  docId={doc._id}
                  repoLabel={doc.repo}
                  active={expanded && tab === "history"}
                  refreshKey={runOpen ? 0 : 1}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <QaConfigDialog
        open={configOpen}
        onOpenChange={(o) => {
          setConfigOpen(o)
          if (!o) setPendingRun(false)
        }}
        owner={doc.owner}
        repo={doc.repo}
        onSaved={() => {
          if (pendingRun) {
            setPendingRun(false)
            setRunOpen(true)
          }
        }}
      />

      <QaRunDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        docId={doc._id}
        endpointLabel={`${doc.method} ${doc.path}`}
        repoLabel={doc.repo}
      />
    </>
  )
}

function QaHistoryTab({
  docId,
  repoLabel,
  active,
  refreshKey,
}: {
  docId: string
  repoLabel: string
  active: boolean
  refreshKey: number
}) {
  const { getRuns, getRun } = useQaApi()
  const [runs, setRuns] = useState<QaRunSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<QaRun | null>(null)
  const [loadingRun, setLoadingRun] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    getRuns(docId).then((list) => {
      if (cancelled) return
      setRuns(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, docId, refreshKey])

  async function openRun(id: string) {
    setLoadingRun(true)
    const r = await getRun(id)
    setLoadingRun(false)
    if (r) setSelected(r)
  }

  if (selected) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/80"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to history
        </button>
        <QaRunView run={selected} repoLabel={repoLabel} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <p className="text-sm text-white/40 py-6 text-center">
        No QA runs yet. Hit “Run QA” to test this endpoint.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-white/10 overflow-hidden">
      {runs.map((r) => {
        const passed = r.totalTests - r.bugCount
        return (
          <button
            key={r._id}
            type="button"
            onClick={() => openRun(r._id)}
            disabled={loadingRun}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors border-b last:border-b-0 border-white/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Play className="h-3.5 w-3.5 text-white/40 shrink-0" />
              <span className="text-xs text-white/60 font-mono">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleString()
                  : r._id.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-mono bg-white/5 text-white/70 border-white/15"
              >
                {passed}/{r.totalTests} pass
              </Badge>
              <Badge
                variant="outline"
                className={
                  r.bugCount > 0
                    ? "text-[10px] font-mono bg-red-500/15 text-red-400 border-red-500/30"
                    : "text-[10px] font-mono bg-green-500/15 text-green-400 border-green-500/30"
                }
              >
                {r.bugCount} {r.bugCount === 1 ? "bug" : "bugs"}
              </Badge>
            </div>
          </button>
        )
      })}
    </div>
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
