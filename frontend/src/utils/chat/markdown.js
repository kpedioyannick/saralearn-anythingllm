import { encode as HTMLEncode } from "he";
import markdownIt from "markdown-it";
import markdownItKatexPlugin from "./plugins/markdown-katex";
import Appearance from "@/models/appearance";
import hljs from "highlight.js";
import "./themes/github-dark.css";
import "./themes/github.css";
import { v4 } from "uuid";

// Register custom lanaguages
import hljsDefineSvelte from "./hljs-libraries/svelte";
hljs.registerLanguage("svelte", hljsDefineSvelte);

const markdown = markdownIt({
  html: Appearance.get("renderHTML") ?? false,
  typographer: true,
  highlight: function (code, lang) {
    const uuid = v4();

    const theme =
      window.localStorage.getItem("theme") === "light"
        ? "github"
        : "github-dark";

    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          `<div class="whitespace-pre-line w-full max-w-[65vw] hljs ${theme} light:border-solid light:border light:border-gray-700 rounded-lg relative font-mono font-normal text-sm text-slate-200">
            <div class="w-full flex items-center sticky top-0 text-slate-200 light:bg-sky-800 bg-stone-800 px-4 py-2 text-xs font-sans justify-between rounded-t-md -mt-5">
              <div class="flex gap-2">
                <code class="text-xs">${lang || ""}</code>
              </div>
              <button data-code-snippet data-code="code-${uuid}" class="flex items-center gap-x-1">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                <p class="text-xs" style="margin: 0px;padding: 0px;">Copy block</p>
              </button>
            </div>
            <pre class="whitespace-pre-wrap px-4 pb-4">` +
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value +
          "</pre></div>"
        );
      } catch {}
    }

    return (
      `<div class="whitespace-pre-line w-full max-w-[65vw] hljs ${theme} light:border-solid light:border light:border-gray-700 rounded-lg relative font-mono font-normal text-sm text-slate-200">
        <div class="w-full flex items-center sticky top-0 text-slate-200 bg-stone-800 px-4 py-2 text-xs font-sans justify-between rounded-t-md -mt-5">
          <div class="flex gap-2"><code class="text-xs"></code></div>
          <button data-code-snippet data-code="code-${uuid}" class="flex items-center gap-x-1">
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            <p class="text-xs" style="margin: 0px;padding: 0px;">Copy block</p>
          </button>
        </div>
        <pre class="whitespace-pre-wrap px-4 pb-4">` +
      HTMLEncode(code) +
      "</pre></div>"
    );
  },
});

// Add custom renderer for strong tags to handle theme colors
markdown.renderer.rules.strong_open = () => '<strong class="text-white">';
markdown.renderer.rules.strong_close = () => "</strong>";
markdown.renderer.rules.link_open = (tokens, idx) => {
  const token = tokens[idx];
  const href = token.attrs.find((attr) => attr[0] === "href");
  return `<a href="${href[1]}" target="_blank" rel="noopener noreferrer">`;
};

// Custom renderer for responsive images rendered in markdown
markdown.renderer.rules.image = function (tokens, idx) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex("src");
  const src = token.attrs[srcIndex][1];
  const alt = token.content || "";

  return `<div class="w-full max-w-[800px]"><img src="${src}" alt="${alt}" class="w-full h-auto" /></div>`;
};

// --- SaraLearn : blocs riches via fence renderer (bypass <pre><code> wrapping) ---
const _defaultFence = markdown.renderer.rules.fence?.bind(markdown.renderer) ??
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

markdown.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const lang = token.info.trim().split(/\s+/)[0];
  const code = token.content;
  const uuid = v4();

  if (lang === "quiz") {
    return `<div class="quiz-block" data-content="${encodeURIComponent(code)}"></div>\n`;
  }
  if (lang === "dictee") {
    return `<div class="dictee-block" data-content="${encodeURIComponent(code)}"></div>\n`;
  }
  if (lang === "markmap") {
    return `<div class="markmap-block" data-content="${encodeURIComponent(code)}" style="width:100%;height:300px;margin-top:8px;border-radius:8px;overflow:hidden;"></div>\n`;
  }
  if (lang === "geogebra") {
    return `<div class="geogebra-block" data-content="${encodeURIComponent(code.trim())}"></div>\n`;
  }
  if (lang === "probleme") {
    return `<div class="probleme-block" data-content="${encodeURIComponent(code)}"></div>\n`;
  }
  if (lang === "video") {
    return `<div class="video-block" data-content="${encodeURIComponent(code)}"></div>\n`;
  }
  if (lang === "video-url") {
    return `<div class="video-url-block" data-content="${encodeURIComponent(code.trim())}"></div>\n`;
  }
  if (lang === "h5p") {
    return `<div class="h5p-block" data-content="${encodeURIComponent(code.trim())}"></div>\n`;
  }
  if (lang === "reveal") {
    const slidesHtml = code
      .split(/\n---\n/)
      .map((s) => `<section data-markdown><textarea data-template>${s}</textarea></section>`)
      .join("");
    return `<div id="reveal-${uuid}" class="reveal" style="width:100%;height:420px;margin-top:8px;"><div class="slides">${slidesHtml}</div></div>\n`;
  }

  return _defaultFence(tokens, idx, options, env, self);
};
// --- fin SaraLearn ---

markdown.use(markdownItKatexPlugin);

// Détecte les messages de progression vidéo "⏳ Rendu vidéo en cours…"
// et les wrap en span animé. Pas de regex sur du HTML déjà rendu : le pattern
// est en texte brut donc on opère AVANT markdown.render.
const VIDEO_LOADER_RE = /^(⏳ Rendu vidéo en cours…(?: ·)*)$/;

export default function renderMarkdown(text = "") {
  const trimmed = text.trim();
  if (VIDEO_LOADER_RE.test(trimmed)) {
    return `<div class="sara-video-loader"><span class="sara-video-loader__icon">⏳</span><span class="sara-video-loader__label">${trimmed.replace(/^⏳ /, "")}</span></div>`;
  }
  return markdown.render(text);
}
