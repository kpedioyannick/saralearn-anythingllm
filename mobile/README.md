# Sara AI — App mobile (Capacitor)

App native Android (et iOS plus tard) qui wrap l'UI web de Sara.

## Architecture

```
mobile/
├── package.json              dépendances Capacitor
├── capacitor.config.json     config app (id, nom, URL serveur)
├── resources/                logos sources pour icônes/splash
└── (généré par CI)
    ├── node_modules/
    ├── www/                  stub HTML, l'app charge sara.education en runtime
    └── android/              projet Android Studio généré
```

## Mode de fonctionnement

L'app charge `https://sara.education` dans une WebView native. Conséquences :
- L'APK est petit (~5 Mo) et n'a pas besoin d'être rebuilt à chaque changement frontend
- Internet requis (mode offline non supporté pour le MVP)
- Branding 100% Sara (icône, splash, nom)

## Comment générer l'APK

### Méthode officielle : GitHub Actions (recommandée)

1. Push sur `main` → workflow `.github/workflows/android-build.yml` se déclenche
2. APK téléchargeable dans l'onglet **Actions** de GitHub, artifact `sara-ai-debug-apk`
3. Build manuel possible via **Actions → Android Build → Run workflow**

### Méthode locale (si besoin de debug avancé)

Pré-requis : Node 20, JDK 17, Android SDK.

```bash
cd mobile/
npm install
mkdir -p www && echo "<!DOCTYPE html><html><head><title>Sara AI</title></head><body>Loading…</body></html>" > www/index.html
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
```

## Prochaines étapes

- [ ] Logo Sara haute résolution dans `resources/icon.png` (1024×1024)
- [ ] Splash screen dans `resources/splash.png` (2732×2732)
- [ ] Signature release (keystore + GitHub Secrets)
- [ ] Plateforme iOS (`npx cap add ios` — requiert macOS)
- [ ] Soumission Play Store / App Store
