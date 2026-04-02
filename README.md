# 🌌 NovaDash 3.0 — Setup Guide

> Your personal browser start page. Cloud-synced, AI-powered, PWA-ready.

---

## Prerequisites

- A web browser (Chrome/Edge recommended for PWA install)
- A [Firebase](https://firebase.google.com/) account (free Spark plan works)
- A [Google AI Studio](https://aistudio.google.com/) account (free Gemini API)
- A simple web server (or Firebase Hosting)

---

## Step 1 — Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click **"Add project"** → give it a name (e.g. `novadash`)
3. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Enable Google Authentication

1. In your Firebase project → **Authentication** → **Get Started**
2. Click **"Google"** → Enable → set your support email → **Save**

---

## Step 3 — Create Firestore Database

1. In Firebase → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** for now (you'll add rules in Step 4)
3. Select a region close to your users → **Done**

---

## Step 4 — Paste Security Rules

1. Firestore → **Rules** tab → Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }
    function isValidLink() {
      return request.resource.data.keys().hasAll(['title','url','sectionId'])
          && request.resource.data.title is string
          && request.resource.data.title.size() <= 100
          && request.resource.data.url is string
          && request.resource.data.url.size() <= 2048;
    }
    function isValidSection() {
      return request.resource.data.keys().hasAll(['name','order'])
          && request.resource.data.name is string
          && request.resource.data.name.size() <= 60;
    }

    match /users/{uid}/{document=**} {
      allow read: if isOwner(uid);
      allow delete: if isOwner(uid);
    }
    match /users/{uid}/links/{linkId} {
      allow create, update: if isOwner(uid) && isValidLink();
    }
    match /users/{uid}/sections/{sectionId} {
      allow create, update: if isOwner(uid) && isValidSection();
    }
    match /users/{uid}/settings/{doc} {
      allow read, write: if isOwner(uid);
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

2. Click **Publish**

---

## Step 5 — Configure Firebase Config

1. Firebase → **Project Settings** (gear icon) → **Your apps** → **Add app** → Web
2. Register app → Copy the `firebaseConfig` object
3. Open `js/firebase.js` → Replace `YOUR_*` values with your actual config:

```javascript
export const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456:web:abc123"
};
```

---

## Step 6 — Configure AI Assistant (Gemini API Key)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"** → Copy the key
3. Open `js/firebase.js` → Set your key:

```javascript
export const GEMINI_API_KEY = "AIzaSy...your_key_here";
```

**Or:** Users can enter their own key via **Settings → AI Assistant** (stored securely in Firestore)

---

## Step 7 — Run Locally

Option A — Simple HTTP server (Python):
```bash
cd novadash
python3 -m http.server 8080
# Open http://localhost:8080
```

Option B — Live Server (VS Code extension):
- Install **Live Server** extension → Right-click `index.html` → Open with Live Server

Option C — Node.js:
```bash
npx serve .
```

> **Note:** Service workers require HTTPS or localhost. Don't open `index.html` directly as a file.

---

## Step 8 — Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Init hosting in your novadash folder
cd novadash
firebase init hosting
# → Select your project
# → Public directory: . (current)
# → Single-page app: No
# → Overwrite index.html: No

# Deploy
firebase deploy --only hosting
```

Your app will be live at `https://your-project.web.app`

---

## PWA Icons

Create two icons and place them at:
- `assets/icons/icon-192.png` (192×192px)
- `assets/icons/icon-512.png` (512×512px)

You can use any image editor or a free tool like [favicon.io](https://favicon.io).

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + K` | Open command palette |
| `Ctrl/⌘ + N` | Add new link |
| `Ctrl/⌘ + ⇧ + N` | Add new section |
| `Ctrl/⌘ + ,` | Open settings |
| `Ctrl/⌘ + ⇧ + A` | Toggle AI assistant |
| `Ctrl/⌘ + ⇧ + L` | Toggle dark/light mode |
| `Ctrl/⌘ + Z` | Undo last deletion |
| `Ctrl/⌘ + E` | Export data |
| `1–9` | Switch to workspace 1–9 |
| `?` | Show shortcuts cheat sheet |
| `Esc` | Close any open panel |

---

## Troubleshooting

**"Firebase not initialized" error**
→ Check your `firebaseConfig` in `js/firebase.js` — all values must be filled.

**Google sign-in not working**
→ Add your domain to Firebase → Authentication → Authorized domains.

**Firestore permission denied**
→ Ensure security rules are published and your user is authenticated.

**AI not responding**
→ Check your Gemini API key is valid and has quota remaining.

**PWA install not showing**
→ Must be served over HTTPS (or localhost). Check browser console for manifest errors.

**Weather not loading**
→ Open-Meteo is free with no key required. Check browser console for CORS errors.

---

## Customisation

- **Themes**: Edit `css/themes.css` to modify or add color themes
- **Templates**: Edit `SECTION_TEMPLATES` in `js/firestore.js`
- **Widgets**: Toggle in Settings or modify `js/widgets.js`
- **Custom CSS**: Settings → Custom CSS (per workspace)
- **Font**: Change `--font-display` and `--font-body` in `css/style.css`

---

## License

MIT — Use freely, attribute appreciated.

---

*NovaDash v3.0 · Built with Firebase, Vanilla JS, Bootstrap 5, SortableJS, Chart.js, Gemini AI, Open-Meteo*
*Your universe, your dashboard. 🌌*
