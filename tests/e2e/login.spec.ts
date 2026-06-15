import { test, expect } from "@playwright/test"

// Smoke — the login page renders its sign-in form. Every selector is a
// data-testid (the flakiness standard); no backend/auth required. This is the
// shape Olivia generates from a recorded flow, then heals until green.
test("login page shows the sign-in form", async ({ page }) => {
  await page.goto("/login")

  await expect(page.getByTestId("login-form")).toBeVisible()
  await expect(page.getByTestId("login-email")).toBeVisible()
  await expect(page.getByTestId("login-password")).toBeVisible()
  await expect(page.getByTestId("login-submit")).toBeVisible()
})
