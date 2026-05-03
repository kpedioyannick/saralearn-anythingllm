/**
 * Télécharge des SVG Mulberry depuis le repo GitHub officiel et les sauve
 * dans server/storage/sara/dys_images/mulberry/FR/<slug_fr>.svg
 *
 * Mapping FR→EN limité aux mots utilisés dans les MD dys-phono.
 * Mulberry licence : CC BY-SA 4.0 (https://github.com/mulberrysymbols/mulberry-symbols)
 *
 * Lancer : node scripts/download_mulberry.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.resolve(__dirname, "../storage/sara/dys_images/mulberry/FR");
const RAW_BASE = "https://raw.githubusercontent.com/mulberrysymbols/mulberry-symbols/master/EN";

// Mapping mot français (slug utilisé dans les MD) → nom Mulberry EN.
// On ne garde que les mots où Mulberry a une icône représentative.
const MAPPING = {
  // Mots P/B
  pain: "bread",
  bain: "bath",
  pomme: "apple",
  bombe: "bomb",
  poule: "chicken",
  boule: "ball",
  // Mots T/D
  table: "table",
  tortue: "turtle",
  tasse: "cup",
  tigre: "tiger",
  tomate: "tomato",
  train: "train",
  toit: "roof",
  trois: "three",
  dos: "back",
  dame: "lady",
  doigt: "finger",
  danse: "dance",
  dent: "tooth",
  dragon: "dragon",
  dauphin: "dolphin",
  douche: "shower",
  // Mots K/G
  café: "coffee",
  carte: "map",
  coq: "cock",
  cube: "cube",
  képi: "cap",
  gâteau: "cake",
  gomme: "rubber",
  gare: "train_station",
  guitare: "guitar",
  gros: "fat",
  guêpe: "wasp",
  gant: "glove",
  gorille: "gorilla",
  // Mots F/V
  fête: "party",
  fille: "girl",
  feu: "fire",
  fleur: "flower",
  phare: "lighthouse",
  fromage: "cheese",
  vache: "cow",
  vélo: "bicycle",
  voiture: "car",
  ville: "city",
  verre: "glass",
  vie: "life",
  voisin: "neighbour",
  // Mots S/Z
  serpent: "snake",
  soleil: "sun",
  souris: "mouse",
  salade: "salad",
  sac: "bag",
  six: "Six",
  zèbre: "zebra",
  zéro: "Zero",
  rose: "rose",
  vase: "vase",
  maison: "house",
  musique: "music",
  // Mots CH/J
  chat: "cat",
  chocolat: "chocolate",
  chemin: "road",
  chien: "dog",
  cheval: "horse",
  chambre: "bedroom",
  chaud: "hot",
  chemise: "shirt",
  jouer: "play",
  jeune: "young",
  jardin: "garden",
  jaune: "yellow",
  joli: "pretty",
  jus: "juice",
  girafe: "giraffe",
  // Mots L/R
  lampe: "lamp",
  lit: "bed",
  loup: "wolf",
  livre: "book",
  rat: "rat",
  rouge: "red",
  robe: "dress",
  rue: "street",
  // Mots M/N
  maman: "mother",
  main: "hand",
  mer: "sea",
  nez: "nose",
  nuit: "night",
  neige: "snow",
  // Mots voyelles
  ami: "friend",
  papa: "father",
  enfant: "child",
  champ: "field",
  stylo: "pen",
  pot: "pot",
  mouton: "sheep",
  bonbon: "sweet",
  mère: "mother",
  tête: "head",
  lait: "milk",
  chaise: "chair",
  vin: "wine",
  lapin: "rabbit",
  œuf: "egg",
  peur: "fear",
  parfum: "perfume",
  petit: "small",
  deux: "Two",
  été: "summer",
  blé: "wheat",
  chanter: "sing",
  beau: "beautiful",
  riz: "rice",
  roue: "wheel",
  soupe: "soup",
  chou: "cabbage",
  // Animaux/objets divers
  agneau: "lamb",
  montagne: "mountain",
  peigne: "comb",
  bébé: "baby",
  // Yeux, famille, paille
  yeux: "eyes",
  famille: "family",
  // Noir, soir
  noir: "black",
  soir: "evening",
};

function fetchSVG(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return fetchSVG(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (const [fr, en] of Object.entries(MAPPING)) {
    const outPath = path.join(OUT_DIR, `${fr}.svg`);
    if (fs.existsSync(outPath)) {
      skipped++;
      continue;
    }
    const url = `${RAW_BASE}/${en}.svg`;
    try {
      const svg = await fetchSVG(url);
      if (!svg.includes("<svg")) {
        throw new Error("Not an SVG file");
      }
      fs.writeFileSync(outPath, svg, "utf-8");
      downloaded++;
      // Petite pause pour être courtois avec GitHub raw
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      failed++;
      errors.push({ fr, en, err: err.message });
    }
  }

  console.log(`\n--- Récap ---`);
  console.log(`Téléchargés : ${downloaded}`);
  console.log(`Skippés (déjà présents) : ${skipped}`);
  console.log(`Échecs : ${failed}`);
  if (errors.length) {
    console.log(`\nDétail échecs (probablement nom EN incorrect) :`);
    for (const e of errors) console.log(`  ${e.fr} → ${e.en} : ${e.err}`);
  }
  console.log(`\nLicense : CC BY-SA 4.0 © Mulberry Symbols`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
