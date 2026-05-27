import { apiFetch } from "~/utils/api"

export interface TwoFactorSetupResponse {
  qrDataUrl: string
  otpauthUrl: string
  secret: string
}

export interface TwoFactorVerifyResponse {
  twoFactorEnabled: true
  backupCodes: string[]
}

export interface TwoFactorDisableResponse {
  twoFactorEnabled: false
}

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : fallback
    throw new Error(message)
  }
  return data as T
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const res = await apiFetch("/api/user/me/2fa/setup", { method: "POST" })
  return readJson<TwoFactorSetupResponse>(res, "No se pudo iniciar la configuración de 2FA")
}

export async function verifyTwoFactorSetup(code: string): Promise<TwoFactorVerifyResponse> {
  const res = await apiFetch("/api/user/me/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
  return readJson<TwoFactorVerifyResponse>(res, "Código inválido")
}

export async function disableTwoFactor(password: string): Promise<TwoFactorDisableResponse> {
  const res = await apiFetch("/api/user/me/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ password }),
  })
  return readJson<TwoFactorDisableResponse>(res, "No se pudo desactivar 2FA")
}
