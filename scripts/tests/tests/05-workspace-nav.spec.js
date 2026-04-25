// Navigation : login → on doit atterrir sur un workspace (avec un thread sélectionné),
// pas sur le composer Main/Home (vérification du fix recent dans pages/Main/Home).
import { test, expect } from "@playwright/test";
import { login } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;

test.describe("Workspace — navigation post-login", () => {
  test("login redirige vers /workspace/:slug puis vers un thread", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants dans .env");
    await login(page, USER, PASS, baseURL);
    // Le fix Main/Home + la redirection WorkspaceChat enchaînent vers /t/:threadSlug
    // SI il existe au moins un thread. On laisse 10 s pour la chaîne de redirections.
    await page.waitForURL(/\/workspace\/[^/]+(\/t\/[^/]+)?$/, { timeout: 15_000 });
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^\/workspace\//);
  });

  test("la sidebar liste au moins 1 workspace", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants dans .env");
    await login(page, USER, PASS, baseURL);
    // Sélecteur souple : on cherche n'importe quel lien vers /workspace/...
    const wsLinks = page.locator('a[href^="/workspace/"]');
    await expect(wsLinks.first()).toBeVisible({ timeout: 10_000 });
  });
});
