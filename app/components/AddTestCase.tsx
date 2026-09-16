import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "~/components/ui/button"

// Write ONE test by hand. The generators only ever produce a whole suite, so
// wanting one more check meant regenerating everything and losing the edits.
// Empty box = a blank test to fill in; a sentence = Claude writes that case.
export function AddTestCase({
  onCreate,
  placeholder = "Describe the test, or leave empty for a blank one",
}: {
  onCreate: (instruction: string) => Promise<boolean>
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const ok = await onCreate(instruction.trim())
    setSaving(false)
    if (ok) {
      setInstruction("")
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-white/40 hover:text-white/70"
      >
        <Plus className="h-3 w-3" />
        Add a test
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        autoFocus
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !saving) void submit()
          if (e.key === "Escape") {
            setOpen(false)
            setInstruction("")
          }
        }}
        placeholder={placeholder}
        className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/25"
      />
      <Button
        size="sm"
        type="button"
        className="h-7 text-[11px]"
        disabled={saving}
        onClick={submit}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
      </Button>
      <button
        type="button"
        className="text-[11px] text-white/35 hover:text-white/60"
        onClick={() => {
          setOpen(false)
          setInstruction("")
        }}
      >
        Cancel
      </button>
    </div>
  )
}
