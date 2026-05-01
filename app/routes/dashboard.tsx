import { useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRight, BookOpen, Boxes, Server, Sparkles } from "lucide-react"
import { Button, buttonVariants } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { useAuth } from "~/context/AuthContext"
import { cn } from "~/lib/utils"

const options = [
  {
    title: "API",
    description: "Generate and browse API docs from GitHub repositories and pull requests.",
    to: "/docs",
    action: "Open API Docs",
    icon: BookOpen,
    accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "MCP",
    description: "Connect an MCP server, generate tool documentation, and review saved docs.",
    to: "/mcp-docs",
    action: "Open MCP Docs",
    icon: Server,
    accent: "text-purple-300 bg-purple-500/10 border-purple-500/20",
  },
]

export default function DashboardSelector() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate("/login", { replace: true })
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-5 md:px-8 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-sm">API Docs</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden sm:block text-xs text-white/40 truncate max-w-48">
            {user.firstName} {user.lastName}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white hover:bg-white/10"
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="px-5 md:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">
              <Sparkles className="h-3 w-3" />
              Docs workspace
            </div>
            <h1 className="text-xl font-semibold text-white">Choose your docs experience</h1>
            <p className="text-sm text-white/50 mt-1">
              Open the existing API documentation workspace or configure MCP tool docs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((option) => {
              const Icon = option.icon
              return (
                <Link
                  key={option.title}
                  to={option.to}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-4">
                      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg border", option.accent)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-medium text-white">{option.title}</h2>
                        <p className="text-sm text-white/50 mt-1 leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "bg-blue-600 hover:bg-blue-500 text-white border-transparent inline-flex items-center gap-1.5"
                        )}
                      >
                        {option.action}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <Boxes className="h-4 w-4 text-white/20 group-hover:text-white/50 shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>

          <Card className="mt-3 bg-white/[0.03] border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-sm">Current API workspace is unchanged</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/50">
                The API option opens the same dashboard and repository documentation flow.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
