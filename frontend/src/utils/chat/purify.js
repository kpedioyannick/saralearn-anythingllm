import createDOMPurify from "dompurify";

const DOMPurify = createDOMPurify(window);
DOMPurify.setConfig({
  ADD_TAGS: ["iframe"],
  ADD_ATTR: [
    "target", "rel",
    // geogebra iframe
    "src", "loading", "allowfullscreen",
    // quiz, dictee, markmap, geogebra, probleme
    "data-content",
    // reveal
    "data-markdown", "data-template",
    // styles inline
    "style",
  ],
});

export default DOMPurify;
