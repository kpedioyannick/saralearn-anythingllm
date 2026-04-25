// LLM live — génération vidéo : vérifie le bloc ```video JSON et l'invocation sara-video.
import { test, expect } from "@playwright/test";
import { login, sendChatMessage, hasBlock, skipIfNoLiveLLM } from "../lib/helpers.js";

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASSWORD;
const WS = process.env.TEST_WORKSPACE_3EME || "3eme-francais";

test.describe("LLM — génération vidéo", () => {
  skipIfNoLiveLLM(test);

  test("'fais-moi une vidéo sur les volcans' → bloc video parseable", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi une vidéo verticale sur les volcans", { maxWaitMs: 180_000 });
    expect(hasBlock(reply, "video")).toBe(true);

    // Extrait le JSON du bloc et vérifie qu'il a la forme attendue.
    const m = reply.match(/```video\s*([\s\S]*?)```/);
    expect(m).toBeTruthy();
    const json = JSON.parse(m[1]);
    expect(Array.isArray(json.slides)).toBe(true);
    expect(json.slides.length).toBeGreaterThan(0);
    expect(["portrait", "landscape", "square"]).toContain(json.format);
  });

  test("'vidéo horizontale' → format=landscape (intent modifier)", async ({ page, baseURL }) => {
    test.skip(!USER || !PASS, "TEST_USER / TEST_PASSWORD manquants");
    await login(page, USER, PASS, baseURL);
    await page.goto(`${baseURL}/workspace/${WS}`);
    await page.waitForURL(/\/workspace\//, { timeout: 15_000 });

    const reply = await sendChatMessage(page, "fais-moi une vidéo horizontale sur la photosynthèse", { maxWaitMs: 180_000 });
    expect(hasBlock(reply, "video")).toBe(true);
    const json = JSON.parse(reply.match(/```video\s*([\s\S]*?)```/)[1]);
    expect(json.format).toBe("landscape");
  });
});
