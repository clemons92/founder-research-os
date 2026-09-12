import { expect, test } from "@playwright/test";

test("sign up lands on the dashboard", async ({ page }) => {
  const email = `user-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel(/name/i).fill("Test User");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("Passw0rd!");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
