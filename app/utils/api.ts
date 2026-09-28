import { getAuthToken, removeAuthUser } from "~/auth"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Limit reached — the workspace's monthly AI budget (402) or a free-trial
  // counter (403 with a code). Announced globally instead of being left to each
  // page: there are dozens of buttons that can hit it, and the ones that don't
  // handle it would show "Request failed (402)" to a paying customer.
  //
  // The response is cloned so the caller still gets an unread body.
  if ((res.status === 402 || res.status === 403) && typeof window !== "undefined") {
    void res
      .clone()
      .json()
      .then((body) => {
        if (!body?.code && res.status === 403) return // a plain permission error
        window.dispatchEvent(
          new CustomEvent("olivia:limit-reached", {
            detail: {
              code: body?.code || "LIMIT_REACHED",
              message: body?.message || "This workspace has reached its limit.",
            },
          })
        )
      })
      .catch(() => {})
  }

  if (res.status === 401 && typeof window !== "undefined") {
    removeAuthUser()
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
  }

  return res
}
