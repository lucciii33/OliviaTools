import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./base.page"
import { testIds } from "../testids"

/**
 * Page Object for /login.
 *
 * Exposes the page's elements as Locators and the atomic actions a user can
 * perform on it. It does NOT assert — assertions live in specs (or helpers).
 * Multi-step journeys that span pages live in flows/, not here.
 */
export class LoginPage extends BasePage {
  readonly path = "/login"

  constructor(page: Page) {
    super(page)
  }

  // --- Elements ---------------------------------------------------------
  get form(): Locator {
    return this.byId(testIds.login.form)
  }
  get email(): Locator {
    return this.byId(testIds.login.email)
  }
  get password(): Locator {
    return this.byId(testIds.login.password)
  }
  get submit(): Locator {
    return this.byId(testIds.login.submit)
  }
  get error(): Locator {
    return this.byId(testIds.login.error)
  }

  // 2FA challenge step
  get twoFactorForm(): Locator {
    return this.byId(testIds.login.twoFactor.form)
  }
  get twoFactorCode(): Locator {
    return this.byId(testIds.login.twoFactor.code)
  }
  get twoFactorSubmit(): Locator {
    return this.byId(testIds.login.twoFactor.submit)
  }

  // --- Actions ----------------------------------------------------------
  /** Fill credentials and submit the sign-in form. */
  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email)
    await this.password.fill(password)
    await this.submit.click()
  }

  /** Complete the 2FA challenge step (only visible after a 2FA login). */
  async submitTwoFactorCode(code: string): Promise<void> {
    await this.twoFactorCode.fill(code)
    await this.twoFactorSubmit.click()
  }
}
