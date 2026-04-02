/**
 * NovaDash 3.0 — search.js
 * Spotlight-style command palette with fuzzy search
 */

import { showToast } from './ui.js';

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let _links = [];
let _sections = [];
let _workspaces = [];
let _notes = [];
let _isOpen = false;
let _activeIndex = 0;
let _results = [];

// Commands registry
const COMMANDS = [
  { id: 'add-link',       label: 'Add new link',           icon: 'bi-plus-circle',        kbd: 'Ctrl+N',    action: () => window.openAddLinkModal?.() },
  { id: 'add-section',    label: 'New section',            icon: 'bi-folder-plus',        kbd: 'Ctrl+⇧+N',  action: () => window.openAddSectionModal?.() },
  { id: 'settings',       label: 'Open settings',          icon: 'bi-gear',               kbd: 'Ctrl+,',    action: () => window.openSettings?.() },
  { id: 'analytics',      label: 'View analytics',         icon: 'bi-bar-chart',          kbd: '',          action: () => window.openAnalytics?.() },
  { id: 'ai',             label: 'Toggle AI assistant',    icon: 'bi-stars',              kbd: 'Ctrl+⇧+A',  action: () => window.toggleAIDrawer?.() },
  { id: 'toggle-theme',   label: 'Toggle dark/light mode', icon: 'bi-circle-half',        kbd: 'Ctrl+⇧+L',  action: () => window.toggleTheme?.() },
  { id: 'export',         label: 'Export data',            icon: 'bi-download',           kbd: 'Ctrl+E',    action: () => window.openExportModal?.() },
  { id: 'shortcuts',      label: 'Keyboard shortcuts',     icon: 'bi-keyboard',           kbd: '?',         action: () => window.showShortcuts?.() },
  { id: 'health-check',   label: 'Check link health',      icon: 'bi-heart-pulse',        kbd: '',          action: () => window.runHealthCheck?.() },
  { id: 'add-note',       label: 'Add new note',           icon: 'bi-sticky',             kbd: '',          action: () => window.openAddNoteModal?.() },
  { id: 'add-habit',      label: 'Add new habit',          icon: 'bi-check-circle',       kbd: '',          action: () => window.openAddHabitModal?.() },
  { id: 'add-countdown',  label: 'Add countdown',          icon: 'bi-hourglass-split',    kbd: '',          action: () => window.openAddCountdownModal?.() },
  { id: 'add-rss',        label: 'Add RSS feed',           icon: 'bi-rss',                kbd: '',          action: () => window.openAddRssModal?.() },
  { id: 'new-workspace',  label: 'New workspace',          icon: 'bi-layout-split',       kbd: '',          action: () => window.openNewWorkspaceModal?.() },
  { id: 'import',         label: 'Import bookmarks',       icon: 'bi-upload',             kbd: '',          action: () => window.openImportModal?.() }
];

// ══════════════════════════════════════════════════
// DATA UPDATERS
// ══════════════════════════════════════════════════
export function updateSearchData({ links, sections, workspaces, notes }) {
  if (links)      _links      = links;
  if (sections)   _sections   = sections;
  if (workspaces) _workspaces = workspaces;
  if (notes)      _notes      = notes;
}

// ══════════════════════════════════════════════════
// OPEN / CLOSE
// ══════════════════════════════════════════════════
export function openCommandPalette() {
  const cp = document.getElementById('commandPalette');
  if (!cp) return;
  _isOpen = true;
  _activeIndex = 0;
  cp.classList.add('visible');
  const input = document.getElementById('cpInput');
  if (input) { input.value = ''; input.focus(); }
  renderResults('');
}

export function closeCommandPalette() {
  const cp = document.getElementById('commandPalette');
  if (!cp) return;
  _isOpen = false;
  cp.classList.remove('visible');
}

export function isCommandPaletteOpen() { return _isOpen; }

