import { expect, test } from "./fixtures";
import { testUserCredentials } from "./utils/test-db";

const { identifier, password } = testUserCredentials;

test("shows the empty garage state when no motorcycles exist", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("E-Mail / Username").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/$/);

  await expect(
    page.getByRole("heading", { name: "Keine Motorräder gefunden" }),
  ).toBeVisible();

  await expect(
    page.getByText("Deine Garage ist leer", { exact: false }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Motorrad hinzufügen" }),
  ).toBeVisible();
});
