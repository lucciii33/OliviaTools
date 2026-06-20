import { test as base } from "@playwright/test"
import { LoginPage } from "../pages/login.page"
import { RegisterPage } from "../pages/register.page"
import { AuthFlow } from "../flows/auth.flow"

/**
 * Custom Playwright fixtures.
 *
 * This is the entry point every spec imports instead of `@playwright/test`:
 *
 *   import { test, expect } from "../../support/fixtures"
 *
 * It injects ready-to-use Page Objects and Flows so specs declare what they
 * need in the test arguments and Playwright builds them per test. Add a new
 * fixture here when you add a new Page Object or Flow.
 */
type Fixtures = {
  loginPage: LoginPage
  registerPage: RegisterPage
  authFlow: AuthFlow
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page))
  },
  authFlow: async ({ page }, use) => {
    await use(new AuthFlow(page))
  },
})

// Re-export expect so specs have a single import source.
export { expect } from "@playwright/test"
