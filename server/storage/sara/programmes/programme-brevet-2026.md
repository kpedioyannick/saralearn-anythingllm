# Programme Brevet 2026 — 8 semaines

**Période** : 28 avril → 23 juin 2026
**Examen** : 26-27 juin 2026
**Cadre** : 2 h/jour × 6 jours/semaine = 12 h/semaine, ~96 h cumulées
**Élève cible** : 3ème, préparation au DNB

## Cadre général

Le programme s'organise autour de **deux workspaces complémentaires** :

- **Workspace `Brevet`** — créneau d'1 heure dédié aux exercices type brevet (annales, sujets zéro, épreuves blanches).
- **Workspace `3eme — [matière]`** — créneau d'1 heure dédié à la révision approfondie d'un chapitre (carte mentale → fiche → vidéo → quiz).

Le **dimanche** est un jour de repos avec un **rappel léger de 30 min** pour entretenir la mémoire des chapitres passés.

## Rotation hebdomadaire type

| Jour | Créneau 1 (1h) — Workspace Brevet | Créneau 2 (1h) — Workspace 3eme — matière |
|------|------------------------------------|--------------------------------------------|
| Lundi | Exercice brevet — chapitre de la semaine en maths | 3eme — Mathématiques |
| Mardi | Rattrapage point faible — choix par le coach | 3eme — Français |
| Mercredi | Exercice brevet — chapitre de la semaine en français | 3eme — Histoire / Géographie |
| Jeudi | Rattrapage point faible — choix par le coach | 3eme — Physique-Chimie |
| Vendredi | Exercice brevet — chapitre de la semaine en HG ou sciences | 3eme — Mathématiques (bis) |
| Samedi | Épreuve blanche chronométrée (sauf S7 = jour buffer libre) | 3eme — SVT |
| Dimanche | **Repos** | **Rappel léger 30 min** — chapitre tiré des semaines passées |

**Pourquoi cette alternance dans le créneau Brevet** : alterner exos brevet (lundi/mercredi/vendredi/samedi) et rattrapage de points faibles (mardi/jeudi) évite la saturation et permet au coach de proposer des séances ciblées sur les chapitres où l'élève a moins de 50 % de réussite.

**Pourquoi le rappel dimanche** : la courbe d'oubli (Ebbinghaus) frappe fort entre 2 et 4 semaines après l'apprentissage. 30 min hebdomadaires sur un chapitre vu 2-3 semaines plus tôt suffisent à consolider la mémoire avant les annales finales.

## Progression par matière sur 8 semaines

### S1 — 28 avril → 4 mai (Diagnostic + points faibles connus)

**Note importante** : la S1 ne suit pas une progression chapitre fixe. Elle commence par un **diagnostic personnalisé** avec le coach. Le coach lit les exercices déjà tentés dans la base (table `user_exercises`) et propose en priorité les chapitres où l'élève a moins de 40 % de réussite.

Sur le profil élève actuel (28 avril), les points faibles connus sont :
- Jules Ferry et l'école primaire — 0 %
- Probabilités — 33 %
- Théorème de Pythagore — 33 %
- Fonctions affines — non encore évalué

**Programme S1 type** :
- Maths : Pythagore (rattrapage) + calcul littéral + équations 1er degré
- Français : genres littéraires, récit
- HG-EMC : 1ère Guerre mondiale, totalitarismes
- Sciences : atomes, molécules

### S2 — 5 → 11 mai

| Matière | Chapitres |
|---|---|
| Mathématiques | Pythagore (consolidation), Thalès |
| Français | Figures de style, poésie |
| Histoire-Géo | 2ème Guerre mondiale, Shoah |
| Sciences | Réactions chimiques |

### S3 — 12 → 18 mai

| Matière | Chapitres |
|---|---|
| Mathématiques | Fonctions linéaires et affines |
| Français | Théâtre, argumentation |
| Histoire-Géo | Guerre froide, décolonisation |
| Sciences | Électricité, circuits |

### S4 — 19 → 25 mai

| Matière | Chapitres |
|---|---|
| Mathématiques | Trigonométrie, géométrie dans l'espace |
| Français | Conjugaison, analyse de phrase |
| Histoire-Géo | France 1945 → Vème République |
| Sciences | Énergie, conversions |

### S5 — 26 mai → 1er juin

| Matière | Chapitres |
|---|---|
| Mathématiques | Statistiques (moyenne / médiane / étendue), probabilités (consolidation) |
| Français | Étude d'image, dictée |
| Histoire-Géo | Aires urbaines, mondialisation |
| Sciences | Génétique, ADN |

### S6 — 2 → 8 juin

| Matière | Chapitres |
|---|---|
| Mathématiques | Racines carrées, puissances |
| Français | Rédaction sujet d'imagination |
| Histoire-Géo | Espaces productifs France / UE |
| Sciences | Reproduction, immunité |

### S7 — 9 → 15 juin (Mix sujet zéro 2026 + buffer rattrapage)

| Matière | Chapitres |
|---|---|
| Mathématiques | Mix sujet zéro 2026 (automatismes) |
| Français | Rédaction sujet de réflexion |
| Histoire-Géo | Démocratie, citoyenneté (EMC) |
| Sciences | Mers / océans, mouvements |

