/**
 * Firestore CRUD Operations
 * All link, category, and settings operations are centralized here.
 * Data is scoped to the authenticated user via uid-based paths.
 */
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════
export async function initializeNewUser(uid) {
  const batch = writeBatch(db);
  const defaultCategories = [
    { name: 'Productivity', emoji: '🚀', order: 0 },
    { name: 'Social', emoji: '💬', order: 1 },
    { name: 'Entertainment', emoji: '🎬', order: 2 },
    { name: 'Development', emoji: '💻', order: 3 },
  ];

  for (const cat of defaultCategories) {
    const catRef = doc(collection(db, `users/${uid}/categories`));
    batch.set(catRef, { ...cat, createdAt: serverTimestamp() });
  }

  await batch.commit();
}

// ═══════════════════════════════════════════
// COLLECTION PATH HELPERS
// ═══════════════════════════════════════════
const paths = {
  links: (uid) => `users/${uid}/links`,
  link: (uid, id) => `users/${uid}/links/${id}`,
  categories: (uid) => `users/${uid}/categories`,
  category: (uid, id) => `users/${uid}/categories/${id}`,
  settings: (uid) => `users/${uid}/settings/main`,
};

// ═══════════════════════════════════════════
// LINKS
// ═══════════════════════════════════════════
export async function addLink(uid, data) {
  return await addDoc(collection(db, paths.links(uid)), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    clickCount: 0,
  });
}

export async function updateLink(uid, linkId, data) {
  await updateDoc(doc(db, paths.link(uid, linkId)), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLink(uid, linkId) {
  await deleteDoc(doc(db, paths.link(uid, linkId)));
}

/**
 * Subscribe to real-time link updates
 * Returns an unsubscribe function
 */
export function subscribeLinks(uid, callback) {
  return onSnapshot(
    query(collection(db, paths.links(uid)), orderBy('order', 'asc')),
    (snap) => {
      const links = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(links);
    },
    (err) => console.error('subscribeLinks error:', err)
  );
}

/**
 * Batch reorder links — persist new order values to Firestore
 */
export async function reorderLinks(uid, orderedLinks) {
  const batch = writeBatch(db);
  orderedLinks.forEach(({ id, order }) => {
    batch.update(doc(db, paths.link(uid, id)), { order });
  });
  await batch.commit();
}

// ═══════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════
export async function addCategory(uid, data) {
  return await addDoc(collection(db, paths.categories(uid)), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateCategory(uid, catId, data) {
  await updateDoc(doc(db, paths.category(uid, catId)), data);
}

export async function deleteCategory(uid, catId) {
  // Delete all links in this category first
  const batch = writeBatch(db);
  const linkSnap = await getDocs(
    query(collection(db, paths.links(uid)), where('categoryId', '==', catId))
  );
  linkSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, paths.category(uid, catId)));
  await batch.commit();
}

/**
 * Subscribe to real-time category updates
 */
export function subscribeCategories(uid, callback) {
  return onSnapshot(
    query(collection(db, paths.categories(uid)), orderBy('order', 'asc')),
    (snap) => {
      const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(categories);
    },
    (err) => console.error('subscribeCategories error:', err)
  );
}

// ═══════════════════════════════════════════
// USER SETTINGS
// ═══════════════════════════════════════════
export async function getUserSettings(uid) {
  try {
    const snap = await getDoc(doc(db, paths.settings(uid)));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('getUserSettings error:', err);
    return null;
  }
}

export async function setUserSettings(uid, data) {
  await setDoc(doc(db, paths.settings(uid)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
