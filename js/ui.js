/**
 * NovaDash 3.0 — ui.js
 * DOM rendering engine: sections, link cards, toasts, modals, context menu, bulk actions
 */

import { recordLinkClick } from './firestore.js';

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let _uid = null;
let _currentLinks = [];
let _currentSections = [];
let _activeWorkspace = null;
let _selectedLinkIds = new Set();
let _trackingEnabled = true;
let _viewMode = 'grid'; // grid | list | compact
let _activeTagFilter = null;
let _onLinkClick = null;

export function setUid(uid) { _uid = uid; }
export function setTrackingEnabled(v) { _trackingEnabled = v; }
export function setViewMode(mode) { _viewMode = mode; renderAllSections(); }
export function setLinkClickHandler(fn) { _onLinkClick = fn; }
export function getSelectedLinks() { return [..._selectedLinkIds]; }
export function clearSelection() {
  _selectedLinkIds.clear();
  document.querySelectorAll('.link-card.selected').forEach(el => el.classList.remove('selected'));
  updateBulkBar();
  document.body.classList.remove('selection-mode');
}

// Tag filter
export function setTagFilter(tag) {
  _activeTagFilter = tag;
  renderAllSections();
}

// ══════════════════════════════════════════════════
// RENDER SECTIONS + LINKS
// ══════════════════════════════════════════════════
export function updateData(links, sections, workspace) {
  _currentLinks = links || [];
  _currentSections = sections || [];
  _activeWorkspace = workspace;
  renderAllSections();
  renderTagFilterBar();
}

