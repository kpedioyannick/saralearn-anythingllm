# Canevas pédagogique pour la rééducation des confusions phonétiques

> **Source d'inspiration** : Mazade, C. (2013). *La dysorthographie et la dyslexie — Les confusions phonétiques*. De Boeck Solal, collection Tests & Matériels en orthophonie. ISBN 978-2-35327-157-3.
>
> **Statut** : ce document décrit la **méthode pédagogique** (libre de droits selon la dichotomie idée/expression du droit d'auteur FR), pas le contenu de l'ouvrage. Aucune liste de mots, paire minimale ou phrase du livre n'est reproduite ici.

## Pour quoi faire ?

Ce canevas sert de **template** pour générer dans Sara un thread de rééducation pour chaque paire de phonèmes confondus, dans le cadre du sous-type **dyslexie-dysorthographie phonologique** (cf. classification Stanké 2016, sous-type 1 : déficit du traitement phonologique).

Couverture cible : **33 paires de phonèmes** organisées par trait articulatoire pertinent (sourdes/sonores, orales/nasales, constrictives/occlusives, points d'articulation labiales/dentales/vélaires, syllabes complexes type PR/BR…).

## Principe pédagogique fondamental

L'enfant ayant une dysorthographie phonologique ne confond pas les lettres au hasard : il confond systématiquement des phonèmes qui ne diffèrent que par **un seul trait articulatoire** (ex : sonorité pour P/B, nasalité pour M/B, point d'articulation pour P/T).

La méthode repose sur **3 piliers cognitifs** :

1. **Conscience articulatoire** — l'enfant ressent physiquement la production du phonème (geste de la bouche, vibration des cordes vocales)
2. **Discrimination auditive** — l'enfant distingue les deux phonèmes à l'oreille
3. **Association phonème ↔ graphème** — l'enfant relie le son perçu à la lettre correspondante

Chaque thread enchaîne ces 3 piliers en **8 étapes graduées** allant du plus décontextualisé (syllabe pure) au plus écologique (verbes en contexte).

## Le canevas en 8 étapes

### Étape 1 — Consigne articulatoire (très courte)

**Objectif** : faire prendre conscience du geste articulatoire qui distingue les deux phonèmes.

**Format** : 1 à 2 phrases maximum, formulées comme une instruction d'action ("fais souffler X… fais chanter Y… mets ta main sur ta gorge…").

**Intent Sara** : `cours` court avec **TTS** prononçant les deux phonèmes en alternance, idéalement avec audio des deux articulations.

**À générer par DeepSeek** : description articulatoire factuelle (point d'articulation + mode + sonorité) + instruction concrète à l'enfant ("place ta langue derrière les dents", "ferme les lèvres puis ouvre", "souffle/fais vibrer").

---

### Étape 2 — Lecture de mots gradués (4 colonnes)

**Objectif** : exposer l'enfant à un grand nombre de mots contenant chacun des deux phonèmes, gradués en difficulté.

**Format tabulaire à 4 colonnes** :
| Phonème X seul | Phonème Y seul | X ou Y (un seul des deux) | X et Y (les deux dans le même mot) |
|---|---|---|---|
| ~12 mots | ~12 mots | ~12 mots | ~12 mots |

**Gradation** : du plus simple (mot court avec phonème en position initiale, X seul) au plus complexe (mot long avec X et Y présents simultanément, demandant alternance articulatoire).

**Intent Sara** : `cours` enrichi affichant le tableau, avec bouton 🔊 par mot pour audio.

**À générer par DeepSeek** : pour chaque paire X/Y, une liste d'environ 50 mots du lexique courant primaire, classés selon les 4 colonnes. Vérifier que les mots sont fréquents pour la classe d'âge cible (cf. `userSettings.classe`).

---

### Étape 3 — Lecture de syllabes décontextualisées

**Objectif** : décodage pur, sans appui sémantique. Force le système phonologique à fonctionner seul.

**Format** : liste de ~20-30 syllabes mêlant X et Y avec différentes voyelles (a/i/o/u/é/è/ai/an/in/on/oi/eu).

**Intent Sara** : `mini_jeu` flashcard rapide style Calculix (cf. inspiration LogicielEducatif) — affichage 1 syllabe à la fois, l'élève prononce ou clique.

**À générer par DeepSeek** : combinatoire systématique X+voyelle, Y+voyelle, dans un ordre mélangé (pas de pattern alterné prévisible).

---

### Étape 4 — Image → graphème

**Objectif** : associer un mot familier (déclenché par l'image) au graphème correspondant.

**Format** : ~12 images d'objets simples avec un blanc à l'emplacement du graphème ciblé. L'enfant nomme l'objet et écrit la lettre manquante.

**Exemple structurel** : si X = F et Y = V, image d'un vélo → `_élo`, image d'un filet → `_ilet`, etc.

**Intent Sara** : `mini_jeu` H5P type "Drag the words" ou "Fill in the blanks" avec image. **Cf. section "Images" du document de réflexion technique** pour la stratégie de sourcing (ARASAAC en priorité).

**À générer par DeepSeek** : liste de mots-cibles avec position du graphème à masquer (initiale, médiane, finale). Sélectionner des mots dont une image illustrative existe ou est générable.

---

### Étape 5 — Phrases à compléter (texte à trous)

**Objectif** : intégrer le phonème dans un contexte sémantique riche. L'enfant utilise le sens de la phrase pour deviner le mot.

**Format** : ~15 phrases courtes du quotidien, avec plusieurs occurrences du graphème ciblé masquées par `…`.

**Intent Sara** : `mini_jeu` complétion ou intent `quiz` type Trous.

**À générer par DeepSeek** : phrases narratives de la vie quotidienne d'un enfant (école, famille, jeux, repas), naturelles, sans tournures artificielles. Densité de la cible : 2-4 occurrences par phrase.

---

### Étape 6 — Paires minimales « Ne confonds pas »

**Objectif** : exposer l'enfant à des couples de mots qui ne diffèrent que par le phonème ciblé, et dont le sens diverge totalement.

**Format** : ~12 paires de mots affichés côte à côte (ex : pour P/B : `poule / boule`, `pâle / balle`, etc.).

**Intent Sara** : `mini_jeu` Memory ou `quiz` Association.

**À générer par DeepSeek** : pour chaque paire X/Y, identifier des mots fréquents qui forment des paires minimales valides en français. Vérifier que les deux mots du couple appartiennent au lexique de la classe d'âge.

---

### Étape 7 — Choix entre parenthèses (sens en contexte)

**Objectif** : forcer le choix entre les deux mots d'une paire minimale en s'appuyant sur le sens.

**Format** : ~15-17 phrases avec un choix entre 2 mots paires minimales.

**Exemple structurel** : `Il visite la (file/ville).` → l'enfant doit barrer/cliquer le bon.

**Intent Sara** : `quiz` QCM **mais** ⚠️ avec précaution importante (cf. principe sans erreur de Stanké 2016, chap. 5.7) :
- En `mini_jeu`, le bon mot doit rester affiché après validation pour ancrage mémoriel
- Pas de pénalité pour la mauvaise réponse
- Pas d'exposition prolongée à l'orthographe erronée

**À générer par DeepSeek** : phrases de contexte non ambigu pour chaque paire minimale, en réutilisant les paires de l'étape 6.

---

### Étape 8 — Verbes à compléter (travail morphologique)

**Objectif** : ancrer le phonème dans le **lexique verbal vivant**, pas seulement dans des mots isolés. C'est l'étape la plus longue et la plus dense.

**Format** : ~80-90 verbes à l'infinitif avec un blanc à compléter, regroupés par ordre alphabétique.

**Pourquoi cette étape est cruciale** : la dysorthographie se manifeste massivement en production écrite via les verbes (l'enfant écrit *« il afaibli »* au lieu de *« il affaiblit »*). Travailler les verbes en infinitif crée des automatismes orthographiques transférables aux conjugaisons.

**Intent Sara** : `mini_jeu` série défilante (1 verbe à la fois pour le mode TDAH), ou `quiz` Trous, ou intent `dictee` adaptée pour qui veut le plus difficile.

**À générer par DeepSeek** : extraction des verbes courants contenant les phonèmes X et/ou Y (incluant les verbes avec doublement de consonne pour le phonème sourd : `eff-`, `aff-`, etc., qui sont des règles morphologiques importantes en orthographe française).

---

## Mise en œuvre pratique pour Sara

### Granularité d'un thread Sara

Un thread = une paire de phonèmes (P/B, T/D, S/Z…). 33 threads à terme pour couvrir le sous-type phonologique complet.

### Découpage en sessions

Les 8 étapes peuvent être étalées sur **3 séances de 15-20 minutes** plutôt que faites d'un coup (cf. principe de rappel espacé / méthode apprentissage-test de Stanké 2016, chap. 5.7) :

- **Session 1** : étapes 1-3 (articulation + lecture mots + syllabes) — découverte
- **Session 2** (J+1 ou J+2) : étapes 4-5 (image + phrases) — application
- **Session 3** (J+5 à J+7) : étapes 6-8 (paires minimales + choix + verbes) — consolidation

Cette répartition exploite la courbe d'oubli d'Ebbinghaus et les bénéfices documentés du rappel espacé.

### Variabilité selon le profil dys de l'élève

Si `userSettings.dys` inclut **TDAH** : raccourcir chaque session, augmenter la gamification de l'étape 3, intégrer Pomodoro entre sessions.

Si `userSettings.dys` inclut **mnésique** (cf. Stanké chap. 5) : multiplier les expositions sans erreur des étapes 4-5, espacer davantage les sessions.

Si `userSettings.dys` inclut **visuo-attentionnel** (cf. Valdois chap. 4) : police OpenDyslexic, fond crème, lignes courtes (≤ 60 caractères), espacement augmenté.

### Détection des paires à travailler en priorité

Idéalement, Sara analyse l'écriture spontanée de l'élève (productions précédentes du chat) pour identifier les confusions récurrentes, et propose en priorité les threads correspondants. À défaut, mini-bilan d'orientation à l'onboarding du workspace dys.

## Stratégie images — Mulberry Symbols

Les images requises par l'**étape 4** (et secondairement par les étapes 6-7 pour illustrer paires minimales et phrases) sont sourcées depuis **Mulberry Symbols**.

### Pourquoi Mulberry Symbols

- **Licence CC BY-SA 4.0** : compatible avec un service commercial (à la différence d'ARASAAC qui est CC BY-NC-SA, exclu en commercial)
- **3 436 pictogrammes SVG** dans le dossier `EN/` du dépôt officiel — largement suffisant pour couvrir le lexique du primaire
- **Style très proche d'ARASAAC** : ligne claire, fond blanc, sans détail parasite, dys-friendly
- **Format SVG vectoriel** : redimensionnable à l'infini sans perte, recoloriable, adaptable au mode sombre/crème
- **Origine** : Paxtoncrafts Charitable Trust (UK), maintenu activement sur GitHub

### Pas d'API REST officielle, mais 3 voies d'accès programmatique

**Voie 1 — Téléchargement bulk depuis GitHub (recommandé)**

Dépôt officiel : `https://github.com/mulberrysymbols/mulberry-symbols`

```bash
git clone --depth 1 https://github.com/mulberrysymbols/mulberry-symbols.git
# Le dossier EN/ contient les 3436 SVG nommés en snake_case anglais :
# EN/cat.svg, EN/aeroplane.svg, EN/computer.svg, EN/Christmas_tree.svg…
```

Ou via tarball direct :

```bash
curl -L https://github.com/mulberrysymbols/mulberry-symbols/archive/refs/heads/master.tar.gz \
  | tar xz --strip-components=1 -C ./mulberry/ "mulberry-symbols-master/EN/"
```

Puis service local Sara : ~3 436 fichiers SVG accessibles offline, latence nulle au runtime.

**Voie 2 — Raw GitHub URLs (pour récupération à la demande)**

Pattern : `https://raw.githubusercontent.com/mulberrysymbols/mulberry-symbols/master/EN/{name}.svg`

Exemples qui fonctionnent :
- `…/EN/cat.svg`
- `…/EN/aeroplane.svg`
- `…/EN/computer.svg`

⚠️ Limite raisonnable de requêtes GitHub raw (~5000/h sans authentification). En pratique, mettre en cache local après premier téléchargement.

**Voie 3 — API OpenSymbols (recherche multi-bibliothèques)**

`https://www.opensymbols.org/api/v1/symbols/search?q={mot}` retourne du JSON avec des résultats issus de Mulberry, Noun Project, ARASAAC et d'autres.

Pour ne garder que Mulberry, filtrer côté client : `repo_key === 'mulberry'`.

Avantage : recherche en français possible (l'API gère la translittération). Inconvénient : ajoute une dépendance externe au runtime.

### Le défi de la traduction français → fichier SVG

Les fichiers Mulberry sont **labellisés en anglais** (`cat.svg` et non `chat.svg`). Sara doit donc maintenir une **table de correspondance français → fichier**.

Stratégie en deux temps :

1. **Index statique** des ~500 mots les plus fréquents du primaire FR, mappés à la main vers leurs équivalents Mulberry. Stocké en JSON dans `server/storage/sara/dys_images/mulberry_fr_index.json` :

   ```json
   {
     "chat": "cat.svg",
     "vélo": "bicycle.svg",
     "valise": "suitcase.svg",
     "feuille": "leaf.svg",
     "avion": "aeroplane.svg",
     "olive": "olive.svg",
     "feu": "fire.svg",
     "fourmi": "ant.svg",
     "fenêtre": "window.svg",
     "éléphant": "elephant.svg"
   }
   ```

2. **Fallback dynamique** : pour les mots non indexés, traduction automatique français → anglais (DeepSeek peut le faire, ou une bibliothèque locale type `fr-en` lookup) puis recherche fuzzy dans la liste des fichiers Mulberry.

### Architecture cible côté Sara

```
server/storage/sara/dys_images/
├── mulberry/                   # Clone du repo (3436 SVG)
│   ├── EN/
│   │   ├── cat.svg
│   │   ├── aeroplane.svg
│   │   └── …
│   └── LICENSE.txt
├── mulberry_fr_index.json      # Mapping mot FR → fichier SVG
├── ATTRIBUTION.md              # Mentions légales (cf. ci-dessous)
└── (cache d'images générées par IA pour les mots non couverts par Mulberry)
```

### Attribution légale obligatoire (CC BY-SA 4.0)

À afficher dans Sara à chaque fois qu'un picto Mulberry est rendu (au minimum sur la page workspace dys et dans un fichier `LICENSES.md` à la racine) :

> *« Pictogrammes : Mulberry Symbols (mulberrysymbols.org), © Paxtoncrafts Charitable Trust, distribués sous licence Creative Commons BY-SA 4.0. »*

La clause **SA (Share-Alike)** impose que tout dérivé direct (image modifiée, recoloriée, recadrée) soit lui-même distribué en CC BY-SA 4.0. En pratique pour Sara :

- Afficher tel quel un picto Mulberry → OK avec attribution
- Le recolorier ou changer son arrière-plan → c'est un dérivé, doit rester CC BY-SA 4.0
- L'inclure dans une image composite générée par Sara → la composite hérite de CC BY-SA 4.0

Aucun de ces cas ne pose problème pour Sara dans son usage prévu.

### Compléments si Mulberry ne suffit pas

Quand un mot du lexique français primaire n'a pas d'équivalent dans les 3 436 SVG Mulberry, deux fallbacks possibles :

1. **Génération IA ciblée** (FLUX schnell ~0.003 $/image), prompt système calibré pour s'approcher du style Mulberry (ligne claire, fond blanc, picto épuré). Output Apache 2.0, propriétaire de Sara.
2. **OpenMoji** (CC BY-SA 4.0, 4 000 emojis modernes) pour concepts non couverts par Mulberry mais standards (genre objets technologiques récents).

Cette stratégie hybride couvre 99% des besoins du workspace dys.

## Rappels éthiques

1. **Sara n'est pas un outil diagnostique.** L'identification d'une dyslexie-dysorthographie relève de l'orthophoniste après bilan. Sara est un complément de pratique.
2. **Mention obligatoire à l'onboarding du workspace dys** : "Sara t'aide à t'entraîner. Pour comprendre tes difficultés en profondeur, demande à un orthophoniste."
3. **Aucun contenu de Mazade (2013) n'est ni ne doit être indexé dans le RAG de Sara.** Seul le canevas méthodologique décrit ici est réutilisable.
4. **Attribution Mulberry Symbols** affichée systématiquement dans le workspace dys et dans le fichier `LICENSES.md`.
