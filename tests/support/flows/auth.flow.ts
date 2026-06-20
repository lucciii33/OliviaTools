import { expect, type Page } from "@playwright/test"
import { LoginPage } from "../pages/login.page"
import { RegisterPage } from "../pages/register.page"
import { makeUser, type TestUser } from "../utils/user-factory"

/**
 * Flows = end-to-end user journeys that span MORE THAN ONE page or combine
 * several actions into a reusable business operation. Specs call flows to set
 * up state ("given a registered user") instead of repeating click-by-click
 * steps. Single-page actions belong on the Page Object, not here.
 */
export class AuthFlow {
  private readonly login: LoginPage
  private readonly register: RegisterPage

  constructor(private readonly page: Page) {
    this.login = new LoginPage(page)
    this.register = new RegisterPage(page)
  }

  /**
   * Register a brand new user end-to-end. On success the app redirects to
   * /login, which this asserts. Returns the user that was created so the
   * caller can immediately log in with it.
   */
  async registerNewUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = makeUser(overrides)
    await this.register.goto()
    await this.register.register(user)
    await expect(this.page).toHaveURL(/\/login/)
    return user
  }

  /**
   * Log in and assert we land on the dashboard. Use for tests that need an
   * authenticated session as a precondition rather than as the thing-under-test.
   */
  async loginExpectingDashboard(email: string, password: string): Promise<void> {
    await this.login.goto()
    await this.login.login(email, password)
    await expect(this.page).toHaveURL(/\/dashboard/)
  }
}
