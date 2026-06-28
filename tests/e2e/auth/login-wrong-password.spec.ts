import { test, expect } from '@playwright/test';

const VALID_EMAIL = 'angejfjg@ded.com';
const WRONG_PASSWORD = 'jajdhejhdwhfwdwe';

test.describe('Email/password login', () => {
  test('valid email but wrong password is rejected', async ({ page }) => {
    // Given the user is on the login page
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/login/);
    await expect(page.getByTestId('login-submit')).toBeVisible();

    // When a valid registered email is entered
    await page.getByTestId('login-email').fill(VALID_EMAIL);

    // When an incorrect password is entered
    await page.getByTestId('login-password').fill(WRONG_PASSWORD);

    // When the Login button is clicked
    await page.getByTestId('login-submit').click();

    // Then an invalid credentials error message is displayed
    await expect(
      page.getByText(/invalid (email or password|credentials)/i)
    ).toBeVisible();

    // Then the user remains on the login page
    await expect(page).toHaveURL(/login/);
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });
});
