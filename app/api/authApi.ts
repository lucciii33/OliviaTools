const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  pais: string
  edad: number
  terms: boolean
  inviteToken?: string
}

export interface AuthResponse {
  token: string
  _id: string
  email: string
  firstName: string
  lastName: string
  pais?: string
  edad?: number
  terms?: boolean
  companyId?: string
  role?: "owner" | "member" | string
}

async function readErrorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  if (!data) return fallback
  if (typeof data === "string") return data
  if (Array.isArray(data)) return data.map(String).join("\n")
  if (typeof data !== "object") return fallback

  if ("message" in data) {
    const value = data.message
    if (Array.isArray(value)) return value.map(String).join("\n")
    if (value && typeof value === "object") return JSON.stringify(value)
    if (value) return String(value)
  }

  if ("error" in data) {
    const value = data.error
    if (Array.isArray(value)) return value.map(String).join("\n")
    if (value && typeof value === "object") return JSON.stringify(value)
    if (value) return String(value)
  }

  if ("errors" in data) {
    const value = data.errors
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item
          if (item && typeof item === "object" && "msg" in item) {
            return String(item.msg)
          }
          if (item && typeof item === "object" && "message" in item) {
            return String(item.message)
          }
          return JSON.stringify(item)
        })
        .join("\n")
    }
    if (value && typeof value === "object") return JSON.stringify(value)
    if (value) return String(value)
  }

  return JSON.stringify(data)
}

export interface TwoFactorChallenge {
  requires2FA: true
  twoFactorToken: string
}

export type LoginResult = AuthResponse | TwoFactorChallenge

export function isTwoFactorChallenge(r: LoginResult): r is TwoFactorChallenge {
  return (r as TwoFactorChallenge).requires2FA === true
}

export async function loginApi(payload: LoginPayload): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 423) {
      throw new Error(
        await readErrorMessage(res, "Cuenta bloqueada temporalmente. Intenta más tarde.")
      )
    }
    throw new Error(await readErrorMessage(res, `Login failed (${res.status})`))
  }
  return res.json()
}

export async function loginVerifyTwoFactorApi(payload: {
  twoFactorToken: string
  code: string
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/user/login/2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `2FA verification failed (${res.status})`))
  }
  return res.json()
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(
      await readErrorMessage(res, `Registration failed (${res.status})`)
    )
  }
  return res.json()
}
