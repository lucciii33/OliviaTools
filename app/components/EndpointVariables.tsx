import { useEffect, useState } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useQaApi, type DocVariables } from "~/api/qaApi"
import { EndpointBody } from "./EndpointBody"

// ONE editor for an endpoint's variables, used everywhere an endpoint appears:
// the QA configuration screen and the tests page. Same component, so the two
// can't drift into different designs or different behaviour.
//
// The tokens / api keys / ids this ONE endpoint resolves. Shows the global set
// (read-only here — it's edited in Target & auth, the same dialog the docs page
// uses) and lets you override or add values for this endpoint alone. This is
// the answer to "why is this test 401 and the others fine".
export function EndpointVariables({
  docId,
  defaultOpen = false,
}: {
  docId: string
  /** Endpoint pages open it collapsed; the QA config screen shows it expanded. */
  defaultOpen?: boolean
}) {
  const { getDocVariables: getVars, saveDocVariables: saveVars } = useQaApi()
  const [open, setOpen] = useState(defaultOpen)
  const [data, setData] = useState<DocVariables | null>(null)
  const [rows, setRows] = useState<
    { key: string; value: string; secret: boolean }[]
  >([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    const d = await getVars(docId)
    if (d) {
      setData(d)
      setRows(d.endpoint.map((v) => ({ ...v })))
    }
  }

  useEffect(() => {
    if (open && !data) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function save() {
    setSaving(true)
    const res = await saveVars(
      docId,
      rows.filter((r) => r.key.trim())
    )
    setSaving(false)
    if (res) {
      setRows(res.map((v) => ({ ...v })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // reload so the "overridden" flags on the global list stay honest
      load()
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/70"
      >
        <KeyRound className="h-3 w-3" />
        variables &amp; body for this endpoint
      </button>
    )
  }

  return (
    <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-amber-300/80 uppercase tracking-wider">
          This endpoint
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-white/30 hover:text-white/60"
        >
          hide
        </button>
      </div>

      {data && (
        <>
          <p className="text-[10px] text-white/35 mb-2">
            {data.baseUrl || "no base URL set"} · auth: {data.authType}
          </p>

          {data.global.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                Global ({data.scope})
              </p>
              <div className="space-y-0.5">
                {data.global.map((v) => (
                  <div
                    key={v.key}
                    className="flex items-center gap-2 text-[11px] font-mono"
                  >
                    <span className="text-white/50">{v.key}</span>
                    <span className="text-white/25 truncate">{v.value}</span>
                    {v.secret && (
                      <span className="text-[9px] text-amber-400/60">secret</span>
                    )}
                    {v.overridden && (
                      <span className="text-[9px] text-white/30">
                        overridden below
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
            This endpoint only
          </p>
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={r.key}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                    )
                  }
                  placeholder="key"
                  className="w-32 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
                />
                <input
                  value={r.value}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x
                      )
                    )
                  }
                  placeholder={r.secret ? "leave blank to keep" : "value"}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] font-mono text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
                />
                <label
                  className="flex items-center gap-1 text-[10px] text-white/40 cursor-pointer"
                  title="Encrypt at rest — for tokens and api keys"
                >
                  <input
                    type="checkbox"
                    checked={r.secret}
                    onChange={(e) =>
                      setRows((rs) =>
                        rs.map((x, j) =>
                          j === i ? { ...x, secret: e.target.checked } : x
                        )
                      )
                    }
                  />
                  secret
                </label>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  className="text-white/25 hover:text-red-400 px-1"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() =>
                setRows((rs) => [...rs, { key: "", value: "", secret: false }])
              }
              className="text-[11px] text-white/40 hover:text-white/70"
            >
              + add
            </button>
            <Button
              type="button"
              size="sm"
              className="h-6 text-[11px] px-2 ml-auto"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : saved ? (
                "Saved"
              ) : (
                "Save"
              )}
            </Button>
          </div>

          {/* A GET has no body. Everything else usually needs a real one — a
              specific shape, or one special field — or the happy path gets
              tested with something invented from the schema. Rendered here so
              the popup and the tests page show the SAME block for an endpoint. */}
          {data.method && data.method !== "GET" && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <EndpointBody docId={docId} exampleBody={data.exampleBody} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
