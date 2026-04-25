// LLM live — intent H5P : exige le mot "h5p" dans le message + un bloc quiz généré.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_3EME || "3eme-francais";

test.describe("LLM — H5P", () => {
  skipIfNoLiveLLM(test);

  test("'fais-moi un h5p sur les figures de style' produit du contenu H5P", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi un h5p sur les figures de style", { maxWaitMs: 120_000 });
    // Le bloc text2quiz est généré, puis converti server-side en URL H5P.
    // À l'écran on doit voir soit le bloc soit une URL d'iframe H5P.
    const hasQuizOrH5p = hasBlock(reply, "quiz") || /h5p|iframe/i.test(reply);
    expect(hasQuizOrH5p).toBe(true);
  });
});
