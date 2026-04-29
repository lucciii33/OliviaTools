import { useEffect } from "react"
import { BookOpen, Menu } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Button } from "~/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { useAuth } from "~/context/AuthContext"
import { useInstallationsApi } from "~/api/installationsApi"
import { cn } from "~/lib/utils"

const itemBase =
  "w-full flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md transition-colors truncate"
const itemIdle = "text-white/60 hover:text-white hover:bg-white/5"
const itemActive = "bg-white/10 text-white"

function SidebarContent() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { installations, getInstallations } = useInstallationsApi()
  const isAllActive = location.pathname === "/docs"

  useEffect(() => {
    getInstallations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <BookOpen className="h-5 w-5 text-blue-400" />
        <span className="font-semibold text-white text-sm">API Docs</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-white/30 uppercase tracking-wider px-2 mb-2">
          Repositories
        </p>
        <Link
          to="/docs"
          className={cn(itemBase, isAllActive ? itemActive : itemIdle)}
        >
          <span>All repos</span>
        </Link>
        {installations.map((i) => {
          const path = `/docs/${i.owner}/${i.repo}`
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={cn(itemBase, active ? itemActive : itemIdle)}
            >
              <span className="truncate">{i.repo}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/10 pt-4 space-y-2">
        {user && (
          <p className="text-xs text-white/40 px-2 truncate">
            {user.firstName} {user.lastName}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10"
          onClick={logout}
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white/[0.03] border-r border-white/10 min-h-screen">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet>
          <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-56 bg-[#0d0d14] border-white/10"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
