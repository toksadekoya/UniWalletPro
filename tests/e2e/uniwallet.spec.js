import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('sets a budget and persists it after reload', async ({ page }) => {
  await page.getByLabel('Budget amount').fill('1200');
  await page.getByLabel('Budget period').selectOption('weekly');
  await page.getByRole('button', { name: 'Save budget' }).click();

  await expect(page.getByText('Weekly budget saved.')).toBeVisible();
  await expect(page.locator('#budgetCard')).toHaveText('£1,200.00');
  await page.reload();
  await expect(page.locator('#budgetCard')).toHaveText('£1,200.00');
});

test('adds, filters and edits an expense safely', async ({ page }) => {
  await page.getByLabel('Description', { exact: true }).fill('<img src=x onerror=alert(1)>');
  await page.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('42.50');
  await page.getByRole('button', { name: 'Add expense' }).click();

  await expect(page.locator('#expenseList img')).toHaveCount(0);
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  await page.getByLabel('Search descriptions').fill('no match');
  await expect(page.getByText('No matching expenses')).toBeVisible();
  await page.getByLabel('Search descriptions').fill('');

  await page.getByRole('button', { name: 'Edit <img src=x onerror=alert(1)>' }).click();
  await page.getByLabel('Description', { exact: true }).fill('Weekly groceries');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Weekly groceries', { exact: true })).toBeVisible();
});

test('has no automatically detectable accessibility violations', async ({ page }) => {
  await page.getByLabel('Budget amount').fill('900');
  await page.getByRole('button', { name: 'Save budget' }).click();
  await page.getByLabel('Description', { exact: true }).fill('Train ticket');
  await page.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('18');
  await page.getByRole('button', { name: 'Add expense' }).click();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keeps core controls before analytics on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const budgetBox = await page.getByRole('heading', { name: 'Set your budget' }).boundingBox();
  const analyticsBox = await page.getByRole('heading', { name: 'Spending analytics' }).boundingBox();

  expect(budgetBox.y).toBeLessThan(analyticsBox.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
