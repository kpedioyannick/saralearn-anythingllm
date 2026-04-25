// Vérifie que le détecteur i18next subdomain fait son boulot :
// fr.sara.education → <html lang="fr">
// en.sara.education → <html lang="en">
import { test, expect } from "@playwright/test";

test.describe("i18n — détection par sous-domaine", () => {
  test("fr.sara.education force lang='fr' après hydration", async ({ page }) => {
    await page.goto((process.env.SARA_URL || "https://fr.sara.education") + "/sara/login");
    // i18next met à jour <html lang> au boot via syncHtmlLang.
    await expect(page.locator("html")).toHaveAttribute("lang", "fr", { timeout: 10_000 });
  });

  test("en.sara.education force lang='en'", async ({ page }) => {
    const url = process.env.SARA_URL_EN || "https://en.sara.education";
    await page.goto(`${url}/sara/login`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 10_000 });
  });

  test("override via ?lng=es", async ({ page }) => {
    const url = process.env.SARA_URL || "https://fr.sara.education";
    await page.goto(`${url}/sara/login?lng=es`);
    // querystring est 2e dans l'ordre — après subdomain. Donc subdomain l'emporte.
    // On documente ce comportement en testant que fr l'emporte sur es.
    await expect(page.locator("html")).toHaveAttribute("lang", "fr", { timeout: 10_000 });
  });
});
