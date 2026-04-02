/**
 * NovaDash 3.0 — firebase.js
 * Firebase initialization, exports, and Gemini API key config
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ══════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// Replace these values with your own Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps → SDK setup
// ══════════════════════════════════════════════════
export const firebaseConfig = {
  apiKey: "AIzaSyArt8IcCSU5gstA-pGAFAqZHBQbC9DuZS0",
  authDomain: "homepage-6bf3b.firebaseapp.com",
  projectId: "homepage-6bf3b",
  storageBucket: "homepage-6bf3b.firebasestorage.app",
  messagingSenderId: "145965989590",
  appId: "1:145965989590:web:b5981f45c58f6db44f9377",
  measurementId: "G-HGJ55NR1G6"
};

// ══════════════════════════════════════════════════
// GEMINI AI CONFIGURATION
// Get your key from: https://aistudio.google.com/app/apikey
// Users can also enter their own key in Settings → AI (stored in Firestore)
// ══════════════════════════════════════════════════
export const GEMINI_API_KEY = "AIzaSyDSh7WOi1NyPOZb1ALAJeW7Jsnj6nKsJIU";
export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ══════════════════════════════════════════════════
// APP INITIALIZATION
// ══════════════════════════════════════════════════
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Set local persistence for cross-tab session
setPersistence(auth, browserLocalPersistence).catch(err =>
  console.warn('Persistence error:', err)
);

// Enable offline persistence (IndexedDB)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open — offline persistence disabled.');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence.');
  }
});

// ══════════════════════════════════════════════════
// COLLECTION PATH HELPERS
// ══════════════════════════════════════════════════
export const paths = {
  profile:     (uid) => `users/${uid}/profile/main`,
  settings:    (uid) => `users/${uid}/settings/main`,
  workspaces:  (uid) => `users/${uid}/workspaces`,
  workspace:   (uid, wsId) => `users/${uid}/workspaces/${wsId}`,
  sections:    (uid) => `users/${uid}/sections`,
  section:     (uid, sId) => `users/${uid}/sections/${sId}`,
  links:       (uid) => `users/${uid}/links`,
  link:        (uid, lId) => `users/${uid}/links/${lId}`,
  notes:       (uid) => `users/${uid}/notes`,
  note:        (uid, nId) => `users/${uid}/notes/${nId}`,
  habits:      (uid) => `users/${uid}/habits`,
  habit:       (uid, hId) => `users/${uid}/habits/${hId}`,
  rssFeeds:    (uid) => `users/${uid}/rssFeeds`,
  rssFeed:     (uid, fId) => `users/${uid}/rssFeeds/${fId}`,
  countdowns:  (uid) => `users/${uid}/countdowns`,
  countdown:   (uid, cId) => `users/${uid}/countdowns/${cId}`,
  analytics:   (uid) => `users/${uid}/analytics`,
  analyticsDay:(uid, d) => `users/${uid}/analytics/${d}`,
  aiChats:     (uid) => `users/${uid}/aiChats`,
  offlineQueue:(uid) => `users/${uid}/offlineQueue`
};
