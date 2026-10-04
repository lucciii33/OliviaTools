import { test, expect } from "@playwright/test"

test.describe("Dashboard navigation", () => {
  test("deep-linking to /mcp-docs works without going through the dashboard", async ({ page }) => {
    // Given the user is authenticated (stored session) and opens /mcp-docs directly
    await page.goto("/mcp-docs")

    // Then the URL is /mcp-docs
    await expect(page).toHaveURL(/\/mcp-docs/)

    // And the MCP docs page content is visible
    await expect(page.getByRole("main")).toBeVisible()
    await expect(page.getByRole("heading", { name: /MCP/i }).first()).toBeVisible()
  })
})