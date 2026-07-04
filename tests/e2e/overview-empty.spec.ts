import { expect, test } from "./fixtures";

// NOTE: requires the API running with this user seeded (see playwright.config.ts).
const { identifier, password } = { identifier: "test@example.com", password: "password123" };

test("shows the empty garage state when no motorcycles exist", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/auth\/login/);

  // Labels and button text match the real (German) login form.
  await page.getByLabel("E-Mail oder Benutzername").fill(identifier);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/$/);

  // The empty garage renders <EmptyState title="Garage leer" …>.
  await expect(
    page.getByRole("heading", { name: "Garage leer" }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Motorrad hinzufügen" }),
  ).toBeVisible();
});
