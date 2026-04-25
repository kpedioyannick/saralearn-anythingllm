// Programmes étrangers + réponse en anglais : on demande à Sara de répondre
// dans une autre langue et on vérifie que le contenu est bien dans cette langue.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_3EME || "3eme-francais";

const ENGLISH_TOKENS = ["the", "and", "is", "are", "this", "with"];
const FRENCH_TOKENS = ["le", "les", "des", "est", "une", "dans"];

function ratio(text, tokens) {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (words.length < 20) return 0;
  const hits = words.filter((w) => tokens.includes(w)).length;
  return hits / words.length;
}

test.describe("LLM — multilingue & curriculum étranger", () => {
  skipIfNoLiveLLM(test);

  test("réponse demandée en anglais → contenu majoritairement anglais", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "Please explain photosynthesis in English with simple words.", { maxWaitMs: 60_000 });
    expect(ratio(reply, ENGLISH_TOKENS)).toBeGreaterThan(ratio(reply, FRENCH_TOKENS));
  });

  test("US curriculum question (American history)", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "Give me a quick explanation of the American Civil War, in English.", { maxWaitMs: 60_000 });
    expect(reply.length).toBeGreaterThan(100);
    expect(ratio(reply, ENGLISH_TOKENS)).toBeGreaterThan(0.05);
  });
});