**Spécificité S7** : le **samedi est un jour buffer libre** (pas d'épreuve blanche chronométrée). L'élève l'utilise pour rattraper ce qui a glissé sur S1-S6 ou pour creuser un point qui a échoué en épreuve blanche précédente. C'est l'élasticité du programme.

### S8 — 16 → 23 juin (Annales chronométrées)

| Matière | Activité |
|---|---|
| Mathématiques | Annales 2024-2025 chronométrées |
| Français | Annales 2024-2025 chronométrées |
| Histoire-Géo | Annales 2024-2025 chronométrées |
| Sciences | Annales 2024-2025 chronométrées |

Cette dernière semaine teste les conditions réelles (durée, gestion du temps, alternance des épreuves). Le coach guide la priorisation selon les écarts encore visibles dans `user_exercises`.

## Cycle de révision dans le workspace matière (1 h × 4 séquences de 15 min)

Chaque séance de révision dans un workspace `3eme — [matière]` suit ce cycle, qui correspond exactement aux intents Sara existants.

| Étape | Durée | Demande à taper | Intent Sara | Bénéfice pédagogique |
|---|---|---|---|---|
| 1. Vue d'ensemble | 15 min | « Fais-moi une carte mentale sur [chapitre]. » | `carte_mentale` (markmap) | Voir la structure globale du chapitre |
| 2. Ancrage | 15 min | « Fais-moi une fiche de révision sur [chapitre]. » | `fiche` | Mémoriser les notions et formules clés |
| 3. Compréhension | 15 min | « Fais-moi une vidéo pédagogique sur [point précis]. » | `video` | Lever les blocages sur un point obscur |
| 4. Validation | 15 min | « Crée-moi un quiz interactif sur [chapitre] pour vérifier mes acquis. » | `generate_h5p` (quiz) | Auto-évaluation et fixation par récupération active |

**À l'issue du quiz**, l'élève revient dans le workspace `Coach Scolaire` et indique son score. Le coach met à jour son diagnostic et planifie la séance suivante.

## Demandes types dans le workspace Brevet

### Bloc 1h — Exercice brevet (lundi, mercredi, vendredi)

```
Donne-moi un exercice type brevet de [matière] sur [chapitre de la semaine], avec corrigé détaillé.
```

**Exemple lundi S2** : *« Donne-moi un exercice type brevet de mathématiques sur le théorème de Pythagore, avec corrigé détaillé. »*

### Bloc 1h — Rattrapage point faible (mardi, jeudi)

```
Donne-moi un exercice type brevet sur [chapitre identifié comme faible par le coach], avec corrigé détaillé.
```

L'élève consulte d'abord le coach (« Sur quoi je travaille mon point faible aujourd'hui ? »), le coach pioche dans la liste des chapitres < 40 % et propose un chapitre précis. L'élève demande ensuite l'exercice dans le workspace Brevet.

### Bloc 1h — Épreuve blanche (samedi, sauf S7)

```
Donne-moi une épreuve type brevet complète de [matière] (chapitres vus en S1 à S[N]), chronométrée.
```

L'élève fait l'épreuve sans aide, puis demande le corrigé et reporte les erreurs au coach pour ajustement de la semaine suivante.

## Rappel dimanche (30 min)

Le dimanche après-midi, créneau optionnel mais fortement recommandé :

```
Rappelle-moi en 5 minutes les points clés de [chapitre vu il y a 2-3 semaines].
```

Puis :

```
Donne-moi 3 questions courtes pour vérifier que je me souviens encore de [chapitre].
```

Le coach peut suggérer le chapitre à rappeler en piochant dans les chapitres validés en S(N-2) ou S(N-3) afin d'optimiser la consolidation mnésique.

## Indicateurs de pilotage

Le coach surveille à chaque interaction :
- **Score global** (objectif : ≥ 80 % en S8)
- **Score par chapitre** (objectif : aucun chapitre < 60 % en S8)
- **Streak (jours consécutifs travaillés)** — alerte si rupture > 2 jours
- **Couverture du programme** (% de chapitres planifiés × % de chapitres effectivement travaillés)
- **Performance en épreuves blanches** (samedi S1 à S6 + S8) — courbe attendue : croissance régulière

## Règles de pilotage par le coach

1. **Personnalisation S1** — adapte les exercices aux points faibles déjà identifiés dans `user_exercises`.
2. **Spaced rappel dimanche** — pioche un chapitre vu 2 à 3 semaines plus tôt, pas le chapitre courant.
3. **Buffer S7 samedi** — pas d'épreuve blanche, l'élève rattrape librement ses points faibles.
4. **Alternance brevet / point faible** dans le créneau d'1 h Brevet — exos chapitre courant lundi/mercredi/vendredi/samedi, rattrapage point faible mardi/jeudi.
5. **Redirection systématique** — pour toute demande pédagogique (fiche, exo, vidéo, dictée, carte mentale, quiz, livre, flashcards), le coach redirige vers le workspace matière avec la phrase exacte à taper.
6. **Cite les chiffres** — score, semaine en cours, jours restants avant l'examen sont systématiquement issus du contexte coach injecté dans le system prompt, jamais inventés.
