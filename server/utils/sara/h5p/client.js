const fetch = require("node-fetch");

const H5P_API_URL =
  process.env.SARA_H5P_API_URL ||
  "http://127.0.0.1:8888/api/generate-content.php";

/**
 * POST un contenu à l'API PHP H5P et retourne { url, slug }.
 * Throw en cas d'échec — appelant doit try/catch.
 */
async function generateH5P({ type, params, title, language = "fr" }) {
  const res = await fetch(H5P_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, params, title, language }),
    timeout: 15000,
  });
  const data = await res.json();
  if (!data?.success) {
    throw new Error(data?.error || `H5P API HTTP ${res.status}`);
  }
  if (!data.url) {
    throw new Error(data.urlError || "H5P API: URL manquante dans la réponse");
  }
  return { url: data.url, slug: data.slug };
}

module.exports = { generateH5P, H5P_API_URL };
