// LLM live — exercice simple QCM.
// Skippé si RUN_LIVE_LLM != 1.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, leakOutsideBlocks, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_BREVET || "brevet";

test.describe("LLM — exercice simple (QCM)", () => {
  skipIfNoLiveLLM(test);

  test("'fais-moi un QCM rapide sur Pythagore' produit un bloc ```quiz", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi un QCM rapide sur Pythagore");
    expect(hasBlock(reply, "quiz")).toBe(true);
    expect(leakOutsideBlocks(reply)).toBeLessThan(50);
  });
});
