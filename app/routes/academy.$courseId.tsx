import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  FileText,
  GraduationCap,
  Lightbulb,
  Lock,
  PenLine,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Star,
  Users,
  Video,
} from "lucide-react"
import { Button, buttonVariants } from "~/components/ui/button"
import {
  getCourseBySlug,
  isPurchased,
  lessonCount,
  purchaseCourse,
  refundCourse,
  type Course,
  type ExamLesson,
  type ExerciseLesson,
  type Lesson,
  type Module,
  type PdfLesson,
  type ReadingLesson,
  type VideoLesson,
} from "~/lib/academy-data"
import { cn } from "~/lib/utils"

const LESSON_META: Record<Lesson["type"], { icon: typeof PlayCircle; label: string }> = {
  video: { icon: PlayCircle, label: "Video" },
  reading: { icon: BookOpen, label: "Reading" },
  pdf: { icon: FileText, label: "PDF" },
  exercise: { icon: PenLine, label: "Exercise" },
  exam: { icon: ShieldCheck, label: "Exam" },
}

// ---------------- Lesson players ----------------

function VideoPlayer({ lesson }: { lesson: VideoLesson }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
        {lesson.src ? (
          <video key={lesson.id} controls className="aspect-video w-full" src={lesson.src}>
            Your browser does not support video.
          </video>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.04] to-transparent text-white/40">
            <Video className="h-8 w-8" />
            <p className="text-sm font-medium text-white/60">Video coming soon</p>
            <p className="text-xs">AWS upload pending · {lesson.duration}</p>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-medium text-white">{lesson.title}</h2>
        {lesson.description && <p className="mt-1 text-sm text-white/50">{lesson.description}</p>}
      </div>
    </div>
  )
}

function ReadingPlayer({ lesson }: { lesson: ReadingLesson }) {
  return (
    <article className="space-y-4">
      <div>
        <div className="mb-1 inline-flex items-center gap-1.5 text-xs text-sky-300">
          <BookOpen className="h-3.5 w-3.5" /> Reading · {lesson.minutes} min
        </div>
        <h2 className="text-lg font-medium text-white">{lesson.title}</h2>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-white/70">
        {lesson.body.split("\n\n").map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {renderInline(para)}
          </p>
        ))}
      </div>
    </article>
  )
}

// Minimal inline formatting: `code` → styled, *word* → emphasis.
function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-200">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="text-white/90 not-italic font-medium">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}

function PdfViewer({ lesson }: { lesson: PdfLesson }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-white">{lesson.title}</h2>
        {lesson.description && <p className="mt-1 text-sm text-white/50">{lesson.description}</p>}
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
        <iframe key={lesson.id} title={lesson.title} src={lesson.src} className="h-[70vh] w-full" />
      </div>
      <a
        href={lesson.src}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <FileText className="h-3.5 w-3.5" /> Open in new tab ({lesson.pages} pages)
      </a>
    </div>
  )
}

function ExercisePlayer({ lesson }: { lesson: ExerciseLesson }) {
  const [answer, setAnswer] = useState(lesson.starter ?? "")
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  // Reset editor when switching between exercises.
  useEffect(() => {
    setAnswer(lesson.starter ?? "")
    setShowHint(false)
    setShowSolution(false)
  }, [lesson.id, lesson.starter])

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 inline-flex items-center gap-1.5 text-xs text-amber-300">
          <PenLine className="h-3.5 w-3.5" /> Hands-on exercise
        </div>
        <h2 className="text-lg font-medium text-white">{lesson.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{lesson.prompt}</p>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        spellCheck={false}
        className="h-64 w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-emerald-100 focus:border-cyan-500/40 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {lesson.hint && (
          <Button variant="outline" size="sm" onClick={() => setShowHint((v) => !v)}>
            <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide hint" : "Show hint"}
          </Button>
        )}
        {lesson.solution && (
          <Button variant="outline" size="sm" onClick={() => setShowSolution((v) => !v)}>
            <Check className="h-3.5 w-3.5" /> {showSolution ? "Hide solution" : "Show solution"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setAnswer(lesson.starter ?? "")}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {showHint && lesson.hint && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          💡 {lesson.hint}
        </div>
      )}
      {showSolution && lesson.solution && (
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {lesson.solution}
        </pre>
      )}
    </div>
  )
}