export function renderAllSections() {
  const container = document.getElementById('sectionsContainer');
  if (!container) return;

  const layout = _activeWorkspace?.layout || 'grid';

  if (_currentSections.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="margin: 3rem 0;">
        <div class="empty-state-icon">🌌</div>
        <div class="empty-state-title">Your universe awaits</div>
        <div class="empty-state-desc">Create a section to start organising your links.</div>
      </div>`;
    return;
  }

  container.innerHTML = '';
  _currentSections.forEach(section => {
    const sectionLinks = getLinksForSection(section.id);
    container.appendChild(renderSection(section, sectionLinks, layout));
  });
}

function getLinksForSection(sectionId) {
  let links = _currentLinks.filter(l => l.sectionId === sectionId);
  if (_activeTagFilter) {
    links = links.filter(l => l.tags && l.tags.includes(_activeTagFilter));
  }
  // Pinned first
  return links.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (a.order || 0) - (b.order || 0);
  });
}

function renderSection(section, links, layout) {
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper animate-fadeInUp';
  wrapper.dataset.sectionId = section.id;
  if (section.collapsed) wrapper.classList.add('collapsed');

  wrapper.innerHTML = `
    <div class="section-header" role="group" aria-label="Section: ${escHtml(section.name)}">
      <input type="checkbox" class="section-select-all" aria-label="Select all links in ${escHtml(section.name)}" />
      <div class="section-icon" style="${section.color ? `color:${section.color}` : ''}">
        <i class="bi ${section.icon || 'bi-grid-3x3-gap-fill'}"></i>
      </div>
      <div>
        <div class="section-title">${escHtml(section.name)}</div>
        ${section.description ? `<div class="section-description">${escHtml(section.description)}</div>` : ''}
      </div>
      <span class="section-count">${links.length}</span>
      <div class="section-actions">
        <div class="d-flex gap-1">
          <button class="btn-nd btn-nd-ghost btn-nd-sm btn-nd-icon" title="Collapse section"
            onclick="sectionCollapseToggle('${section.id}')" aria-label="Toggle collapse">
            <i class="bi bi-chevron-down"></i>
          </button>
          <button class="btn-nd btn-nd-ghost btn-nd-sm btn-nd-icon" title="Add link to section"
            onclick="openAddLinkModal('${section.id}')" aria-label="Add link">
            <i class="bi bi-plus"></i>
          </button>
          <button class="btn-nd btn-nd-ghost btn-nd-sm btn-nd-icon" title="Section options"
            onclick="openSectionMenu(event, '${section.id}')" aria-label="Section options">
            <i class="bi bi-three-dots"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="section-links-grid links-${_viewMode}" id="linksGrid_${section.id}" 
         data-section-id="${section.id}" role="list" aria-label="Links in ${escHtml(section.name)}">
    </div>
  `;

  const grid = wrapper.querySelector(`#linksGrid_${section.id}`);

  if (links.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem;">
        <div class="empty-state-icon" style="font-size:1.5rem;">🔗</div>
        <div class="empty-state-desc">No links yet. Click + to add one.</div>
      </div>`;
  } else {
    links.forEach(link => {
      grid.appendChild(renderLinkCard(link, layout));
    });
  }

  // Select-all checkbox handler
  const selectAll = wrapper.querySelector('.section-select-all');
  selectAll.addEventListener('change', () => {
    links.forEach(link => {
      if (selectAll.checked) {
        _selectedLinkIds.add(link.id);
      } else {
        _selectedLinkIds.delete(link.id);
      }
    });
    if (selectAll.checked) document.body.classList.add('selection-mode');
    renderAllSections();
    updateBulkBar();
  });

  return wrapper;
}

function renderLinkCard(link, layout) {
  const card = document.createElement('div');
  card.className = 'link-card';
  card.dataset.linkId = link.id;
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;
  if (link.pinned)   card.classList.add('pinned');
  if (_selectedLinkIds.has(link.id)) card.classList.add('selected');

  const iconHtml = renderLinkIcon(link);
  const isHot = (link.clickCount || 0) >= 10;

  if (layout === 'list') {
    card.innerHTML = `
      ${link.pinned ? '<i class="link-pin-badge bi bi-pin-fill"></i>' : ''}
      <div class="link-icon">${iconHtml}</div>
      <div class="link-title">${escHtml(link.title)}</div>
      <div class="link-url">${escHtml(shortUrl(link.url))}</div>
      ${link.tags?.length ? `<div class="link-tags">${link.tags.map(t => `<span class="link-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="link-clicks">${link.clickCount || 0} clicks</div>
    `;
  } else if (layout === 'compact') {
    card.innerHTML = `
      <div class="link-icon">${iconHtml}</div>
      <div class="link-title">${escHtml(link.title)}</div>
    `;
  } else {
    // Grid
    card.innerHTML = `
      ${link.pinned ? '<i class="link-pin-badge bi bi-pin-fill"></i>' : ''}
      ${isHot ? '<span class="link-badge">🔥</span>' : ''}
      <div class="link-icon">${iconHtml}</div>
      <div class="link-title">${escHtml(link.title)}</div>
    `;
  }

  // Click handler
  card.addEventListener('click', async (e) => {
    // If in selection mode (any selected) — toggle selection
    if (_selectedLinkIds.size > 0 || e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      toggleLinkSelection(link.id);
      return;
    }

    // Normal open
    if (_uid) await recordLinkClick(_uid, link.id, _trackingEnabled);
    if (_onLinkClick) _onLinkClick(link);

    const target = link.openInNewTab !== false ? '_blank' : '_self';
    window.open(link.url, target, 'noopener,noreferrer');
  });

  // Keyboard open
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });

  return card;
}

function renderLinkIcon(link) {
  if (link.iconType === 'emoji') {
    return `<span>${link.iconValue || '🔗'}</span>`;
  }
  if (link.iconType === 'bootstrap') {
    return `<i class="bi ${link.iconValue || 'bi-link-45deg'}"></i>`;
  }
  if (link.iconType === 'image') {
    return `<img src="${escHtml(link.iconValue)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><i class="bi bi-link-45deg" style="display:none"></i>`;
  }
  // Default: favicon
  const domain = safeGetDomain(link.url);
  return `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>🔗</text></svg>'">`;
}

// ══════════════════════════════════════════════════
// SELECTION
// ══════════════════════════════════════════════════
function toggleLinkSelection(linkId) {
  if (_selectedLinkIds.has(linkId)) {
    _selectedLinkIds.delete(linkId);
  } else {
    _selectedLinkIds.add(linkId);
  }

  const card = document.querySelector(`[data-link-id="${linkId}"]`);
  if (card) card.classList.toggle('selected', _selectedLinkIds.has(linkId));

  if (_selectedLinkIds.size > 0) {
    document.body.classList.add('selection-mode');
  } else {
    document.body.classList.remove('selection-mode');
  }

  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkActionBar');
  if (!bar) return;
  if (_selectedLinkIds.size > 0) {
    bar.classList.add('visible');
    const countEl = bar.querySelector('.bulk-count');
    if (countEl) countEl.textContent = `${_selectedLinkIds.size} link${_selectedLinkIds.size > 1 ? 's' : ''} selected`;
  } else {
    bar.classList.remove('visible');
  }
}

// ══════════════════════════════════════════════════
// TAG FILTER BAR
// ══════════════════════════════════════════════════
export function renderTagFilterBar() {
  const bar = document.getElementById('tagFilterBar');
  if (!bar) return;

  // Collect all unique tags
  const tagSet = new Set();
  _currentLinks.forEach(l => (l.tags || []).forEach(t => tagSet.add(t)));

  if (tagSet.size === 0) { bar.classList.remove('visible'); return; }

  bar.classList.add('visible');
  bar.innerHTML = `
    <span class="tag-filter-pill all ${!_activeTagFilter ? 'active' : ''}" onclick="setTagFilter(null)">All</span>
    ${[...tagSet].map(t => `
      <span class="tag-filter-pill ${_activeTagFilter === t ? 'active' : ''}" onclick="setTagFilter('${escHtml(t)}')">${escHtml(t)}</span>
    `).join('')}
    <span class="tag-filter-pill" onclick="setTagFilter(null)" style="margin-left:auto;opacity:0.5;">× Clear</span>
  `;
}

// ══════════════════════════════════════════════════
// TOASTS
// ══════════════════════════════════════════════════
const TOAST_ICONS = {
  success: 'bi-check-circle-fill',
  error:   'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info:    'bi-info-circle-fill'
};

export function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-nd ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <i class="bi ${TOAST_ICONS[type] || 'bi-info-circle-fill'} toast-icon" style="color:var(--${type === 'error' ? 'danger' : type})"></i>
    <span class="toast-text">${escHtml(msg)}</span>
    <i class="bi bi-x toast-close" onclick="this.closest('.toast-nd').remove()" aria-label="Dismiss"></i>
  `;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }
}

// ══════════════════════════════════════════════════
// CONTEXT MENU
// ══════════════════════════════════════════════════
let _contextMenuLinkId = null;

export function initContextMenu() {
  document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('[data-link-id]');
    if (!card) { hideContextMenu(); return; }
    e.preventDefault();
    _contextMenuLinkId = card.dataset.linkId;
    showContextMenu(e.clientX, e.clientY);
  });

  document.addEventListener('click', () => hideContextMenu());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideContextMenu(); });
  window.addEventListener('scroll', () => hideContextMenu(), { passive: true });
}

function showContextMenu(x, y) {
  const menu = document.getElementById('contextMenu');
  if (!menu) return;

  const link = _currentLinks.find(l => l.id === _contextMenuLinkId);
  if (!link) return;

  menu.innerHTML = `
    <div class="ctx-item" onclick="ctxOpenLink()"><i class="bi bi-box-arrow-up-right"></i> Open Link</div>
    <div class="ctx-item" onclick="ctxEditLink()"><i class="bi bi-pencil"></i> Edit</div>
    <div class="ctx-item" onclick="ctxCopyUrl()"><i class="bi bi-clipboard"></i> Copy URL</div>
    <div class="ctx-divider"></div>
    <div class="ctx-item" onclick="ctxMoveToSection()"><i class="bi bi-folder-symlink"></i> Move to Section</div>
    <div class="ctx-item" onclick="ctxAddTag()"><i class="bi bi-tag"></i> Add Tag</div>
    <div class="ctx-item" onclick="ctxTogglePin()"><i class="bi bi-pin${link.pinned ? '-angle-fill' : ''}"></i> ${link.pinned ? 'Unpin' : 'Pin'}</div>
    <div class="ctx-item" onclick="ctxViewStats()"><i class="bi bi-bar-chart"></i> View Stats (${link.clickCount || 0} clicks)</div>
    <div class="ctx-divider"></div>
    <div class="ctx-item danger" onclick="ctxDeleteLink()"><i class="bi bi-trash"></i> Delete</div>
  `;

  menu.classList.add('visible');

  // Smart positioning
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let mx = x, my = y;
  if (x + 200 > vw) mx = x - 200;
  if (y + 300 > vh) my = y - rect.height - 10;

  menu.style.left = `${Math.max(8, mx)}px`;
  menu.style.top  = `${Math.max(8, my)}px`;
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.classList.remove('visible');
}

export function getContextMenuLinkId() { return _contextMenuLinkId; }

// ══════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════
export function createModal({ title, content, footer, id = 'ndModal', maxWidth = '520px' }) {
  // Remove existing
  document.getElementById(id)?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'nd-modal-backdrop';
  backdrop.id = id;
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', `${id}Title`);

  const modal = document.createElement('div');
  modal.className = 'nd-modal';
  modal.style.maxWidth = maxWidth;
  modal.tabIndex = -1;

  modal.innerHTML = `
    <div class="nd-modal-header">
      <div class="nd-modal-title" id="${id}Title">${title}</div>
      <button class="nd-modal-close" onclick="document.getElementById('${id}').remove()" aria-label="Close modal">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="nd-modal-body">${content}</div>
    ${footer ? `<div class="nd-modal-footer">${footer}</div>` : ''}
  `;

  // Trap focus
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') backdrop.remove();
    if (e.key === 'Tab') trapFocus(e, modal);
  });

  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  document.body.appendChild(backdrop);
  modal.focus();
  return backdrop;
}

function trapFocus(e, modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export function closeModal(id = 'ndModal') {
  document.getElementById(id)?.remove();
}

// ══════════════════════════════════════════════════
// ADD / EDIT LINK MODAL
// ══════════════════════════════════════════════════
export function openAddLinkModal(sectionId, existingLink = null) {
  const isEdit = !!existingLink;
  const l = existingLink || {};

  const sectionsOpts = _currentSections.map(s =>
    `<option value="${s.id}" ${(l.sectionId || sectionId) === s.id ? 'selected' : ''}>${escHtml(s.name)}</option>`
  ).join('');

  const content = `
    <div class="nd-form-group">
      <label class="nd-label" for="linkTitle">Title</label>
      <input id="linkTitle" class="nd-input" type="text" placeholder="e.g. GitHub" value="${escHtml(l.title || '')}" required maxlength="100" />
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="linkUrl">URL</label>
      <input id="linkUrl" class="nd-input" type="url" placeholder="https://..." value="${escHtml(l.url || '')}" required maxlength="2048" />
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="linkSection">Section</label>
      <select id="linkSection" class="nd-select">${sectionsOpts}</select>
    </div>
    <div style="display:flex;gap:1rem;">
      <div class="nd-form-group" style="flex:1">
        <label class="nd-label" for="linkIconType">Icon Type</label>
        <select id="linkIconType" class="nd-select" onchange="updateIconValueField()">
          <option value="favicon" ${l.iconType==='favicon'?'selected':''}>Favicon (auto)</option>
          <option value="emoji"   ${l.iconType==='emoji'?'selected':''}>Emoji</option>
          <option value="bootstrap" ${l.iconType==='bootstrap'?'selected':''}>Bootstrap Icon</option>
          <option value="image"   ${l.iconType==='image'?'selected':''}>Image URL</option>
        </select>
      </div>
      <div class="nd-form-group" style="flex:1" id="iconValueWrap">
        <label class="nd-label" for="linkIconValue">Icon Value</label>
        <input id="linkIconValue" class="nd-input" type="text" placeholder="🔗 or bi-github or URL" value="${escHtml(l.iconValue || '')}" />
      </div>
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="linkDescription">Description (optional)</label>
      <input id="linkDescription" class="nd-input" type="text" placeholder="Short note about this link" value="${escHtml(l.description || '')}" maxlength="200" />
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="linkTags">Tags (comma-separated)</label>
      <input id="linkTags" class="nd-input" type="text" placeholder="work, daily, dev" value="${escHtml((l.tags || []).join(', '))}" />
    </div>
    <div class="d-flex gap-3 mt-2">
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" id="linkNewTab" ${l.openInNewTab !== false ? 'checked' : ''} />
        Open in new tab
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
        <input type="checkbox" id="linkPinned" ${l.pinned ? 'checked' : ''} />
        Pinned
      </label>
    </div>
  `;

  const footer = `
    <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-nd btn-nd-primary" onclick="submitLinkForm(${isEdit ? `'${l.id}'` : 'null'})">
      <i class="bi bi-${isEdit ? 'check' : 'plus'}"></i> ${isEdit ? 'Save Changes' : 'Add Link'}
    </button>
  `;

  createModal({ title: isEdit ? '✏️ Edit Link' : '🔗 Add Link', content, footer });

  // Auto-fill title from URL
  document.getElementById('linkUrl')?.addEventListener('blur', async () => {
    const urlInput = document.getElementById('linkUrl');
    const titleInput = document.getElementById('linkTitle');
    if (urlInput.value && !titleInput.value) {
      try {
        const domain = new URL(urlInput.value).hostname.replace('www.', '');
        titleInput.value = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      } catch(e) {}
    }
  });
}

// ══════════════════════════════════════════════════
// SECTION COLLAPSE TOGGLE
// ══════════════════════════════════════════════════
export function sectionCollapseToggle(sectionId) {
  const wrapper = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (wrapper) wrapper.classList.toggle('collapsed');
}

// ══════════════════════════════════════════════════
// SETTINGS DRAWER TOGGLE
// ══════════════════════════════════════════════════
export function toggleSettingsDrawer(open) {
  const drawer = document.getElementById('settingsDrawer');
  if (!drawer) return;
  drawer.classList.toggle('open', open);
  if (open) {
    const closeEl = drawer.querySelector('.settings-close');
    if (closeEl) closeEl.focus();
  }
}

// ══════════════════════════════════════════════════
// VIEW MODE TOGGLE BUTTONS
// ══════════════════════════════════════════════════
export function renderViewModeButtons(current) {
  const btns = document.querySelectorAll('[data-view-mode]');
  btns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewMode === current);
  });
}

// ══════════════════════════════════════════════════
// EXPORT / IMPORT MODAL
// ══════════════════════════════════════════════════
export function openExportModal(links, sections) {
  const content = `
    <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.25rem;">Choose an export format:</p>
    <div class="d-flex flex-column gap-0.75">
      <button class="btn-nd btn-nd-secondary" onclick="exportData('json')" style="justify-content:flex-start;gap:0.75rem;">
        <i class="bi bi-filetype-json" style="color:var(--accent-primary)"></i>
        <div><div style="font-weight:600">JSON</div><div style="font-size:0.75rem;color:var(--text-muted)">Full data backup (re-importable)</div></div>
      </button>
      <button class="btn-nd btn-nd-secondary" onclick="exportData('markdown')" style="justify-content:flex-start;gap:0.75rem;margin-top:0.5rem">
        <i class="bi bi-markdown" style="color:var(--accent-secondary)"></i>
        <div><div style="font-weight:600">Markdown</div><div style="font-size:0.75rem;color:var(--text-muted)">Human-readable link list</div></div>
      </button>
      <button class="btn-nd btn-nd-secondary" onclick="exportData('html')" style="justify-content:flex-start;gap:0.75rem;margin-top:0.5rem">
        <i class="bi bi-filetype-html" style="color:var(--warning)"></i>
        <div><div style="font-weight:600">HTML Bookmarks</div><div style="font-size:0.75rem;color:var(--text-muted)">Import into any browser</div></div>
      </button>
      <button class="btn-nd btn-nd-secondary" onclick="exportData('csv')" style="justify-content:flex-start;gap:0.75rem;margin-top:0.5rem">
        <i class="bi bi-filetype-csv" style="color:var(--success)"></i>
        <div><div style="font-weight:600">CSV</div><div style="font-size:0.75rem;color:var(--text-muted)">Spreadsheet-friendly</div></div>
      </button>
    </div>
  `;
  createModal({ title: '📤 Export Data', content });
}

// ══════════════════════════════════════════════════
// UTILITY HELPERS
// ══════════════════════════════════════════════════
export function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch { return url; }
}

export function safeGetDomain(url) {
  try { return new URL(url).hostname; }
  catch { return ''; }
}

// Confirm dialog
export function confirmDialog(msg, onConfirm) {
  const content = `<p style="color:var(--text-secondary)">${escHtml(msg)}</p>`;
  const footer = `
    <button class="btn-nd btn-nd-secondary" onclick="closeModal('confirmDialog')">Cancel</button>
    <button class="btn-nd btn-nd-danger" id="confirmBtn">Delete</button>
  `;
  createModal({ title: '⚠️ Confirm', content, footer, id: 'confirmDialog' });
  document.getElementById('confirmBtn')?.addEventListener('click', () => {
    closeModal('confirmDialog');
    onConfirm();
  });
}
