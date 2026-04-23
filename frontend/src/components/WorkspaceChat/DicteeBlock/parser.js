/**
 * Parse le bloc dictée généré par le LLM.
 *
 * Format attendu :
 *   titre: Le renard et le corbeau
 *   niveau: 6ème
 *
 *   Un corbeau tenait en son bec un fromage,||
 *   attiré par l'odeur, il s'approcha.||
 *   Le renard ouvrit la bouche et parla.
 *
 * - "||" = séparateur de phrase (chaque phrase sera lue 2×)
 * - Les lignes vides sont ignorées
 * - titre/niveau sont optionnels
 */
export function parseDictee(raw) {
  const lines = raw.trim().split(/\r?\n/);
  const meta = { titre: null, niveau: null };
  const textLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase().startsWith("titre:")) {
      meta.titre = trimmed.slice(6).trim();
    } else if (trimmed.toLowerCase().startsWith("niveau:")) {
      meta.niveau = trimmed.slice(7).trim();
    } else {
      textLines.push(trimmed);
    }
  }

  // Rejoindre toutes les lignes de texte, puis séparer sur "||"
  const fullText = textLines.join(" ");
  const phrases = fullText
    .split("||")
    .map((p) => p.trim())
    .filter(Boolean);

  return { ...meta, phrases };
}
