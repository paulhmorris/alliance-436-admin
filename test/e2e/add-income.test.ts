import { expect, test } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { getToday } from "~/lib/utils";

dayjs.extend(utc);

test.use({ storageState: "playwright/.auth/admin.json" });
test.describe("Add Income", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/income/new");
  });

  test("link should navigate to add income", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /add income/i }).click();
    await expect(page).toHaveURL("/income/new");
  });

  test("should not add income with all empty fields", async ({ page }) => {
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page).toHaveURL("/income/new");
    await expect(page.getByRole("textbox", { name: "Amount" })).toBeFocused();
  });

  test("all fields should have default state", async ({ page }) => {
    await expect(page.getByLabel(/date/i)).toHaveValue(getToday());
    await expect(page.getByLabel(/notify user/i)).not.toBeChecked();
  });

  test("should allow adding and deleting transaction items", async ({ page }) => {
    await page.getByRole("button", { name: /add item/i }).click();
    await expect(page.getByRole("heading", { name: /item 2/i })).toBeVisible();
    await page.getByRole("button", { name: /remove item 2/i }).click();
    await expect(page.getByRole("heading", { name: /item 2/i })).toBeHidden();
  });

  test("should add income with valid fields", async ({ page }) => {
    // Fill out form
    await page.getByLabel("Select account").click();
    await page.getByLabel(/E2E Account/).click();
    await page.getByRole("textbox", { name: "Amount" }).fill("100");

    await page.getByLabel("Select method").click();
    await page.getByLabel("ACH").click();

    await page.getByLabel("Select type").click();
    await page.getByLabel("Donation").click();
    await page.getByRole("button", { name: /submit/i }).click();

    // Verifiy transaction went through
    await expect(page).toHaveURL(/accounts/);
    await expect(page.getByRole("heading", { name: /9999/i })).toBeVisible();

    // Verify transaction amount is correct
    await expect(page.getByRole("cell", { name: "$" }).locator("span")).toHaveText("$100.00");

    // Verify toast message
    await expect(page.getByRole("status")).toHaveText(/success/i);

    // Verify transaction link
    await page.getByRole("link", { name: /view/i }).click();
    await expect(page).toHaveURL(/transactions/);

    // Verify transaction details
    await expect(page.getByRole("heading", { name: /transaction details/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: /100/i })).toBeVisible();

    // Verify account link
    await page.getByRole("link", { name: /9999/i }).click();
    await expect(page).toHaveURL(/accounts/);
    await expect(page.getByRole("heading", { name: /9999/i })).toBeVisible();
  });
});
