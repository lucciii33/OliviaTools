import { useEffect } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRight, BookOpen, Boxes, FlaskConical, Server, Settings, Sparkles } from "lucide-react"
import { Button, buttonVariants } from "~/components/ui/button"
import { useAuth } from "~/context/AuthContext"
import { cn } from "~/lib/utils"

const options = [
  {
    title: "API Automation",
    description: "Generate endpoint docs from repositories, backfills, and pull request changes. Run QA against documented endpoints.",
    to: "/docs",
    action: "Open API workspace",
    icon: BookOpen,
    accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "MCP Automation",
    description: "Connect live MCP servers, document tools and schemas, create smoke suites, and track tool-level bugs.",
    to: "/mcp-docs",
    action: "Open MCP workspace",
    icon: Server,
    accent: "text-purple-300 bg-purple-500/10 border-purple-500/20",
  },
  {
    title: "Front End Automation",
    description: "Upload a demo video and Olivia writes your Playwright E2E tests — BDD test cases, self-healing runs, committed to your repo.",
    to: "/e2e-qa",
    action: "Open Front End workspace",
    icon: FlaskConical,
    accent: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    title: "Workspace Members",
    description: "Invite teammates, review pending invitations, and manage who has access to this workspace.",
    to: "/workspace",
    action: "Manage members",
    icon: Settings,
    accent: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
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
          <Sparkles className="h-5 w-5 text-cyan-300" />
          <span className="font-semibold text-sm">Olivia Tool</span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden sm:block text-xs text-white/40 truncate max-w-48">
            {user.firstName} {user.lastName}
            {user.role ? ` · ${user.role}` : ""}
          </p>
          <Link
            to="/workspace"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-white/50 hover:text-white hover:bg-white/10 gap-1.5"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Workspace
          </Link>
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
              Olivia workspace
            </div>
            <h1 className="text-xl font-semibold text-white">Choose what Olivia should automate</h1>
            <p className="text-sm text-white/50 mt-1">
              API automation and MCP automation are separate workflows with different sources, docs, tests, and bug reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

        </div>
      </main>
    </div>
  )
}
