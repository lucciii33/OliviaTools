import { test, expect } from "@playwright/test"

test.use({
  storageState: "/Users/angelo/Documents/sailTrimBackend/backend/.e2e-auth/6a580ef4df123a39ff40f79b.json",
})

test.describe("Dashboard navigation", () => {
  test("browser back from the workspace returns to the dashboard", async ({ page }) => {
    // Given the user is on the /dashboard page
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/dashboard/)

    // When clicking the Workspace Members link
    const workspaceLink = page.getByRole("link", { name: /Workspace Members/i }).first()
    await expect(workspaceLink).toBeVisible()
    await workspaceLink.click()

    // Then the app navigates to the workspace page
    await expect(page).toHaveURL(/workspace/i)

    // When navigating back in the browser
    await page.goBack()

    // Then the URL returns to /dashboard
    await expect(page).toHaveURL(/\/dashboard(\/|\?|$)/)
  })
})