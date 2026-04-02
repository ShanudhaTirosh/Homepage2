/**
 * NovaDash 3.0 — ai.js
 * Gemini AI Assistant: chat drawer, streaming, link extraction, suggestions
 */

import { GEMINI_API_URL, GEMINI_API_KEY } from './firebase.js';
import { saveAiChat, getAiChat } from './firestore.js';
import { showToast } from './ui.js';

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let _chatHistory = [];
let _uid = null;
let _userLinks = [];
let _apiKey = GEMINI_API_KEY;
let _isOpen = false;
let _isTyping = false;

const SUGGESTED_PROMPTS = [
  'Suggest tools for web developers',
  'What are the best design resources?',
  'Help me organise my current links',
  'Best productivity apps for 2025',
  'Top resources for learning JavaScript'
];

// ══════════════════════════════════════════════════
// INITIALISE
// ══════════════════════════════════════════════════
export async function initAI(uid, links, userApiKey = null) {
  _uid = uid;
  _userLinks = links;
  if (userApiKey) _apiKey = userApiKey;

  // Load chat history
  if (uid) {
    _chatHistory = await getAiChat(uid);
  }

  renderAIDrawer();
}

export function updateAILinks(links) {
  _userLinks = links;
}

// ══════════════════════════════════════════════════
// DRAWER TOGGLE
// ══════════════════════════════════════════════════
export function toggleAIDrawer(force) {
  const drawer = document.getElementById('aiDrawer');
  if (!drawer) return;
  _isOpen = force !== undefined ? force : !_isOpen;
  drawer.classList.toggle('open', _isOpen);

  if (_isOpen) {
    renderAIDrawer();
    setTimeout(() => {
      document.getElementById('aiInputField')?.focus();
    }, 350);
  }
}

// ══════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════
function renderAIDrawer() {
  const drawer = document.getElementById('aiDrawer');
  if (!drawer) return;

  drawer.innerHTML = `
    <div class="nd-modal-header" style="border-radius:var(--radius-xl) var(--radius-xl) 0 0;flex-shrink:0">
      <div class="nd-modal-title">
        <span style="background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">✨ NovaDash AI</span>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <button class="btn-nd btn-nd-ghost btn-nd-sm btn-nd-icon" onclick="clearAIChat()" title="Clear chat" aria-label="Clear chat">
          <i class="bi bi-trash3"></i>
        </button>
        <button class="nd-modal-close" onclick="toggleAIDrawer(false)" aria-label="Close AI assistant">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <div class="ai-messages" id="aiMessages">
      ${_chatHistory.length === 0 ? renderAIEmptyState() : ''}
      ${_chatHistory.map(msg => renderMessage(msg)).join('')}
    </div>

    <div class="ai-input-row">
      <input 
        type="text" 
        id="aiInputField" 
        placeholder="Ask anything…"
        aria-label="Chat with AI"
        onkeydown="aiInputKeyDown(event)"
        maxlength="1000"
      />
      <button class="btn-nd btn-nd-primary btn-nd-sm" onclick="sendAIMessage()" aria-label="Send message">
        <i class="bi bi-send-fill"></i>
      </button>
    </div>
  `;

  scrollToBottom();
}

