/**
 * NovaDash 3.0 — app.js
 * Main application controller — wires all modules together
 */

import { auth, db } from './firebase.js';
import {
  initAuthGuard, getUser, handleSignOut,
  initOnboarding, onboardNext, onboardBack,
  onboardSelectTheme, onboardSelectTemplate, onboardToggleWidget,
  renderUserNav
} from './auth.js';
import {
  addLink, updateLink, deleteLink, bulkDeleteLinks, bulkMoveLinks,
  addSection, updateSection, deleteSection, duplicateSection,
  addNote, updateNote, deleteNote,
  addHabit, markHabitComplete, unmarkHabitComplete,
  addCountdown, deleteCountdown,
  addRssFeed, deleteRssFeed,
  subscribeLinks, subscribeSections, subscribeWorkspaces,
  subscribeNotes, subscribeHabits, subscribeCountdowns, subscribeRssFeeds,
  reorderLinks, reorderSections,
  recordLinkClick, updateLinkHealth,
  setProfile, getProfile,
  SECTION_TEMPLATES, todayStr
} from './firestore.js';
import {
  updateData, setUid, setTrackingEnabled, setViewMode,
  showToast, createModal, closeModal, confirmDialog,
  openAddLinkModal, escHtml, sectionCollapseToggle,
  toggleSettingsDrawer, getSelectedLinks, clearSelection,
  setTagFilter, renderTagFilterBar, openExportModal,
  initContextMenu, getContextMenuLinkId
} from './ui.js';
import {
  renderWidgetZone, initClockWidget, initWeatherWidget,
  initPomodoroWidget, initCountdownWidget, initHabitStrip,
  initRssTicker, initRssFeedWidget, initQuotesWidget,
  fetchQuote, copyQuote, pomodoroToggle, pomodoroReset,
  countdownNext, toggleHabit, renderNotesWidget
} from './widgets.js';
import { initAI, toggleAIDrawer, sendAIMessage, aiInputKeyDown, useSuggestedPrompt, clearAIChat, aiAddLink, aiAddAllLinks } from './ai.js';
import { updateSearchData, openCommandPalette, closeCommandPalette, cpKeyDown, cpInput, cpSetActive, cpSelectIndex, renderResults } from './search.js';
import { openAnalyticsModal, exportData } from './analytics.js';
import { initShortcuts, showShortcutsModal, pushUndo, runHealthCheckModal } from './shortcuts.js';
import { registerServiceWorker, initInstallPrompt, initNetworkMonitor, installPWA, dismissInstallBanner } from './pwa.js';

// Sortable
const Sortable = window.Sortable;

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let _uid = null;
let _workspaces = [];
let _activeWorkspace = null;
let _sections = [];
let _links = [];
let _notes = [];
let _habits = [];
let _countdowns = [];
let _rssFeeds = [];
let _settings = { trackClicks: true };
let _viewMode = 'grid';

// Unsub functions
const _unsubs = [];

// ══════════════════════════════════════════════════
// BOOTSTRAP
// ══════════════════════════════════════════════════
async function boot() {
  // Register SW + PWA install prompt
  registerServiceWorker();
  initInstallPrompt();
  initNetworkMonitor();

  // Context menu
  initContextMenu();

  // Expose globals for HTML onclick attributes
  exposeGlobals();

  // Auth guard (waits for user)
  const { user, profile } = await initAuthGuard();
  _uid = user.uid;
  setUid(_uid);

  renderUserNav(user, profile);

  // Start workspace subscription
  _unsubs.push(subscribeWorkspaces(_uid, onWorkspacesUpdate));

  // Init shortcuts
  initShortcuts({
    openCommandPalette,
    addLink: () => openAddLinkModal(null),
    addSection: openAddSectionModal,
    openSettings,
    toggleAI: () => toggleAIDrawer(),
    toggleTheme,
    openWorkspaceSwitcher: () => document.querySelector('.ws-btn')?.click(),
    exportData: () => openExportModal(_links, _sections),
    closeAll: closeAll,
    switchWorkspaceByIndex: (idx) => _workspaces[idx] && switchWorkspace(_workspaces[idx].id)
  });

  // Keyboard events for command palette
  document.addEventListener('keydown', cpKeyDown);

  // Show onboarding if needed
  if (!profile.onboardingComplete) {
    initOnboarding(_uid, profile.activeWorkspaceId);
  }
}

// ══════════════════════════════════════════════════
// WORKSPACE MANAGEMENT
// ══════════════════════════════════════════════════
async function onWorkspacesUpdate(workspaces) {
  _workspaces = workspaces;
  renderWorkspaceSwitcher();
  updateSearchData({ workspaces });

  // Load active workspace
  const profile = await getProfile(_uid);
  const activeId = profile?.activeWorkspaceId || workspaces[0]?.id;
  if (activeId && _activeWorkspace?.id !== activeId) {
    await switchWorkspace(activeId);
  }
}

async function switchWorkspace(wsId) {
  const ws = _workspaces.find(w => w.id === wsId);
  if (!ws) return;

  _activeWorkspace = ws;

  // Update profile
  await setProfile(_uid, { activeWorkspaceId: wsId });

  // Apply theme
  document.documentElement.dataset.theme = ws.theme || 'midnight';

  // Apply custom CSS
  let customStyle = document.getElementById('custom-css');
  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = 'custom-css';
    document.head.appendChild(customStyle);
  }
  customStyle.textContent = ws.customCSS || '';

  // Unsubscribe old listeners
  _unsubs.forEach(fn => { try { fn(); } catch(e) {} });
  _unsubs.length = 0;

  // Re-subscribe for this workspace
  _unsubs.push(
    subscribeLinks(_uid, wsId, onLinksUpdate),
    subscribeSections(_uid, wsId, onSectionsUpdate),
    subscribeNotes(_uid, wsId, onNotesUpdate),
    subscribeHabits(_uid, wsId, onHabitsUpdate),
    subscribeCountdowns(_uid, wsId, onCountdownsUpdate),
    subscribeRssFeeds(_uid, wsId, onRssFeedsUpdate),
    subscribeWorkspaces(_uid, onWorkspacesUpdate)
  );

  // View mode
  _viewMode = ws.layout || 'grid';
  setViewMode(_viewMode);

  // Render widget zone
  renderWidgetZone(ws);

  // Init enabled widgets
  const w = ws.widgetsEnabled || {};
  if (w.clock)   initClockWidget();
  if (w.weather) initWeatherWidget(ws.weatherLocation || '');
  if (w.pomodoro) initPomodoroWidget();
  if (w.quotes)  initQuotesWidget();

  // Init AI
  await initAI(_uid, _links, null);

  // Update workspace switcher UI
  renderWorkspaceSwitcher();
}

