import { useEffect, useRef } from "react"

// Minimal typing for the Google Identity Services global.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (resp: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void
        }
      }
    }
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client"
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      return
    }
    const s = document.createElement("script")
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load Google script"))
    document.head.appendChild(s)
  })
}

// Renders the official "Sign in with Google" button. Calls onCredential with
// the ID token (a signed JWT) which the backend verifies. Renders nothing if
// VITE_GOOGLE_CLIENT_ID isn't configured.
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return
    let cancelled = false
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resp) => onCredential(resp.credential),
        })
        window.google.accounts.id.renderButton(ref.current, {
          theme: "filled_black",
          size: "large",
          width: 320,
          text: "signin_with",
          shape: "rectangular",
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!CLIENT_ID) return null
  return <div ref={ref} className="flex justify-center" />
}
