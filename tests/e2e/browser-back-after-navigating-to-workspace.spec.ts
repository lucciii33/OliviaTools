import { test, expect } from '@playwright/test';

test.use({
  storageState: '/Users/angelo/Documents/sailTrimBackend/backend/.e2e-auth/6a580ef4df123a39ff40f79b.json'
});

test('test', async ({ page }) => {
  await page.goto('https://www.oliviatools.co/');
});