// ══════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════
function fuzzyScore(str, query) {
  str   = str.toLowerCase();
  query = query.toLowerCase();
  if (!query) return 1;
  if (str === query) return 100;
  if (str.startsWith(query)) return 80;
  if (str.includes(query)) return 60;

  // Character-by-character fuzzy
  let score = 0, idx = 0;
  for (const char of query) {
    const pos = str.indexOf(char, idx);
    if (pos === -1) return -1;
    score += 1 / (pos - idx + 1);
    idx = pos + 1;
  }
  return score * 40;
}

function searchAll(query) {
  const results = [];
  const q = query.toLowerCase().trim();

  // Recent links (show when empty)
  if (!q) {
    const recent = [..._links]
      .sort((a, b) => (b.lastClickedAt?.seconds || 0) - (a.lastClickedAt?.seconds || 0))
      .slice(0, 5);

    if (recent.length) {
      results.push({ group: 'RECENT', items: recent.map(l => ({
        type: 'link',
        id: l.id,
        label: l.title,
        sub: shortUrl(l.url),
        icon: 'bi-link-45deg',
        data: l
      }))});
    }

    results.push({ group: 'COMMANDS', items: COMMANDS.slice(0, 6).map(c => ({
      type: 'command',
      id: c.id,
      label: c.label,
      sub: c.kbd,
      icon: c.icon,
      action: c.action
    }))});

    return results;
  }

  // Commands
  const matchedCmds = COMMANDS.map(c => ({
    score: Math.max(fuzzyScore(c.label, q), fuzzyScore(c.id, q)),
    item: { type: 'command', id: c.id, label: c.label, sub: c.kbd, icon: c.icon, action: c.action }
  })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (matchedCmds.length) {
    results.push({ group: 'COMMANDS', items: matchedCmds.slice(0, 4).map(x => x.item) });
  }

  // Links
  const matchedLinks = _links.map(l => {
    const score = Math.max(
      fuzzyScore(l.title || '', q),
      fuzzyScore(l.url || '', q),
      fuzzyScore((l.tags || []).join(' '), q),
      fuzzyScore(l.description || '', q)
    ) + (l.clickCount || 0) * 0.01;
    return { score, item: l };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (matchedLinks.length) {
    const section = (id) => _sections.find(s => s.id === id)?.name || '';
    results.push({ group: 'LINKS', items: matchedLinks.slice(0, 8).map(x => ({
      type: 'link',
      id: x.item.id,
      label: x.item.title,
      sub: `${shortUrl(x.item.url)} · ${section(x.item.sectionId)}`,
      icon: 'bi-link-45deg',
      data: x.item
    }))});
  }

  // Sections
  const matchedSections = _sections.map(s => ({
    score: fuzzyScore(s.name || '', q),
    item: s
  })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (matchedSections.length) {
    results.push({ group: 'SECTIONS', items: matchedSections.slice(0, 3).map(x => ({
      type: 'section',
      id: x.item.id,
      label: x.item.name,
      sub: `${_links.filter(l => l.sectionId === x.item.id).length} links`,
      icon: x.item.icon || 'bi-grid',
      data: x.item
    }))});
  }

  // Notes
  const matchedNotes = _notes.map(n => ({
    score: Math.max(fuzzyScore(n.title || '', q), fuzzyScore(n.content || '', q)),
    item: n
  })).filter(x => x.score > 0);

  if (matchedNotes.length) {
    results.push({ group: 'NOTES', items: matchedNotes.slice(0, 3).map(x => ({
      type: 'note',
      id: x.item.id,
      label: x.item.title || 'Untitled Note',
      sub: (x.item.content || '').slice(0, 60),
      icon: 'bi-sticky',
      data: x.item
    }))});
  }

  // Workspaces
  const matchedWs = _workspaces.map(w => ({
    score: fuzzyScore(w.name || '', q),
    item: w
  })).filter(x => x.score > 0);

  if (matchedWs.length) {
    results.push({ group: 'WORKSPACES', items: matchedWs.slice(0, 3).map(x => ({
      type: 'workspace',
      id: x.item.id,
      label: `${x.item.emoji || '🏠'} ${x.item.name}`,
      sub: 'Switch to workspace',
      icon: 'bi-layers',
      data: x.item
    }))});
  }

  return results;
}

// ══════════════════════════════════════════════════
// RENDER RESULTS
// ══════════════════════════════════════════════════
export function renderResults(query) {
  const container = document.getElementById('cpResults');
  if (!container) return;

  const grouped = searchAll(query);
  _results = grouped.flatMap(g => g.items);
  _activeIndex = 0;

  if (_results.length === 0) {
    container.innerHTML = `
      <div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem">
        <i class="bi bi-search" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;opacity:0.5"></i>
        No results for "<strong style="color:var(--text-secondary)">${escHtml(query)}</strong>"
      </div>`;
    return;
  }

  let html = '';
  let globalIdx = 0;

  grouped.forEach(({ group, items }) => {
    html += `<div class="cp-group-label">${group}</div>`;
    items.forEach(item => {
      const isActive = globalIdx === _activeIndex;
      html += `
        <div class="cp-result-item ${isActive ? 'active' : ''}" 
             data-idx="${globalIdx}"
             onclick="cpSelectIndex(${globalIdx})"
             onmouseenter="cpSetActive(${globalIdx})"
             role="option"
             aria-selected="${isActive}">
          <div class="cp-result-icon">
            ${item.type === 'link' ? renderFavicon(item.data?.url) : `<i class="bi ${item.icon}"></i>`}
          </div>
          <div style="flex:1;min-width:0">
            <div class="cp-result-label">${escHtml(item.label)}</div>
            ${item.sub ? `<div class="cp-result-sub">${escHtml(item.sub)}</div>` : ''}
          </div>
          ${item.sub && item.type === 'command' && item.sub ? `<span class="cp-result-kbd">${escHtml(item.sub)}</span>` : ''}
          ${item.type === 'link' ? `<i class="bi bi-arrow-up-right" style="color:var(--text-muted);font-size:0.75rem;flex-shrink:0"></i>` : ''}
        </div>
      `;
      globalIdx++;
    });
  });

  container.innerHTML = html;
}

function renderFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" width="18" height="18" 
                 style="border-radius:4px" 
                 onerror="this.outerHTML='<i class=\\'bi bi-link-45deg\\'></i>'" alt="">`;
  } catch {
    return '<i class="bi bi-link-45deg"></i>';
  }
}

// ══════════════════════════════════════════════════
// KEYBOARD NAVIGATION
// ══════════════════════════════════════════════════
export function cpKeyDown(e) {
  if (e.key === 'Escape') {
    closeCommandPalette();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _activeIndex = Math.min(_activeIndex + 1, _results.length - 1);
    updateActiveItem();
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    _activeIndex = Math.max(_activeIndex - 1, 0);
    updateActiveItem();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    cpExecute(_results[_activeIndex]);
    return;
  }
}

export function cpSetActive(idx) {
  _activeIndex = idx;
  updateActiveItem();
}

export function cpSelectIndex(idx) {
  _activeIndex = idx;
  cpExecute(_results[idx]);
}

function updateActiveItem() {
  document.querySelectorAll('.cp-result-item').forEach((el, i) => {
    const isActive = i === _activeIndex;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-selected', isActive);
    if (isActive) el.scrollIntoView({ block: 'nearest' });
  });
}

function cpExecute(item) {
  if (!item) return;
  closeCommandPalette();

  if (item.type === 'command') {
    item.action?.();
    return;
  }

  if (item.type === 'link') {
    const link = item.data;
    window.open(link.url, link.openInNewTab !== false ? '_blank' : '_self', 'noopener,noreferrer');
    return;
  }

  if (item.type === 'section') {
    // Scroll to section
    const el = document.querySelector(`[data-section-id="${item.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (item.type === 'note') {
    window.openEditNoteModal?.(item.id);
    return;
  }

  if (item.type === 'workspace') {
    window.switchWorkspace?.(item.id);
    return;
  }
}

// ══════════════════════════════════════════════════
// INPUT HANDLER
// ══════════════════════════════════════════════════
export function cpInput(e) {
  const query = e.target?.value || '';
  renderResults(query);
}

// ══════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════
function shortUrl(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url || ''; }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
