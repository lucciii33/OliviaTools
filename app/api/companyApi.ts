import { apiFetch } from "~/utils/api"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export interface Company {
  _id?: string
  name: string
}

export interface CompanyMember {
  _id: string
  firstName?: string
  lastName?: string
  email: string
  role: "owner" | "member" | string
}

export interface PendingInvite {
  _id: string
  email: string
  role?: "owner" | "member" | string
  expiresAt: string
}

export interface InvitePreview {
  email: string
  role: "owner" | "member" | string
  company: Company
  expiresAt: string
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with ${res.status}`
    throw new Error(message)
  }
  return data as T
}

export async function getInvitePreview(token: string) {
  const res = await fetch(
    `${BASE_URL}/api/company/invite/${encodeURIComponent(token)}`,
    { cache: "no-store" }
  )
  return readJson<InvitePreview>(res)
}

export async function getCompany() {
  const res = await apiFetch("/api/company", { cache: "no-store" })
  return readJson<Company>(res)
}

export async function getCompanyMembers() {
  const res = await apiFetch("/api/company/members", { cache: "no-store" })
  return readJson<{
    members: CompanyMember[]
    pendingInvites: PendingInvite[]
  }>(res)
}

export async function inviteCompanyMember(email: string) {
  const res = await apiFetch("/api/company/invite", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
  return readJson<PendingInvite | { invite?: PendingInvite; message?: string }>(res)
}

export async function acceptCompanyInvite(token: string) {
  const res = await apiFetch("/api/company/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
  return readJson<{
    companyId?: string
    role?: "owner" | "member" | string
    token?: string
    _id?: string
    email?: string
    firstName?: string
    lastName?: string
  }>(res)
}

export async function removeCompanyMember(userId: string) {
  const res = await apiFetch(`/api/company/members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  })
  return readJson<{ ok?: boolean; message?: string }>(res)
}

export async function cancelCompanyInvite(inviteId: string) {
  const res = await apiFetch(`/api/company/invite/${encodeURIComponent(inviteId)}`, {
    method: "DELETE",
  })
  return readJson<{ ok?: boolean; message?: string }>(res)
}

export interface SlackConfig {
  slackChannelId: string | null
  slackBotTokenMask: string | null
  hasSlackBotToken: boolean
}

export async function getSlackConfig() {
  const res = await apiFetch("/api/company/slack", { cache: "no-store" })
  return readJson<SlackConfig>(res)
}

export async function saveSlackConfig(channelId: string, botToken: string) {
  const res = await apiFetch("/api/company/slack", {
    method: "PUT",
    body: JSON.stringify({ channelId, botToken }),
  })
  return readJson<SlackConfig>(res)
}

export async function deleteSlackConfig() {
  const res = await apiFetch("/api/company/slack", { method: "DELETE" })
  return readJson<SlackConfig>(res)
}
