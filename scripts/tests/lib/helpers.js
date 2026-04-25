// Helpers partagés entre les specs Playwright pour Sara.
import { expect } from "@playwright/test";

/**
 * Connecte l'user via l'écran /sara/login. Suppose que le formulaire est
 * standard avec inputs nommés "email"/"password" (ou type=email/password).
 * Retourne quand on est sorti de /sara/login (redirect vers / ou workspace).
 */
export async function login(page, user, password, baseURL) {
  await page.goto(`${baseURL}/sara/login`);
  // On accepte plusieurs sélecteurs possibles selon les variantes du form.
  const emailField = page
    .locator('input[type="email"], input[name="email"], input[name="username"]')
    .first();
  const passwordField = page.locator('input[type="password"]').first();
  await emailField.fill(user);
  await passwordField.fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/sara/login"), { timeout: 30_000 }),
    page
      .locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Login"), button:has-text("Se connecter")')
      .first()
      .click(),
  ]);
}

/**
 * Lit la dernière bulle de réponse Sara dans le chat actif.
 * On vise tout texte présent dans la zone des messages assistant.
 */
export async function lastAssistantMessage(page) {
  const messages = page.locator(
    '[data-role="assistant"], [class*="assistant"], [class*="response"]'
  );
  const count = await messages.count();
  if (count === 0) return "";
  return (await messages.nth(count - 1).innerText()) || "";
}

/**
 * Envoie un message dans le composer du chat ouvert et attend la fin du stream.
 * Stratégie : tape le message, valide, et attend qu'aucun événement de streaming
 * n'arrive pendant 4 s consécutives (heuristique simple mais robuste pour SSE).
 */
export async function sendChatMessage(page, message, { quietWindowMs = 4000, maxWaitMs = 90_000 } = {}) {
  const composer = page
    .locator('textarea, [contenteditable="true"]')
    .filter({ hasText: "" })
    .first();
  await composer.click();
  await composer.fill(message);
  await page.keyboard.press("Enter");

  // Attente "stream silencieux" : on échantillonne le DOM toutes les 500 ms.
  const start = Date.now();
  let lastChange = Date.now();
  let lastSize = 0;
  while (Date.now() - start < maxWaitMs) {
    const txt = await lastAssistantMessage(page);
    if (txt.length !== lastSize) {
      lastChange = Date.now();
      lastSize = txt.length;
    }
    if (Date.now() - lastChange > quietWindowMs && lastSize > 0) {
      return txt;
    }
    await page.waitForTimeout(500);
  }
  return await lastAssistantMessage(page);
}

/** Vérifie qu'un bloc fence ```<lang> est présent dans le texte. */
export function hasBlock(text, lang) {
  return new RegExp("```" + lang + "\\b", "i").test(text);
}

/** Mesure le texte hors de TOUT bloc ``` (pour détecter les "leaks" markdown). */
export function leakOutsideBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, "").trim().length;
}

/**
 * Skip propre quand RUN_LIVE_LLM != "1". Les tests qui appellent DeepSeek
 * coûtent de l'argent et sont lents, on les exclut par défaut.
 */
export function skipIfNoLiveLLM(test) {
  test.skip(process.env.RUN_LIVE_LLM !== "1", "RUN_LIVE_LLM != 1 — test live LLM désactivé");
}

export { expect };
