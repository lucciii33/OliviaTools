/**
 * Central registry of every `data-testid` used by the app.
 *
 * This is the SINGLE SOURCE OF TRUTH for selectors. Page Objects read from
 * here, never from inline strings. When you add a `data-testid` in the app,
 * add it here too and the Page Object will pick it up.
 *
 * Convention: testids are `<feature>-<element>` in kebab-case, mirroring the
 * route they live on (e.g. `login-email`, `register-submit`).
 *
 * Keep this grouped by feature/page so it stays navigable.
 */
export const testIds = {
  login: {
    form: "login-form",
    email: "login-email",
    password: "login-password",
    submit: "login-submit",
    error: "login-error",
    twoFactor: {
      form: "login-2fa-form",
      code: "login-2fa-code",
      submit: "login-2fa-submit",
      cancel: "login-2fa-cancel",
    },
  },
  register: {
    form: "register-form",
    firstName: "register-first-name",
    lastName: "register-last-name",
    email: "register-email",
    password: "register-password",
    country: "register-country",
    age: "register-age",
    terms: "register-terms",
    submit: "register-submit",
    error: "register-error",
    loginLink: "register-login-link",
  },
} as const

export type TestIds = typeof testIds
