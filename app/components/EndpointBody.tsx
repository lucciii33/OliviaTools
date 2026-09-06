import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useQaApi } from "~/api/qaApi"

// The request body for ONE endpoint, saved on the endpoint itself
// (doc.exampleBody). The generator reads it as the base for the happy path, so
// a POST that needs a specific shape — or one special field — gets tested with
// the real thing instead of something invented from the schema.
//
// Lives here rather than inside a page so the endpoint popups and the swagger
// page all render the same editor.
export function EndpointBody({
  docId,
  exampleBody,
}: {
  docId: string
  exampleBody: unknown
}) {
  const { saveDocBody } = useQaApi()
  const initial =
    exampleBody != null &&
    !(
      typeof exampleBody === "object" &&
      !Array.isArray(exampleBody) &&
      Object.keys(exampleBody as object).length === 0
    )
      ? JSON.stringify(exampleBody, null, 2)
      : ""
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = text.trim() !== initial.trim()

  async function save() {
    setErr(null)
    let parsed: unknown = {}
    if (text.trim()) {
      try {
        parsed = JSON.parse(text)
      } catch {
        setErr("Invalid JSON — check quotes, commas and braces.")
        return
      }
    }
    setSaving(true)
    const updated = await saveDocBody(docId, parsed)
    setSaving(false)
    if (updated) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } else {
      setErr("Could not save. Try again.")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-white/40 uppercase tracking-wider text-[10px]">
          Custom body <span className="lowercase text-white/25">(optional)</span>
        </div>
        {initial && (
          <span className="text-[10px] text-emerald-400/80">override active</span>
        )}
      </div>
      <p className="text-white/30 mb-1.5 text-[11px]">
        Paste a JSON body to force the happy-path payload. Supports{" "}
        <code className="text-white/50">{"{{variables}}"}</code>. Leave empty and
        the AI generates one from the schema.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setErr(null)
        }}
        spellCheck={false}
        placeholder={'{\n  "email": "{{email}}",\n  "amount": 100\n}'}
        className="w-full min-h-[96px] rounded bg-black/40 border border-white/10 p-2 font-mono text-[11px] text-white/80 outline-none focus:border-white/25 resize-y"
      />
      {err && <p className="text-red-400 mt-1 text-[11px]">{err}</p>}
      <div className="flex items-center gap-2 mt-1.5">
        <Button
          type="button"
          size="sm"
          className="h-7 bg-white/10 hover:bg-white/20 text-white text-xs"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save body"}
        </Button>
        {text && (
          <button
            type="button"
            onClick={() => {
              setText("")
              setErr(null)
            }}
            className="text-[11px] text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        )}
        {saved && <span className="text-[11px] text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  )
}
