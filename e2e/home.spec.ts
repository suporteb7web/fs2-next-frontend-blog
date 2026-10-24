import { expect, test } from "@playwright/test";
import { mockPublicPostTitle } from "./mocks/data";

test("acessa a página inicial", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible();
});

test("mostra o título do post mockado na home", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 2, name: mockPublicPostTitle }),
  ).toBeVisible();
});
