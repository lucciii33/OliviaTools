import { useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router"

export default function CatchAll() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname.startsWith("//")) {
      navigate(
        `/${location.pathname.replace(/^\/+/, "")}${location.search}`,
        { replace: true }
      )
    }
  }, [location.pathname, location.search, navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 text-white">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-white/50">
          This link does not match a valid Olivia Tool route.
        </p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-cyan-400 px-3 text-sm font-medium text-slate-950 hover:bg-cyan-300"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
