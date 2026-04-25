// LLM live — carte mentale : doit produire un bloc ```markmap.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_3EME || "3eme-francais";

test.describe("LLM — carte mentale", () => {
  skipIfNoLiveLLM(test);

  test("'fais-moi une carte mentale sur la photosynthèse' → ```markmap", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi une carte mentale sur la photosynthèse");
    expect(hasBlock(reply, "markmap")).toBe(true);
  });
});
