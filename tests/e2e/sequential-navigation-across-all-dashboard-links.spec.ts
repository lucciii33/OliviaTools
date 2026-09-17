import { test, expect } from '@playwright/test';

test('Sequential navigation across all dashboard links', async ({ page }) => {
  await page.goto("https://www.oliviatools.co/login");
  await page.goto("https://accounts.google.com/gsi/button?theme=filled_black&size=large&width=320&text=signin_with&shape=rectangular&is_fedcm_supported=true&client_id=916944106987-7f85gbg1is4fuvikape77e49ctkm4mmt.apps.googleusercontent.com&iframe_id=gsi_934170_650838&cas=25jzRr6uaH1vqp6QTv9gz5O%2BRo9btRskhR2PN%2FeoZew");
  await page.getByTestId("login-email").click();
  await page.getByTestId("login-email").click();
  await page.getByTestId("login-email").fill("angelomaiele@gmail.com");
  await page.getByTestId("login-password").click();
  await page.getByTestId("login-submit").click();
  await page.getByTestId("login-password").fill(process.env.E2E_SECRET_VALUE || '');
  await page.goto("https://www.oliviatools.co/login?");
  await page.goto("https://accounts.google.com/gsi/button?theme=filled_black&size=large&width=320&text=signin_with&shape=rectangular&is_fedcm_supported=true&client_id=916944106987-7f85gbg1is4fuvikape77e49ctkm4mmt.apps.googleusercontent.com&iframe_id=gsi_962337_791734&cas=braFHtiYTPh5Dr1FQZ8uCnTLdsBIEZBPVhxBqbCngao");
  await page.getByTestId("login-submit").click();
  await page.getByTestId("login-email").click();
  await page.getByTestId("login-email").fill("angelomaiele@gmail.com");
  await page.getByTestId("login-password").click();
  await page.getByTestId("login-password").fill(process.env.E2E_SECRET_VALUE || '');
  await page.getByTestId("login-submit").click();
  await page.goto("https://www.oliviatools.co/login?");
  await page.goto("https://accounts.google.com/gsi/button?theme=filled_black&size=large&width=320&text=signin_with&shape=rectangular&is_fedcm_supported=true&client_id=916944106987-7f85gbg1is4fuvikape77e49ctkm4mmt.apps.googleusercontent.com&iframe_id=gsi_984021_719287&cas=9mFON3kNLtwqlVIcpfpRH8KnlnMWHs25%2FQiGCGl6f7E");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/.*/);
});
