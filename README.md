# DugnadHub Setup & Run Guide

This document walks a new contributor through creating a fresh Firebase project, wiring the credentials into the app, and running DugnadHub on Windows or macOS (including Android emulators and real devices).

---

## 1. Firebase Setup (New Google Account)

> These steps assume you have a Google account that does not yet have Firebase resources and that you will use the Firebase Web SDK configuration values inside the Expo app.

### 1.1 Create the Firebase project

1. Visit [https://console.firebase.google.com](https://console.firebase.google.com) and press Add project.
2. Enter a project name (for example `dugnadhub-student`) and keep the generated project ID handy.
3. Disable Google Analytics unless you specifically need it, then create the project. Firebase takes a few seconds to provision.

### 1.2 Register the web app & collect config

1. After the project opens, click the Web `</>` icon under "Get started".
2. Provide an app nickname (e.g. `dugnadhub-web`) and leave Firebase Hosting disabled.
3. Click Register app. Firebase shows a code snippet containing the Web SDK configuration; copy the field values (`apiKey`, `authDomain`, etc.).
4. Click Continue to console when finished. The config values remain available under Project settings → General → Your apps → SDK setup and configuration.

### 1.3 Enable required Firebase services

1. Authentication

   - Navigate to Build → Authentication.
   - Click Get started.
   - Under the Sign-in method tab enable Email/Password (no other providers are required for the current app).

2. Firestore Database

   - Go to Build → Firestore Database and click Create database.
   - Choose Start in production mode (safer defaults) and pick your desired region. Production mode requires defining Firestore rules; a simple starter set is shown below.

   ```json
   // Firestore security rules starter (tighten further as needed)
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
         allow create: if request.auth != null && request.auth.uid == userId;
         allow update: if request.auth != null && request.auth.uid == userId;
       }

       match /events/{eventId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

3. (Optional) Storage
   - If you plan on uploading assets, enable Build → Storage and accept the default bucket. The current app references the bucket but will run without stored media.

### 1.4 Connect the Expo app (.env)

1. Duplicate the provided `.env` file and replace the values with the ones from Project settings → General.

   | Firebase field    | .env variable                              |
   | ----------------- | ------------------------------------------ |
   | apiKey            | `EXPO_PUBLIC_FIREBASE_API_KEY`             |
   | authDomain        | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`         |
   | projectId         | `EXPO_PUBLIC_FIREBASE_PROJECT_ID`          |
   | storageBucket     | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`      |
   | messagingSenderId | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | appId             | `EXPO_PUBLIC_FIREBASE_APP_ID`              |

2. Save the file as `.env` in the project root (replace the existing file if necessary). Expo automatically exposes variables prefixed with `EXPO_PUBLIC_`.
3. Restart Expo after editing `.env` to load the new configuration (`Ctrl+C` / `Cmd+C` in the Metro terminal, then `npm run start`).

### 1.5 Seed initial data (optional but helpful)

The app automatically creates a Firestore `users/{uid}` document with the role `volunteer` when a user signs up via email/password.

If you need an organiser account for testing:

1. After registering an account through the app, open Firestore → Data → `users` collection.
2. Locate the document with the authenticated user’s UID.
3. Edit the `role` field to `organiser` so the Create Event tab appears within the app.

---

## 2. Local Environment Prerequisites

- Node.js 18.x or 20.x (use [nvm](https://github.com/nvm-sh/nvm) on macOS/Linux or [nvm-windows](https://github.com/coreybutler/nvm-windows) on Windows).
- npm (bundled with Node) or yarn if you prefer.
- Expo CLI (optional globally, you can rely on `npx expo`).
- Git to clone the repository.
- Android Studio (for the Android Emulator) or a physical Android phone running Android 8.0+.
- On macOS, install [Watchman](https://facebook.github.io/watchman/docs/install) (`brew install watchman`) to improve Metro reliability.

---

## 3. Project Setup (Windows & macOS)

### 3.1 Clone and install dependencies

```bash
# Clone the repository
git clone <REPO_URL>
cd DugnadHub

# Install dependencies
npm install
# or
# yarn install
```

Ensure `.env` exists with the Firebase credentials before starting Expo.

### 3.2 macOS-specific notes

1. Install Xcode command line tools if prompted (`xcode-select --install`).
2. If using Homebrew-installed Node, ensure `/opt/homebrew/bin` is in your `PATH` (Apple silicon).
3. Allow the Android emulator to use the ARM 64-v8a image (Android Studio handles this automatically on Apple silicon).

### 3.3 Windows-specific notes

1. If PowerShell execution policies block scripts, run PowerShell as Admin and execute `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
2. Install [Chocolatey](https://chocolatey.org/install) if you prefer automated installs (`choco install nodejs-lts openjdk11`).
3. Enable hardware virtualization (BIOS/UEFI) for Android emulators; ensure `HAXM`/`Windows Hypervisor Platform` is active.

---

## 4. Launching the App

### 4.1 Quick start with Expo Metro

```bash
npm run start        # Starts Metro bundler in interactive mode
npm run android      # Starts Metro and launches default Android emulator
npm run ios          # Requires macOS + iOS simulator (optional for this project)
npm run web          # Runs the web build in a browser (already confirmed working)
```

During development keep the Metro terminal open. Press `r` to reload, `m` to open the developer menu, and `Shift+d` to toggle the development build mode.

### 4.2 Running on an Android emulator

1. Install Android Studio, then open the AVD Manager and create a device (Pixel series recommended) using an Android 14 or 13 system image.
2. Start the virtual device from Android Studio.
3. In the project directory run `npm run android`.
4. Metro pushes the Expo dev client to the emulator and opens the app automatically. If Metro cannot detect the emulator, launch it first, then run `npx expo start --android`.
5. If the splash screen spins indefinitely, check the Metro console for Firebase errors (common causes: incorrect `.env` values or Firestore rules blocking reads).

### 4.3 Running on a physical Android device (Expo Go)

1. Install Expo Go from the Google Play Store on the phone.
2. Ensure the phone and the development machine share the same Wi‑Fi network.
3. Start Metro with `npm run start`.
4. Scan the QR code shown in the Metro terminal (Android commands listed below) or in the Expo Dev Tools browser tab.
5. Expo Go opens DugnadHub instantly. Shake the device (or use the status bar notification) to access developer options.

### 4.4 Building a native debug APK (optional)

For an offline build without Expo Go:

```bash
# Installs native Android directories (one-time)
npx expo prebuild --platform android

# Builds and deploys to a connected emulator/device
npx expo run:android
```

> Note: `expo prebuild` introduces native Android/iOS folders. Commit or ignore them according to your workflow and ensure the correct Java JDK (17+) is installed.

---

## 5. Environment Management

- Restart Metro every time you change `.env` values so Expo reloads the config.
- Never commit `.env` to version control unless you intentionally share credentials.
- For shared development, create an `.env.example` with placeholder values (already provided `.env` file can be copied and sanitized).

---

## 6. Troubleshooting Checklist

- Auth spinner persists: verify Email/Password auth is enabled and `.env` values exactly match the Firebase console.
- `FirebaseError: Missing or insufficient permissions`: adjust Firestore rules or ensure the Firestore collection exists (`users`, `events`).
- Metro fails to connect to the emulator: reopen Android Studio, ensure only one Metro instance is running, and run `npx expo start --android --clear` to reset caches.
- SDK mismatch warnings: delete `node_modules`, run `npm install`, then `npx expo start -c`.
- Expo Go stuck on splash: open the in-app developer menu → Reload or toggle Remote JS Debugging to surface errors in the Metro console.

---