function ExamPlayer({ lesson }: { lesson: ExamLesson }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setAnswers({})
    setSubmitted(false)
  }, [lesson.id])

  const correct = lesson.questions.filter((q) => answers[q.id] === q.correctIndex).length
  const score = Math.round((correct / lesson.questions.length) * 100)
  const passed = score >= lesson.passScore
  const allAnswered = lesson.questions.every((q) => answers[q.id] !== undefined)

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 inline-flex items-center gap-1.5 text-xs text-cyan-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Exam · pass at {lesson.passScore}%
        </div>
        <h2 className="text-lg font-medium text-white">{lesson.title}</h2>
      </div>

      <div className="space-y-4">
        {lesson.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-sm font-medium text-white">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi
                const isCorrect = oi === q.correctIndex
                const showState = submitted && (selected || isCorrect)
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !submitted && selected && "border-cyan-500/40 bg-cyan-500/10 text-white",
                      !submitted && !selected && "border-white/10 text-white/70 hover:bg-white/5",
                      showState && isCorrect && "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
                      showState && selected && !isCorrect && "border-red-400/40 bg-red-500/15 text-red-100",
                      submitted && !showState && "border-white/10 text-white/40"
                    )}
                  >
                    {submitted && isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                    ) : (
                      <Circle className={cn("h-4 w-4 shrink-0", selected ? "text-cyan-300" : "text-white/30")} />
                    )}
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <Button disabled={!allAnswered} onClick={() => setSubmitted(true)}>
          Submit exam
        </Button>
      ) : (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4",
            passed
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-amber-400/30 bg-amber-500/10"
          )}
        >
          <div>
            <p className={cn("text-sm font-semibold", passed ? "text-emerald-200" : "text-amber-200")}>
              {passed ? "Passed 🎉" : "Not quite yet"}
            </p>
            <p className="text-xs text-white/50">
              You scored {score}% ({correct}/{lesson.questions.length} correct)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAnswers({})
              setSubmitted(false)
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retake
          </Button>
        </div>
      )}
    </div>
  )
}

function LessonRenderer({ lesson }: { lesson: Lesson }) {
  switch (lesson.type) {
    case "video":
      return <VideoPlayer lesson={lesson} />
    case "reading":
      return <ReadingPlayer lesson={lesson} />
    case "pdf":
      return <PdfViewer lesson={lesson} />
    case "exercise":
      return <ExercisePlayer lesson={lesson} />
    case "exam":
      return <ExamPlayer lesson={lesson} />
  }
}

// ---------------- Sales view (not purchased) ----------------

