export interface KnownRepo {
  owner: string
  repo: string
}

const KEY = "known-repos"

export function getKnownRepos(): KnownRepo[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is KnownRepo =>
        typeof r?.owner === "string" && typeof r?.repo === "string"
    )
  } catch {
    return []
  }
}

export function addKnownRepo(entry: KnownRepo): KnownRepo[] {
  if (!entry.owner || !entry.repo) return getKnownRepos()
  const current = getKnownRepos()
  const deduped = current.filter(
    (r) => !(r.owner === entry.owner && r.repo === entry.repo)
  )
  const next = [{ owner: entry.owner, repo: entry.repo }, ...deduped]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  return next
}

export function removeKnownRepo(entry: KnownRepo): KnownRepo[] {
  const next = getKnownRepos().filter(
    (r) => !(r.owner === entry.owner && r.repo === entry.repo)
  )
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  return next
}
