/**
 * Génère 1 fichier MD par confusion phonétique dans
 *   server/storage/sara/dys/phono/confusion-<pair>.md
 *
 * Structure adaptée au focus pédagogique demandé par Yannick :
 *   1. Articulation (court, factuel, pas de QCM)
 *   2. Discrimination auditive (TTS QCM)
 *   3. Lecture (lire les graphies)
 *   4. Production en mot isolé — "Nomme les dessins et choisis le bon graphème"
 *   5. Production en phrase — phrases à compléter + verbes + dictée
 *
 * Idempotent par défaut. Forcer avec --force.
 *
 * Lancer : node scripts/gen_phono_md.js [--force]
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(__dirname, "../storage/sara/dys/phono");
const FORCE = process.argv.includes("--force");

// Emojis pour donner un visuel dans "Nomme et choisis" en attendant Mulberry.
const EMOJI = {
  pain: "🥖", bain: "🛁", pomme: "🍎", bombe: "💣", poule: "🐔", boule: "⚪",
  table: "🪑", tortue: "🐢", tasse: "🍵", tigre: "🐯", tomate: "🍅", train: "🚆",
  toit: "🏠", trois: "3️⃣", dos: "🔙", dame: "👩", doigt: "👆", danse: "💃",
  dent: "🦷", dragon: "🐉", dauphin: "🐬", douche: "🚿",
  café: "☕", carte: "🃏", coq: "🐓", cube: "🟦", képi: "🧢",
  gâteau: "🎂", gomme: "🌰", gare: "🚉", guitare: "🎸", gros: "🐘", guêpe: "🐝",
  gant: "🧤", gorille: "🦍",
  fête: "🎉", fille: "👧", feu: "🔥", fou: "🃏", facile: "😊", fleur: "🌸",
  phare: "🚨", fromage: "🧀", four: "🔥",
  vache: "🐄", vélo: "🚴", voiture: "🚗", ville: "🏙️", verre: "🥛", vide: "📭",
  voisin: "👨", vie: "💚",
  serpent: "🐍", soleil: "☀️", souris: "🐭", salade: "🥗", sac: "👜", six: "6️⃣",
  zèbre: "🦓", zoo: "🦁", zéro: "0️⃣", rose: "🌹", vase: "🏺", maison: "🏠",
  musique: "🎵",
  chat: "🐱", chocolat: "🍫", chemin: "🛤️", chien: "🐕", cheval: "🐎",
  chambre: "🛏️", chaud: "♨️", chiffre: "🔢", chemise: "👕",
  jouer: "🎮", jeune: "🧒", jardin: "🌳", jaune: "🟡", jeudi: "📅", joli: "💖",
  jus: "🧃", girafe: "🦒",
  lampe: "💡", lit: "🛏️", loup: "🐺", livre: "📖",
  rat: "🐀", rouge: "🟥", robe: "👗", rue: "🛣️",
  maman: "👩", main: "✋", mer: "🌊", nez: "👃", nuit: "🌙", neige: "❄️",
  agneau: "🐑", montagne: "⛰️", peigne: "💆",
  ami: "👫", papa: "👨", banane: "🍌", enfant: "👶", champ: "🌾",
  stylo: "🖋️", pot: "🏺", mouton: "🐑", balcon: "🏠", bonbon: "🍬",
  mère: "👩", tête: "🤔", lait: "🥛", chaise: "🪑", vin: "🍷", lapin: "🐰",
  œuf: "🥚", peur: "😨", lundi: "📅", parfum: "🌷",
  petit: "🐣", deux: "2️⃣",
  été: "☀️", blé: "🌾", chanter: "🎤",
  beau: "🌟", lu: "📚", riz: "🍚", roue: "⚙️", soupe: "🍲", chou: "🥬", chute: "💥",
  yeux: "👀", famille: "👨‍👩‍👧", paille: "🌾",
  moi: "👤", toi: "👈", soir: "🌆", noir: "⬛",
};

function emj(word) {
  const w = word.toLowerCase();
  return EMOJI[w] ? `[img:emoji:${EMOJI[w]}] ` : "";
}

// Données pédagogiques — mêmes paires que la version précédente.
const DATA = {
  td: {
    phon1: "[t]", phon2: "[d]", graph1: "T", graph2: "D",
    articulation: "Pose la pointe de ta langue derrière les dents du haut, puis relâche-la d'un coup. Pour [t], pas de vibration de la gorge. Pour [d], la gorge vibre.",
    distinctTrait: "sonorité (vibration des cordes vocales)",
    tip: "Pose ta main sur ta gorge : si ça vibre c'est D, sinon c'est T.",
    words1: ["table", "tortue", "tasse", "tigre", "tomate", "train", "toit", "trois"],
    words2: ["dos", "dame", "doigt", "danse", "dent", "dragon", "dauphin", "douche"],
    minimalPairs: [["tas", "das"], ["taux", "dos"], ["temps", "dans"], ["thé", "dé"], ["toux", "doux"]],
    sentences: ["Le tigre dort dans la tanière.", "Ton dauphin danse dans l'eau douce.", "Trois dames trottent vers la table."],
    verbs: [
      { word: "trotter", blank: "{{t}}rotter" }, { word: "dormir", blank: "{{d}}ormir" },
      { word: "tomber", blank: "{{t}}omber" }, { word: "danser", blank: "{{d}}anser" },
      { word: "tirer", blank: "{{t}}irer" }, { word: "donner", blank: "{{d}}onner" },
      { word: "ajouter", blank: "ajou{{t}}er" }, { word: "additionner", blank: "ad{{d}}i{{t}}ionner" },
    ],
    title: "Confusion T / D", threadSlug: "confusion-td",
    desc: "Distinguer les sons [t] (sourd) et [d] (sonore), tous deux apico-dentaux.",
  },
  kg: {
    phon1: "[k]", phon2: "[g]", graph1: "C, Q, K", graph2: "G, GU",
    articulation: "Plaque l'arrière de ta langue contre le voile du palais, puis relâche d'un coup. Pour [k], pas de vibration. Pour [g], la gorge vibre.",
    distinctTrait: "sonorité (vibration des cordes vocales)",
    tip: "[k] : c devant a/o/u, qu devant e/i. [g] : g devant a/o/u, gu devant e/i.",
    words1: ["café", "carte", "coq", "cube", "képi"],
    words2: ["gâteau", "gomme", "gare", "guitare", "gros", "guêpe", "gant", "gorille"],
    minimalPairs: [["car", "gare"], ["cou", "goût"], ["camp", "gant"]],
    sentences: ["Le gros chat boit du café.", "Mon copain joue de la guitare.", "Une guêpe vole près du gâteau."],
    verbs: [
      { word: "courir", blank: "{{c}}ourir" }, { word: "garder", blank: "{{g}}arder" },
      { word: "couper", blank: "{{c}}ouper" }, { word: "gagner", blank: "{{g}}agner" },
      { word: "casser", blank: "{{c}}asser" }, { word: "guider", blank: "{{gu}}ider" },
      { word: "occuper", blank: "o{{cc}}uper" }, { word: "aggraver", blank: "a{{gg}}raver" },
    ],
    title: "Confusion K / G", threadSlug: "confusion-kg",
    desc: "Distinguer les sons [k] (sourd) et [g] (sonore), tous deux vélaires.",
  },
  fv: {
    phon1: "[f]", phon2: "[v]", graph1: "F, FF, PH", graph2: "V",
    articulation: "Pose tes dents du haut sur ta lèvre du bas et souffle. Pour [f], pas de vibration. Pour [v], la gorge vibre.",
    distinctTrait: "sonorité (vibration des cordes vocales)",
    tip: "Si la gorge vibre quand tu prolonges le son, c'est V. Sinon, c'est F.",
    words1: ["fête", "fille", "feu", "fou", "facile", "fleur", "phare", "fromage"],
    words2: ["vache", "vélo", "voiture", "ville", "verre", "vide", "vie", "voisin"],
    minimalPairs: [["fou", "vous"], ["faux", "veau"], ["fer", "verre"], ["fond", "vont"]],
    sentences: ["La vache fait un grand bond dans la prairie.", "Ma voisine vole vers la fête.", "Le voleur a froid dans la voiture."],
    verbs: [
      { word: "fermer", blank: "{{f}}ermer" }, { word: "voler", blank: "{{v}}oler" },
      { word: "finir", blank: "{{f}}inir" }, { word: "venir", blank: "{{v}}enir" },
      { word: "faire", blank: "{{f}}aire" }, { word: "vouloir", blank: "{{v}}ouloir" },
      { word: "affirmer", blank: "a{{ff}}irmer" }, { word: "effrayer", blank: "e{{ff}}rayer" },
      { word: "souffler", blank: "sou{{ff}}ler" }, { word: "envoyer", blank: "en{{v}}oyer" },
    ],
    title: "Confusion F / V", threadSlug: "confusion-fv",
    desc: "Distinguer les sons [f] (sourd) et [v] (sonore), tous deux labio-dentaux.",
  },
  sz: {
    phon1: "[s]", phon2: "[z]", graph1: "S, SS, C, Ç, X", graph2: "Z, S (entre voyelles)",
    articulation: "Pose le bout de ta langue près des dents du haut et souffle un mince filet d'air. Pour [s], pas de vibration. Pour [z], la gorge vibre.",
    distinctTrait: "sonorité (vibration des cordes vocales)",
    tip: "Entre 2 voyelles, S se prononce [z] (rose). SS reste [s] (poisson). Z se prononce toujours [z].",
    words1: ["serpent", "soleil", "souris", "salade", "sac", "six"],
    words2: ["zèbre", "zoo", "zéro", "rose", "vase", "maison", "musique"],
    minimalPairs: [["poisson", "poison"], ["dessert", "désert"], ["coussin", "cousin"], ["baisser", "baiser"]],
    sentences: ["Le zèbre court dans le désert.", "Ma cousine sent la rose.", "Six souris se cachent dans le vase."],
    verbs: [
      { word: "sortir", blank: "{{s}}ortir" }, { word: "savoir", blank: "{{s}}avoir" },
      { word: "passer", blank: "pa{{ss}}er" }, { word: "casser", blank: "ca{{ss}}er" },
      { word: "poser", blank: "po{{s}}er" }, // S entre voyelles → [z]
      { word: "user", blank: "u{{s}}er" },   // S entre voyelles → [z]
      { word: "briser", blank: "bri{{s}}er" },
      { word: "amuser", blank: "amu{{s}}er" },
    ],
    title: "Confusion S / Z", threadSlug: "confusion-sz",
    desc: "Distinguer les sons [s] (sourd) et [z] (sonore), tous deux alvéolaires.",
  },
  chj: {
    phon1: "[ʃ]", phon2: "[ʒ]", graph1: "CH", graph2: "J, G (devant e/i)",
    articulation: "Arrondis tes lèvres, lève la langue vers le haut sans toucher le palais, et souffle. Pour [ʃ] (CH), pas de vibration. Pour [ʒ] (J), la gorge vibre.",
    distinctTrait: "sonorité (vibration des cordes vocales)",
    tip: "G devant e/i se lit [ʒ] (genou, gigot). G devant a/o/u se lit [g]. CH s'écrit toujours « ch ».",
    words1: ["chat", "chocolat", "chemin", "chien", "cheval", "chambre", "chaud", "chiffre"],
    words2: ["jouer", "jeune", "jardin", "jaune", "jeudi", "joli", "jus", "girafe"],
    minimalPairs: [["chou", "joue"], ["choix", "joie"], ["cher", "geai"], ["bouche", "bouge"]],
    sentences: ["Mon chien joue dans le jardin jaune.", "Le jeune cheval mange du chocolat.", "J'ai choisi une jolie chemise."],
    verbs: [
      { word: "chercher", blank: "{{ch}}er{{ch}}er" }, { word: "jouer", blank: "{{j}}ouer" },
      { word: "chanter", blank: "{{ch}}anter" }, { word: "juger", blank: "{{j}}u{{g}}er" },
      { word: "manger", blank: "man{{g}}er" }, { word: "couché", blank: "cou{{ch}}é" },
    ],
    title: "Confusion CH / J", threadSlug: "confusion-chj",
    desc: "Distinguer les sons [ʃ] (sourd, ch) et [ʒ] (sonore, j ou g), tous deux post-alvéolaires.",
  },

  // Skeleton tier — données plus minces
  fch: { phon1: "[f]", phon2: "[ʃ]", graph1: "F", graph2: "CH", articulation: "Pour [f], dents sur la lèvre du bas et souffle. Pour [ʃ], lèvres arrondies et souffle. Tous deux sourds.", distinctTrait: "point d'articulation (lèvres vs langue arrondie)", tip: "[f] = souffle court avec les dents. [ʃ] = souffle long avec les lèvres en avant.", words1: ["fête","fille","fleur","feu"], words2: ["chat","chaud","chien","chocolat"], minimalPairs: [["fer","cher"],["faux","chaud"],["fou","chou"]], sentences: ["Le chat fait peur à la fille.","Mon chien fête son anniversaire."], verbs: [{word:"fermer",blank:"{{f}}ermer"},{word:"finir",blank:"{{f}}inir"},{word:"faire",blank:"{{f}}aire"},{word:"chercher",blank:"{{ch}}er{{ch}}er"},{word:"chanter",blank:"{{ch}}anter"},{word:"souffler",blank:"sou{{ff}}ler"}], title: "Confusion F / CH", threadSlug: "confusion-fch", desc: "Distinguer les sons [f] et [ʃ], deux souffles à points d'articulation différents." },
  vj: { phon1: "[v]", phon2: "[ʒ]", graph1: "V", graph2: "J, G (devant e/i)", articulation: "Pour [v], dents sur lèvre du bas et vibration. Pour [ʒ], lèvres arrondies et vibration. Tous deux sonores.", distinctTrait: "point d'articulation (lèvres vs langue arrondie)", tip: "[v] = vibration courte avec les dents. [ʒ] = vibration plus longue avec les lèvres rondes.", words1: ["vache","vélo","verre","vie"], words2: ["jour","jaune","joli","jardin"], minimalPairs: [["vous","joue"],["vent","gens"]], sentences: ["Mon voisin joue dans le jardin.","La vache verte joue au jardin."], verbs: [{word:"voler",blank:"{{v}}oler"},{word:"venir",blank:"{{v}}enir"},{word:"vivre",blank:"{{v}}ivre"},{word:"jouer",blank:"{{j}}ouer"},{word:"juger",blank:"{{j}}u{{g}}er"},{word:"envoyer",blank:"en{{v}}oyer"}], title: "Confusion V / J", threadSlug: "confusion-vj", desc: "Distinguer les sons [v] et [ʒ], deux sons sonores constrictifs." },
  sch: { phon1: "[s]", phon2: "[ʃ]", graph1: "S, SS, C, Ç", graph2: "CH", articulation: "Pour [s], pointe de la langue près des dents, souffle sifflant. Pour [ʃ], lèvres arrondies, souffle chuintant. Tous deux sourds.", distinctTrait: "lieu de constriction (avant vs arrière)", tip: "[s] siffle comme un serpent. [ʃ] chuinte comme un chat.", words1: ["soleil","souris","sac","six"], words2: ["chat","chien","chemin","chaud"], minimalPairs: [["sou","chou"],["seau","chaud"],["sa","chat"]], sentences: ["Sept souris sortent du chemin.","Le chat sort sous la chaise."], verbs: [{word:"sortir",blank:"{{s}}ortir"},{word:"savoir",blank:"{{s}}avoir"},{word:"sauter",blank:"{{s}}auter"},{word:"chercher",blank:"{{ch}}er{{ch}}er"},{word:"chanter",blank:"{{ch}}anter"},{word:"passer",blank:"pa{{ss}}er"}], title: "Confusion S / CH", threadSlug: "confusion-sch", desc: "Distinguer les sons [s] (sifflant) et [ʃ] (chuintant), tous deux sourds." },
  pt: { phon1: "[p]", phon2: "[t]", graph1: "P", graph2: "T", articulation: "Pour [p], ferme et ouvre les lèvres d'un coup. Pour [t], plaque la pointe de la langue contre les dents puis relâche.", distinctTrait: "point d'articulation (lèvres vs dents)", tip: "[p] explose des lèvres. [t] explose de la pointe de la langue.", words1: ["pain","poule","pomme","papa"], words2: ["table","tortue","tomate","trois"], minimalPairs: [["pas","tas"],["pont","ton"],["père","terre"]], sentences: ["Trois poules picorent la tomate.","Papa porte le pain à table."], verbs: [{word:"partir",blank:"{{p}}artir"},{word:"porter",blank:"{{p}}orter"},{word:"tomber",blank:"{{t}}omber"},{word:"tenir",blank:"{{t}}enir"},{word:"apporter",blank:"a{{pp}}orter"},{word:"attendre",blank:"a{{tt}}endre"}], title: "Confusion P / T", threadSlug: "confusion-pt", desc: "Distinguer [p] et [t], occlusives sourdes : lèvres vs dents." },
  tk: { phon1: "[t]", phon2: "[k]", graph1: "T", graph2: "C, Q, K", articulation: "Pour [t], pointe de la langue contre les dents. Pour [k], arrière de la langue contre le palais.", distinctTrait: "point d'articulation (avant vs arrière)", tip: "[t] vient de l'avant. [k] vient de l'arrière (gorge).", words1: ["table","trois","tortue","thé"], words2: ["café","carte","coq","cube"], minimalPairs: [["tas","cas"],["thé","qui"]], sentences: ["Tante Carine boit son thé chaud.","Trois coqs courent dans la cour."], verbs: [{word:"tomber",blank:"{{t}}omber"},{word:"tenir",blank:"{{t}}enir"},{word:"tirer",blank:"{{t}}irer"},{word:"courir",blank:"{{c}}ourir"},{word:"couper",blank:"{{c}}ouper"},{word:"attendre",blank:"a{{tt}}endre"},{word:"occuper",blank:"o{{cc}}uper"}], title: "Confusion T / K", threadSlug: "confusion-tk", desc: "Distinguer [t] et [k], occlusives sourdes : dents vs gorge." },
  pk: { phon1: "[p]", phon2: "[k]", graph1: "P", graph2: "C, Q, K", articulation: "Pour [p], lèvres qui s'ouvrent. Pour [k], arrière de la langue qui se décolle du palais.", distinctTrait: "point d'articulation (lèvres vs gorge)", tip: "[p] = avant (lèvres). [k] = arrière (gorge).", words1: ["pain","pomme","poule","papa"], words2: ["café","carte","coq"], minimalPairs: [["pas","cas"],["pont","con"]], sentences: ["Papa coupe la pomme.","Le coq picore le pain."], verbs: [{word:"partir",blank:"{{p}}artir"},{word:"porter",blank:"{{p}}orter"},{word:"pouvoir",blank:"{{p}}ouvoir"},{word:"courir",blank:"{{c}}ourir"},{word:"couper",blank:"{{c}}ouper"},{word:"apporter",blank:"a{{pp}}orter"},{word:"occuper",blank:"o{{cc}}uper"}], title: "Confusion P / K", threadSlug: "confusion-pk", desc: "Distinguer [p] et [k], occlusives sourdes : lèvres vs gorge." },
  bd: { phon1: "[b]", phon2: "[d]", graph1: "B", graph2: "D", articulation: "Pour [b], lèvres qui s'ouvrent avec vibration. Pour [d], pointe de la langue contre les dents avec vibration.", distinctTrait: "point d'articulation (lèvres vs dents)", tip: "[b] = lèvres qui vibrent. [d] = dents/langue qui vibrent.", words1: ["bain","balle","bébé","bois"], words2: ["dos","danse","doigt","dent"], minimalPairs: [["bas","das"],["bon","don"],["beau","dos"]], sentences: ["Le bébé danse dans le bain.","Mon doigt touche la balle."], verbs: [{word:"battre",blank:"{{b}}attre"},{word:"boire",blank:"{{b}}oire"},{word:"bouger",blank:"{{b}}ouger"},{word:"donner",blank:"{{d}}onner"},{word:"dormir",blank:"{{d}}ormir"},{word:"descendre",blank:"{{d}}escendre"}], title: "Confusion B / D", threadSlug: "confusion-bd", desc: "Distinguer [b] et [d], occlusives sonores : lèvres vs dents." },
  dg: { phon1: "[d]", phon2: "[g]", graph1: "D", graph2: "G, GU", articulation: "Pour [d], pointe de la langue contre les dents. Pour [g], arrière de la langue contre le palais.", distinctTrait: "point d'articulation (avant vs arrière)", tip: "[d] vient des dents. [g] vient de la gorge.", words1: ["dos","dame","danse","doigt"], words2: ["gâteau","gomme","gros","guitare"], minimalPairs: [["doux","goût"],["dent","gant"]], sentences: ["Ma dame mange un gros gâteau.","Le doigt glisse sur la gomme."], verbs: [{word:"donner",blank:"{{d}}onner"},{word:"dormir",blank:"{{d}}ormir"},{word:"descendre",blank:"{{d}}escendre"},{word:"gagner",blank:"{{g}}agner"},{word:"garder",blank:"{{g}}arder"},{word:"glisser",blank:"{{g}}lisser"},{word:"aggraver",blank:"a{{gg}}raver"}], title: "Confusion D / G", threadSlug: "confusion-dg", desc: "Distinguer [d] et [g], occlusives sonores : dents vs gorge." },
  bg: { phon1: "[b]", phon2: "[g]", graph1: "B", graph2: "G, GU", articulation: "Pour [b], lèvres qui s'ouvrent avec vibration. Pour [g], arrière de la langue qui se décolle.", distinctTrait: "point d'articulation (lèvres vs gorge)", tip: "[b] vient des lèvres. [g] vient de la gorge.", words1: ["bain","balle","bois"], words2: ["gâteau","gros","gomme","garçon"], minimalPairs: [["bas","gars"],["bon","gond"]], sentences: ["Le gros garçon joue à la balle.","Mon bébé goûte le bon gâteau."], verbs: [{word:"battre",blank:"{{b}}attre"},{word:"boire",blank:"{{b}}oire"},{word:"bouger",blank:"{{b}}ouger"},{word:"gagner",blank:"{{g}}agner"},{word:"garder",blank:"{{g}}arder"},{word:"goûter",blank:"{{g}}oûter"}], title: "Confusion B / G", threadSlug: "confusion-bg", desc: "Distinguer [b] et [g], occlusives sonores : lèvres vs gorge." },
  lr: { phon1: "[l]", phon2: "[ʁ]", graph1: "L, LL", graph2: "R, RR", articulation: "Pour [l], pointe de la langue contre les dents du haut, l'air passe sur les côtés. Pour [ʁ], la racine de la langue se rapproche du voile du palais (à l'arrière).", distinctTrait: "lieu d'articulation (avant vs arrière)", tip: "[l] = langue collée devant. [ʁ] = bruit qui vient du fond de la gorge.", words1: ["lampe","lit","loup","livre"], words2: ["rat","rouge","robe","rue"], minimalPairs: [["lit","riz"],["loup","roux"],["long","rond"]], sentences: ["Le loup roule sur le lit rouge.","Ma lampe rouge éclaire la rue."], verbs: [{word:"lire",blank:"{{l}}ire"},{word:"lever",blank:"{{l}}ever"},{word:"lancer",blank:"{{l}}ancer"},{word:"rouler",blank:"{{r}}ouler"},{word:"regarder",blank:"{{r}}egarder"},{word:"rire",blank:"{{r}}ire"},{word:"aller",blank:"a{{ll}}er"},{word:"arriver",blank:"a{{rr}}iver"},{word:"allumer",blank:"a{{ll}}umer"},{word:"arrêter",blank:"a{{rr}}êter"}], title: "Confusion L / R", threadSlug: "confusion-lr", desc: "Distinguer [l] (latéral) et [ʁ] (uvulaire), liquides à articulation très différente." },
  mn: { phon1: "[m]", phon2: "[n]", graph1: "M, MM", graph2: "N, NN", articulation: "Pour [m], lèvres fermées et l'air sort par le nez. Pour [n], pointe de la langue contre les dents et l'air sort par le nez. Tous deux nasaux.", distinctTrait: "point d'articulation (lèvres vs dents)", tip: "[m] = bouche fermée. [n] = bouche entrouverte avec langue contre les dents.", words1: ["maman","main","maison","mer"], words2: ["nez","nuit","neige","non"], minimalPairs: [["ma","na"],["mon","non"],["mou","nous"]], sentences: ["Ma maman dort la nuit.","La neige est blanche dans la main."], verbs: [{word:"manger",blank:"{{m}}anger"},{word:"marcher",blank:"{{m}}archer"},{word:"monter",blank:"{{m}}onter"},{word:"naître",blank:"{{n}}aître"},{word:"nager",blank:"{{n}}ager"},{word:"nettoyer",blank:"{{n}}ettoyer"},{word:"emmener",blank:"e{{mm}}ener"},{word:"donner",blank:"do{{nn}}er"}], title: "Confusion M / N", threadSlug: "confusion-mn", desc: "Distinguer [m] et [n], nasales : lèvres vs dents." },
  ngn: { phon1: "[n]", phon2: "[ɲ]", graph1: "N", graph2: "GN", articulation: "Pour [n], pointe de la langue derrière les dents du haut. Pour [ɲ] (gn), milieu de la langue contre le palais.", distinctTrait: "lieu d'articulation (alvéolaire vs palatal)", tip: "[ɲ] (gn) = comme dans peigne, montagne. [n] = comme dans nez.", words1: ["nez","nuit","neige","nous"], words2: ["agneau","montagne","ligne","peigne"], minimalPairs: [["année","agnée"]], sentences: ["L'agneau dort dans la montagne.","Mon peigne est près du nez."], verbs: [{word:"nager",blank:"{{n}}ager"},{word:"naître",blank:"{{n}}aître"},{word:"nourrir",blank:"{{n}}ourrir"},{word:"gagner",blank:"ga{{gn}}er"},{word:"soigner",blank:"soi{{gn}}er"},{word:"peigner",blank:"pei{{gn}}er"},{word:"saigner",blank:"sai{{gn}}er"}], title: "Confusion N / GN", threadSlug: "confusion-ngn", desc: "Distinguer [n] (alvéolaire) et [ɲ] (palatal, gn), tous deux nasaux." },
  mb: { phon1: "[m]", phon2: "[b]", graph1: "M, MM", graph2: "B", articulation: "Les deux : lèvres fermées. Pour [m], l'air sort par le nez. Pour [b], l'air sort par la bouche avec une explosion.", distinctTrait: "nasalité (nez vs bouche)", tip: "Pince ton nez : si tu ne peux plus prononcer, c'était [m] (nasal).", words1: ["maman","main","mer","mou"], words2: ["bain","balle","bois","bébé"], minimalPairs: [["ma","ba"],["main","bain"],["mou","bout"]], sentences: ["Maman donne le bain au bébé.","La balle est dans la main."], verbs: [{word:"manger",blank:"{{m}}anger"},{word:"marcher",blank:"{{m}}archer"},{word:"monter",blank:"{{m}}onter"},{word:"battre",blank:"{{b}}attre"},{word:"boire",blank:"{{b}}oire"},{word:"bouger",blank:"{{b}}ouger"},{word:"emmener",blank:"e{{mm}}ener"}], title: "Confusion M / B", threadSlug: "confusion-mb", desc: "Distinguer [m] (nasale) et [b] (orale), tous deux bilabiaux." },
  nd: { phon1: "[n]", phon2: "[d]", graph1: "N, NN", graph2: "D", articulation: "Les deux : pointe de la langue contre les dents. Pour [n], l'air sort par le nez. Pour [d], par la bouche.", distinctTrait: "nasalité (nez vs bouche)", tip: "Pince ton nez : si tu ne peux plus prononcer, c'était [n].", words1: ["nez","nuit","neige","non"], words2: ["dos","doigt","dame","dent"], minimalPairs: [["non","don"],["nez","dé"],["nuit","duit"]], sentences: ["La dame dort la nuit.","Mon doigt touche le nez."], verbs: [{word:"nager",blank:"{{n}}ager"},{word:"naître",blank:"{{n}}aître"},{word:"nettoyer",blank:"{{n}}ettoyer"},{word:"donner",blank:"{{d}}o{{nn}}er"},{word:"dormir",blank:"{{d}}ormir"},{word:"descendre",blank:"{{d}}escendre"}], title: "Confusion N / D", threadSlug: "confusion-nd", desc: "Distinguer [n] (nasale) et [d] (orale), tous deux apico-dentaux." },
  "a-an": { phon1: "[a]", phon2: "[ɑ̃]", graph1: "A, À", graph2: "AN, EN, AM, EM", articulation: "Pour [a], la bouche est ouverte et l'air sort par la bouche seule. Pour [ɑ̃] (an), l'air sort aussi par le nez.", distinctTrait: "nasalité (oral vs nasal)", tip: "Pince ton nez : si tu ne peux plus prononcer, c'était nasal (an, en, am, em).", words1: ["chat","ami","papa","salade"], words2: ["enfant","manger","champ","tante"], minimalPairs: [["bas","banc"],["pas","paon"],["sa","sang"]], sentences: ["L'enfant mange une banane.","Mon ami chante dans le champ."], verbs: [{word:"avoir",blank:"{{a}}voir"},{word:"aller",blank:"{{a}}ller"},{word:"attraper",blank:"{{a}}ttraper"},{word:"chanter",blank:"ch{{an}}ter"},{word:"danser",blank:"d{{an}}ser"},{word:"manger",blank:"m{{an}}ger"},{word:"ranger",blank:"r{{an}}ger"},{word:"trembler",blank:"tr{{em}}bler"}], title: "Confusion A / AN", threadSlug: "confusion-a-an", desc: "Distinguer [a] (orale) et [ɑ̃] (nasale, an, en, am, em)." },
  "o-on": { phon1: "[o]", phon2: "[ɔ̃]", graph1: "O, AU, EAU", graph2: "ON, OM", articulation: "Pour [o], lèvres arrondies, son sortant par la bouche. Pour [ɔ̃] (on), son sortant aussi par le nez.", distinctTrait: "nasalité (oral vs nasal)", tip: "Pince ton nez : si tu ne peux plus prononcer, c'était [ɔ̃] (on, om).", words1: ["dos","vélo","stylo","pot"], words2: ["mouton","balcon","sermon","bonbon"], minimalPairs: [["pot","pont"],["beau","bon"],["dos","don"]], sentences: ["Le mouton mange un bonbon.","Mon vélo est sur le balcon."], verbs: [{word:"offrir",blank:"{{o}}ffrir"},{word:"oser",blank:"{{o}}ser"},{word:"ouvrir",blank:"{{ou}}vrir"},{word:"tomber",blank:"t{{o}}mber"},{word:"monter",blank:"m{{on}}ter"},{word:"tomber",blank:"t{{o}}mber"},{word:"sonner",blank:"s{{on}}ner"},{word:"composer",blank:"c{{om}}poser"}], title: "Confusion O / ON", threadSlug: "confusion-o-on", desc: "Distinguer [o] (orale) et [ɔ̃] (nasale, on, om)." },
  "e-in": { phon1: "[ɛ]", phon2: "[ɛ̃]", graph1: "È, Ê, AI, EI", graph2: "IN, AIN, EIN, IM", articulation: "Pour [ɛ] (è), bouche entrouverte, son oral. Pour [ɛ̃] (in), même position mais l'air sort aussi par le nez.", distinctTrait: "nasalité (oral vs nasal)", tip: "Pince ton nez : si tu ne peux plus prononcer, c'était [ɛ̃] (in, ain, ein).", words1: ["mère","tête","lait","chaise"], words2: ["pain","main","vin","lapin"], minimalPairs: [["mais","main"],["thé","thym"],["fait","fin"]], sentences: ["Mon lapin mange du pain.","Ma main touche la chaise."], verbs: [{word:"aimer",blank:"{{ai}}mer"},{word:"faire",blank:"f{{ai}}re"},{word:"naître",blank:"n{{aî}}tre"},{word:"peindre",blank:"p{{ein}}dre"},{word:"teindre",blank:"t{{ein}}dre"},{word:"plaindre",blank:"pl{{ain}}dre"},{word:"craindre",blank:"cr{{ain}}dre"}], title: "Confusion È / IN", threadSlug: "confusion-e-in", desc: "Distinguer [ɛ] (orale) et [ɛ̃] (nasale, in, ain, ein)." },
  "eu-un": { phon1: "[ø]/[œ]", phon2: "[œ̃]", graph1: "EU, ŒU", graph2: "UN, UM", articulation: "Pour [ø]/[œ] (eu), lèvres arrondies, son oral. Pour [œ̃] (un), l'air sort aussi par le nez.", distinctTrait: "nasalité (oral vs nasal)", tip: "[œ̃] (un) tend à se confondre avec [ɛ̃] en français moderne.", words1: ["jeu","feu","œuf","peur"], words2: ["lundi","parfum","chacun"], minimalPairs: [["jeu","jun"]], sentences: ["Lundi, j'ai un jeu nouveau.","Chacun a peur du feu."], verbs: [{word:"pleuvoir",blank:"pl{{eu}}voir"},{word:"pleurer",blank:"pl{{eu}}rer"},{word:"meubler",blank:"m{{eu}}bler"},{word:"emprunter",blank:"empr{{un}}ter"}], title: "Confusion EU / UN", threadSlug: "confusion-eu-un", desc: "Distinguer [ø]/[œ] (orale) et [œ̃] (nasale, un, um)." },
  "e-eu": { phon1: "[ə]", phon2: "[ø]/[œ]", graph1: "E (e muet)", graph2: "EU, ŒU", articulation: "[ə] est un son très court, à peine prononcé. [ø]/[œ] est plus long, lèvres bien arrondies.", distinctTrait: "durée et arrondi", tip: "Le [ə] (e muet) disparaît souvent à l'oral. Le [ø] est clairement audible.", words1: ["le","ce","que","petit"], words2: ["deux","jeu","feu","œuf"], minimalPairs: [["le","leu"],["de","deux"]], sentences: ["Le petit jeu coûte deux euros.","Ce feu est petit."], verbs: [{word:"jeter",blank:"j{{e}}ter"},{word:"peser",blank:"p{{e}}ser"},{word:"mener",blank:"m{{e}}ner"},{word:"pleuvoir",blank:"pl{{eu}}voir"},{word:"pleurer",blank:"pl{{eu}}rer"},{word:"meubler",blank:"m{{eu}}bler"}], title: "Confusion E / EU", threadSlug: "confusion-e-eu", desc: "Distinguer [ə] (e muet) et [ø]/[œ] (eu)." },
  ee: { phon1: "[e]", phon2: "[ɛ]", graph1: "É, ER, EZ", graph2: "È, Ê, AI, ET", articulation: "Pour [e] (é), bouche presque fermée, lèvres tendues. Pour [ɛ] (è), bouche plus ouverte.", distinctTrait: "ouverture de la bouche", tip: "[e] est aigu et fermé. [ɛ] est plus grave et ouvert.", words1: ["été","blé","chanter","nez"], words2: ["mère","tête","lait","fête"], minimalPairs: [["é","ait"],["nez","naît"]], sentences: ["Ma mère chante en été.","Le nez de papa est rouge."], verbs: [{word:"chanter",blank:"chant{{er}}"},{word:"manger",blank:"mang{{er}}"},{word:"aimer",blank:"aim{{er}}"},{word:"espérer",blank:"esp{{é}}r{{er}}"},{word:"plaire",blank:"pl{{ai}}re"},{word:"faire",blank:"f{{ai}}re"},{word:"naître",blank:"n{{aî}}tre"}], title: "Confusion É / È", threadSlug: "confusion-ee", desc: "Distinguer [e] (é fermé) et [ɛ] (è ouvert)." },
  "o-eu": { phon1: "[o]", phon2: "[ø]", graph1: "O, AU, EAU", graph2: "EU, ŒU", articulation: "Pour [o], lèvres arrondies, langue à l'arrière. Pour [ø], lèvres arrondies, langue à l'avant.", distinctTrait: "lieu de la langue (arrière vs avant)", tip: "[o] vient de l'arrière. [ø] vient de l'avant.", words1: ["dos","beau","vélo","stylo"], words2: ["jeu","deux","œuf","feu"], minimalPairs: [["dos","deux"],["mot","meut"]], sentences: ["Mon vélo est beau et neuf.","Le feu chauffe le dos."], verbs: [{word:"oser",blank:"{{o}}ser"},{word:"voler",blank:"v{{o}}ler"},{word:"poser",blank:"p{{o}}ser"},{word:"pleuvoir",blank:"pl{{eu}}voir"},{word:"vouloir",blank:"v{{ou}}loir"},{word:"pleurer",blank:"pl{{eu}}rer"}], title: "Confusion O / EU", threadSlug: "confusion-o-eu", desc: "Distinguer [o] et [ø], arrondies à l'arrière vs avant." },
  iu: { phon1: "[i]", phon2: "[y]", graph1: "I, Y", graph2: "U, Û", articulation: "Pour [i], lèvres tirées comme pour sourire. Pour [y], lèvres arrondies en avant comme pour siffler.", distinctTrait: "arrondi des lèvres", tip: "Si tu souris, c'est [i]. Si tes lèvres sont en avant, c'est [y].", words1: ["lit","riz","midi","ami"], words2: ["lu","rue","pure","mur"], minimalPairs: [["lit","lu"],["riz","rue"],["dit","dû"]], sentences: ["Mon ami a lu un livre.","La rue est près du lit."], verbs: [{word:"finir",blank:"f{{i}}n{{i}}r"},{word:"lire",blank:"l{{i}}re"},{word:"rire",blank:"r{{i}}re"},{word:"écrire",blank:"écr{{i}}re"},{word:"user",blank:"{{u}}ser"},{word:"saluer",blank:"sal{{u}}er"},{word:"juger",blank:"j{{u}}ger"}], title: "Confusion I / U", threadSlug: "confusion-iu", desc: "Distinguer [i] (étirée) et [y] (arrondie)." },
  "ou-u": { phon1: "[u]", phon2: "[y]", graph1: "OU, OÙ", graph2: "U, Û", articulation: "Pour [u] (ou), lèvres arrondies, langue à l'arrière. Pour [y] (u), lèvres arrondies, langue à l'avant.", distinctTrait: "lieu de la langue (arrière vs avant)", tip: "[u] (ou) vient du fond. [y] (u) vient de l'avant.", words1: ["loup","roue","soupe","chou"], words2: ["lu","rue","sur","chute"], minimalPairs: [["loup","lu"],["roue","rue"],["pou","pu"]], sentences: ["Le loup mange la soupe.","Sur la rue, il y a un chou."], verbs: [{word:"jouer",blank:"j{{ou}}er"},{word:"trouver",blank:"tr{{ou}}ver"},{word:"écouter",blank:"éc{{ou}}ter"},{word:"courir",blank:"c{{ou}}rir"},{word:"saluer",blank:"sal{{u}}er"},{word:"user",blank:"{{u}}ser"},{word:"étudier",blank:"ét{{u}}dier"}], title: "Confusion OU / U", threadSlug: "confusion-ou-u", desc: "Distinguer [u] (ou) et [y] (u), toutes deux arrondies." },
  "i-y": { phon1: "[i]", phon2: "[j]", graph1: "I, Y", graph2: "Y, ILL, Ï", articulation: "Pour [i], voyelle pure. Pour [j], semi-voyelle (transition rapide vers une autre voyelle).", distinctTrait: "syllabe (voyelle vs semi-voyelle)", tip: "[i] = syllabe complète. [j] = mouvement avant une autre voyelle (yeux, fille).", words1: ["lit","midi","riz","vie"], words2: ["yeux","famille","paille","fille"], minimalPairs: [["pi","pied"]], sentences: ["Ma fille a de beaux yeux.","La paille est dans le lit."], verbs: [{word:"finir",blank:"f{{i}}n{{i}}r"},{word:"lire",blank:"l{{i}}re"},{word:"écrire",blank:"écr{{i}}re"},{word:"travailler",blank:"trava{{ill}}er"},{word:"briller",blank:"br{{ill}}er"},{word:"payer",blank:"pa{{y}}er"},{word:"essayer",blank:"essa{{y}}er"}], title: "Confusion I / Y / ILL", threadSlug: "confusion-i-y", desc: "Distinguer [i] (voyelle) et [j] (semi-voyelle, y, ill, ï)." },
  "wa-oi": { phon1: "[wa]", phon2: "[u-a]", graph1: "OI", graph2: "OUA, OU-A", articulation: "Pour [wa] (oi), une syllabe avec semi-voyelle. Pour [u-a], deux syllabes distinctes.", distinctTrait: "nombre de syllabes", tip: "Compte les syllabes : « moi » = 1, « il joue à » = 3.", words1: ["moi","toi","soir","noir"], words2: ["oua-oua","joua","loua"], minimalPairs: [["moi","moua"]], sentences: ["Ce soir, c'est moi qui joue.","Mon chien fait oua-oua."], verbs: [{word:"voir",blank:"v{{oi}}r"},{word:"croire",blank:"cr{{oi}}re"},{word:"boire",blank:"b{{oi}}re"},{word:"avoir",blank:"av{{oi}}r"},{word:"jouer",blank:"j{{ou}}er"},{word:"louer",blank:"l{{ou}}er"},{word:"avouer",blank:"av{{ou}}er"}], title: "Confusion OUA / OI", threadSlug: "confusion-wa-oi", desc: "Distinguer [wa] (oi) et [u-a] séparé." },
  "c-c": { phon1: "[k]", phon2: "[s]", graph1: "C devant a/o/u", graph2: "Ç devant a/o/u, C devant e/i", articulation: "Le C se prononce différemment selon la voyelle qui suit. Pour [k], C devant a, o, u (cadeau, coq, cube). Pour [s], C devant e, i (cerise, cinéma) OU Ç devant a, o, u (ça, garçon).", distinctTrait: "règle d'orthographe", tip: "La cédille (Ç) sert à garder le son [s] devant a, o, u.", words1: ["café","carte","coq","cube"], words2: ["ça","garçon","leçon","façade"], minimalPairs: [["coca","ça"]], sentences: ["Le garçon boit son café.","Ma leçon est facile."], verbs: [{word:"couper",blank:"{{c}}ouper"},{word:"courir",blank:"{{c}}ourir"},{word:"casser",blank:"{{c}}asser"},{word:"commencer",blank:"{{c}}ommen{{c}}er"},{word:"lancer",blank:"lan{{c}}er"},{word:"placer",blank:"pla{{c}}er"},{word:"avancer",blank:"avan{{c}}er"}], title: "Confusion C / Ç", threadSlug: "confusion-c-c", desc: "Choisir entre c (= [k]) et ç (= [s]) devant a, o, u." },
  "g-gu": { phon1: "[g] avec G", phon2: "[g] avec GU", graph1: "G devant a/o/u", graph2: "GU devant e/i", articulation: "Le G se prononce [g] toujours, mais s'écrit différemment. G devant a, o, u (gâteau, gomme). GU devant e, i (guêpe, guirlande).", distinctTrait: "règle d'orthographe", tip: "Sans le U, G devant e/i ferait [ʒ]. Le U ajoute le son [g].", words1: ["gâteau","gomme","légume","gros"], words2: ["guêpe","guirlande","guitare","guide"], minimalPairs: [["gain","guin"]], sentences: ["Le guide joue de la guitare.","Mon gros gâteau a une guêpe dessus."], verbs: [{word:"gagner",blank:"{{g}}agner"},{word:"garder",blank:"{{g}}arder"},{word:"goûter",blank:"{{g}}oûter"},{word:"guider",blank:"{{gu}}ider"},{word:"guérir",blank:"{{gu}}érir"}], title: "Confusion G / GU", threadSlug: "confusion-g-gu", desc: "Choisir entre g (devant a/o/u) et gu (devant e/i)." },
  "s-ss": { phon1: "[s]", phon2: "[z]", graph1: "S, SS", graph2: "S entre voyelles", articulation: "Le S se prononce différemment selon sa position. Entre 2 voyelles, S = [z] (rose). Au début ou doublé (SS), S = [s] (soleil, poisson).", distinctTrait: "position dans le mot", tip: "Si le S est entre 2 voyelles, il fait [z]. Sinon (début, fin, ou SS), il fait [s].", words1: ["soleil","poisson","tasse","russe"], words2: ["rose","vase","musique","maison"], minimalPairs: [["poisson","poison"],["dessert","désert"],["coussin","cousin"]], sentences: ["Mon cousin met le poisson sur le coussin.","Cette rose russe est rare."], verbs: [{word:"sortir",blank:"{{s}}ortir"},{word:"savoir",blank:"{{s}}avoir"},{word:"poser",blank:"po{{s}}er"},{word:"user",blank:"u{{s}}er"},{word:"passer",blank:"pa{{ss}}er"},{word:"casser",blank:"ca{{ss}}er"},{word:"laisser",blank:"lai{{ss}}er"}], title: "Confusion S / SS", threadSlug: "confusion-s-ss", desc: "Choisir entre s (entre voyelles → [z]) et ss (entre voyelles → [s])." },
};

// Pour faire un Trous "Nomme et choisis" : on prend un mot, on coupe sa première lettre.
// Renvoie un objet { sentenceWithBlank, answer }
function buildNommerExercise(word, sentence = null) {
  const w = String(word);
  // Pour les mots commençant par CH, GN, GU, PH, OU... on prend le digramme entier.
  let cut = 1;
  const lc = w.toLowerCase();
  if (lc.startsWith("ch") || lc.startsWith("gn") || lc.startsWith("gu") || lc.startsWith("ph") || lc.startsWith("ou")) cut = 2;
  if (lc.startsWith("an") || lc.startsWith("on") || lc.startsWith("in") || lc.startsWith("am") || lc.startsWith("om") || lc.startsWith("im") || lc.startsWith("en") || lc.startsWith("un")) cut = 2;
  const head = w.slice(0, cut);
  const tail = w.slice(cut);
  const blanked = `{{${head}}}${tail}`;
  return blanked;
}

function buildMd(pair, data) {
  const lines = [];

  // Frontmatter
  lines.push("---");
  lines.push(`threadSlug: ${data.threadSlug}`);
  lines.push(`title: ${data.title}`);
  lines.push(`description: ${data.desc}`);
  lines.push("---");
  lines.push("");

  // Description
  lines.push("## Description du thread");
  lines.push("");
  lines.push(`Les sons **${data.phon1}** et **${data.phon2}** se distinguent par **${data.distinctTrait}**. ${data.articulation}`);
  lines.push("");
  lines.push(`Tu vas travailler 5 objectifs : sentir la différence en bouche, l'entendre, la lire, l'écrire dans un mot, puis dans une phrase.`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Objectif 1 — Articulation (court, factuel, PAS de QCM)
  lines.push("## Objectif 1 — Articulation");
  lines.push(`<!-- slug: ${pair}-articulation -->`);
  lines.push("<!-- order: 1 -->");
  lines.push("");
  lines.push("### Cours");
  lines.push("");
  lines.push(data.articulation);
  lines.push("");
  lines.push(`**Astuce :** ${data.tip}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Objectif 2 — Discrimination auditive
  lines.push("## Objectif 2 — Discrimination auditive");
  lines.push(`<!-- slug: ${pair}-discrimination -->`);
  lines.push("<!-- order: 2 -->");
  lines.push("");
  lines.push("### Cours");
  lines.push("");
  lines.push(`Tu vas écouter des mots et reconnaître si tu entends **${data.phon1}** ou **${data.phon2}**.`);
  lines.push(data.tip);
  lines.push("");
  lines.push("### Exemples d'exercices");
  lines.push("");
  lines.push("```quiz");
  lines.push(`competence: Distinguer ${data.phon1} et ${data.phon2} à l'oral`);
  for (let i = 0; i < Math.min(3, data.words1.length); i++) {
    const w = data.words1[i];
    lines.push(`QCM || [tts:${w}] Quel son entends-tu dans « ${w} » ? || V: ${data.phon1} | ${data.phon2} || « ${w} » contient le son ${data.phon1}.`);
  }
  for (let i = 0; i < Math.min(3, data.words2.length); i++) {
    const w = data.words2[i];
    lines.push(`QCM || [tts:${w}] Quel son entends-tu dans « ${w} » ? || ${data.phon1} | V: ${data.phon2} || « ${w} » contient le son ${data.phon2}.`);
  }
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Objectif 3 — Lecture
  lines.push("## Objectif 3 — Lecture");
  lines.push(`<!-- slug: ${pair}-lecture -->`);
  lines.push("<!-- order: 3 -->");
  lines.push("");
  lines.push("### Cours");
  lines.push("");
  lines.push(`Quand tu lis :`);
  lines.push(`- **${data.graph1}** se lit ${data.phon1}.`);
  lines.push(`- **${data.graph2}** se lit ${data.phon2}.`);
  lines.push("");
  lines.push("### Exemples d'exercices");
  lines.push("");
  lines.push("```quiz");
  lines.push(`competence: Lire correctement les graphies de ${data.phon1} et ${data.phon2}`);
  // Association mots → son (avec mots de minimalPairs ou words1/2)
  const assocPairs = [];
  for (let i = 0; i < Math.min(3, data.words1.length); i++) assocPairs.push([data.words1[i], data.phon1]);
  for (let i = 0; i < Math.min(3, data.words2.length); i++) assocPairs.push([data.words2[i], data.phon2]);
  // Filtre doublons sur le mot (left)
  const uniqAssoc = [];
  const seen = new Set();
  for (const [w, p] of assocPairs) {
    if (seen.has(w)) continue;
    seen.add(w);
    uniqAssoc.push([w, p]);
  }
  if (uniqAssoc.length >= 4) {
    const assocStr = uniqAssoc.slice(0, 6).map(([w, p]) => `{{${w}::${p}}}`).join("");
    lines.push(`Association || ${assocStr}`);
  }
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Objectif 4 — "Nomme les dessins et choisis le bon graphème"
  lines.push("## Objectif 4 — Nomme les dessins et choisis le bon graphème");
  lines.push(`<!-- slug: ${pair}-production-mot -->`);
  lines.push("<!-- order: 4 -->");
  lines.push("");
  lines.push("### Cours");
  lines.push("");
  lines.push(`Pour chaque image, prononce le mot doucement, repère le son, puis tape la lettre (ou le groupe de lettres) qui manque.`);
  lines.push("");
  lines.push(`**Astuce :** ${data.tip}`);
  lines.push("");
  lines.push("### Exemples d'exercices");
  lines.push("");
  lines.push("```quiz");
  lines.push(`competence: Nommer un mot illustré et choisir entre ${data.graph1} et ${data.graph2}`);
  const allWords = [
    ...data.words1.slice(0, 4).map(w => ({ w, son: 1 })),
    ...data.words2.slice(0, 4).map(w => ({ w, son: 2 })),
  ];
  for (const { w } of allWords) {
    const blanked = buildNommerExercise(w);
    lines.push(`Trous || ${emj(w)}${blanked}`);
  }
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Objectif 5 — Production en phrase / dictée
  lines.push("## Objectif 5 — Production en phrase / dictée");
  lines.push(`<!-- slug: ${pair}-production-phrase -->`);
  lines.push("<!-- order: 5 -->");
  lines.push("");
  lines.push("### Cours");
  lines.push("");
  lines.push(`Maintenant, complète des phrases entières et écris des verbes. Pour chaque mot où tu hésites :`);
  lines.push("1. Prononce-le doucement.");
  lines.push(`2. ${data.tip}`);
  lines.push("3. Relis ta phrase à voix haute.");
  lines.push("");
  // Type 1 — Phrases à compléter : prend les phrases de data.sentences et met en blanc
  // les mots-clés (ceux contenant le son). On évite les phrases construites à la main
  // qui ont des bugs d'accord.
  lines.push("### Phrases à compléter");
  lines.push("");
  lines.push("```quiz");
  lines.push(`competence: Compléter des phrases avec ${data.graph1} ou ${data.graph2}`);
  for (const sentence of data.sentences) {
    // On transforme la phrase : pour chaque mot de words1/2 trouvé, on remplace son
    // initiale (ou digramme) par {{...}}.
    let blanked = sentence;
    const allWords = [...data.words1, ...data.words2];
    // Tri par longueur décroissante pour matcher les mots longs avant les courts.
    const sortedWords = [...new Set(allWords)].sort((a, b) => b.length - a.length);
    for (const w of sortedWords) {
      // Match insensible à la casse, en respectant les frontières de mot.
      const re = new RegExp(`\\b(${w.charAt(0).toUpperCase() + w.slice(1)}|${w})\\b`, "g");
      blanked = blanked.replace(re, (match) => {
        // Détermine le digramme à mettre en blanc
        let cut = 1;
        const lc = match.toLowerCase();
        if (lc.startsWith("ch") || lc.startsWith("gn") || lc.startsWith("gu") || lc.startsWith("ph")) cut = 2;
        // On préserve la casse de la 1ère lettre si majuscule
        const head = match.slice(0, cut).toLowerCase();
        const tail = match.slice(cut);
        return `{{${head}}}${tail}`;
      });
    }
    if (blanked !== sentence) {
      lines.push(`Trous || ${blanked}`);
    } else {
      // Aucune substitution possible : on ne met pas la phrase
    }
  }
  lines.push("```");
  lines.push("");

  // Type 2 — Verbes : seulement si data.verbs existe. Sinon, on n'affiche pas ce bloc.
  if (data.verbs && data.verbs.length > 0) {
    const hasGemination = data.verbs.some(v => /\{\{[a-zA-Zé]{2,}\}\}/.test(v.blank));
    lines.push("### Verbes à compléter");
    lines.push("");
    lines.push("```quiz");
    lines.push(`competence: Compléter des verbes avec ${data.graph1} ou ${data.graph2}` + (hasGemination ? " (certains verbes prennent une consonne doublée)" : ""));
    for (const v of data.verbs) {
      lines.push(`Trous || ${v.blank}`);
    }
    lines.push("```");
    lines.push("");
  }

  lines.push("### Dictée");
  lines.push("");
  lines.push("```dictee");
  lines.push(`titre: Dictée ${data.graph1} / ${data.graph2}`);
  lines.push("niveau: 6e");
  lines.push("");
  lines.push(data.sentences.join("||\n"));
  lines.push("```");
  lines.push("");

  return lines.join("\n") + "\n";
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;

  for (const [pair, data] of Object.entries(DATA)) {
    const filename = path.join(OUT_DIR, `confusion-${pair}.md`);
    if (fs.existsSync(filename) && !FORCE) {
      console.log(`⏭️  ${path.basename(filename)} (existe — skip, --force pour réécrire)`);
      skipped++;
      continue;
    }
    const md = buildMd(pair, data);
    fs.writeFileSync(filename, md, "utf-8");
    const lines = md.split("\n").length;
    console.log(`✅ ${path.basename(filename)} (${lines} lignes)`);
    written++;
  }

  console.log(`\n--- Récap ---`);
  console.log(`MD écrits  : ${written}`);
  console.log(`MD skippés : ${skipped}`);
  console.log(`Total cible: ${Object.keys(DATA).length} (+ confusion-pb.md déjà existant)`);
}

main();
