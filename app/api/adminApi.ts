// The operator's back office. Authenticated with a single admin key typed into
// the page — never with a user session, because these calls change what
// customers are allowed to spend.
//
// The key is kept in sessionStorage: it disappears when the tab closes, which is
// the right lifetime for something that shouldn't sit in a browser for weeks.

export interface AdminCompany {
  _id: string
  name: string
  plan: "free" | "test" | "pro" | "enterprise"
  // What the plan includes: api, mcp, automation, watchers.
  features: string[]
  aiBudgetUsd: number | null
  planNote: string
  createdAt: string
  ownerEmail: string
  members: number
  spentUsd: number
  ownKeyUsd: number
  calls: number
  limitUsd: number
  percent: number
}

export interface AdminCompanyUsage {
  plan: string
  spentUsd: number
  limitUsd: number
  remainingUsd: number
  overLimit: boolean
  percent: number
  since: string
  calls: number
  byAction: {
    action: string
    costUsd: number
    calls: number
    tokensIn: number
    tokensOut: number
  }[]
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ""
const KEY_STORAGE = "olivia.adminKey"

export function getAdminKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || ""
  } catch {
    return ""
  }
}

export function setAdminKey(key: string) {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    /* private window: the page still works, it just asks again on reload */
  }
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/admin${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-olivia-admin-key": getAdminKey(),
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      msg = JSON.parse(text)?.message || text
    } catch {
      /* keep the raw text */
    }
    const err = new Error(msg || `Request failed (${res.status})`) as Error & {
      status?: number
    }
    err.status = res.status
    throw err
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}

/** Cheap call to check the key before showing anything. */
export function pingAdmin() {
  return adminFetch<{ ok: boolean }>("/ping")
}

export function listCompanies() {
  return adminFetch<AdminCompany[]>("/companies")
}

export function getCompanyUsage(id: string) {
  return adminFetch<AdminCompanyUsage>(`/companies/${id}/usage`)
}

/** Fake spend, to watch a limit bite without paying for it. */
export function simulateSpend(id: string, usd: number) {
  return adminFetch<{ spentUsd: number; limitUsd: number; overLimit: boolean }>(
    `/companies/${id}/simulate-spend`,
    { method: "POST", body: JSON.stringify({ usd }) }
  )
}

export function clearSimulatedSpend(id: string) {
  return adminFetch<{ removed: number; spentUsd: number }>(
    `/companies/${id}/simulate-spend`,
    { method: "DELETE" }
  )
}

export function updateCompanyPlan(
  id: string,
  payload: { plan?: string; aiBudgetUsd?: number | null; planNote?: string }
) {
  return adminFetch<AdminCompany>(`/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
