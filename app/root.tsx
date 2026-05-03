import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
} from "react-router"

import type { Route } from "./+types/root"
import { AuthProvider } from "~/context/AuthContext"
import "./app.css"

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  if (url.pathname.startsWith("//")) {
    url.pathname = `/${url.pathname.replace(/^\/+/, "")}`
    return redirect(`${url.pathname}${url.search}`)
  }
  return null
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[#0a0a0f] antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{message}</h1>
      <p className="text-white/60 mb-6">{details}</p>
      {stack && (
        <pre className="w-full max-w-2xl p-4 bg-white/5 rounded-lg overflow-x-auto text-xs text-white/40">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
