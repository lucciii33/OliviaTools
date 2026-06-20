/**
 * Typed access to the environment the suite runs against.
 *
 * Everything that varies per machine/CI lives here so tests never read
 * `process.env` directly. Set these in your shell or CI before running:
 *
 *   E2E_BASE_URL          base URL of the app under test (default localhost:5173)
 *   E2E_USER_EMAIL        email of a pre-seeded user for login tests
 *   E2E_USER_PASSWORD     password of that seeded user
 */
export const env = {
  baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",

  /** A known-good account for login happy-path tests (optional). */
  seededUser: {
    email: process.env.E2E_USER_EMAIL ?? "",
    password: process.env.E2E_USER_PASSWORD ?? "",
  },

  get hasSeededUser(): boolean {
    return Boolean(this.seededUser.email && this.seededUser.password)
  },
} as const
