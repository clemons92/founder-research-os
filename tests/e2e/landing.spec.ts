import { expect, test } from "@playwright/test";

test("landing shows product name and sign-up CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: /sign up/i }),
  ).toBeVisible();
});
