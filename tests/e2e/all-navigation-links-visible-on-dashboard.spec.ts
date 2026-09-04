import { test, expect } from "@playwright/test"

test.describe("Dashboard navigation", () => {
  test("renders all four navigation entries", async ({ page }) => {
    // Given the user is on the dashboard page
    await page.goto("/dashboard")

    // Then each of the four navigation links is visible
    await expect(page.getByRole("link", { name: /API Automation/i }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /MCP Automation/i }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /Front End Automation/i }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /Workspace Members/i }).first()).toBeVisible()
  })
})