// Mock data for Olivia Academy — no backend yet.
// Purchases are simulated in localStorage (see helpers at the bottom).

export type LessonType = "video" | "reading" | "pdf" | "exercise" | "exam"

export interface VideoLesson {
  id: string
  type: "video"
  title: string
  duration: string
  // AWS video URL. Leave "" to show a "coming soon" placeholder until the
  // real URL is dropped in.
  src: string
  description?: string
}

export interface ReadingLesson {
  id: string
  type: "reading"
  title: string
  minutes: number
  // Paragraphs separated by a blank line. Rendered as prose.
  body: string
}

export interface PdfLesson {
  id: string
  type: "pdf"
  title: string
  pages: number
  src: string
  description?: string
}

export interface ExerciseLesson {
  id: string
  type: "exercise"
  title: string
  prompt: string
  starter?: string
  hint?: string
  solution?: string
}

export interface ExamQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface ExamLesson {
  id: string
  type: "exam"
  title: string
  passScore: number // percentage needed to pass
  questions: ExamQuestion[]
}

export type Lesson = VideoLesson | ReadingLesson | PdfLesson | ExerciseLesson | ExamLesson

export interface Module {
  id: string
  title: string
  summary: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  price: number
  level: "Beginner" | "Intermediate" | "Advanced"
  category: string
  instructor: string
  hours: number
  rating: number
  students: number
  // Emoji + gradient stand in for a cover image (no assets/backend yet).
  emoji: string
  gradient: string
  outcomes: string[]
  modules: Module[]
}

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
const SAMPLE_PDF =
  "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"

// Videos are hosted on AWS S3. The bucket base URL comes from the
// VITE_VIDEO_BASE env var so it isn't hardcoded; per-lesson filenames are
// appended below. Empty base falls back to relative paths.
const VIDEO_BASE = import.meta.env.VITE_VIDEO_BASE ?? ""
const video = (file: string) => `${VIDEO_BASE}/${file}`

// Empty `src` shows a "coming soon" placeholder until the video is ready.
const AWS = "" // TODO: replace "" per lesson with the real video filename via video()

