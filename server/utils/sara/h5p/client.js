const fetch = require("node-fetch");

const H5P_API_URL =
  process.env.SARA_H5P_API_URL ||
  "http://127.0.0.1:8888/api/generate-content.php";
const H5P_BOOK_API_URL =
  process.env.SARA_H5P_BOOK_API_URL ||
  "http://127.0.0.1:8888/api/generate-book.php";
const H5P_FLASHCARDS_API_URL =
  process.env.SARA_H5P_FLASHCARDS_API_URL ||
  "http://127.0.0.1:8888/api/generate-flashcards.php";

async function postJson(url, body, timeout = 20000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout,
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

async function generateH5P({ type, params, title, language = "fr" }) {
  return postJson(H5P_API_URL, { type, params, title, language });
}

async function generateH5PBook({ title, language = "fr", pages, showCoverPage = true, bookCover }) {
  return postJson(H5P_BOOK_API_URL, { title, language, pages, showCoverPage, bookCover });
}

async function generateH5PFlashcards({ title, language = "fr", description = "", cards }) {
  return postJson(H5P_FLASHCARDS_API_URL, { title, language, description, cards });
}

module.exports = {
  generateH5P,
  generateH5PBook,
  generateH5PFlashcards,
  H5P_API_URL,
  H5P_BOOK_API_URL,
  H5P_FLASHCARDS_API_URL,
};
