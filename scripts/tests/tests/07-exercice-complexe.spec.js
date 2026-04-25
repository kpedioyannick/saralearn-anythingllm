// LLM live — exercice brevet riche, doit produire un bloc ```probleme.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, leakOutsideBlocks, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_BREVET || "brevet";

test.describe("LLM — exercice complexe (brevet)", () => {
  skipIfNoLiveLLM(test);

  test("'donne-moi un exercice du brevet 2024 sur la compréhension de texte' → ```probleme", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "donne-moi un exercice du brevet 2024 sur la compréhension de texte", { maxWaitMs: 120_000 });
    // Doit contenir un bloc probleme OU quiz (les 2 sont OK pour exercice).
    const wrapped = hasBlock(reply, "probleme") || hasBlock(reply, "quiz");
    expect(wrapped).toBe(true);
    expect(leakOutsideBlocks(reply)).toBeLessThan(100);
  });
});
