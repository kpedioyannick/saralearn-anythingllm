/**
 * Parse un bloc ```probleme
 * Format :
 *   titre: ...
 *   niveau: ...
 *   (ligne vide)
 *   ## Énoncé markdown libre
 *   ---
 *   Q: question ouverte
 *   R: corrigé détaillé
 */
export function parseProbleme(raw) {
  const lines = raw.split(/\r?\n/);
  const meta = {};
  let bodyStart = 0;

  // Lire les méta-données (clé: valeur) jusqu'à la première ligne vide
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\w+):\s*(.+)/);
    if (m) {
      meta[m[1]] = m[2].trim();
      bodyStart = i + 1;
    } else if (lines[i].trim() === "" && i === bodyStart) {
      bodyStart = i + 1;
      break;
    } else {
      break;
    }
  }

  const body = lines.slice(bodyStart).join("\n");

  // Séparer énoncé et questions sur "---"
  const sepIdx = body.indexOf("\n---");
  const enonce = sepIdx >= 0 ? body.slice(0, sepIdx).trim() : body.trim();
  const qrRaw = sepIdx >= 0 ? body.slice(sepIdx + 4).trim() : "";

  // Parser les paires Q: / R:
  // `(?:^|\n)` consomme le `Q:` initial AUSSI bien que les suivants — sans
  // ça, le 1er bloc gardait "Q: " en préfixe (les autres étaient propres
  // car splittés sur `\nQ:`), produisant un affichage incohérent
  // ("Q: 1. ..." pour la 1ère, "2. ..." pour les suivantes).
  // On nettoie aussi les séparateurs `---` qui peuvent traîner en queue
  // de chaque bloc (le LLM met souvent `---` entre paires Q/R).
  const stripTrailingSep = (s) => s.replace(/\n?---\s*$/, "").trim();
  const questions = [];
  const blocks = qrRaw.split(/(?:^|\n)Q:\s*/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const rIdx = block.indexOf("\nR:");
    if (rIdx >= 0) {
      questions.push({
        question: stripTrailingSep(block.slice(0, rIdx)),
        corrige: stripTrailingSep(block.slice(rIdx + 3)),
      });
    } else {
      questions.push({ question: stripTrailingSep(block), corrige: "" });
    }
  }

  return { titre: meta.titre || "", niveau: meta.niveau || "", competence: meta.competence || "", enonce, questions };
}
