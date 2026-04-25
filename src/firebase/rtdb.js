/**
 * Firebase Realtime Database — Quick Notes & Presence
 * Notes are stored in RTDB for fast, live updates across tabs.
 */
import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from './config';

// ═══════════════════════════════════════════
// QUICK NOTES
// ═══════════════════════════════════════════

/**
 * Save quick notes content to RTDB
 */
export function saveQuickNotes(uid, content) {
  const notesRef = ref(rtdb, `users/${uid}/quickNotes`);
  return set(notesRef, {
    content,
    updatedAt: Date.now(),
  });
}

/**
 * Subscribe to quick notes changes (live sync across tabs)
 * Returns a cleanup function
 */
export function subscribeQuickNotes(uid, callback) {
  const notesRef = ref(rtdb, `users/${uid}/quickNotes`);
  const handler = onValue(notesRef, (snapshot) => {
    const data = snapshot.val();
    callback(data?.content || '');
  });
  // Return unsubscribe function
  return () => off(notesRef, 'value', handler);
}

// ═══════════════════════════════════════════
// PRESENCE
// ═══════════════════════════════════════════

/**
 * Set user presence as online
 */
export function setPresence(uid, online = true) {
  const presenceRef = ref(rtdb, `users/${uid}/presence`);
  return set(presenceRef, {
    online,
    lastSeen: Date.now(),
  });
}
