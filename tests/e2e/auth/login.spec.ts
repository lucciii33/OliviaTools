import { test, expect } from "../../support/fixtures"
import { expectVisibleError } from "../../support/helpers/assertions"
import { env } from "../../support/utils/env"

test.describe("Login", () => {
  test("rejects a valid email with the wrong password", async ({ loginPage, page }) => {
    const email = env.hasSeededUser ? env.seededUser.email : "testvalidemail@test.com"

    await loginPage.goto()
    await expect(loginPage.form).toBeVisible()

    await loginPage.login(email, "wrongpawwseordtest12!")

    await expectVisibleError(loginPage.error)
    await expect(page).toHaveURL(/\/login/)
  })
})
