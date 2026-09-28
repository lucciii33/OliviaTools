import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { Loader2 } from "lucide-react"
import { QaReportView } from "~/components/QaReportView"
import { getSharedQaReport, type QaReport } from "~/api/qaReportApi"

// The public page behind a share link: no sidebar, no session, nothing to click
// through to. Whoever holds the link sees this report and only this report.
export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<QaReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getSharedQaReport(token)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "This link is not available."),
      )
  }, [token])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <main className="mx-auto max-w-4xl px-5 md:px-8 py-10">
        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : !report ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : (
          <>
            <QaReportView report={report} />
            <p className="mt-10 text-[11px] text-white/25">
              Shared from OliviaTools · read-only
            </p>
          </>
        )}
      </main>
    </div>
  )
}
