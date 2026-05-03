const MEDIA_RE = /\[(img|tts|audio|video):([^\]]+)\]/g;
const VIDEO_KIND_RE = /^(articulation|lsf|avatar):(.+)$/;

function parseMediaToken(type, value) {
  if (type === "img") return { type: "image", src: value };
  if (type === "tts") return { type: "tts", text: value };
  if (type === "audio") return { type: "audio", url: value };
  if (type === "video") {
    const m = value.match(VIDEO_KIND_RE);
    if (m) return { type: "video", kind: m[1], key: m[2] };
    return { type: "video", url: value };
  }
  return null;
}

export function tokenize(raw) {
  if (raw == null) return [];
  const str = String(raw);
  const items = [];
  let last = 0;
  let m;
  MEDIA_RE.lastIndex = 0;
  while ((m = MEDIA_RE.exec(str)) !== null) {
    if (m.index > last) {
      const text = str.slice(last, m.index);
      if (text.length) items.push({ type: "text", content: text });
    }
    const token = parseMediaToken(m[1], m[2].trim());
    if (token) items.push(token);
    last = m.index + m[0].length;
  }
  if (last < str.length) {
    const text = str.slice(last);
    if (text.length) items.push({ type: "text", content: text });
  }
  if (!items.length) items.push({ type: "text", content: "" });
  // Déduplique les tokens TTS consécutifs avec le même texte (Sara empile parfois
  // un TTS de consigne + un TTS du mot, ou 2 fois le même mot). Garde le 1er.
  const seen = new Set();
  const dedup = [];
  for (const it of items) {
    if (it.type === "tts") {
      const key = String(it.text).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    dedup.push(it);
  }
  return dedup;
}

export function tokenizeIfAny(raw) {
  const items = tokenize(raw);
  if (items.length === 1 && items[0].type === "text") return null;
  return items;
}

export function extractMeta(raw) {
  if (!raw) return { text: "", feedback_ok: null, feedback_ko: null };
  // Tolérance LLM : "FEEDBACK:OK:" / "FEEDBACK_OK:" → "OK:"
  const text = String(raw).replace(/\bFEEDBACK[:_-]?(OK|KO):\s*/gi, "$1: ");
  const re = /(^|\s)(OK|KO):\s*/i;
  const m = text.match(re);
  if (!m) return { text: text.trim(), feedback_ok: null, feedback_ko: null };
  const cutAt = m.index + m[1].length;
  const main = text.slice(0, cutAt).trim();
  const metaStr = text.slice(cutAt);
  let feedback_ok = null;
  let feedback_ko = null;
  const parts = metaStr.split(/\s+(?=(?:OK|KO):)/i);
  for (const p of parts) {
    const mm = p.match(/^(OK|KO):\s*([\s\S]*)$/i);
    if (!mm) continue;
    if (mm[1].toUpperCase() === "OK") feedback_ok = mm[2].trim() || null;
    else feedback_ko = mm[2].trim() || null;
  }
  return { text: main, feedback_ok, feedback_ko };
}