function renderAIEmptyState() {
  return `
    <div style="text-align:center;padding:2rem 1rem;">
      <div style="font-size:2.5rem;margin-bottom:0.75rem">✨</div>
      <div style="font-family:var(--font-display);font-weight:700;color:var(--text-primary);font-size:1rem;margin-bottom:0.5rem">
        NovaDash AI
      </div>
      <div style="color:var(--text-muted);font-size:0.82rem;margin-bottom:1.5rem;line-height:1.5">
        Ask me anything — I can suggest links, help you organise your dashboard, or answer questions.
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;text-align:left">
        ${SUGGESTED_PROMPTS.map(p => `
          <button class="btn-nd btn-nd-secondary" style="font-size:0.8rem;justify-content:flex-start;text-align:left"
                  onclick="useSuggestedPrompt('${p.replace(/'/g, "\\'")}')">
            <i class="bi bi-lightning-charge" style="color:var(--accent-primary)"></i> ${p}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  const isUser = msg.role === 'user';
  const links = msg.role === 'assistant' ? extractLinksFromResponse(msg.content) : [];

  return `
    <div class="ai-msg ${isUser ? 'user' : 'assistant'}">
      <div class="ai-msg-avatar" aria-hidden="true">
        ${isUser ? '<i class="bi bi-person-fill"></i>' : '✨'}
      </div>
      <div>
        <div class="ai-msg-bubble">${formatAIResponse(msg.content)}</div>
        ${links.length > 0 ? `
          <div class="ai-link-suggestions">
            ${links.map(l => `
              <span class="ai-link-pill" onclick="aiAddLink('${escAttr(l.title)}', '${escAttr(l.url)}')"
                    title="Add '${escAttr(l.title)}' to dashboard">
                <i class="bi bi-plus-circle"></i> ${l.title}
              </span>
            `).join('')}
            ${links.length > 1 ? `
              <span class="ai-link-pill" onclick="aiAddAllLinks(${JSON.stringify(links).replace(/"/g, '&quot;')})"
                    style="background:var(--accent-gradient);color:var(--text-on-accent);border:none">
                <i class="bi bi-plus-circle-dotted"></i> Add All
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTypingIndicator() {
  return `
    <div class="ai-msg assistant" id="aiTypingIndicator">
      <div class="ai-msg-avatar" aria-hidden="true">✨</div>
      <div class="ai-msg-bubble">
        <div class="ai-typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════════════
export async function sendAIMessage(text) {
  const input = document.getElementById('aiInputField');
  const userText = text || input?.value?.trim();
  if (!userText || _isTyping) return;

  if (input) input.value = '';

  // Validate API key
  if (!_apiKey || _apiKey === 'YOUR_GEMINI_API_KEY') {
    showToast('Please set your Gemini API key in Settings → AI', 'warning', 5000);
    return;
  }

  // Add user message
  const userMsg = { role: 'user', content: userText };
  _chatHistory.push(userMsg);

  // Re-render with user message + typing indicator
  const messagesEl = document.getElementById('aiMessages');
  if (messagesEl) {
    messagesEl.innerHTML = _chatHistory.map(m => renderMessage(m)).join('') + renderTypingIndicator();
    scrollToBottom();
  }

  _isTyping = true;

  try {
    const responseText = await callGemini(_chatHistory, _userLinks, _apiKey);

    // Remove typing indicator
    document.getElementById('aiTypingIndicator')?.remove();

    const assistantMsg = { role: 'assistant', content: responseText };
    _chatHistory.push(assistantMsg);

    // Add rendered message
    if (messagesEl) {
      const msgEl = document.createElement('div');
      msgEl.innerHTML = renderMessage(assistantMsg);
      messagesEl.appendChild(msgEl.firstElementChild);
      scrollToBottom();
    }

    // Persist chat
    if (_uid) await saveAiChat(_uid, _chatHistory);

  } catch (err) {
    document.getElementById('aiTypingIndicator')?.remove();
    const errMsg = { role: 'assistant', content: `Sorry, I ran into an error: ${err.message}` };
    _chatHistory.push(errMsg);
    if (messagesEl) {
      const msgEl = document.createElement('div');
      msgEl.innerHTML = renderMessage(errMsg);
      messagesEl.appendChild(msgEl.firstElementChild);
      scrollToBottom();
    }
    showToast('AI request failed. Check your API key.', 'error');
  } finally {
    _isTyping = false;
  }
}

export function aiInputKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
}

export async function useSuggestedPrompt(prompt) {
  const input = document.getElementById('aiInputField');
  if (input) input.value = prompt;
  await sendAIMessage(prompt);
}

export function clearAIChat() {
  _chatHistory = [];
  if (_uid) saveAiChat(_uid, []);
  renderAIDrawer();
}

// ══════════════════════════════════════════════════
// GEMINI API CALL
// ══════════════════════════════════════════════════
async function callGemini(history, userLinks, apiKey) {
  const systemInstruction = `You are NovaDash AI, a helpful assistant built into a personal browser dashboard.
The user currently has these links saved: ${JSON.stringify(userLinks.slice(0, 30).map(l => l.title))}.
When suggesting websites, always format them as [Title](URL) so they can be added to the dashboard.
Be concise, friendly, and practical. Keep responses under 300 words.`;

  // Gemini uses "user" / "model" roles
  const contents = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
}

// ══════════════════════════════════════════════════
// LINK EXTRACTION
// ══════════════════════════════════════════════════
export function extractLinksFromResponse(text) {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const links = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push({ title: match[1], url: match[2] });
  }
  return links;
}

// Opens the add link modal pre-filled (calls into app.js via global)
export function aiAddLink(title, url) {
  if (window.openAddLinkFromAI) {
    window.openAddLinkFromAI(title, url);
  } else {
    showToast(`Opening add link for: ${title}`, 'info', 2000);
  }
}

export function aiAddAllLinks(links) {
  if (window.openAddLinkFromAI) {
    links.forEach((l, i) => setTimeout(() => window.openAddLinkFromAI(l.title, l.url), i * 200));
    showToast(`Added ${links.length} links to add queue`, 'success', 3000);
  }
}

// ══════════════════════════════════════════════════
// FORMAT RESPONSE (basic markdown → HTML)
// ══════════════════════════════════════════════════
function formatAIResponse(text) {
  if (!text) return '';
  return text
    // Links: [title](url) → styled anchor
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary)">$1</a>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^[•\-\*]\s+(.+)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul style="margin:0.5rem 0;padding-left:1rem">$1</ul>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>')
    // Code inline
    .replace(/`([^`]+)`/g, '<code style="background:var(--glass-bg);padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin:0.5rem 0">')
    .replace(/\n/g, '<br>');
}

// ══════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════
function scrollToBottom() {
  const el = document.getElementById('aiMessages');
  if (el) el.scrollTop = el.scrollHeight;
}

function escAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
