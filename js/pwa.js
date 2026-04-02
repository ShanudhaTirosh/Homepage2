/**
 * NovaDash 3.0 — pwa.js
 * Service worker registration + PWA install prompt handler
 */

import { showToast } from './ui.js';

// ══════════════════════════════════════════════════
// SERVICE WORKER REGISTRATION
// ══════════════════════════════════════════════════
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('[NovaDash] Service Worker registered:', reg.scope);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          showUpdateBanner();
        }
      });
    });
  } catch(e) {
    console.warn('[NovaDash] Service Worker registration failed:', e);
  }
}

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);
    background:var(--bg-elevated);border:1px solid var(--glass-border);
    border-radius:var(--radius-lg);padding:0.75rem 1.25rem;
    box-shadow:var(--shadow-elevated);z-index:9000;
    display:flex;align-items:center;gap:1rem;font-size:0.875rem;
    color:var(--text-primary);animation:fadeInUp 0.3s ease both;
  `;
  banner.innerHTML = `
    <i class="bi bi-arrow-clockwise" style="color:var(--accent-primary)"></i>
    <span>A new version is available!</span>
    <button class="btn-nd btn-nd-primary btn-nd-sm" onclick="window.location.reload()">Update</button>
    <button class="btn-nd btn-nd-ghost btn-nd-sm" onclick="this.closest('div').remove()">Later</button>
  `;
  document.body.appendChild(banner);
}

// ══════════════════════════════════════════════════
// INSTALL PROMPT
// ══════════════════════════════════════════════════
let deferredPrompt = null;
const DISMISS_KEY = 'novadash_pwa_dismissed';

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Don't show if already dismissed
    if (!localStorage.getItem(DISMISS_KEY)) {
      showInstallBanner();
    }
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPrompt = null;
    showToast('🎉 NovaDash installed successfully!', 'success', 4000);
  });

  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('[NovaDash] Running as installed PWA');
  }
}

function showInstallBanner() {
  const banner = document.getElementById('pwaBanner');
  if (banner) {
    banner.classList.add('visible');
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaBanner');
  if (banner) {
    banner.classList.remove('visible');
  }
}

export async function installPWA() {
  if (!deferredPrompt) {
    // iOS fallback instructions
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      showIOSInstructions();
    } else {
      showToast('Installation not available in this browser', 'info');
    }
    return;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      showToast('Installing NovaDash...', 'success');
    } else {
      showToast('Installation cancelled', 'info', 2000);
    }
  } catch(e) {
    console.error('PWA install error:', e);
  } finally {
    deferredPrompt = null;
    hideInstallBanner();
  }
}

export function dismissInstallBanner() {
  localStorage.setItem(DISMISS_KEY, '1');
  hideInstallBanner();
}

function showIOSInstructions() {
  const content = `
    <div style="text-align:center;padding:1rem 0">
      <div style="font-size:2rem;margin-bottom:0.75rem">📱</div>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem">To install NovaDash on iOS:</p>
      <div style="text-align:left;display:flex;flex-direction:column;gap:0.75rem">
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--glass-bg);border-radius:var(--radius-md)">
          <div style="width:32px;height:32px;background:var(--accent-gradient);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-weight:700">1</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Tap the <strong style="color:var(--text-primary)">Share</strong> button in Safari <i class="bi bi-box-arrow-up"></i></div>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--glass-bg);border-radius:var(--radius-md)">
          <div style="width:32px;height:32px;background:var(--accent-gradient);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-weight:700">2</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Select <strong style="color:var(--text-primary)">"Add to Home Screen"</strong></div>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--glass-bg);border-radius:var(--radius-md)">
          <div style="width:32px;height:32px;background:var(--accent-gradient);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-weight:700">3</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Tap <strong style="color:var(--text-primary)">"Add"</strong> to confirm</div>
        </div>
      </div>
    </div>
  `;
  const { createModal } = window;
  if (createModal) createModal({ title: '📲 Install on iOS', content, id: 'iosInstallModal' });
}

// ══════════════════════════════════════════════════
// NETWORK STATUS
// ══════════════════════════════════════════════════
export function initNetworkMonitor() {
  const dot = document.getElementById('networkDot');

  function updateStatus() {
    const online = navigator.onLine;
    if (dot) {
      dot.classList.toggle('offline', !online);
      dot.title = online ? 'Online' : 'Offline — changes will sync when reconnected';
    }
    if (!online) {
      showToast('📡 You are offline. Changes will sync when reconnected.', 'warning', 5000);
    }
  }

  window.addEventListener('online',  () => {
    updateStatus();
    showToast('🔄 Back online — syncing changes...', 'success', 3000);
  });
  window.addEventListener('offline', updateStatus);
  updateStatus();
}