function SalesView({ course, onBuy }: { course: Course; onBuy: () => void }) {
  return (
    <main className="px-5 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-white/40">
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5">{course.level}</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5">{course.category}</span>
            </div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">{course.title}</h1>
            <p className="mt-2 text-base text-white/60">{course.subtitle}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/40">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-300" /> {course.rating} rating
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> {course.students.toLocaleString()} students
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> {course.hours}h · {lessonCount(course)} lessons
              </span>
              <span>By {course.instructor}</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-white/70">{course.description}</p>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              What you'll learn
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <div key={o} className="flex items-start gap-2 text-sm text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {o}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
              Curriculum
            </h2>
            <div className="space-y-3">
              {course.modules.map((m, mi) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">
                    Module {mi + 1}: {m.title}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">{m.summary}</p>
                  <ul className="mt-3 space-y-1.5">
                    {m.lessons.map((l) => {
                      const Meta = LESSON_META[l.type]
                      return (
                        <li key={l.id} className="flex items-center gap-2 text-sm text-white/50">
                          <Meta.icon className="h-4 w-4 text-white/30" />
                          <span className="flex-1">{l.title}</span>
                          <Lock className="h-3.5 w-3.5 text-white/20" />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Purchase card */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div
              className={cn(
                "flex h-40 items-center justify-center bg-gradient-to-br text-6xl",
                course.gradient
              )}
            >
              {course.emoji}
            </div>
            <div className="space-y-4 p-5">
              <div className="text-3xl font-semibold text-white">
                {course.price === 0 ? "Free" : `$${course.price}`}
                {course.price > 0 && (
                  <span className="ml-2 text-sm font-normal text-white/40 line-through">
                    ${course.price + 30}
                  </span>
                )}
              </div>
              <Button className="w-full" size="lg" onClick={onBuy}>
                {course.price === 0 ? "Enroll for free" : "Buy this course"}
              </Button>
              <p className="text-center text-xs text-white/30">
                Full lifetime access · 30-day money-back
              </p>
              <ul className="space-y-2 border-t border-white/10 pt-4 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-white/30" /> {lessonCount(course)} lessons
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/30" /> Downloadable PDFs
                </li>
                <li className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-white/30" /> Hands-on exercises
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-white/30" /> Exams & certificates
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

// ---------------- Learning view (purchased) ----------------

function LearnView({ course, onRefund }: { course: Course; onRefund: () => void }) {
  const [activeId, setActiveId] = useState(course.modules[0]?.lessons[0]?.id)
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    Object.fromEntries(course.modules.map((m, i) => [m.id, i === 0]))
  )
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  const allLessons = useMemo(
    () => course.modules.flatMap((m) => m.lessons),
    [course]
  )
  const active = allLessons.find((l) => l.id === activeId) ?? allLessons[0]
  const progress = Math.round((completed.size / allLessons.length) * 100)

  function toggleModule(id: string) {
    setOpenModules((o) => ({ ...o, [id]: !o[id] }))
  }

  function goNext() {
    const idx = allLessons.findIndex((l) => l.id === active.id)
    setCompleted((c) => new Set(c).add(active.id))
    if (idx < allLessons.length - 1) setActiveId(allLessons[idx + 1].id)
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[320px_1fr]">
      {/* Curriculum sidebar */}
      <aside className="lg:sticky lg:top-6 lg:h-fit lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-white/50">
            <span>Your progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {course.modules.map((m: Module, mi) => (
            <div key={m.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => toggleModule(m.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
              >
                <span className="text-sm font-medium text-white/90">
                  {mi + 1}. {m.title}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-white/40 transition-transform",
                    openModules[m.id] && "rotate-180"
                  )}
                />
              </button>
              {openModules[m.id] && (
                <ul className="pb-2">
                  {m.lessons.map((l) => {
                    const Meta = LESSON_META[l.type]
                    const isActive = l.id === active.id
                    const done = completed.has(l.id)
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => setActiveId(l.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                            isActive ? "bg-cyan-500/10 text-white" : "text-white/60 hover:bg-white/5"
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                          ) : (
                            <Meta.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-cyan-300" : "text-white/30")} />
                          )}
                          <span className="flex-1 leading-snug">{l.title}</span>
                          {l.type === "video" && (
                            <span className="text-[11px] text-white/30">{(l as VideoLesson).duration}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onRefund}
          className="mt-4 w-full text-center text-xs text-white/25 hover:text-white/50"
        >
          Reset purchase (demo)
        </button>
      </aside>

      {/* Active lesson */}
      <section className="min-w-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
          <LessonRenderer lesson={active} />
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
              {(() => {
                const Meta = LESSON_META[active.type]
                return <Meta.icon className="h-3.5 w-3.5" />
              })()}
              {LESSON_META[active.type].label}
            </span>
            <Button onClick={goNext}>
              {completed.has(active.id) ? "Next lesson" : "Mark complete & continue"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

// ---------------- Route ----------------

export default function CourseDetail() {
  const { courseId } = useParams()
  const course = getCourseBySlug(courseId)
  const [owned, setOwned] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (course) setOwned(isPurchased(course.id))
    setReady(true)
  }, [course])

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white">
        <p className="text-white/60">Course not found.</p>
        <Link to="/academy" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to catalog
        </Link>
      </div>
    )
  }

  function buy() {
    purchaseCourse(course!.id)
    setOwned(true)
  }
  function refund() {
    refundCourse(course!.id)
    setOwned(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/academy" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Academy
          </Link>
          <Link to="/academy" className="flex items-center gap-2 text-white/90">
            <GraduationCap className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">Olivia Academy</span>
          </Link>
        </div>
      </header>

      {ready && (owned ? <LearnView course={course} onRefund={refund} /> : <SalesView course={course} onBuy={buy} />)}
    </div>
  )
}
