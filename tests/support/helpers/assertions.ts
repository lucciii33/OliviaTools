import { expect, type Locator } from "@playwright/test"

/**
 * Reusable, intention-revealing assertions shared across specs.
 *
 * Keep these generic. Page-specific expectations belong in the spec; only
 * promote something here once it's repeated in 2+ places.
 */

/** Assert an inline form error is visible and (optionally) contains text. */
export async function expectVisibleError(error: Locator, contains?: string): Promise<void> {
  await expect(error).toBeVisible()
  if (contains) await expect(error).toContainText(contains)
}

/** Assert a form and all of its key fields rendered. */
export async function expectFormReady(form: Locator, ...fields: Locator[]): Promise<void> {
  await expect(form).toBeVisible()
  for (const field of fields) await expect(field).toBeVisible()
}
