// Smoke tests : tous les services backend répondent.
// Pas d'auth ici, juste des pings d'endpoints publics.
import { test, expect, request as pwRequest } from "@playwright/test";

const BASE_FR = process.env.SARA_URL || "https://fr.sara.education";
const BASE_EN = process.env.SARA_URL_EN || "https://en.sara.education";

test.describe("Smoke — services up", () => {
  test("frontend FR répond 200", async () => {
    const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(`${BASE_FR}/sara/login`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("<html");
  });

  test("frontend EN répond 200", async () => {
    const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(`${BASE_EN}/sara/login`);
    expect(res.status()).toBe(200);
  });

  test("API /api/system/check-token sans token → 403", async () => {
    const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(`${BASE_FR}/api/system/check-token`);
    // Sans token, l'API doit refuser (200 = bug, 403/401 = OK).
    expect([401, 403]).toContain(res.status());
  });

  test("sara-video répond /sara-video/health", async () => {
    const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(`${BASE_FR}/sara-video/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
