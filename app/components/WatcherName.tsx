import { useState } from "react"
import { Pencil } from "lucide-react"

// A watcher's name, renamable in place. Older watchers have no name, so the
// repo (or project) is shown until someone gives it one.
export function WatcherName({
  name,
  fallback,
  onRename,
}: {
  name?: string
  fallback: string
  onRename: (name: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name || "")
  const [saving, setSaving] = useState(false)

  async function save() {
    const next = value.trim()
    if (!next || next === (name || "")) {
      setEditing(false)
      setValue(name || "")
      return
    }
    setSaving(true)
    try {
      await onRename(next)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={80}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save()
          if (e.key === "Escape") {
            setEditing(false)
            setValue(name || "")
          }
        }}
        className="w-48 bg-white/[0.04] border border-white/15 rounded px-2 py-0.5 text-sm text-white/85 focus:outline-none focus:border-white/30"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(name || "")
        setEditing(true)
      }}
      title="Rename"
      className="group inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white"
    >
      <span className={name ? "font-medium" : "font-mono"}>{name || fallback}</span>
      <Pencil className="h-3 w-3 text-white/25 opacity-0 group-hover:opacity-100" />
    </button>
  )
}
