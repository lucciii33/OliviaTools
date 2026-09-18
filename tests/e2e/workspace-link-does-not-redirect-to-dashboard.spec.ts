import { test, expect } from "@playwright/test"

test.describe("Dashboard navigation", () => {
  test("Workspace Members link navigates away from the dashboard to the workspace", async ({
    page,
  }) => {
    // Given the user is on the /dashboard page
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/dashboard/)

    // When clicking the Workspace Members link
    const workspaceLink = page.getByRole("link", { name: /Workspace Members/i }).first()
    await expect(workspaceLink).toBeVisible()
    await workspaceLink.click()

    // Then the URL points at the workspace (which also proves it left the dashboard)
    await expect(page).toHaveURL(/workspace/i)

    // And the URL is no longer the dashboard
    expect(page.url()).not.toMatch(/\/dashboard(\/|\?|$)/)
  })
})