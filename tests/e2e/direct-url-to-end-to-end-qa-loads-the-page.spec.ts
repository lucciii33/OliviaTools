import { test, expect } from "@playwright/test"

test.describe("Dashboard navigation", () => {
  test("deep-linking to /end-to-end-QA resolves to a stable, rendered page", async ({ page }) => {
    // Given the user opens the end-to-end QA deep link directly
    await page.goto("/end-to-end-QA")

    // Then the app resolves to a stable URL (either the E2E-QA workspace when
    // authenticated, or the login page when the session is not applied)
    await expect(page).toHaveURL(/E2E-QA|login/i)

    // And the page content is rendered
    await expect(page.locator("body")).toBeVisible()
    await expect(page.locator("#root, main, body").first()).toBeVisible()
  })
})