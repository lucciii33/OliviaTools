/**
 * Factory for test user data. Generates unique, valid users so register tests
 * never collide on a duplicate email across runs.
 *
 * The password defaults to one that satisfies the app's policy (see
 * `validatePassword` in app/routes/register.tsx): >= 12 chars, upper, lower,
 * number and symbol.
 */
export interface TestUser {
  firstName: string
  lastName: string
  email: string
  password: string
  country: string
  age: number
}

/** A password guaranteed to pass the register form's validation rules. */
export const VALID_PASSWORD = "Str0ng!Passw0rd"

let counter = 0

/**
 * Build a fresh, valid user. Each call yields a unique email.
 * Pass overrides to exercise edge cases (e.g. a too-short password).
 */
export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  counter += 1
  const unique = `${Date.now()}-${counter}`
  return {
    firstName: "Test",
    lastName: "User",
    email: `qa+${unique}@oliviatools.test`,
    password: VALID_PASSWORD,
    country: "Spain",
    age: 28,
    ...overrides,
  }
}
