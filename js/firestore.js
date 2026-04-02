/**
 * NovaDash 3.0 — firestore.js
 * Complete CRUD + onSnapshot subscriptions + offline queue
 */

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, limit, writeBatch,
  serverTimestamp, increment, arrayUnion, arrayRemove, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db, paths } from './firebase.js';

// ── Utility: today's date string ──────────────────────────
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ══════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════
export async function getProfile(uid) {
  try {
    const snap = await getDoc(doc(db, paths.profile(uid)));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.error('getProfile:', e); return null; }
}

export async function setProfile(uid, data) {
  try {
    await setDoc(doc(db, paths.profile(uid)), {
      ...data,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) { console.error('setProfile:', e); }
}

export async function updateLastSeen(uid) {
  try {
    await setDoc(doc(db, paths.profile(uid)),
      { lastSeen: serverTimestamp() }, { merge: true });
  } catch(e) { /* silent */ }
}

// ══════════════════════════════════════════════════
// WORKSPACES
// ══════════════════════════════════════════════════
export async function addWorkspace(uid, data) {
  return await addDoc(collection(db, paths.workspaces(uid)), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateWorkspace(uid, wsId, data) {
  try {
    await updateDoc(doc(db, paths.workspace(uid, wsId)), data);
  } catch (e) { console.error('updateWorkspace:', e); throw e; }
}

export async function deleteWorkspace(uid, wsId) {
  try {
    const batch = writeBatch(db);

    // Delete all sections in workspace
    const sectSnap = await getDocs(
      query(collection(db, paths.sections(uid)), where('workspaceId', '==', wsId))
    );
    sectSnap.forEach(d => batch.delete(d.ref));

    // Delete all links in workspace
    const linkSnap = await getDocs(
      query(collection(db, paths.links(uid)), where('workspaceId', '==', wsId))
    );
    linkSnap.forEach(d => batch.delete(d.ref));

    // Delete workspace itself
    batch.delete(doc(db, paths.workspace(uid, wsId)));
    await batch.commit();
  } catch (e) { console.error('deleteWorkspace:', e); throw e; }
}

export async function setActiveWorkspace(uid, wsId) {
  await setDoc(doc(db, paths.profile(uid)), { activeWorkspaceId: wsId }, { merge: true });
}

export function subscribeWorkspaces(uid, cb) {
  return onSnapshot(
    query(collection(db, paths.workspaces(uid)), orderBy('order', 'asc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeWorkspaces:', err)
  );
}

// ══════════════════════════════════════════════════
// SECTIONS
// ══════════════════════════════════════════════════
export async function addSection(uid, data) {
  return await addDoc(collection(db, paths.sections(uid)), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateSection(uid, sId, data) {
  await updateDoc(doc(db, paths.section(uid, sId)), data);
}

export async function deleteSection(uid, sId) {
  const batch = writeBatch(db);
  // Delete all links in section first
  const linkSnap = await getDocs(
    query(collection(db, paths.links(uid)), where('sectionId', '==', sId))
  );
  linkSnap.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, paths.section(uid, sId)));
  await batch.commit();
}

export async function duplicateSection(uid, sId) {
  const origSection = await getDoc(doc(db, paths.section(uid, sId)));
  if (!origSection.exists()) return;

  const newSectionRef = await addSection(uid, {
    ...origSection.data(),
    name: origSection.data().name + ' (copy)',
    createdAt: serverTimestamp()
  });

  // Copy all links
  const linkSnap = await getDocs(
    query(collection(db, paths.links(uid)), where('sectionId', '==', sId))
  );

  const batch = writeBatch(db);
  linkSnap.forEach(d => {
    const newRef = doc(collection(db, paths.links(uid)));
    batch.set(newRef, {
      ...d.data(),
      sectionId: newSectionRef.id,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
  return newSectionRef;
}

export function subscribeSections(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.sections(uid)),
      where('workspaceId', '==', wsId),
      orderBy('order', 'asc')
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeSections:', err)
  );
}

// Batch reorder sections
export async function reorderSections(uid, orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, idx) => {
    batch.update(doc(db, paths.section(uid, id)), { order: idx });
  });
  await batch.commit();
}

// ══════════════════════════════════════════════════
// LINKS
// ══════════════════════════════════════════════════
export async function addLink(uid, data) {
  return await addDoc(collection(db, paths.links(uid)), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    clickCount: 0,
    isAlive: null
  });
}

export async function updateLink(uid, lId, data) {
  await updateDoc(doc(db, paths.link(uid, lId)), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteLink(uid, lId) {
  await deleteDoc(doc(db, paths.link(uid, lId)));
}

export async function bulkDeleteLinks(uid, linkIds) {
  const batch = writeBatch(db);
  linkIds.forEach(id => batch.delete(doc(db, paths.link(uid, id))));
  await batch.commit();
}

export async function bulkMoveLinks(uid, linkIds, sectionId) {
  const batch = writeBatch(db);
  linkIds.forEach(id => {
    batch.update(doc(db, paths.link(uid, id)), {
      sectionId,
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
}

export async function recordLinkClick(uid, linkId, trackingEnabled) {
  if (!trackingEnabled) return;
  try {
    const today = todayStr();
    const batch = writeBatch(db);
    batch.update(doc(db, paths.link(uid, linkId)), {
      clickCount: increment(1),
      lastClickedAt: serverTimestamp()
    });
    batch.set(doc(db, paths.analyticsDay(uid, today)), {
      [`clicks.${linkId}`]: increment(1),
      totalClicks: increment(1)
    }, { merge: true });
    await batch.commit();
  } catch (e) { /* silent - non-critical */ }
}

export function subscribeLinks(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.links(uid)),
      where('workspaceId', '==', wsId),
      orderBy('order', 'asc')
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeLinks:', err)
  );
}

// Batch reorder links within section
export async function reorderLinks(uid, orderedLinks) {
  const batch = writeBatch(db);
  orderedLinks.forEach(({ id, order }) => {
    batch.update(doc(db, paths.link(uid, id)), { order });
  });
  await batch.commit();
}

// Update link health
export async function updateLinkHealth(uid, linkId, isAlive) {
  await updateDoc(doc(db, paths.link(uid, linkId)), {
    isAlive,
    lastHealthCheck: serverTimestamp()
  });
}

// ══════════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════════
export async function addNote(uid, data) {
  return await addDoc(collection(db, paths.notes(uid)), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateNote(uid, nId, data) {
  await updateDoc(doc(db, paths.note(uid, nId)), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteNote(uid, nId) {
  await deleteDoc(doc(db, paths.note(uid, nId)));
}

export function subscribeNotes(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.notes(uid)),
      where('workspaceId', '==', wsId),
      orderBy('updatedAt', 'desc')
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeNotes:', err)
  );
}

// ══════════════════════════════════════════════════
// HABITS
// ══════════════════════════════════════════════════
export async function addHabit(uid, data) {
  return await addDoc(collection(db, paths.habits(uid)), {
    ...data,
    completions: {},
    streak: 0,
    createdAt: serverTimestamp()
  });
}

export async function updateHabit(uid, hId, data) {
  await updateDoc(doc(db, paths.habit(uid, hId)), data);
}

export async function deleteHabit(uid, hId) {
  await deleteDoc(doc(db, paths.habit(uid, hId)));
}

export async function markHabitComplete(uid, hId, dateStr) {
  await updateDoc(doc(db, paths.habit(uid, hId)), {
    [`completions.${dateStr}`]: true
  });
}

export async function unmarkHabitComplete(uid, hId, dateStr) {
  await updateDoc(doc(db, paths.habit(uid, hId)), {
    [`completions.${dateStr}`]: false
  });
}

export function subscribeHabits(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.habits(uid)),
      where('workspaceId', '==', wsId)
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeHabits:', err)
  );
}

// Calculate streak from completions map
export function calcStreak(completions) {
  if (!completions) return 0;
  const today = new Date();
  let streak = 0;
  let cursor = new Date(today);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (completions[key]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ══════════════════════════════════════════════════
// RSS FEEDS
// ══════════════════════════════════════════════════
export async function addRssFeed(uid, data) {
  return await addDoc(collection(db, paths.rssFeeds(uid)), {
    ...data,
    lastFetched: null,
    createdAt: serverTimestamp()
  });
}

export async function deleteRssFeed(uid, fId) {
  await deleteDoc(doc(db, paths.rssFeed(uid, fId)));
}

export function subscribeRssFeeds(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.rssFeeds(uid)),
      where('workspaceId', '==', wsId)
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeRssFeeds:', err)
  );
}

// ══════════════════════════════════════════════════
// COUNTDOWNS
// ══════════════════════════════════════════════════
export async function addCountdown(uid, data) {
  return await addDoc(collection(db, paths.countdowns(uid)), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function deleteCountdown(uid, cId) {
  await deleteDoc(doc(db, paths.countdown(uid, cId)));
}

export function subscribeCountdowns(uid, wsId, cb) {
  return onSnapshot(
    query(
      collection(db, paths.countdowns(uid)),
      where('workspaceId', '==', wsId)
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('subscribeCountdowns:', err)
  );
}

// ══════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════
export async function getAnalyticsSummary(uid, days = 30) {
  try {
    const results = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const snap = await getDoc(doc(db, paths.analyticsDay(uid, dateStr)));
      results.push({
        date: dateStr,
        total: snap.exists() ? (snap.data().totalClicks || 0) : 0,
        clicks: snap.exists() ? (snap.data().clicks || {}) : {}
      });
    }
    return results.reverse();
  } catch (e) { console.error('getAnalyticsSummary:', e); return []; }
}

export async function getTopLinks(uid, limitNum = 10) {
  try {
    const snap = await getDocs(
      query(
        collection(db, paths.links(uid)),
        orderBy('clickCount', 'desc'),
        limit(limitNum)
      )
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error('getTopLinks:', e); return []; }
}

// ══════════════════════════════════════════════════
// AI CHAT HISTORY
// ══════════════════════════════════════════════════
export async function saveAiChat(uid, messages) {
  await setDoc(doc(db, `users/${uid}/aiChats/main`), {
    messages: messages.slice(-50), // max 50
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getAiChat(uid) {
  try {
    const snap = await getDoc(doc(db, `users/${uid}/aiChats/main`));
    return snap.exists() ? (snap.data().messages || []) : [];
  } catch (e) { return []; }
}

// ══════════════════════════════════════════════════
// OFFLINE QUEUE
// ══════════════════════════════════════════════════
export async function queueOperation(uid, operation) {
  await addDoc(collection(db, paths.offlineQueue(uid)), {
    ...operation,
    timestamp: serverTimestamp(),
    synced: false
  });
}

export async function flushOfflineQueue(uid) {
  const snap = await getDocs(
    query(
      collection(db, paths.offlineQueue(uid)),
      where('synced', '==', false),
      orderBy('timestamp', 'asc')
    )
  );
  // Firebase offline mode handles sync automatically via IndexedDB
  // This function just marks them synced
  const batch = writeBatch(db);
  snap.forEach(d => batch.update(d.ref, { synced: true }));
  if (!snap.empty) await batch.commit();
}

// ══════════════════════════════════════════════════
// SECTION TEMPLATES
// Pre-built link packs for quick setup
// ══════════════════════════════════════════════════
export const SECTION_TEMPLATES = {
  dev: {
    name: '🛠️ Dev Tools',
    icon: 'bi-code-slash',
    color: '#7c6ef7',
    links: [
      { title: 'GitHub',          url: 'https://github.com',            iconType: 'favicon' },
      { title: 'Stack Overflow',  url: 'https://stackoverflow.com',     iconType: 'favicon' },
      { title: 'MDN Docs',        url: 'https://developer.mozilla.org', iconType: 'favicon' },
      { title: 'CodePen',         url: 'https://codepen.io',            iconType: 'favicon' },
      { title: 'npm',             url: 'https://npmjs.com',             iconType: 'favicon' },
      { title: 'Vercel',          url: 'https://vercel.com',            iconType: 'favicon' },
      { title: 'Netlify',         url: 'https://netlify.com',           iconType: 'favicon' }
    ]
  },
  social: {
    name: '📱 Social Media',
    icon: 'bi-share',
    color: '#ec4899',
    links: [
      { title: 'Twitter / X',  url: 'https://twitter.com',   iconType: 'favicon' },
      { title: 'Instagram',    url: 'https://instagram.com', iconType: 'favicon' },
      { title: 'LinkedIn',     url: 'https://linkedin.com',  iconType: 'favicon' },
      { title: 'YouTube',      url: 'https://youtube.com',   iconType: 'favicon' },
      { title: 'Reddit',       url: 'https://reddit.com',    iconType: 'favicon' },
      { title: 'TikTok',       url: 'https://tiktok.com',    iconType: 'favicon' }
    ]
  },
  work: {
    name: '💼 Work Suite',
    icon: 'bi-briefcase',
    color: '#00c8d4',
    links: [
      { title: 'Gmail',       url: 'https://mail.google.com',         iconType: 'favicon' },
      { title: 'Calendar',    url: 'https://calendar.google.com',     iconType: 'favicon' },
      { title: 'Drive',       url: 'https://drive.google.com',        iconType: 'favicon' },
      { title: 'Zoom',        url: 'https://zoom.us',                 iconType: 'favicon' },
      { title: 'Slack',       url: 'https://slack.com',               iconType: 'favicon' },
      { title: 'Notion',      url: 'https://notion.so',               iconType: 'favicon' },
      { title: 'Trello',      url: 'https://trello.com',              iconType: 'favicon' }
    ]
  },
  design: {
    name: '🎨 Design Resources',
    icon: 'bi-palette',
    color: '#f59e0b',
    links: [
      { title: 'Figma',          url: 'https://figma.com',                       iconType: 'favicon' },
      { title: 'Dribbble',       url: 'https://dribbble.com',                    iconType: 'favicon' },
      { title: 'Behance',        url: 'https://behance.net',                     iconType: 'favicon' },
      { title: 'Awwwards',       url: 'https://awwwards.com',                    iconType: 'favicon' },
      { title: 'Coolors',        url: 'https://coolors.co',                      iconType: 'favicon' },
      { title: 'Google Fonts',   url: 'https://fonts.google.com',                iconType: 'favicon' }
    ]
  },
  news: {
    name: '📰 News',
    icon: 'bi-newspaper',
    color: '#ff6b35',
    links: [
      { title: 'Hacker News',  url: 'https://news.ycombinator.com', iconType: 'favicon' },
      { title: 'TechCrunch',   url: 'https://techcrunch.com',       iconType: 'favicon' },
      { title: 'The Verge',    url: 'https://theverge.com',         iconType: 'favicon' },
      { title: 'BBC News',     url: 'https://bbc.com/news',         iconType: 'favicon' },
      { title: 'Reddit',       url: 'https://reddit.com',           iconType: 'favicon' }
    ]
  },
  gaming: {
    name: '🎮 Gaming',
    icon: 'bi-controller',
    color: '#34d364',
    links: [
      { title: 'Steam',          url: 'https://store.steampowered.com', iconType: 'favicon' },
      { title: 'Twitch',         url: 'https://twitch.tv',              iconType: 'favicon' },
      { title: 'Discord',        url: 'https://discord.com',            iconType: 'favicon' },
      { title: 'Epic Games',     url: 'https://epicgames.com',          iconType: 'favicon' }
    ]
  },
  learning: {
    name: '🎓 Learning',
    icon: 'bi-mortarboard',
    color: '#818cf8',
    links: [
      { title: 'Coursera',      url: 'https://coursera.org',       iconType: 'favicon' },
      { title: 'Udemy',         url: 'https://udemy.com',          iconType: 'favicon' },
      { title: 'freeCodeCamp', url: 'https://freecodecamp.org',   iconType: 'favicon' },
      { title: 'Khan Academy',  url: 'https://khanacademy.org',    iconType: 'favicon' },
      { title: 'Duolingo',      url: 'https://duolingo.com',       iconType: 'favicon' }
    ]
  },
  shopping: {
    name: '🛍️ Shopping',
    icon: 'bi-bag',
    color: '#ff3d8a',
    links: [
      { title: 'Amazon',        url: 'https://amazon.com',         iconType: 'favicon' },
      { title: 'eBay',          url: 'https://ebay.com',           iconType: 'favicon' },
      { title: 'Etsy',          url: 'https://etsy.com',           iconType: 'favicon' },
      { title: 'Product Hunt',  url: 'https://producthunt.com',    iconType: 'favicon' }
    ]
  }
};
