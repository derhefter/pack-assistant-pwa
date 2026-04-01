import { expect, test } from '@playwright/test';

test('manual import creates and archives an order', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox').fill('3 mal Halloren Kugeln\n2 mal Schoko Brezeln');
  await page.getByRole('button', { name: 'Text importieren' }).click();

  await expect(page.getByText('Manueller Auftrag')).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(2);

  await page.locator('.product-card__toggle').first().click();
  await expect(page.getByText('1 von 2 gepackt')).toBeVisible();

  await page.getByRole('button', { name: 'Auftrag archivieren' }).click();
  await expect(page.getByText('Archiv durchsuchen')).toBeVisible();

  await page.getByRole('button', { name: 'Wieder oeffnen' }).first().click();
  await expect(page.getByText('Manueller Auftrag')).toBeVisible();
});