function renderWorkspaceSwitcher() {
  const wsSwitcher = document.getElementById('wsSwitcherDropdown');
  if (!wsSwitcher) return;

  const active = _activeWorkspace;
  wsSwitcher.innerHTML = `
    ${_workspaces.map(ws => `
      <div class="ws-dropdown-item ${ws.id === active?.id ? 'active' : ''}" onclick="switchWorkspace('${ws.id}')">
        <span>${ws.emoji || '🏠'}</span>
        <span style="flex:1">${escHtml(ws.name)}</span>
        ${ws.id === active?.id ? '<i class="bi bi-check2" style="color:var(--accent-primary)"></i>' : ''}
      </div>
    `).join('')}
    <div class="ws-dropdown-divider"></div>
    <div class="ws-dropdown-item" onclick="openNewWorkspaceModal()">
      <i class="bi bi-plus-circle"></i> New Workspace
    </div>
    <div class="ws-dropdown-item" onclick="openManageWorkspacesModal()">
      <i class="bi bi-gear"></i> Manage Workspaces
    </div>
  `;

  const btn = document.getElementById('wsBtn');
  if (btn && active) {
    btn.innerHTML = `${active.emoji || '🏠'} ${escHtml(active.name)} <i class="bi bi-chevron-down" style="font-size:0.65rem"></i>`;
  }
}

// ══════════════════════════════════════════════════
// DATA UPDATE HANDLERS (onSnapshot callbacks)
// ══════════════════════════════════════════════════
function onLinksUpdate(links) {
  _links = links;
  updateData(_links, _sections, _activeWorkspace);
  updateSearchData({ links });
  initAI(_uid, _links);
}

function onSectionsUpdate(sections) {
  _sections = sections;
  updateData(_links, _sections, _activeWorkspace);
  updateSearchData({ sections });
  initSortable();
}

function onNotesUpdate(notes) {
  _notes = notes;
  updateSearchData({ notes });
  renderNotesWidget(_notes, _uid, _activeWorkspace?.id);
}

function onHabitsUpdate(habits) {
  _habits = habits;
  initHabitStrip(habits, _uid);

  const widgetsEnabled = _activeWorkspace?.widgetsEnabled || {};
  if (widgetsEnabled.habits) {
    const habitModalGrid = document.getElementById('habitModalGrid');
    if (habitModalGrid) renderHabitModal();
  }
}

function onCountdownsUpdate(countdowns) {
  _countdowns = countdowns;
  const widgetsEnabled = _activeWorkspace?.widgetsEnabled || {};
  if (widgetsEnabled.countdown) initCountdownWidget(countdowns);
}

function onRssFeedsUpdate(feeds) {
  _rssFeeds = feeds;
  const widgetsEnabled = _activeWorkspace?.widgetsEnabled || {};
  if (widgetsEnabled.rss && feeds.length) {
    initRssTicker(feeds);
    const rssContent = document.getElementById('rssFeedContent');
    if (rssContent) initRssFeedWidget(feeds, rssContent);
  }
}

// ══════════════════════════════════════════════════
// DRAG & DROP (SortableJS)
// ══════════════════════════════════════════════════
function initSortable() {
  // Sort sections
  const sectContainer = document.getElementById('sectionsContainer');
  if (sectContainer && Sortable) {
    Sortable.create(sectContainer, {
      handle: '.section-icon',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        const orderedIds = [...sectContainer.querySelectorAll('[data-section-id]')]
          .map(el => el.dataset.sectionId);
        try { await reorderSections(_uid, orderedIds); }
        catch(e) { showToast('Failed to reorder sections', 'error'); }
      }
    });
  }

  // Sort links within each section
  document.querySelectorAll('[id^="linksGrid_"]').forEach(grid => {
    if (Sortable) {
      Sortable.create(grid, {
        group: 'links',
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        chosenClass: 'sortable-chosen',
        onEnd: async (evt) => {
          const newSectionId = evt.to.dataset.sectionId;
          const linkId = evt.item.dataset.linkId;

          if (evt.from !== evt.to) {
            // Moved to different section
            await updateLink(_uid, linkId, { sectionId: newSectionId });
          }

          // Reorder all links in section
          const orderedLinks = [...evt.to.querySelectorAll('[data-link-id]')]
            .map((el, idx) => ({ id: el.dataset.linkId, order: idx }));
          try { await reorderLinks(_uid, orderedLinks); }
          catch(e) { showToast('Failed to reorder links', 'error'); }
        }
      });
    }
  });
}

// ══════════════════════════════════════════════════
// LINK CRUD
// ══════════════════════════════════════════════════
async function submitLinkForm(editId = null) {
  const title  = document.getElementById('linkTitle')?.value?.trim();
  const url    = document.getElementById('linkUrl')?.value?.trim();
  const sectionId = document.getElementById('linkSection')?.value;
  const iconType  = document.getElementById('linkIconType')?.value || 'favicon';
  const iconValue = document.getElementById('linkIconValue')?.value?.trim() || '';
  const description = document.getElementById('linkDescription')?.value?.trim() || '';
  const tagsRaw = document.getElementById('linkTags')?.value || '';
  const openInNewTab = document.getElementById('linkNewTab')?.checked ?? true;
  const pinned = document.getElementById('linkPinned')?.checked ?? false;

  if (!title || !url) { showToast('Title and URL are required', 'warning'); return; }
  if (!url.startsWith('http')) { showToast('URL must start with http:// or https://', 'warning'); return; }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const wsId = _activeWorkspace?.id;

  const linkData = {
    title, url, sectionId: sectionId || _sections[0]?.id || '',
    iconType, iconValue, description, tags,
    openInNewTab, pinned, workspaceId: wsId,
    order: _links.filter(l => l.sectionId === sectionId).length
  };

  try {
    if (editId) {
      await updateLink(_uid, editId, linkData);
      showToast('Link updated ✓', 'success');
    } else {
      const ref = await addLink(_uid, linkData);
      showToast('Link added ✓', 'success');
      pushUndo({
        description: `Add link "${title}"`,
        undo: () => deleteLink(_uid, ref.id)
      });
    }
    closeModal();
  } catch(e) {
    console.error(e);
    showToast('Failed to save link', 'error');
  }
}

