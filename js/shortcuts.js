/**
 * NovaDash 3.0 — shortcuts.js
 * Keyboard shortcuts registry + undo stack + shortcuts cheat sheet
 */

import { showToast, createModal } from './ui.js';

// ══════════════════════════════════════════════════
// UNDO STACK
// ══════════════════════════════════════════════════
const MAX_UNDO = 20;
const _undoStack = [];

export function pushUndo(operation) {
  _undoStack.push(operation);
  if (_undoStack.length > MAX_UNDO) _undoStack.shift();
}

export async function performUndo() {
  const op = _undoStack.pop();
  if (!op) { showToast('Nothing to undo', 'info', 2000); return; }

  try {
    await op.undo();
    showToast(`↩ Undone: ${op.description}`, 'success', 2000);
  } catch(e) {
    console.error('Undo error:', e);
    showToast('Undo failed', 'error');
  }
}

// ══════════════════════════════════════════════════
// SHORTCUT REGISTRY
// ══════════════════════════════════════════════════
const shortcuts = [
  {
    group: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'],         label: 'Open command palette' },
      { keys: ['Ctrl', 'F'],         label: 'Focus search' },
      { keys: ['Ctrl', 'N'],         label: 'Add new link' },
      { keys: ['Ctrl', '⇧', 'N'],    label: 'Add new section' },
      { keys: ['Esc'],               label: 'Close any open panel/modal' },
      { keys: ['1–9'],               label: 'Switch to workspace 1–9' }
    ]
  },
  {
    group: 'Interface',
    items: [
      { keys: ['Ctrl', ','],         label: 'Open settings' },
      { keys: ['Ctrl', '⇧', 'L'],    label: 'Toggle dark/light mode' },
      { keys: ['Ctrl', '⇧', 'W'],    label: 'Switch workspace' },
      { keys: ['?'],                 label: 'Show this shortcuts reference' }
    ]
  },
  {
    group: 'Actions',
    items: [
      { keys: ['Ctrl', 'Z'],         label: 'Undo last deletion' },
      { keys: ['Ctrl', 'E'],         label: 'Export data' },
      { keys: ['Ctrl', '⇧', 'A'],    label: 'Toggle AI assistant' },
      { keys: ['Ctrl', 'Click'],     label: 'Select link (multi-select)' },
      { keys: ['⇧', 'Click'],        label: 'Select range of links' }
    ]
  }
];

// ══════════════════════════════════════════════════
// INIT — wire up global keydown
// ══════════════════════════════════════════════════
export function initShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in an input
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      || document.activeElement?.isContentEditable;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Esc — close modals / drawers / palette
    if (e.key === 'Escape') {
      handlers.closeAll?.();
      return;
    }

    // ? — show shortcuts (not in input)
    if (e.key === '?' && !inInput) {
      e.preventDefault();
      showShortcutsModal();
      return;
    }

    // Skip rest if in input and not a global shortcut
    if (inInput && !ctrl) return;

    // Ctrl+K — command palette
    if (ctrl && e.key === 'k') {
      e.preventDefault();
      handlers.openCommandPalette?.();
      return;
    }

    // Ctrl+N — add link
    if (ctrl && !shift && e.key === 'n') {
      e.preventDefault();
      handlers.addLink?.();
      return;
    }

    // Ctrl+Shift+N — add section
    if (ctrl && shift && e.key === 'N') {
      e.preventDefault();
      handlers.addSection?.();
      return;
    }

    // Ctrl+, — settings
    if (ctrl && e.key === ',') {
      e.preventDefault();
      handlers.openSettings?.();
      return;
    }

    // Ctrl+Shift+A — AI
    if (ctrl && shift && e.key === 'A') {
      e.preventDefault();
      handlers.toggleAI?.();
      return;
    }

    // Ctrl+Shift+L — toggle theme
    if (ctrl && shift && e.key === 'L') {
      e.preventDefault();
      handlers.toggleTheme?.();
      return;
    }

    // Ctrl+Shift+W — workspace switcher
    if (ctrl && shift && e.key === 'W') {
      e.preventDefault();
      handlers.openWorkspaceSwitcher?.();
      return;
    }

    // Ctrl+Z — undo
    if (ctrl && !shift && e.key === 'z') {
      e.preventDefault();
      performUndo();
      return;
    }

    // Ctrl+E — export
    if (ctrl && !shift && e.key === 'e') {
      e.preventDefault();
      handlers.exportData?.();
      return;
    }

    // Ctrl+F — focus search
    if (ctrl && e.key === 'f') {
      e.preventDefault();
      document.getElementById('navSearchInput')?.focus();
      return;
    }

    // Number keys 1-9 — switch workspace
    if (!inInput && !ctrl && !shift && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      handlers.switchWorkspaceByIndex?.(idx);
      return;
    }
  });
}

