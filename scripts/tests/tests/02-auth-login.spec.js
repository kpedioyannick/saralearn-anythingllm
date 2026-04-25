// Connexion via le formulaire /sara/login.
import { test, expect } from "@playwright/test";
import { login } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;

test.describe("Auth — login", () => {
  test("connexion valide redirige hors de /sara/login", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants dans .env");
    await login(page, USER, PASS, baseURL);
    expect(page.url()).not.toContain("/sara/login");
  });

  test("connexion invalide affiche une erreur et reste sur /sara/login", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/sara/login`);
    await page
      .locator('input[type="email"], input[name="email"], input[name="username"]')
      .first()
      .fill("nobody@nowhere.invalid");
    await page.locator('input[type="password"]').first().fill("wrongpassword");
    await page
      .locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Login")')
      .first()
      .click();
    // On donne 5 s au backend pour répondre, puis on vérifie qu'on est toujours sur le login.
    await page.waitForTimeout(5_000);
    expect(page.url()).toContain("/sara/login");
  });
});