// ══════════════════════════════════════════════════
// SECTION CRUD
// ══════════════════════════════════════════════════
function openAddSectionModal() {
  const content = `
    <div class="nd-form-group">
      <label class="nd-label" for="sectionName">Section Name</label>
      <input id="sectionName" class="nd-input" type="text" placeholder="e.g. Work Tools" maxlength="60" required />
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="sectionIcon">Icon (Bootstrap icon class)</label>
      <input id="sectionIcon" class="nd-input" type="text" placeholder="bi-folder (leave blank for default)" />
    </div>
    <div class="nd-form-group">
      <label class="nd-label" for="sectionDescription">Description (optional)</label>
      <input id="sectionDescription" class="nd-input" type="text" placeholder="Short description" maxlength="100" />
    </div>
    <div style="margin-top:1rem">
      <div style="font-size:0.8rem;font-weight:500;color:var(--text-secondary);margin-bottom:0.75rem">Or start from a template:</div>
      <div class="template-grid" style="grid-template-columns:repeat(3,1fr)">
        ${Object.entries(SECTION_TEMPLATES).map(([key, tpl]) => `
          <div class="template-option" data-template="${key}" onclick="selectSectionTemplate('${key}')">
            <div style="font-size:1.2rem">${tpl.name.split(' ')[0]}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem">${tpl.links.length} links</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const footer = `
    <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-nd btn-nd-primary" onclick="submitSectionForm()">
      <i class="bi bi-plus"></i> Add Section
    </button>
  `;

  createModal({ title: '📂 New Section', content, footer });
}

let _selectedTemplate = null;

window.selectSectionTemplate = function(key) {
  _selectedTemplate = key;
  document.querySelectorAll('.template-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.template === key);
  });
  const tpl = SECTION_TEMPLATES[key];
  if (tpl) {
    const nameEl = document.getElementById('sectionName');
    const iconEl = document.getElementById('sectionIcon');
    if (nameEl && !nameEl.value) nameEl.value = tpl.name;
    if (iconEl && !iconEl.value) iconEl.value = tpl.icon || '';
  }
};

async function submitSectionForm() {
  const name = document.getElementById('sectionName')?.value?.trim();
  if (!name) { showToast('Section name is required', 'warning'); return; }

  const icon = document.getElementById('sectionIcon')?.value?.trim() || 'bi-grid-3x3-gap-fill';
  const description = document.getElementById('sectionDescription')?.value?.trim() || '';
  const wsId = _activeWorkspace?.id;

  try {
    const ref = await addSection(_uid, {
      name, icon, description,
      order: _sections.length,
      workspaceId: wsId,
      collapsed: false,
      color: ''
    });

    // If template selected, add template links
    if (_selectedTemplate && SECTION_TEMPLATES[_selectedTemplate]) {
      const tpl = SECTION_TEMPLATES[_selectedTemplate];
      for (let i = 0; i < tpl.links.length; i++) {
        await addLink(_uid, {
          ...tpl.links[i],
          sectionId: ref.id,
          workspaceId: wsId,
          order: i,
          openInNewTab: true,
          pinned: false,
          tags: [],
          description: ''
        });
      }
      showToast(`Section created with ${tpl.links.length} links ✓`, 'success');
    } else {
      showToast('Section created ✓', 'success');
    }

    _selectedTemplate = null;
    pushUndo({
      description: `Create section "${name}"`,
      undo: () => deleteSection(_uid, ref.id)
    });
    closeModal();
  } catch(e) {
    console.error(e);
    showToast('Failed to create section', 'error');
  }
}

// ══════════════════════════════════════════════════
// CONTEXT MENU ACTIONS (exposed to window)
// ══════════════════════════════════════════════════
function setupContextMenuActions() {
  window.ctxOpenLink = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (link) window.open(link.url, '_blank', 'noopener');
  };

  window.ctxEditLink = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (link) openAddLinkModal(link.sectionId, link);
  };

  window.ctxCopyUrl = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (link) {
      navigator.clipboard?.writeText(link.url)
        .then(() => showToast('URL copied!', 'success', 2000));
    }
  };

  window.ctxMoveToSection = function() {
    const linkId = getContextMenuLinkId();
    const link = _links.find(l => l.id === linkId);
    if (!link) return;
    const content = `
      <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem">Move "<strong style="color:var(--text-primary)">${escHtml(link.title)}</strong>" to:</p>
      <div style="display:flex;flex-direction:column;gap:0.375rem">
        ${_sections.map(s => `
          <div class="ws-dropdown-item ${s.id === link.sectionId ? 'active' : ''}" onclick="ctxDoMoveLink('${link.id}','${s.id}')">
            <i class="bi ${s.icon || 'bi-folder'}"></i> ${escHtml(s.name)}
          </div>
        `).join('')}
      </div>
    `;
    createModal({ title: '📂 Move to Section', content, id: 'moveSectionModal' });
  };

  window.ctxDoMoveLink = async function(linkId, sectionId) {
    closeModal('moveSectionModal');
    try {
      await updateLink(_uid, linkId, { sectionId });
      showToast('Link moved ✓', 'success');
    } catch(e) { showToast('Failed to move link', 'error'); }
  };

  window.ctxTogglePin = async function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (!link) return;
    try {
      await updateLink(_uid, link.id, { pinned: !link.pinned });
      showToast(link.pinned ? 'Unpinned' : 'Pinned ✓', 'success', 2000);
    } catch(e) { showToast('Failed to update', 'error'); }
  };

  window.ctxDeleteLink = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (!link) return;
    confirmDialog(`Delete "${link.title}"? This cannot be undone.`, async () => {
      const snapshot = { ...link };
      try {
        await deleteLink(_uid, link.id);
        showToast(`"${link.title}" deleted. Ctrl+Z to undo.`, 'info', 4000);
        pushUndo({
          description: `Delete link "${link.title}"`,
          undo: () => addLink(_uid, { ...snapshot, createdAt: undefined, updatedAt: undefined })
        });
      } catch(e) { showToast('Failed to delete link', 'error'); }
    });
  };

  window.ctxAddTag = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (!link) return;
    const content = `
      <div class="nd-form-group">
        <label class="nd-label">Tags (comma-separated)</label>
        <input id="ctxTagInput" class="nd-input" type="text" value="${escHtml((link.tags||[]).join(', '))}" placeholder="work, daily, dev" />
      </div>
    `;
    createModal({
      title: '🏷️ Edit Tags',
      content,
      footer: `
        <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-nd btn-nd-primary" onclick="saveCtxTags('${link.id}')">Save Tags</button>
      `,
      id: 'ctxTagModal'
    });
  };

  window.saveCtxTags = async function(linkId) {
    const tags = document.getElementById('ctxTagInput')?.value
      .split(',').map(t => t.trim()).filter(Boolean) || [];
    closeModal('ctxTagModal');
    try {
      await updateLink(_uid, linkId, { tags });
      showToast('Tags updated ✓', 'success');
    } catch(e) { showToast('Failed to update tags', 'error'); }
  };

  window.ctxViewStats = function() {
    const link = _links.find(l => l.id === getContextMenuLinkId());
    if (!link) return;
    const lastClicked = link.lastClickedAt?.seconds
      ? new Date(link.lastClickedAt.seconds * 1000).toLocaleDateString()
      : 'Never';
    createModal({
      title: `📊 Stats: ${link.title}`,
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="analytics-chart-wrap" style="text-align:center">
            <div style="font-size:2rem;font-weight:800;color:var(--text-primary);font-family:var(--font-display)">${link.clickCount || 0}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Total Clicks</div>
          </div>
          <div class="analytics-chart-wrap" style="text-align:center">
            <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${lastClicked}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Last Clicked</div>
          </div>
        </div>
        <div style="margin-top:1rem;font-size:0.8rem;color:var(--text-muted)">
          URL: <a href="${link.url}" target="_blank" style="color:var(--accent-primary)">${link.url}</a>
        </div>
        ${link.isAlive === false ? '<div style="margin-top:0.5rem;color:var(--danger);font-size:0.8rem">⚠️ Last health check: dead link</div>' : ''}
      `
    });
  };
}