// ══════════════════════════════════════════════════
// SHORTCUTS CHEAT SHEET MODAL
// ══════════════════════════════════════════════════
export function showShortcutsModal() {
  const content = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
      ${shortcuts.map(group => `
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">
            ${group.group}
          </div>
          ${group.items.map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid var(--border-subtle)">
              <span style="font-size:0.8rem;color:var(--text-secondary)">${item.label}</span>
              <div style="display:flex;gap:0.2rem;flex-shrink:0;margin-left:0.5rem">
                ${item.keys.map(k => `
                  <kbd style="padding:2px 7px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:5px;font-size:0.68rem;color:var(--text-primary);font-family:monospace">${k}</kbd>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;

  createModal({
    title: '⌨️ Keyboard Shortcuts',
    content,
    id: 'shortcutsModal',
    maxWidth: '640px'
  });
}

// ══════════════════════════════════════════════════
// LINK HEALTH CHECK
// ══════════════════════════════════════════════════
const CORS_PROXY = 'https://corsproxy.io/?';

export async function checkLinkHealth(url) {
  try {
    const res = await fetch(
      `${CORS_PROXY}${encodeURIComponent(url)}`,
      { method: 'HEAD', signal: AbortSignal.timeout(5000) }
    );
    return res.ok || res.status < 400;
  } catch {
    return false;
  }
}

export async function runHealthCheckModal(uid, links, updateLinkHealthFn) {
  if (!links.length) { showToast('No links to check', 'info'); return; }

  const content = `
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem">
      Checking ${links.length} link${links.length !== 1 ? 's' : ''} — this may take a moment…
    </p>
    <div style="background:var(--glass-bg);border-radius:var(--radius-md);height:6px;overflow:hidden;margin-bottom:1rem">
      <div id="healthProgress" style="height:100%;background:var(--accent-gradient);width:0%;transition:width 0.3s ease;border-radius:var(--radius-md)"></div>
    </div>
    <div id="healthProgress-text" style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1rem;text-align:center">0 / ${links.length}</div>
    <div id="healthResults" style="max-height:300px;overflow-y:auto"></div>
    <div id="healthSummary" style="display:none;margin-top:1rem"></div>
  `;

  const footer = `
    <button class="btn-nd btn-nd-secondary" id="healthCancelBtn" onclick="closeModal('healthCheckModal')">Cancel</button>
    <button class="btn-nd btn-nd-danger" id="removeDeadBtn" onclick="removeDeadLinks()" style="display:none">
      <i class="bi bi-trash3"></i> Remove All Dead Links
    </button>
  `;

  const modal = createModal({ title: '🩺 Link Health Check', content, footer, id: 'healthCheckModal' });
  const resultsEl = document.getElementById('healthResults');
  const progressBar = document.getElementById('healthProgress');
  const progressText = document.getElementById('healthProgress-text');

  const results = { alive: [], dead: [], unchecked: [] };
  let deadIds = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    // Update progress
    const pct = Math.round(((i) / links.length) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `${i} / ${links.length}`;

    // Add "checking" item
    if (resultsEl) {
      resultsEl.innerHTML += `
        <div class="health-check-item" id="hitem_${link.id}">
          <div class="health-dot checking"></div>
          <div style="font-size:0.82rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(link.title)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${shortUrl(link.url)}</div>
        </div>
      `;
      resultsEl.scrollTop = resultsEl.scrollHeight;
    }

    const isAlive = await checkLinkHealth(link.url);
    if (isAlive) results.alive.push(link); else { results.dead.push(link); deadIds.push(link.id); }

    // Update item
    const item = document.getElementById(`hitem_${link.id}`);
    if (item) {
      const dot = item.querySelector('.health-dot');
      if (dot) { dot.classList.remove('checking'); dot.classList.add(isAlive ? 'alive' : 'dead'); }
    }

    // Save result to Firestore
    try { await updateLinkHealthFn(uid, link.id, isAlive); } catch(e) {}
  }

  // Final progress
  if (progressBar) progressBar.style.width = '100%';
  if (progressText) progressText.textContent = `${links.length} / ${links.length} — Done!`;

  // Show summary
  const summaryEl = document.getElementById('healthSummary');
  if (summaryEl) {
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
      <div style="display:flex;gap:1rem;padding:0.75rem;background:var(--glass-bg);border-radius:var(--radius-md)">
        <div style="text-align:center;flex:1">
          <div style="font-size:1.2rem;font-weight:700;color:var(--success)">${results.alive.length}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">Alive ✓</div>
        </div>
        <div style="text-align:center;flex:1">
          <div style="font-size:1.2rem;font-weight:700;color:var(--danger)">${results.dead.length}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">Dead ✗</div>
        </div>
      </div>
    `;
  }

  if (results.dead.length > 0) {
    document.getElementById('removeDeadBtn')?.removeAttribute('style');
    window._deadLinkIds = deadIds;
  }
}

window.removeDeadLinks = async function() {
  if (!window._deadLinkIds?.length) return;
  if (window.bulkDeleteLinks) {
    await window.bulkDeleteLinks(window._deadLinkIds);
    window._deadLinkIds = [];
    showToast(`Removed dead links`, 'success');
    closeModal('healthCheckModal');
  }
};

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shortUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