export const COURSES: Course[] = [
  {
    id: "postman",
    slug: "postman-fundamentals",
    title: "Postman: APIs from Zero",
    subtitle: "Understand APIs and test them like a pro with Postman",
    description:
      "Start from nothing: install Postman, understand what an API really is, learn the core HTTP methods (GET, POST, PUT, DELETE), and master endpoints, HTTPS, collections, environments, and status codes — with short videos, readings, and quick checks after each concept.",
    price: 0,
    level: "Beginner",
    category: "Testing",
    instructor: "Olivia",
    hours: 3,
    rating: 5.0,
    students: 0,
    emoji: "📮",
    gradient: "from-orange-500/30 to-amber-500/10",
    outcomes: [
      "Install and navigate Postman confidently",
      "Explain what an API is in plain language",
      "Use GET, POST, PUT and DELETE correctly",
      "Read endpoints, HTTPS URLs and status codes",
      "Organize requests with collections & environments",
    ],
    modules: [
      {
        id: "pm-m1",
        title: "Getting started & what an API is",
        summary: "Install Postman and build a mental model of APIs and methods.",
        lessons: [
          {
            id: "pm-m1-web",
            type: "video",
            title: "Postman: web vs desktop",
            duration: "4:00",
            src: video("POSTMAN+WEB.mov"),
            description: "Where Postman runs and which version we'll use.",
          },
          {
            id: "pm-m1-l1",
            type: "video",
            title: "Installing Postman",
            duration: "5:00",
            src: video("INSTALLETION.mov"),
            description: "Download, install, and create your free Postman account.",
          },
          {
            id: "pm-m1-l2",
            type: "video",
            title: "Installing Postman (part 2): a tour of the app",
            duration: "6:00",
            src: video("IINSTALLETION2.mov"),
            description: "Sidebar, request builder, tabs — where everything lives.",
          },
          {
            id: "pm-m1-l3",
            type: "video",
            title: 'What "API" stands for',
            duration: "4:30",
            src: video("STANDSFOR.mov"),
            description: "Application Programming Interface — what each word means.",
          },
          {
            id: "pm-m1-l4",
            type: "video",
            title: "The kitchen analogy: how an API works",
            duration: "5:15",
            src: video("HOW+IT+WORKS.mov"),
            description: "You (client) order from a waiter (API) who talks to the kitchen (server).",
          },

          // ---- GET ----
          {
            id: "pm-m1-l5",
            type: "video",
            title: "GET — reading data",
            duration: "5:40",
            src: video("GET.mov"),
          },
          {
            id: "pm-m1-l6",
            type: "reading",
            title: "How GET works",
            minutes: 2,
            body:
              "GET is the method you use to *read* data. It asks the server for a resource without changing anything — run the same GET ten times and you get the same result while the server stays untouched. That property is called being “safe” and “idempotent.”\n\nIn Postman you pick GET, type the URL, and hit Send. Anything you want to filter or paginate by (a search term, a page number) goes in the query string, after a `?` — for example `/products?category=shoes&page=2`.",
          },
          {
            id: "pm-m1-l7",
            type: "exam",
            title: "Quick check: GET",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "Which best describes a GET request?",
                options: [
                  "It creates a new resource on the server",
                  "It retrieves data without modifying the server",
                  "It deletes a resource",
                  "It uploads a file",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "Where do you usually put a search term in a GET request?",
                options: [
                  "In the request body",
                  "In the query string, after a ?",
                  "In the status code",
                  "In the password field",
                ],
                correctIndex: 1,
              },
            ],
          },

          // ---- POST ----
          {
            id: "pm-m1-l8",
            type: "video",
            title: "POST — creating data",
            duration: "5:50",
            src: video("POST.mov"),
          },
          {
            id: "pm-m1-l9",
            type: "reading",
            title: "How POST works",
            minutes: 2,
            body:
              "POST is how you *create* something new. You send a body — usually JSON — describing the resource you want the server to add, and the server typically responds with `201 Created` plus the new record (often including an `id` it generated for you).\n\nUnlike GET, POST is not idempotent: send it twice and you may create two separate records. In Postman you choose POST, open the Body tab, pick “raw → JSON”, and type your payload before hitting Send.",
          },
          {
            id: "pm-m1-l10",
            type: "exam",
            title: "Quick check: POST",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "What is POST typically used for?",
                options: [
                  "Reading a list of resources",
                  "Creating a new resource",
                  "Encrypting the connection",
                  "Renaming the server",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "Sending the same POST twice may…",
                options: [
                  "Always return the exact same record",
                  "Create two separate records",
                  "Delete the resource",
                  "Do nothing at all",
                ],
                correctIndex: 1,
              },
            ],
          },

          // ---- PUT ----
          {
            id: "pm-m1-l11",
            type: "video",
            title: "PUT — updating data",
            duration: "5:20",
            src: video("PUT.mov"),
          },
          {
            id: "pm-m1-l12",
            type: "reading",
            title: "How PUT works",
            minutes: 2,
            body:
              "PUT *updates* an existing resource by replacing it. You send the full representation to a specific URL — like `/users/42` — and the server overwrites what was there.\n\nPUT is idempotent: sending the same PUT repeatedly leaves the resource in the same final state. That is the key difference from POST — POST keeps creating, PUT keeps overwriting the same target.",
          },
          {
            id: "pm-m1-l13",
            type: "exam",
            title: "Quick check: PUT",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "PUT is used to…",
                options: [
                  "Create a brand-new resource every time",
                  "Replace / update an existing resource",
                  "Fetch a list of resources",
                  "Open an encrypted tunnel",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "Which property does PUT have that POST does not?",
                options: [
                  "It requires no URL",
                  "It is idempotent (same call → same final state)",
                  "It never sends a body",
                  "It only works over HTTP, not HTTPS",
                ],
                correctIndex: 1,
              },
            ],
          },

          // ---- DELETE ----
          {
            id: "pm-m1-l14",
            type: "video",
            title: "DELETE — removing data",
            duration: "4:40",
            src: video("DELETE.mov"),
          },
          {
            id: "pm-m1-l15",
            type: "reading",
            title: "How DELETE works",
            minutes: 2,
            body:
              "DELETE *removes* a resource at a given URL, such as `DELETE /users/42`. A successful delete often returns `204 No Content` — success with an empty body.\n\nDeleting the same thing twice usually still leaves it gone, so DELETE is considered idempotent even if the second call comes back `404 Not Found`.",
          },
          {
            id: "pm-m1-l16",
            type: "exam",
            title: "Quick check: DELETE",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "A successful DELETE often returns…",
                options: ["200 with the full object", "201 Created", "204 No Content", "500 Server Error"],
                correctIndex: 2,
              },
              {
                id: "q2",
                question: "What does DELETE /users/42 do?",
                options: [
                  "Creates user 42",
                  "Removes the user with id 42",
                  "Renames user 42",
                  "Lists all users",
                ],
                correctIndex: 1,
              },
            ],
          },

          // ---- HTTPS & endpoints ----
          {
            id: "pm-m1-l17",
            type: "video",
            title: "HTTPS explained",
            duration: "6:10",
            src: video("HTTP.mov"),
          },
          {
            id: "pm-m1-l18",
            type: "video",
            title: "Endpoints",
            duration: "5:30",
            src: video("ENDPOINT.mov"),
          },
          {
            id: "pm-m1-l18b",
            type: "video",
            title: "Endpoint example",
            duration: "6:00",
            src: video("ENDPOINT+EXAMPLE.mov"),
          },
          {
            id: "pm-m1-l18c",
            type: "video",
            title: "Endpoint example over HTTP",
            duration: "6:45",
            src: video("ENDPOINTEXMAPLEHTTP.mov"),
          },
          {
            id: "pm-m1-l19",
            type: "reading",
            title: "Endpoints & HTTPS",
            minutes: 3,
            body:
              "Every request travels to an *endpoint*: a base URL plus a path, like `https://api.store.com/v1/products`. The path (`/v1/products`) names the resource, and combined with a method (GET, POST…) it tells the server both what you want and what to do with it.\n\nThe “S” in HTTPS means the connection is encrypted with TLS, so nobody between you and the server can read or tamper with the traffic — always prefer it over plain HTTP. When you type a URL in Postman and choose a method, you are choosing an endpoint and an action together.",
          },
          {
            id: "pm-m1-l20",
            type: "exam",
            title: "Quick check: endpoints & HTTPS",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "What does the “S” in HTTPS provide?",
                options: [
                  "A faster connection",
                  "An encrypted (TLS) connection",
                  "A shorter URL",
                  "Automatic pagination",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "In https://api.store.com/v1/products, which part is the endpoint path?",
                options: ["https://", "api.store.com", "/v1/products", "the whole thing is the method"],
                correctIndex: 2,
              },
              {
                id: "q3",
                question: "What tells the server both WHAT you want and WHAT to do with it?",
                options: [
                  "Only the status code",
                  "The path (resource) together with the method (action)",
                  "Only the password",
                  "The color of the button",
                ],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
      {
        id: "pm-m2",
        title: "Working in Postman",
        summary: "Organize requests, switch environments, and read responses.",
        lessons: [
          {
            id: "pm-m2-l1",
            type: "video",
            title: "Collections & how to organize them",
            duration: "7:00",
            src: AWS,
            description: "Group related requests, add folders, and share a collection.",
          },
          {
            id: "pm-m2-l2",
            type: "video",
            title: "Environments & variables (dev, staging, prod)",
            duration: "7:30",
            src: AWS,
            description: "Use {{baseUrl}} variables to swap between environments in one click.",
          },
          {
            id: "pm-m2-l3",
            type: "video",
            title: "Status codes explained",
            duration: "6:20",
            src: AWS,
          },
          {
            id: "pm-m2-l4",
            type: "reading",
            title: "Status codes reference",
            minutes: 3,
            body:
              "Status codes are the server's short answer about what happened.\n\n2xx = success — 200 OK, 201 Created, 204 No Content.\n3xx = redirection.\n4xx = you made a mistake — 400 Bad Request, 401 Unauthenticated, 403 Forbidden, 404 Not Found.\n5xx = the server broke.\n\nLearning the common ones lets you debug an API at a glance: if you see 401 you fix your auth, if you see 404 you check the URL, and if you see 500 the problem is on the server side.",
          },
          {
            id: "pm-m2-l5",
            type: "exam",
            title: "Quick check: status codes",
            passScore: 100,
            questions: [
              {
                id: "q1",
                question: "A 404 means…",
                options: [
                  "The request succeeded",
                  "The resource was not found",
                  "The server crashed",
                  "You were redirected",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "Which range means the client made an error?",
                options: ["2xx", "3xx", "4xx", "5xx"],
                correctIndex: 2,
              },
              {
                id: "q3",
                question: "Which code means a resource was created?",
                options: ["200", "201", "204", "404"],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "c1",
    slug: "playwright-e2e-mastery",
    title: "Playwright E2E Mastery",
    subtitle: "From zero to self-healing end-to-end suites",
    description:
      "Learn to design resilient end-to-end tests with Playwright — locators, fixtures, network mocking, visual checks, and CI. Build a full BDD suite from a real app and keep it green.",
    price: 49,
    level: "Intermediate",
    category: "Testing",
    instructor: "Olivia",
    hours: 6.5,
    rating: 4.9,
    students: 1284,
    emoji: "🎭",
    gradient: "from-emerald-500/30 to-teal-500/10",
    outcomes: [
      "Write stable locators that survive UI changes",
      "Mock network requests and control app state",
      "Run tests in parallel across browsers",
      "Wire Playwright into CI with trace debugging",
    ],
    modules: [
      {
        id: "c1-m1",
        title: "Foundations",
        summary: "Set up Playwright and write your first test.",
        lessons: [
          {
            id: "c1-m1-l1",
            type: "video",
            title: "Welcome & how the course works",
            duration: "4:12",
            src: SAMPLE_VIDEO,
            description: "A tour of the tools, the repo, and how to get help.",
          },
          {
            id: "c1-m1-l2",
            type: "video",
            title: "Installing Playwright & project layout",
            duration: "11:38",
            src: SAMPLE_VIDEO,
          },
          {
            id: "c1-m1-l3",
            type: "pdf",
            title: "Cheat sheet: locators & assertions",
            pages: 4,
            src: SAMPLE_PDF,
            description: "Print-friendly reference for the most-used APIs.",
          },
          {
            id: "c1-m1-l4",
            type: "exercise",
            title: "Exercise: write your first test",
            prompt:
              "Write a Playwright test that visits the login page, fills email and password, submits, and asserts the dashboard heading is visible.",
            starter:
              "import { test, expect } from '@playwright/test'\n\ntest('user can log in', async ({ page }) => {\n  // your code here\n})",
            hint: "Use page.getByLabel() for inputs and page.getByRole('heading') for the assertion.",
            solution:
              "import { test, expect } from '@playwright/test'\n\ntest('user can log in', async ({ page }) => {\n  await page.goto('/login')\n  await page.getByLabel('Email').fill('demo@olivia.dev')\n  await page.getByLabel('Password').fill('secret')\n  await page.getByRole('button', { name: 'Sign in' }).click()\n  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()\n})",
          },
        ],
      },
      {
        id: "c1-m2",
        title: "Resilient selectors & fixtures",
        summary: "Stop writing flaky tests.",
        lessons: [
          {
            id: "c1-m2-l1",
            type: "video",
            title: "Role-based locators deep dive",
            duration: "14:02",
            src: SAMPLE_VIDEO,
          },
          {
            id: "c1-m2-l2",
            type: "video",
            title: "Custom fixtures & auth state reuse",
            duration: "18:45",
            src: SAMPLE_VIDEO,
          },
          {
            id: "c1-m2-l3",
            type: "exam",
            title: "Quiz: locators & fixtures",
            passScore: 70,
            questions: [
              {
                id: "q1",
                question: "Which locator is most resilient to markup changes?",
                options: [
                  "page.locator('.btn-primary')",
                  "page.getByRole('button', { name: 'Save' })",
                  "page.locator('div > span:nth-child(3)')",
                  "page.locator('#app > form > button')",
                ],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "What is the main benefit of a storageState fixture?",
                options: [
                  "It speeds up the browser download",
                  "It reuses an authenticated session across tests",
                  "It disables JavaScript",
                  "It records a video automatically",
                ],
                correctIndex: 1,
              },
              {
                id: "q3",
                question: "Playwright auto-waiting means you usually don't need…",
                options: [
                  "expect() assertions",
                  "manual sleep()/waitForTimeout calls",
                  "a browser",
                  "test titles",
                ],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "c2",
    slug: "api-testing-fundamentals",
    title: "API Testing Fundamentals",
    subtitle: "Design, document, and validate REST APIs with confidence",
    description:
      "Understand status codes, contracts, and edge cases. Build a suite that documents endpoints and validates them automatically against an OpenAPI spec.",
    price: 39,
    level: "Beginner",
    category: "Testing",
    instructor: "Olivia",
    hours: 4,
    rating: 4.7,
    students: 932,
    emoji: "🔌",
    gradient: "from-blue-500/30 to-indigo-500/10",
    outcomes: [
      "Read and reason about HTTP status codes",
      "Validate responses against a schema",
      "Cover happy-path and edge cases",
      "Generate living docs from a spec",
    ],
    modules: [
      {
        id: "c2-m1",
        title: "HTTP & contracts",
        summary: "The vocabulary of APIs.",
        lessons: [
          {
            id: "c2-m1-l1",
            type: "video",
            title: "Anatomy of an HTTP request",
            duration: "9:20",
            src: SAMPLE_VIDEO,
          },
          {
            id: "c2-m1-l2",
            type: "pdf",
            title: "Status codes reference",
            pages: 2,
            src: SAMPLE_PDF,
          },
          {
            id: "c2-m1-l3",
            type: "exam",
            title: "Quiz: HTTP basics",
            passScore: 60,
            questions: [
              {
                id: "q1",
                question: "Which status code means 'created successfully'?",
                options: ["200", "201", "204", "400"],
                correctIndex: 1,
              },
              {
                id: "q2",
                question: "A 401 response indicates…",
                options: [
                  "The server crashed",
                  "The request is unauthenticated",
                  "The resource was deleted",
                  "Too many requests",
                ],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "c3",
    slug: "typescript-for-testers",
    title: "TypeScript for Testers",
    subtitle: "Type-safe test code without the headaches",
    description:
      "A practical, testing-focused TypeScript course. Generics, utility types, and typing your fixtures and page objects so your tests fail at compile time, not in CI.",
    price: 0,
    level: "Beginner",
    category: "Programming",
    instructor: "Olivia",
    hours: 3.5,
    rating: 4.8,
    students: 2571,
    emoji: "🧩",
    gradient: "from-purple-500/30 to-fuchsia-500/10",
    outcomes: [
      "Type function arguments and return values",
      "Use generics in reusable helpers",
      "Model API responses with interfaces",
      "Fix common TS errors quickly",
    ],
    modules: [
      {
        id: "c3-m1",
        title: "Types you'll actually use",
        summary: "The 20% of TypeScript that covers 80% of test code.",
        lessons: [
          {
            id: "c3-m1-l1",
            type: "video",
            title: "Interfaces vs types",
            duration: "7:44",
            src: SAMPLE_VIDEO,
          },
          {
            id: "c3-m1-l2",
            type: "exercise",
            title: "Exercise: type this helper",
            prompt:
              "Add types to a `pick` helper that takes an object and a list of keys and returns a new object with only those keys.",
            starter:
              "function pick(obj, keys) {\n  return keys.reduce((acc, k) => {\n    acc[k] = obj[k]\n    return acc\n  }, {})\n}",
            hint: "Use two generics: <T, K extends keyof T> and return Pick<T, K>.",
            solution:
              "function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {\n  return keys.reduce((acc, k) => {\n    acc[k] = obj[k]\n    return acc\n  }, {} as Pick<T, K>)\n}",
          },
        ],
      },
    ],
  },
]

export function getCourseBySlug(slug: string | undefined): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}

export function lessonCount(course: Course): number {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0)
}

// ---- Simulated "purchases" via localStorage (no backend) ----

const STORAGE_KEY = "olivia-academy-purchases"

export function getPurchasedIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function isPurchased(courseId: string): boolean {
  return getPurchasedIds().includes(courseId)
}

export function purchaseCourse(courseId: string): void {
  if (typeof window === "undefined") return
  const ids = new Set(getPurchasedIds())
  ids.add(courseId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function refundCourse(courseId: string): void {
  if (typeof window === "undefined") return
  const ids = getPurchasedIds().filter((id) => id !== courseId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}
