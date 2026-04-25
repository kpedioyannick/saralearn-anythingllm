// LLM live — dictée. L'intent dictée s'active soit par embedding soit
// automatiquement si le thread porte "dict" dans son nom.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_DICTEE || process.env.TEST_WORKSPACE_3EME || "3eme-francais";

test.describe("LLM — dictée", () => {
  skipIfNoLiveLLM(test);

  test("'fais-moi une dictée sur le passé composé' → ```dictee", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi une dictée sur le passé composé");
    expect(hasBlock(reply, "dictee")).toBe(true);
    expect(reply).toContain("||"); // les phrases de dictée sont séparées par ||
  });
});
