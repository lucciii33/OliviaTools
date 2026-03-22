import { Link } from "react-router"
import { BookOpen, Zap, GitPullRequest, ArrowRight } from "lucide-react"
import { buttonVariants } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-sm">API Docs</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-white/70 hover:text-white")}
          >
            Log in
          </Link>
          <Link
            to="/register"
            className={cn(buttonVariants({ size: "sm" }), "bg-blue-600 hover:bg-blue-500 text-white border-transparent")}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
            <Zap className="h-3 w-3" />
            Powered by AI
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white">
            API docs that write{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              themselves
            </span>
          </h1>

          <p className="text-lg text-white/60 leading-relaxed">
            Auto-generates API docs from your GitHub PRs using AI. Connect your repo,
            open a Pull Request, and your documentation is ready instantly.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-blue-600 hover:bg-blue-500 text-white border-transparent inline-flex items-center gap-2"
              )}
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/20 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/30"
              )}
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            {
              icon: <GitPullRequest className="h-5 w-5 text-blue-400" />,
              title: "Open a PR",
              desc: "Our GitHub App reads every diff automatically",
            },
            {
              icon: <Zap className="h-5 w-5 text-purple-400" />,
              title: "AI generates docs",
              desc: "Endpoints, params, and responses extracted instantly",
            },
            {
              icon: <BookOpen className="h-5 w-5 text-green-400" />,
              title: "Docs appear here",
              desc: "Organized by repo, always up to date",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left space-y-2"
            >
              {f.icon}
              <h3 className="font-medium text-sm text-white">{f.title}</h3>
              <p className="text-xs text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-white/30">
        API Docs — auto-generated from your GitHub PRs
      </footer>
    </div>
  )
}
