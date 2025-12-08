import { test, expect } from '@playwright/test';

test('loads and shows Doubloon Vault', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Doubloon Vault')).toBeVisible();
});
