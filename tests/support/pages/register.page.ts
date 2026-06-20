import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./base.page"
import { testIds } from "../testids"
import type { TestUser } from "../utils/user-factory"

/**
 * Page Object for /register (also reachable at /signup).
 *
 * Exposes elements and atomic actions only. No assertions here.
 */
export class RegisterPage extends BasePage {
  readonly path = "/register"

  constructor(page: Page) {
    super(page)
  }

  // --- Elements ---------------------------------------------------------
  get form(): Locator {
    return this.byId(testIds.register.form)
  }
  get firstName(): Locator {
    return this.byId(testIds.register.firstName)
  }
  get lastName(): Locator {
    return this.byId(testIds.register.lastName)
  }
  get email(): Locator {
    return this.byId(testIds.register.email)
  }
  get password(): Locator {
    return this.byId(testIds.register.password)
  }
  get country(): Locator {
    return this.byId(testIds.register.country)
  }
  get age(): Locator {
    return this.byId(testIds.register.age)
  }
  get terms(): Locator {
    return this.byId(testIds.register.terms)
  }
  get submit(): Locator {
    return this.byId(testIds.register.submit)
  }
  get error(): Locator {
    return this.byId(testIds.register.error)
  }
  get loginLink(): Locator {
    return this.byId(testIds.register.loginLink)
  }

  // --- Actions ----------------------------------------------------------
  /** Fill every field from a TestUser without submitting. */
  async fill(user: TestUser, { acceptTerms = true } = {}): Promise<void> {
    await this.firstName.fill(user.firstName)
    await this.lastName.fill(user.lastName)
    await this.email.fill(user.email)
    await this.password.fill(user.password)
    await this.country.fill(user.country)
    await this.age.fill(String(user.age))
    if (acceptTerms) await this.terms.check()
  }

  /** Fill the whole form and submit it. */
  async register(user: TestUser, opts?: { acceptTerms?: boolean }): Promise<void> {
    await this.fill(user, opts)
    await this.submit.click()
  }
}
