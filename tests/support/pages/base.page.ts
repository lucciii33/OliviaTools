import type { Locator, Page } from "@playwright/test"

/**
 * Base class every Page Object extends.
 *
 * Responsibilities shared by all pages live here: navigation and the single
 * helper used to resolve a `data-testid` into a Locator. Page Objects should
 * never call `page.locator(...)` with a raw CSS string — go through `byId` so
 * selectors stay centralized and consistent.
 */
export abstract class BasePage {
  /** Route path this page lives at, e.g. "/login". Set by each subclass. */
  abstract readonly path: string

  constructor(protected readonly page: Page) {}

  /** Navigate to this page's route. */
  async goto(): Promise<void> {
    await this.page.goto(this.path)
  }

  /** Resolve a `data-testid` (from the central registry) to a Locator. */
  protected byId(testId: string): Locator {
    return this.page.getByTestId(testId)
  }
}
