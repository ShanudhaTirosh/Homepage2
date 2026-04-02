/**
 * NovaDash 3.0 — auth.js
 * Auth guard, onboarding flow, multi-tab session sync, BroadcastChannel
 */

import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { auth, db } from './firebase.js';
import { getProfile, setProfile } from './firestore.js';
import { SECTION_TEMPLATES, addSection, addLink } from './firestore.js';
import { showToast } from './ui.js';

// ══════════════════════════════════════════════════
// BROADCAST CHANNEL — multi-tab sync
// ══════════════════════════════════════════════════
let bc;
try {
  bc = new BroadcastChannel('novadash_auth');
  bc.onmessage = ({ data }) => {
    if (data.type === 'signout') {
      window.location.href = 'index.html';
    }
    if (data.type === 'signin' && window.location.pathname.endsWith('dashboard.html')) {
      // Another tab signed in — reload to pick up their session
      window.location.reload();
    }
  };
} catch (e) {
  bc = { postMessage: () => {}, close: () => {} };
}

// ══════════════════════════════════════════════════
// ROUTE GUARD — call on dashboard.html load
// ══════════════════════════════════════════════════
let _currentUser = null;
let _profileData = null;
let _authReadyCb = null;

export function getUser()    { return _currentUser; }
export function getProfile2(){ return _profileData; }

export function onAuthReady(cb) {
  if (_currentUser !== null) cb(_currentUser, _profileData);
  else _authReadyCb = cb;
}

export function initAuthGuard() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not signed in → redirect to sign-in
        window.location.href = 'index.html';
        return;
      }

      _currentUser = user;

      // Load or create profile
      let profile = await getProfile(user.uid);
      if (!profile) {
        // First-ever login — create profile
        const defaultWsId = `ws_${Date.now()}`;
        profile = {
          displayName: user.displayName || 'Explorer',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          onboardingComplete: false,
          totalLinksAdded: 0,
          activeWorkspaceId: defaultWsId
        };
        await setProfile(user.uid, profile);

        // Create default workspace
        const { doc, setDoc, collection } = await import(
          'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
        );
        await setDoc(doc(db, `users/${user.uid}/workspaces/${defaultWsId}`), {
          name: 'Personal',
          emoji: '🏠',
          order: 0,
          isDefault: true,
          background: { type: 'gradient', value: 'default' },
          theme: 'midnight',
          accentColor: '#7c6ef7',
          cardStyle: { borderRadius: 14, blurIntensity: 20, shadowOpacity: 0.3 },
          layout: 'grid',
          widgetsEnabled: {
            clock: true, weather: true, notes: true,
            ai: true, habits: false, rss: false,
            pomodoro: false, quotes: true, countdown: false
          },
          weatherLocation: '',
          customCSS: '',
          fontFamily: 'default',
          createdAt: new Date().toISOString()
        });
      } else {
        // Update last seen
        await setProfile(user.uid, {});
      }

      _profileData = profile;

      // Broadcast sign-in to other tabs
      bc.postMessage({ type: 'signin', uid: user.uid });

      if (_authReadyCb) {
        _authReadyCb(user, profile);
        _authReadyCb = null;
      }
      resolve({ user, profile });

      // Update last seen every 5 minutes
      setInterval(() => setProfile(user.uid, {}), 5 * 60 * 1000);
    });
  });
}

// ══════════════════════════════════════════════════
// SIGN OUT
// ══════════════════════════════════════════════════
export async function handleSignOut() {
  try {
    bc.postMessage({ type: 'signout' });
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (e) {
    showToast('Sign-out failed. Please try again.', 'error');
  }
}

// ══════════════════════════════════════════════════
// ONBOARDING FLOW
// ══════════════════════════════════════════════════
let onboardingStep = 1;
const onboardingChoices = {
  theme: 'midnight',
  template: null,
  widgets: { clock: true, weather: true, notes: true, ai: true, habits: false }
};

export function initOnboarding(uid, wsId) {
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  renderOnboardingStep(1);
}

function renderOnboardingStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active'));
  const stepEl = document.getElementById(`onboardStep${step}`);
  if (stepEl) stepEl.classList.add('active');

  // Update progress dots
  document.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
    dot.classList.toggle('done', i < step);
  });

  onboardingStep = step;
}

export function onboardNext() {
  if (onboardingStep < 4) {
    renderOnboardingStep(onboardingStep + 1);
  } else {
    finishOnboarding();
  }
}

export function onboardBack() {
  if (onboardingStep > 1) renderOnboardingStep(onboardingStep - 1);
}

export function onboardSelectTheme(theme) {
  onboardingChoices.theme = theme;
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.theme === theme);
  });
  // Apply theme preview
  document.documentElement.dataset.theme = theme;
}

export function onboardSelectTemplate(tplKey) {
  onboardingChoices.template = tplKey;
  document.querySelectorAll('.template-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.template === tplKey);
  });
}

export function onboardToggleWidget(widget) {
  onboardingChoices.widgets[widget] = !onboardingChoices.widgets[widget];
  const el = document.querySelector(`[data-widget="${widget}"]`);
  if (el) el.classList.toggle('selected', onboardingChoices.widgets[widget]);
}

async function finishOnboarding() {
  const user = _currentUser;
  const profile = _profileData;
  if (!user) return;

  try {
    const wsId = profile.activeWorkspaceId;

    // Apply chosen theme to workspace
    const { doc, updateDoc } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    await updateDoc(doc(db, `users/${user.uid}/workspaces/${wsId}`), {
      theme: onboardingChoices.theme,
      widgetsEnabled: onboardingChoices.widgets
    });

    // Apply template if chosen
    if (onboardingChoices.template && onboardingChoices.template !== 'blank') {
      const tpl = SECTION_TEMPLATES[onboardingChoices.template];
      if (tpl) {
        const sectionRef = await addSection(user.uid, {
          name: tpl.name,
          icon: tpl.icon,
          color: tpl.color,
          order: 0,
          workspaceId: wsId,
          collapsed: false,
          description: ''
        });
        for (let i = 0; i < tpl.links.length; i++) {
          await addLink(user.uid, {
            ...tpl.links[i],
            sectionId: sectionRef.id,
            workspaceId: wsId,
            order: i,
            openInNewTab: true,
            pinned: false,
            tags: [],
            description: ''
          });
        }
      }
    }

    // Mark onboarding complete
    await setProfile(user.uid, { onboardingComplete: true });
    _profileData.onboardingComplete = true;

    // Hide overlay + confetti
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.style.display = 'none';

    // Trigger confetti
    if (window.launchConfetti) window.launchConfetti();

    showToast('Welcome to NovaDash! 🎉', 'success', 4000);

  } catch (e) {
    console.error('Onboarding error:', e);
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════
// USER AVATAR / DISPLAY
// ══════════════════════════════════════════════════
export function renderUserNav(user, profile) {
  const nameEl  = document.getElementById('navUserName');
  const photoEl = document.getElementById('navUserPhoto');
  const initEl  = document.getElementById('navUserInitial');

  if (nameEl)  nameEl.textContent = user.displayName || profile.displayName || 'Explorer';

  if (user.photoURL && photoEl) {
    photoEl.src = user.photoURL;
    photoEl.style.display = 'block';
    if (initEl) initEl.style.display = 'none';
  } else if (initEl) {
    initEl.textContent = (user.displayName || 'E')[0].toUpperCase();
    initEl.style.display = 'flex';
    if (photoEl) photoEl.style.display = 'none';
  }
}
