import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "~/lib/utils"

/**
 * Fades its children in when they are scrolled to.
 *
 * Starts visible and only hides itself once the observer is known to work, so a
 * browser without IntersectionObserver (or with JS still loading) shows the
 * content rather than a blank page — the failure mode of every scroll-reveal
 * that sets opacity in CSS and waits for a script.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    // Anything already on screen on the first paint must not flash.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setArmed(true)
      setVisible(true)
      return
    }

    setArmed(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(armed && "reveal", visible && "is-visible", className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
