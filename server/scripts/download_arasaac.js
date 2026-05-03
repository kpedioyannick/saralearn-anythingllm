/**
 * Télécharge des PNG ARASAAC (https://arasaac.org/) en français pour combler
 * les mots manquants après download_mulberry.js.
 *
 * Stratégie : pour chaque mot français, query l'API ARASAAC en FR, prend le 1er
 * résultat (le mieux noté), télécharge le PNG 500x500 dans
 * server/storage/sara/dys_images/mulberry/FR/<slug>.png
 *
 * ARASAAC licence : CC BY-NC-SA 4.0 © Aragon Government / ARASAAC
 *
 * Lancer : node scripts/download_arasaac.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.resolve(__dirname, "../storage/sara/dys_images/mulberry/FR");

// Mots à compléter — ceux qui ont échoué chez Mulberry + quelques bonus utiles
// pour les MD dys-phono.
const WORDS = [
  "bombe","tasse","toit","dame","danse","dragon","carte","coq","cube",
  "gomme","gare","gant","fête","fille","phare","ville","vie","voisin",
  "sac","six","chambre","jouer","jardin","jus","lit","livre","rue",
  "maman","main","mer","nez","ami","papa","enfant","mère","peur",
  "petit","deux","blé","chanter","beau","roue","montagne","soir",
  "noir","yeux","famille",
  // Bonus mots non couverts par Mulberry
  "café","carte","café","baignoire","balle","bébé","banane",
  "champ","crayon","parapluie","école","arbre","oiseau","poisson","fleur",
  "valise","pantalon","chaussure","chapeau","sac","clé","ciseaux",
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      })
      .on("error", reject);
  });
}

function fetchBinary(url, outPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return fetchBinary(res.headers.location, outPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const file = fs.createWriteStream(outPath);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

async function downloadOne(word) {
  // Skip if already exists (in any extension)
  const svgPath = path.join(OUT_DIR, `${word}.svg`);
  const pngPath = path.join(OUT_DIR, `${word}.png`);
  if (fs.existsSync(svgPath) || fs.existsSync(pngPath)) {
    return { word, status: "skip" };
  }

  // Search
  const searchUrl = `https://api.arasaac.org/api/pictograms/fr/search/${encodeURIComponent(word)}`;
  const results = await fetchJSON(searchUrl);
  if (!Array.isArray(results) || results.length === 0) {
    return { word, status: "no_match" };
  }

  // Take the first result (most relevant)
  const id = results[0]._id;
  const imgUrl = `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
  await fetchBinary(imgUrl, pngPath);
  return { word, status: "ok", id };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const stats = { ok: 0, skip: 0, no_match: 0, fail: 0 };
  const noMatch = [];
  const failed = [];

  for (const word of WORDS) {
    try {
      const r = await downloadOne(word);
      stats[r.status]++;
      if (r.status === "no_match") noMatch.push(word);
      // Petite pause pour ne pas spammer l'API
      await new Promise((res) => setTimeout(res, 100));
    } catch (err) {
      stats.fail++;
      failed.push({ word, err: err.message });
    }
  }

  console.log(`\n--- Récap ARASAAC ---`);
  console.log(`Téléchargés : ${stats.ok}`);
  console.log(`Skippés (déjà présents) : ${stats.skip}`);
  console.log(`Aucun match ARASAAC : ${stats.no_match} ${noMatch.length ? "(" + noMatch.join(", ") + ")" : ""}`);
  console.log(`Échecs : ${stats.fail}`);
  if (failed.length) {
    for (const f of failed) console.log(`  ${f.word}: ${f.err}`);
  }
  console.log(`\nLicense : CC BY-NC-SA 4.0 © ARASAAC`);
}

main().catch((e) => { console.error("❌ Fatal:", e); process.exit(1); });
