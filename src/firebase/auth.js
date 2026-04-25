/**
 * Firebase Authentication — Email/Password
 * Single-user system: after first registration, all future signups are blocked
 * via a Firestore flag at settings/app → registrationLocked: true
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

/**
 * Check if registration is locked (a user already exists)
 */
export async function isRegistrationLocked() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    return snap.exists() && snap.data().registrationLocked === true;
  } catch (err) {
    console.error('isRegistrationLocked error:', err);
    return false;
  }
}

/**
 * Register a new user (only if not locked)
 */
export async function registerUser(email, password) {
  const locked = await isRegistrationLocked();
  if (locked) {
    throw new Error('Registration is closed. Only one user is allowed.');
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Lock registration permanently after first user
  await setDoc(doc(db, 'settings', 'app'), { registrationLocked: true }, { merge: true });

  return userCredential.user;
}

/**
 * Sign in with email/password
 */
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Sign out the current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
