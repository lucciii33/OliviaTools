import { test, expect } from "../../support/fixtures"
import { expectFormReady, expectVisibleError } from "../../support/helpers/assertions"
import { makeUser } from "../../support/utils/user-factory"

test.describe("Register", () => {
  test("renders the create-account form @smoke", async ({ registerPage }) => {
    await registerPage.goto()
    await expectFormReady(
      registerPage.form,
      registerPage.firstName,
      registerPage.lastName,
      registerPage.email,
      registerPage.password,
      registerPage.country,
      registerPage.age,
      registerPage.submit,
    )
  })

  test("rejects a password that is too weak", async ({ registerPage }) => {
    await registerPage.goto()
    await registerPage.register(makeUser({ password: "weak" }))
    await expectVisibleError(registerPage.error, "Password must be at least 12 characters")
  })

  test("blocks submit until terms are accepted", async ({ registerPage, page }) => {
    await registerPage.goto()
    // The terms checkbox is `required`, so native validation blocks submit and
    // we never leave the page (the JS "accept the terms" guard is a backstop).
    await registerPage.register(makeUser(), { acceptTerms: false })
    await expect(registerPage.terms).not.toBeChecked()
    await expect(page).toHaveURL(/\/(register|signup)/)
  })

  test("links back to the login page", async ({ registerPage, page }) => {
    await registerPage.goto()
    await registerPage.loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })

  // Hits the real backend; enable when an API is available for the suite.
  test.skip("registers a new user and redirects to login", async ({ authFlow }) => {
    await authFlow.registerNewUser()
  })
})
