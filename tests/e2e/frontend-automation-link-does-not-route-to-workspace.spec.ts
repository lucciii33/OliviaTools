import { test, expect } from "../../support/fixtures"

test.describe("Dashboard navigation links", () => {
  test("Frontend Automation link routes only to E2E-QA", async ({ page }) => {
    // Given the user is on the dashboard
    await page.goto("/dashboard")

    // When clicking the Frontend Automation link
    await page.getByRole("link", { name: /Front End Automation/i }).click()

    // Then the URL contains 'E2E-QA'
    await expect.poll(() => page.url()).toContain("E2E-QA")

    // Then the URL does not contain 'Dash Workspace'
    expect(decodeURIComponent(page.url())).not.toContain("Dash Workspace")
  })
})