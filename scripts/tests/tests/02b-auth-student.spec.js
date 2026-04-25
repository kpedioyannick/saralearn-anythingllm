// Login d'un élève (rôle "default") : vérifie que les gates UI cachent
// les boutons CRUD threads conformément au verrouillage frontend récent.
import { test, expect } from "@playwright/test";
import { login } from "../lib/helpers.js";

const STUDENT = process.env.TEST_STUDENT_USER;
const STUDENT_PASS = process.env.TEST_STUDENT_PASSWORD;

test.describe("Auth — élève 3ème (rôle default)", () => {
  test("connexion élève + sidebar montre les threads SANS bouton 'New Thread'", async ({ page, baseURL }) => {
    test.skip(!STUDENT || !STUDENT_PASS, "TEST_STUDENT_USER / TEST_STUDENT_PASSWORD manquants — créer le compte avant ce test");
    await login(page, STUDENT, STUDENT_PASS, baseURL);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    // Le bouton NewThreadButton retourne null pour role=default. Texte typique : "New Thread" / "+ New Thread".
    const newThreadBtn = page.getByRole("button", { name: /new\s*thread/i });
    await expect(newThreadBtn).toHaveCount(0);
  });

  test("élève ne voit pas le menu 'options' (rename/delete) sur les threads", async ({ page, baseURL }) => {
    test.skip(!STUDENT || !STUDENT_PASS, "TEST_STUDENT_USER / TEST_STUDENT_PASSWORD manquants");
    await login(page, STUDENT, STUDENT_PASS, baseURL);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    // L'aria-label "Thread options" est porté par le bouton DotsThree dans ThreadItem.
    // Il est rendu uniquement si canModify === true (= role !== "default").
    const optionsBtn = page.getByRole("button", { name: /thread options/i });
    await expect(optionsBtn).toHaveCount(0);
  });

  test("élève ne voit pas le bouton 'New Workspace'", async ({ page, baseURL }) => {
    test.skip(!STUDENT || !STUDENT_PASS, "TEST_STUDENT_USER / TEST_STUDENT_PASSWORD manquants");
    await login(page, STUDENT, STUDENT_PASS, baseURL);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    // Sidebar:201 cache déjà ce bouton pour role=default.
    const newWsBtn = page.getByRole("button", { name: /new\s*workspace|nouveau\s*workspace/i });
    await expect(newWsBtn).toHaveCount(0);
  });
});
