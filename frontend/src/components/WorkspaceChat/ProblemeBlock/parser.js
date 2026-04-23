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
  const questions = [];
  const blocks = qrRaw.split(/\nQ:\s*/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const rIdx = block.indexOf("\nR:");
    if (rIdx >= 0) {
      questions.push({
        question: block.slice(0, rIdx).trim(),
        corrige: block.slice(rIdx + 3).trim(),
      });
    } else {
      questions.push({ question: block.trim(), corrige: "" });
    }
  }

  return { titre: meta.titre || "", niveau: meta.niveau || "", competence: meta.competence || "", enonce, questions };
}
