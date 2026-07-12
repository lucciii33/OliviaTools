import { useEffect, useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Check,
  Clock,
  GraduationCap,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react"
import { buttonVariants } from "~/components/ui/button"
import {
  COURSES,
  getPurchasedIds,
  lessonCount,
  type Course,
} from "~/lib/academy-data"
import { cn } from "~/lib/utils"

export function meta() {
  return [
    { title: "Olivia Academy — Learn testing & automation" },
    {
      name: "description",
      content: "Buy courses and learn end-to-end testing, APIs, and TypeScript with Olivia.",
    },
  ]
}

const CATEGORIES = ["All", "Testing", "Programming"] as const

function priceLabel(price: number) {
  return price === 0 ? "Free" : `$${price}`
}

function CourseCard({ course, owned }: { course: Course; owned: boolean }) {
  return (
    <Link
      to={`/academy/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div
        className={cn(
          "relative flex h-32 items-center justify-center bg-gradient-to-br text-5xl",
          course.gradient
        )}
      >
        <span className="drop-shadow">{course.emoji}</span>
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">
          {course.level}
        </span>
        {owned && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
            <Check className="h-3 w-3" /> Owned
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-medium leading-snug text-white">{course.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/50">{course.subtitle}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-300" /> {course.rating}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {course.students.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {course.hours}h
          </span>
          <span className="inline-flex items-center gap-1">
            <PlayCircle className="h-3.5 w-3.5" /> {lessonCount(course)} lessons
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <span
            className={cn(
              "text-lg font-semibold",
              course.price === 0 ? "text-emerald-300" : "text-white"
            )}
          >
            {priceLabel(course.price)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-cyan-300 transition-transform group-hover:translate-x-0.5">
            {owned ? "Continue" : "View course"}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function Academy() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All")
  const [owned, setOwned] = useState<string[]>([])

  useEffect(() => {
    setOwned(getPurchasedIds())
  }, [])

  const filtered = COURSES.filter((c) => {
    const matchesCategory = category === "All" || c.category === category
    const matchesQuery =
      query.trim() === "" ||
      `${c.title} ${c.subtitle} ${c.description}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/academy" className="flex items-center gap-2 text-white/90 transition-colors hover:text-white">
            <GraduationCap className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">Olivia Academy</span>
          </Link>
          <Link
            to="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-white/50 hover:bg-white/10 hover:text-white")}
          >
            Back to tools
          </Link>
        </div>
      </header>

      <main className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              <Sparkles className="h-3 w-3" /> Learn by doing
            </div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">
              Master testing & automation with Olivia
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
              Buy a course once and get lifetime access to its videos, PDFs, hands-on exercises, and
              exams. Pick a track below and start learning.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses…"
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none"
              />
            </div>
            <div className="flex gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    category === cat
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
              No courses match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} owned={owned.includes(course.id)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