// ══════════════════════════════════════════════════
// SETTINGS DRAWER
// ══════════════════════════════════════════════════
function openSettings() {
  toggleSettingsDrawer(true);
  renderSettingsDrawer();
}

function renderSettingsDrawer() {
  const drawer = document.getElementById('settingsDrawer');
  if (!drawer) return;

  const ws = _activeWorkspace || {};

  drawer.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;padding:1.25rem 1.5rem;border-bottom:1px solid var(--glass-border);flex-shrink:0">
      <div style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;flex:1">⚙️ Settings</div>
      <button class="nd-modal-close settings-close" onclick="toggleSettingsDrawer(false)" aria-label="Close settings">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div style="overflow-y:auto;flex:1;padding:1.25rem 1.5rem">
      <!-- Theme -->
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">Appearance</div>
      <div class="nd-form-group">
        <label class="nd-label">Theme</label>
        <div class="theme-selector-grid" style="grid-template-columns:repeat(4,1fr);margin:0.5rem 0">
          ${[
            {key:'midnight',label:'🌑 Midnight'},{key:'ocean',label:'🌊 Ocean'},
            {key:'forest',label:'🌿 Forest'},{key:'sunset',label:'🌇 Sunset'},
            {key:'rose',label:'🌹 Rose'},{key:'ice',label:'🧊 Ice'},
            {key:'neon',label:'💜 Neon'},{key:'carbon',label:'⚙️ Carbon'},
            {key:'paper',label:'📄 Paper'},{key:'latte',label:'☕ Latte'},
            {key:'sakura',label:'🌸 Sakura'},{key:'custom',label:'🎨 Custom'}
          ].map(t => `
            <div class="theme-option ${ws.theme === t.key ? 'selected' : ''}" 
                 data-theme="${t.key}" onclick="setTheme('${t.key}')"
                 style="font-size:0.7rem;padding:0.5rem">
              ${t.label}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Layout -->
      <div class="nd-form-group">
        <label class="nd-label">Layout</label>
        <div style="display:flex;gap:0.375rem">
          ${['grid','list','compact'].map(m => `
            <button class="btn-nd ${_viewMode === m ? 'btn-nd-primary' : 'btn-nd-secondary'} btn-nd-sm"
                    onclick="changeViewMode('${m}')">
              <i class="bi bi-${m === 'grid' ? 'grid-3x3-gap' : m === 'list' ? 'list-ul' : 'layout-text-sidebar-reverse'}"></i>
              ${m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          `).join('')}
        </div>
      </div>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Widgets -->
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">Widgets</div>
      ${Object.entries(ws.widgetsEnabled || {}).map(([widget, enabled]) => `
        <label style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;cursor:pointer">
          <span style="font-size:0.875rem;color:var(--text-secondary);text-transform:capitalize">${widget}</span>
          <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleWidget('${widget}', this.checked)"
                 style="accent-color:var(--accent-primary);width:16px;height:16px" />
        </label>
      `).join('')}

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Weather Location -->
      <div class="nd-form-group">
        <label class="nd-label" for="weatherLocInput">Weather Location</label>
        <div style="display:flex;gap:0.5rem">
          <input id="weatherLocInput" class="nd-input" type="text" 
                 value="${escHtml(ws.weatherLocation || '')}" placeholder="City name (leave blank for auto)" />
          <button class="btn-nd btn-nd-secondary btn-nd-sm" onclick="saveWeatherLocation()">Save</button>
        </div>
      </div>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Privacy -->
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">Privacy</div>
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.875rem;color:var(--text-secondary)">
        <input type="checkbox" id="trackClicksToggle" ${_settings.trackClicks ? 'checked' : ''} 
               onchange="setTrackClicks(this.checked)" style="accent-color:var(--accent-primary)" />
        Track link click analytics
      </label>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Custom CSS -->
      <div class="nd-form-group">
        <label class="nd-label">Custom CSS <span style="opacity:0.5;font-size:0.7rem">(Power Users)</span></label>
        <textarea id="customCSSInput" class="nd-textarea" rows="5" placeholder="/* Your custom styles */">${escHtml(ws.customCSS || '')}</textarea>
        <button class="btn-nd btn-nd-secondary btn-nd-sm mt-2" onclick="saveCustomCSS()">Apply CSS</button>
      </div>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- AI -->
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">AI Assistant</div>
      <div class="nd-form-group">
        <label class="nd-label" for="geminiKeyInput">Gemini API Key</label>
        <input id="geminiKeyInput" class="nd-input" type="password" placeholder="Your Gemini API key from aistudio.google.com" />
        <button class="btn-nd btn-nd-secondary btn-nd-sm mt-2" onclick="saveGeminiKey()">Save Key</button>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.375rem">
          Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-primary)">aistudio.google.com</a>
        </div>
      </div>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Data -->
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-primary);margin-bottom:0.75rem">Data</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <button class="btn-nd btn-nd-secondary" onclick="window.openExportModal?.()">
          <i class="bi bi-download"></i> Export Data
        </button>
        <button class="btn-nd btn-nd-secondary" onclick="window.openImportModal?.()">
          <i class="bi bi-upload"></i> Import Bookmarks
        </button>
        <button class="btn-nd btn-nd-secondary" onclick="window.runHealthCheck?.()">
          <i class="bi bi-heart-pulse"></i> Check Link Health
        </button>
        <button class="btn-nd btn-nd-secondary" onclick="window.openAnalytics?.()">
          <i class="bi bi-bar-chart"></i> View Analytics
        </button>
      </div>

      <hr style="border-color:var(--glass-border);margin:1.25rem 0">

      <!-- Sign Out -->
      <button class="btn-nd btn-nd-danger w-100" onclick="handleSignOut()">
        <i class="bi bi-box-arrow-left"></i> Sign Out
      </button>
    </div>
  `;
}

// ══════════════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════════════
function launchConfetti({ count = 80, duration = 3000 } = {}) {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  const colors = ['#7c6ef7','#4ecdc4','#ff6b6b','#ffd93d','#a8e063'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation: confettiFall ${duration/2 + Math.random() * duration/2}ms linear ${Math.random() * duration/3}ms forwards,
                 confettiWiggle ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate;
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration + 1000);
  }
}

// ══════════════════════════════════════════════════
// EXPOSE ALL GLOBALS (for HTML onclick + module use)
// ══════════════════════════════════════════════════
function exposeGlobals() {
  // Auth
  window.handleSignOut         = handleSignOut;

  // Onboarding
  window.onboardNext           = onboardNext;
  window.onboardBack           = onboardBack;
  window.onboardSelectTheme    = onboardSelectTheme;
  window.onboardSelectTemplate = onboardSelectTemplate;
  window.onboardToggleWidget   = onboardToggleWidget;

  // Modals & UI
  window.openAddLinkModal      = openAddLinkModal;
  window.openAddSectionModal   = openAddSectionModal;
  window.submitLinkForm        = submitLinkForm;
  window.submitSectionForm     = submitSectionForm;
  window.closeModal            = closeModal;
  window.sectionCollapseToggle = sectionCollapseToggle;
  window.toggleSettingsDrawer  = toggleSettingsDrawer;
  window.openSettings          = openSettings;
  window.openSectionMenu       = (e, sId) => { /* handled in section actions */ };

  // AI
  window.toggleAIDrawer        = toggleAIDrawer;
  window.sendAIMessage         = sendAIMessage;
  window.aiInputKeyDown        = aiInputKeyDown;
  window.useSuggestedPrompt    = useSuggestedPrompt;
  window.clearAIChat           = clearAIChat;
  window.aiAddLink             = aiAddLink;
  window.aiAddAllLinks         = aiAddAllLinks;

  window.openAddLinkFromAI     = (title, url) => openAddLinkModal(null, { title, url });

  // Search / Command Palette
  window.openCommandPalette    = openCommandPalette;
  window.closeCommandPalette   = closeCommandPalette;
  window.cpInput               = cpInput;
  window.cpKeyDown             = cpKeyDown;
  window.cpSetActive           = cpSetActive;
  window.cpSelectIndex         = cpSelectIndex;

  // Workspaces
  window.switchWorkspace       = switchWorkspace;
  window.openNewWorkspaceModal = openNewWorkspaceModal;
  window.openManageWorkspacesModal = () => {};

  // Tags
  window.setTagFilter          = (tag) => { setTagFilter(tag); };

  // Analytics
  window.openAnalytics         = () => openAnalyticsModal(_uid);
  window.exportData            = (format) => exportData(format, _links, _sections);
  window.openExportModal       = () => openExportModal(_links, _sections);

  // Import
  window.openImportModal       = openImportModal;

  // Shortcuts
  window.showShortcuts         = showShortcutsModal;

  // Bulk
  window.bulkDeleteLinks       = async (ids) => {
    await bulkDeleteLinks(_uid, ids);
    clearSelection();
    showToast(`${ids.length} links deleted`, 'success');
  };
  window.clearSelection        = clearSelection;

  // Health check
  window.runHealthCheck        = () => runHealthCheckModal(_uid, _links, updateLinkHealth);

  // Confetti
  window.launchConfetti        = launchConfetti;

  // Theme
  window.setTheme              = async (theme) => {
    document.documentElement.dataset.theme = theme;
    if (_activeWorkspace) {
      await updateWorkspace(_uid, _activeWorkspace.id, { theme });
      _activeWorkspace.theme = theme;
    }
  };

  // View mode
  window.changeViewMode        = (mode) => {
    _viewMode = mode;
    setViewMode(mode);
    renderSettingsDrawer();
  };

  // Widget toggle
  window.toggleWidget          = async (widget, enabled) => {
    if (!_activeWorkspace) return;
    const widgetsEnabled = { ..._activeWorkspace.widgetsEnabled, [widget]: enabled };
    _activeWorkspace.widgetsEnabled = widgetsEnabled;
    const { updateWorkspace } = await import('./firestore.js');
    await updateWorkspace(_uid, _activeWorkspace.id, { widgetsEnabled });
    renderWidgetZone(_activeWorkspace);
    if (enabled) {
      if (widget === 'clock') initClockWidget();
      if (widget === 'weather') initWeatherWidget(_activeWorkspace.weatherLocation || '');
      if (widget === 'pomodoro') initPomodoroWidget();
      if (widget === 'quotes') initQuotesWidget();
    }
  };

  // Weather location
  window.saveWeatherLocation   = async () => {
    const loc = document.getElementById('weatherLocInput')?.value?.trim() || '';
    if (_activeWorkspace) {
      const { updateWorkspace } = await import('./firestore.js');
      await updateWorkspace(_uid, _activeWorkspace.id, { weatherLocation: loc });
      _activeWorkspace.weatherLocation = loc;
      initWeatherWidget(loc);
      showToast('Weather location saved ✓', 'success');
    }
  };

  // Tracking
  window.setTrackClicks        = (v) => { _settings.trackClicks = v; setTrackingEnabled(v); };

  // Custom CSS
  window.saveCustomCSS         = async () => {
    const css = document.getElementById('customCSSInput')?.value || '';
    const style = document.getElementById('custom-css');
    if (style) style.textContent = css;
    if (_activeWorkspace) {
      const { updateWorkspace } = await import('./firestore.js');
      await updateWorkspace(_uid, _activeWorkspace.id, { customCSS: css });
      showToast('Custom CSS applied ✓', 'success');
    }
  };

  // AI key
  window.saveGeminiKey         = async () => {
    const key = document.getElementById('geminiKeyInput')?.value?.trim();
    if (!key) return;
    await setProfile(_uid, { geminiApiKey: key });
    showToast('API key saved ✓', 'success');
  };

  // Notes
  window.openAddNoteModal      = openAddNoteModal;
  window.openEditNoteModal     = (nId) => {
    const note = _notes.find(n => n.id === nId);
    if (note) openAddNoteModal(note);
  };

  // Habits
  window.toggleHabit           = toggleHabit;
  window.openAddHabitModal     = openAddHabitModal;

  // Countdown
  window.openAddCountdownModal = openAddCountdownModal;
  window.countdownNext         = countdownNext;

  // RSS
  window.openAddRssModal       = openAddRssModal;

  // Pomodoro
  window.pomodoroToggle        = pomodoroToggle;
  window.pomodoroReset         = pomodoroReset;

  // Quotes
  window.fetchQuote            = fetchQuote;
  window.copyQuote             = copyQuote;

  // Toggle theme
  window.toggleTheme           = () => {
    const current = document.documentElement.dataset.theme;
    const lightThemes = ['paper','latte','sakura'];
    const next = lightThemes.includes(current) ? 'midnight' : 'paper';
    window.setTheme(next);
  };

  // PWA
  window.installPWA            = installPWA;
  window.dismissInstallBanner  = dismissInstallBanner;

  // Section open menu
  window.openSectionMenu       = (e, sId) => {
    e.stopPropagation();
    const section = _sections.find(s => s.id === sId);
    if (!section) return;
    createModal({
      title: `📂 ${escHtml(section.name)}`,
      content: `
        <div style="display:flex;flex-direction:column;gap:0.375rem">
          <button class="btn-nd btn-nd-secondary" style="justify-content:flex-start" onclick="closeModal();openAddLinkModal('${sId}')">
            <i class="bi bi-plus-circle"></i> Add Link
          </button>
          <button class="btn-nd btn-nd-secondary" style="justify-content:flex-start" onclick="closeModal();editSection('${sId}')">
            <i class="bi bi-pencil"></i> Edit Section
          </button>
          <button class="btn-nd btn-nd-secondary" style="justify-content:flex-start" onclick="closeModal();duplicateSection('${sId}')">
            <i class="bi bi-copy"></i> Duplicate Section
          </button>
          <button class="btn-nd btn-nd-danger" style="justify-content:flex-start" onclick="closeModal();deleteSection('${sId}')">
            <i class="bi bi-trash3"></i> Delete Section
          </button>
        </div>
      `
    });
  };

  window.editSection = (sId) => {
    const section = _sections.find(s => s.id === sId);
    if (!section) return;
    createModal({
      title: '✏️ Edit Section',
      content: `
        <div class="nd-form-group">
          <label class="nd-label">Section Name</label>
          <input id="editSectionName" class="nd-input" value="${escHtml(section.name)}" />
        </div>
        <div class="nd-form-group">
          <label class="nd-label">Icon class</label>
          <input id="editSectionIcon" class="nd-input" value="${escHtml(section.icon || '')}" placeholder="bi-folder" />
        </div>
      `,
      footer: `
        <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-nd btn-nd-primary" onclick="doEditSection('${sId}')">Save</button>
      `
    });
  };

  window.doEditSection = async (sId) => {
    const name = document.getElementById('editSectionName')?.value?.trim();
    const icon = document.getElementById('editSectionIcon')?.value?.trim();
    if (!name) return;
    closeModal();
    await updateSection(_uid, sId, { name, icon: icon || 'bi-grid-3x3-gap-fill' });
    showToast('Section updated ✓', 'success');
  };

  window.duplicateSection = async (sId) => {
    try {
      await duplicateSection(_uid, sId);
      showToast('Section duplicated ✓', 'success');
    } catch(e) { showToast('Failed to duplicate', 'error'); }
  };

  window.deleteSection = (sId) => {
    const section = _sections.find(s => s.id === sId);
    confirmDialog(
      `Delete section "${section?.name}" and all its links? This cannot be undone.`,
      async () => {
        try {
          await deleteSection(_uid, sId);
          showToast('Section deleted', 'success');
        } catch(e) { showToast('Failed to delete', 'error'); }
      }
    );
  };

  setupContextMenuActions();
}

function closeAll() {
  closeModal();
  closeCommandPalette();
  toggleAIDrawer(false);
  toggleSettingsDrawer(false);
  document.getElementById('contextMenu')?.classList.remove('visible');
  document.querySelectorAll('.ws-dropdown').forEach(d => d.style.display = 'none');
}

// ── New Workspace Modal ──
function openNewWorkspaceModal() {
  if (_workspaces.length >= 10) {
    showToast('Maximum 10 workspaces reached', 'warning');
    return;
  }
  createModal({
    title: '🌌 New Workspace',
    content: `
      <div class="nd-form-group">
        <label class="nd-label">Name</label>
        <input id="wsName" class="nd-input" placeholder="Work, Gaming, Personal..." maxlength="30" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Emoji</label>
        <input id="wsEmoji" class="nd-input" placeholder="🏠" maxlength="2" style="font-size:1.5rem" />
      </div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-nd btn-nd-primary" onclick="createWorkspace()">Create</button>
    `
  });
}

window.createWorkspace = async function() {
  const name  = document.getElementById('wsName')?.value?.trim();
  const emoji = document.getElementById('wsEmoji')?.value?.trim() || '🏠';
  if (!name) { showToast('Name is required', 'warning'); return; }
  closeModal();
  const { addWorkspace } = await import('./firestore.js');
  const ref = await addWorkspace(_uid, {
    name, emoji,
    order: _workspaces.length,
    isDefault: false,
    background: { type: 'gradient', value: 'default' },
    theme: 'midnight',
    accentColor: '#7c6ef7',
    cardStyle: { borderRadius: 14, blurIntensity: 20, shadowOpacity: 0.3 },
    layout: 'grid',
    widgetsEnabled: { clock: true, weather: true, notes: true, ai: true, habits: false, rss: false, pomodoro: false, quotes: true, countdown: false },
    weatherLocation: '', customCSS: '', fontFamily: 'default'
  });
  showToast(`Workspace "${name}" created ✓`, 'success');
  await switchWorkspace(ref.id);
};

// ── Notes Modals ──
function openAddNoteModal(existingNote = null) {
  const n = existingNote || {};
  createModal({
    title: existingNote ? '✏️ Edit Note' : '📝 New Note',
    content: `
      <div class="nd-form-group">
        <label class="nd-label">Title (optional)</label>
        <input id="noteTitle" class="nd-input" placeholder="Note title" value="${escHtml(n.title || '')}" maxlength="100" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Content (Markdown supported)</label>
        <textarea id="noteContent" class="nd-textarea" rows="8" placeholder="Write your note...">${escHtml(n.content || '')}</textarea>
      </div>
      <div style="display:flex;gap:1rem">
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--text-secondary);cursor:pointer">
          <input type="checkbox" id="notePinned" ${n.pinned ? 'checked' : ''} /> Pinned
        </label>
      </div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      ${existingNote ? `<button class="btn-nd btn-nd-danger btn-nd-sm" onclick="deleteNoteConfirm('${n.id}')"><i class="bi bi-trash3"></i></button>` : ''}
      <button class="btn-nd btn-nd-primary" onclick="submitNoteForm(${existingNote ? `'${n.id}'` : 'null'})">
        ${existingNote ? 'Save' : 'Add Note'}
      </button>
    `
  });
}

window.submitNoteForm = async (editId) => {
  const title   = document.getElementById('noteTitle')?.value?.trim() || '';
  const content = document.getElementById('noteContent')?.value || '';
  const pinned  = document.getElementById('notePinned')?.checked || false;
  closeModal();
  try {
    if (editId) {
      await updateNote(_uid, editId, { title, content, pinned });
    } else {
      await addNote(_uid, { title, content, pinned, tags: [], color: '', workspaceId: _activeWorkspace?.id });
    }
    showToast(editId ? 'Note updated ✓' : 'Note added ✓', 'success');
  } catch(e) { showToast('Failed to save note', 'error'); }
};

window.deleteNoteConfirm = (nId) => {
  confirmDialog('Delete this note?', async () => {
    await deleteNote(_uid, nId);
    closeModal();
    showToast('Note deleted', 'success');
  });
};

// ── Habit Modal ──
function openAddHabitModal() {
  createModal({
    title: '✅ New Habit',
    content: `
      <div class="nd-form-group">
        <label class="nd-label">Name</label>
        <input id="habitName" class="nd-input" placeholder="e.g. Drink Water" maxlength="50" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Emoji</label>
        <input id="habitEmoji" class="nd-input" placeholder="💧" maxlength="2" style="font-size:1.5rem" />
      </div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-nd btn-nd-primary" onclick="submitHabitForm()">Add Habit</button>
    `
  });
}

window.submitHabitForm = async () => {
  const name  = document.getElementById('habitName')?.value?.trim();
  const emoji = document.getElementById('habitEmoji')?.value?.trim() || '✅';
  if (!name) { showToast('Name is required', 'warning'); return; }
  closeModal();
  await addHabit(_uid, { name, emoji, color: '#4ecdc4', frequency: 'daily', workspaceId: _activeWorkspace?.id });
  showToast('Habit added ✓', 'success');
};

// ── Countdown Modal ──
function openAddCountdownModal() {
  createModal({
    title: '⏳ New Countdown',
    content: `
      <div class="nd-form-group">
        <label class="nd-label">Title</label>
        <input id="cdTitle" class="nd-input" placeholder="My Birthday" maxlength="50" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Target Date</label>
        <input id="cdDate" class="nd-input" type="date" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Emoji</label>
        <input id="cdEmoji" class="nd-input" placeholder="🎉" maxlength="2" style="font-size:1.5rem" />
      </div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-nd btn-nd-primary" onclick="submitCountdownForm()">Add</button>
    `
  });
}

window.submitCountdownForm = async () => {
  const title = document.getElementById('cdTitle')?.value?.trim();
  const date  = document.getElementById('cdDate')?.value;
  const emoji = document.getElementById('cdEmoji')?.value?.trim() || '⏳';
  if (!title || !date) { showToast('Title and date required', 'warning'); return; }
  closeModal();
  const { Timestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  await addCountdown(_uid, { title, emoji, targetDate: Timestamp.fromDate(new Date(date)), workspaceId: _activeWorkspace?.id });
  showToast('Countdown added ✓', 'success');
};

// ── RSS Feed Modal ──
function openAddRssModal() {
  const PRESETS = [
    { name: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
    { name: 'CSS-Tricks',  url: 'https://css-tricks.com/feed/' },
    { name: 'Dev.to',      url: 'https://dev.to/feed' },
    { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
    { name: 'TechCrunch',  url: 'https://techcrunch.com/feed/' }
  ];
  createModal({
    title: '📡 Add RSS Feed',
    content: `
      <div class="nd-form-group">
        <label class="nd-label">Feed Name</label>
        <input id="rssName" class="nd-input" placeholder="Hacker News" maxlength="50" />
      </div>
      <div class="nd-form-group">
        <label class="nd-label">Feed URL</label>
        <input id="rssUrl" class="nd-input" type="url" placeholder="https://..." />
      </div>
      <div style="margin-top:0.75rem">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.5rem">Quick add:</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.375rem">
          ${PRESETS.map(p => `
            <button class="btn-nd btn-nd-secondary btn-nd-sm" onclick="prefillRss('${escHtml(p.name)}','${escHtml(p.url)}')">${p.name}</button>
          `).join('')}
        </div>
      </div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-nd btn-nd-primary" onclick="submitRssForm()">Add Feed</button>
    `
  });
}

window.prefillRss = (name, url) => {
  const n = document.getElementById('rssName'); if (n) n.value = name;
  const u = document.getElementById('rssUrl');  if (u) u.value = url;
};

window.submitRssForm = async () => {
  const name = document.getElementById('rssName')?.value?.trim();
  const url  = document.getElementById('rssUrl')?.value?.trim();
  if (!name || !url) { showToast('Name and URL required', 'warning'); return; }
  closeModal();
  await addRssFeed(_uid, { name, url, workspaceId: _activeWorkspace?.id });
  showToast('RSS feed added ✓', 'success');
};

// ── Import Modal ──
function openImportModal() {
  createModal({
    title: '📥 Import Bookmarks',
    content: `
      <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem">
        Import links from a browser bookmark HTML file or NovaDash JSON export.
      </p>
      <div class="nd-form-group">
        <label class="nd-label" for="importFile">Select file (.html or .json)</label>
        <input id="importFile" type="file" accept=".html,.json" class="nd-input" style="padding:0.5rem" />
      </div>
      <div id="importPreview" style="margin-top:0.75rem"></div>
    `,
    footer: `
      <button class="btn-nd btn-nd-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-nd btn-nd-primary" onclick="processImport()">Import</button>
    `
  });

  document.getElementById('importFile')?.addEventListener('change', previewImport);
}

async function previewImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const preview = document.getElementById('importPreview');
  if (!preview) return;
  let count = 0;
  if (file.name.endsWith('.html')) {
    const parsed = parseBookmarkHTML(text);
    count = parsed.links.length;
  } else {
    try { const data = JSON.parse(text); count = data.links?.length || 0; } catch(e) {}
  }
  preview.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem">Found <strong style="color:var(--text-primary)">${count}</strong> links to import.</div>`;
}

window.processImport = async () => {
  const file = document.getElementById('importFile')?.files[0];
  if (!file) { showToast('Please select a file', 'warning'); return; }
  closeModal();
  const text = await file.text();
  try {
    let sectionsToCreate = [], linksToCreate = [];
    if (file.name.endsWith('.html')) {
      const parsed = parseBookmarkHTML(text);
      sectionsToCreate = parsed.sections;
      linksToCreate = parsed.links;
    } else {
      const data = JSON.parse(text);
      sectionsToCreate = data.sections || [];
      linksToCreate = data.links || [];
    }

    const wsId = _activeWorkspace?.id;
    const sectionMap = {};

    for (const s of sectionsToCreate) {
      const ref = await addSection(_uid, { name: s.name, icon: 'bi-folder', order: _sections.length, workspaceId: wsId, collapsed: false });
      sectionMap[s.id || s.name] = ref.id;
    }

    let i = 0;
    for (const l of linksToCreate) {
      const sId = sectionMap[l.sectionId] || sectionMap[l.section] || _sections[0]?.id || '';
      await addLink(_uid, { title: l.title, url: l.url, sectionId: sId, workspaceId: wsId, order: i++, iconType: 'favicon', openInNewTab: true, pinned: false, tags: [], description: '' });
    }

    showToast(`✓ Imported ${linksToCreate.length} links`, 'success', 4000);
  } catch(e) {
    console.error('Import error:', e);
    showToast('Import failed — invalid file format', 'error');
  }
};

function parseBookmarkHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections = [];
  const links = [];

  doc.querySelectorAll('DT > H3').forEach(folder => {
    const section = { id: folder.textContent, name: folder.textContent };
    sections.push(section);
    const dl = folder.nextElementSibling;
    if (dl) {
      dl.querySelectorAll('A').forEach(a => {
        links.push({ title: a.textContent, url: a.href, section: folder.textContent });
      });
    }
  });

  // Top-level links without folder
  doc.querySelectorAll('DL > DT > A').forEach(a => {
    links.push({ title: a.textContent, url: a.href, section: '' });
  });

  return { sections, links };
}

// ══════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════
boot().catch(err => {
  console.error('[NovaDash] Boot error:', err);
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:#f0f2ff;text-align:center;gap:1rem;padding:2rem">
      <div style="font-size:3rem">⚠️</div>
      <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:700">Something went wrong</div>
      <div style="color:#5a6380;max-width:400px">${err.message}</div>
      <a href="index.html" style="color:#7c6ef7;font-size:0.9rem">← Back to sign in</a>
    </div>
  `;
});
