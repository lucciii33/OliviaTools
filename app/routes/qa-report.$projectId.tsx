import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { ArrowLeft, Copy, Download, Link2, Loader2, Printer, Trash2 } from "lucide-react"
import { Sidebar } from "~/components/Sidebar"
import { Button } from "~/components/ui/button"
import { QaReportView } from "~/components/QaReportView"
import { useAuth } from "~/context/AuthContext"
import {
  createReportLink,
  getQaReport,
  listReportLinks,
  reportToMarkdown,
  revokeReportLink,
  type QaReport,
  type ReportScope,
  type ShareLinkRow,
} from "~/api/qaReportApi"

// One repo's (or project's) QA report, with the period the customer picks, a
// copy to download, and the read-only link they forward to their own customer.

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function QaReportPage() {
  const { projectId, owner, repo } = useParams()
  const [params] = useSearchParams()
  const surface = params.get("surface") === "mcp" ? "mcp" : "api"
  const scope: ReportScope =
    owner && repo ? { owner, repo } : { projectId, surface }

  const { user } = useAuth()
  const [report, setReport] = useState<QaReport | null>(null)
  const [links, setLinks] = useState<ShareLinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState("")

  async function load(range: { from?: string; to?: string } = {}) {
    setLoading(true)
    setError(null)
    try {
      const [r, l] = await Promise.all([
        getQaReport(scope, range),
        listReportLinks(scope).catch(() => []),
      ])
      setReport(r)
      setLinks(l)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, owner, repo, projectId])

  async function share() {
    setSharing(true)
    setError(null)
    try {
      const { token } = await createReportLink(scope, { from, to })
      const url = `${window.location.origin}/report/${token}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setCopied(url)
      setLinks(await listReportLinks(scope).catch(() => links))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the link")
    } finally {
      setSharing(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 px-5 md:px-8 py-6 min-w-0 max-w-4xl">
        <div className="print:hidden">
          <Link
            to={owner && repo ? `/docs/${owner}/${repo}` : "/mcp-docs"}
            className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-4"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>

          {/* Period: coverage is always "now", the rest is counted over this. */}
          <div className="flex flex-wrap items-end gap-2 mb-5">
            <label className="text-[11px] text-white/40">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/25"
              />
            </label>
            <label className="text-[11px] text-white/40">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/25"
              />
            </label>
            <Button
              size="sm"
              type="button"
              className="h-8 text-xs"
              onClick={() => load({ from, to })}
              disabled={loading}
            >
              Apply
            </Button>
            {(from || to) && (
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-8 text-xs border-white/15 text-white/60"
                onClick={() => {
                  setFrom("")
                  setTo("")
                  void load()
                }}
              >
                All time
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-8 text-xs border-white/15 gap-1.5"
                disabled={!report}
                onClick={() =>
                  report &&
                  download(
                    `qa-report-${report.subject.replace(/[^a-z0-9]+/gi, "-")}.md`,
                    reportToMarkdown(report),
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Markdown
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="h-8 text-xs border-white/15 gap-1.5"
                onClick={() => window.print()}
                title="Print, or save as PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                PDF
              </Button>
              <Button
                size="sm"
                type="button"
                className="h-8 text-xs gap-1.5"
                onClick={share}
                disabled={sharing}
              >
                {sharing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Share link
              </Button>
            </div>
          </div>

          {copied && (
            <p className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 break-all">
              Link copied: {copied}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : report ? (
          <QaReportView report={report} />
        ) : null}

        {links.length > 0 && (
          <section className="mt-8 print:hidden">
            <h2 className="text-sm font-medium text-white/70 mb-2">
              Shared links ({links.length})
            </h2>
            <div className="space-y-1.5">
              {links.map((l) => {
                const url = `${window.location.origin}/report/${l.token}`
                return (
                  <div
                    key={l.token}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="font-mono text-[11px] text-white/50 truncate">
                      {url}
                    </span>
                    <span className="text-[11px] text-white/30 shrink-0 ml-auto">
                      {l.views} view{l.views === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      title="Copy"
                      className="text-white/35 hover:text-white p-1"
                      onClick={() => {
                        void navigator.clipboard.writeText(url)
                        setCopied(url)
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Revoke this link"
                      className="text-white/25 hover:text-red-400 p-1"
                      onClick={async () => {
                        await revokeReportLink(l.token)
                        setLinks((prev) => prev.filter((x) => x.token !== l.token))
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
