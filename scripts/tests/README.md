# Tests E2E Playwright — Sara AI

Suite de tests d'intégration end-to-end pour vérifier les flows critiques de Sara :
authentification, navigation, intents pédagogiques (quiz / probleme / video / markmap /
dictee / h5p), i18n par sous-domaine, multilinguisme.

## Installation

```bash
cd /var/www/saralearn-anythingllm/scripts/tests
npm install
npx playwright install chromium     # télécharge le browser headless
cp .env.example .env                 # ajuste les valeurs
```

## Configuration

`.env` doit contenir :

| Variable | Rôle | Défaut |
|---|---|---|
| `SARA_URL` | URL de l'instance FR | `https://fr.sara.education` |
| `SARA_URL_EN` | URL EN (pour test i18n) | `https://en.sara.education` |
| `TEST_USER` / `TEST_PASSWORD` | Compte admin de test | — |
| `TEST_STUDENT_USER` / `TEST_STUDENT_PASSWORD` | Compte élève (rôle `default`) | — |
| `TEST_WORKSPACE_BREVET` | Slug du workspace brevet | `brevet` |
| `TEST_WORKSPACE_3EME` | Slug du workspace 3ème | `3eme-francais` |
| `TEST_WORKSPACE_DICTEE` | Slug d'un workspace avec thread "dictée" | optionnel |
| `RUN_LIVE_LLM` | `1` pour activer les tests qui appellent DeepSeek | `0` |

⚠️ Les tests live-LLM coûtent ~$0.05 par run complet et durent ~5 min — laisse `RUN_LIVE_LLM=0` par défaut.

## Lancer les tests

```bash
# Tout (offline + live si RUN_LIVE_LLM=1)
npm test

# Smoke uniquement (services up)
npm run test:smoke

# Auth + navigation
npm run test:auth

# i18n
npm run test:i18n

# Tous les tests LLM live
npm run test:llm

# Mode visuel (browser ouvert) pour debug
npm run test:headed

# Voir le rapport HTML après run
npm run report
```

## Structure

```
scripts/tests/
├── package.json
├── playwright.config.js
├── .env.example
├── lib/
│   └── helpers.js        # login, sendChatMessage, hasBlock, leakOutsideBlocks
└── tests/
    ├── 01-smoke.spec.js              # services FR/EN/sara-video
    ├── 02-auth-login.spec.js         # connexion valide / invalide
    ├── 03-auth-register.spec.js      # accessibilité du form register
    ├── 04-i18n-subdomain.spec.js     # fr.sara → fr, en.sara → en
    ├── 05-workspace-nav.spec.js      # post-login → /workspace/.../t/...
    ├── 06-exercice-simple.spec.js    # ```quiz QCM
    ├── 07-exercice-complexe.spec.js  # ```probleme brevet
    ├── 08-video.spec.js              # ```video JSON + format dynamique
    ├── 09-h5p.spec.js                # intent h5p
    ├── 10-markmap.spec.js            # ```markmap
    ├── 11-dictee.spec.js             # ```dictee
    └── 12-language-pref.spec.js      # réponse EN, curriculum US
```

## Stratégie de test

- **Tests offline** (smoke, auth, i18n, navigation) tournent en quelques secondes,
  toujours actifs.
- **Tests live LLM** (06 → 12) sont gardés derrière `RUN_LIVE_LLM=1` pour ne pas
  brûler de tokens à chaque commit. Les assertions sont **structurelles**
  (présence d'un bloc fence, parseabilité du JSON) plutôt que
  **sémantiques**, parce que la sortie d'un LLM n'est pas déterministe.
- Le helper `sendChatMessage` détecte la fin du stream SSE par "fenêtre
  silencieuse" (4 s sans changement DOM). Robuste mais ajoute ~4 s par test.
- En cas d'échec, Playwright capture **trace, vidéo et screenshot** (config
  `retain-on-failure`) → consulter `playwright-report/` ou lancer `npm run report`.
