/**
 * NovaDash 3.0 — widgets.js
 * All widget logic: Clock, Weather, Pomodoro, Countdown, Habits, RSS, Quotes
 */

import { showToast } from './ui.js';
import {
  markHabitComplete, unmarkHabitComplete, addHabit, deleteHabit,
  addCountdown, deleteCountdown, addRssFeed, deleteRssFeed,
  calcStreak, todayStr
} from './firestore.js';

// ══════════════════════════════════════════════════
// CLOCK WIDGET
// ══════════════════════════════════════════════════
let clockInterval = null;

export function initClockWidget() {
  const el = document.getElementById('widgetClock');
  if (!el) return;
  el.style.display = 'block';
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }
}

export function destroyClockWidget() {
  clearInterval(clockInterval);
  const el = document.getElementById('widgetClock');
  if (el) el.style.display = 'none';
}

// ══════════════════════════════════════════════════
// WEATHER WIDGET (Open-Meteo — free, no key needed)
// ══════════════════════════════════════════════════
let weatherRefreshInterval = null;

export async function initWeatherWidget(location = '') {
  const el = document.getElementById('widgetWeather');
  if (!el) return;
  el.style.display = 'block';
  setWeatherLoading();

  try {
    let lat, lon, locName = location;

    if (!location) {
      // Use IP geolocation (no key required)
      const geo = await fetch('https://ipapi.co/json/');
      const geoData = await geo.json();
      lat = geoData.latitude;
      lon = geoData.longitude;
      locName = `${geoData.city}, ${geoData.country_code}`;
    } else {
      // Geocode the location name
      const geocode = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      const geoData = await geocode.json();
      if (!geoData.results?.[0]) throw new Error('Location not found');
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
      locName = `${geoData.results[0].name}, ${geoData.results[0].country_code}`;
    }

    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`
    );
    const wData = await weather.json();
    const cw = wData.current_weather;

    renderWeather(cw.temperature, cw.windspeed, cw.weathercode, locName);

    clearInterval(weatherRefreshInterval);
    weatherRefreshInterval = setInterval(() => initWeatherWidget(location), 15 * 60 * 1000);

  } catch (e) {
    console.error('Weather error:', e);
    renderWeatherError();
  }
}

function setWeatherLoading() {
  const temp = document.getElementById('weatherTemp');
  const icon = document.getElementById('weatherIcon');
  const desc = document.getElementById('weatherDesc');
  if (temp) temp.textContent = '--°';
  if (icon) icon.textContent = '⏳';
  if (desc) desc.textContent = 'Loading...';
}

function renderWeather(temp, wind, code, location) {
  const { emoji, desc } = weatherCodeToEmoji(code);
  const tempEl = document.getElementById('weatherTemp');
  const iconEl = document.getElementById('weatherIcon');
  const descEl = document.getElementById('weatherDesc');
  const locEl  = document.getElementById('weatherLocation');
  if (tempEl) tempEl.textContent = `${Math.round(temp)}°C`;
  if (iconEl) iconEl.textContent = emoji;
  if (descEl) descEl.textContent = desc;
  if (locEl)  locEl.textContent  = location;
}

function renderWeatherError() {
  const iconEl = document.getElementById('weatherIcon');
  const descEl = document.getElementById('weatherDesc');
  if (iconEl) iconEl.textContent = '❓';
  if (descEl) descEl.textContent = 'Set location in settings';
}

function weatherCodeToEmoji(code) {
  if (code === 0)             return { emoji: '☀️',  desc: 'Clear sky' };
  if (code <= 2)              return { emoji: '⛅',  desc: 'Partly cloudy' };
  if (code === 3)             return { emoji: '☁️',  desc: 'Overcast' };
  if (code <= 49)             return { emoji: '🌫️', desc: 'Foggy' };
  if (code <= 57)             return { emoji: '🌧️', desc: 'Drizzle' };
  if (code <= 67)             return { emoji: '🌧️', desc: 'Rain' };
  if (code <= 77)             return { emoji: '🌨️', desc: 'Snow' };
  if (code <= 82)             return { emoji: '🌦️', desc: 'Rain showers' };
  if (code <= 84)             return { emoji: '🌨️', desc: 'Snow showers' };
  if (code <= 99)             return { emoji: '⛈️',  desc: 'Thunderstorm' };
  return { emoji: '🌡️', desc: 'Unknown' };
}

export function destroyWeatherWidget() {
  clearInterval(weatherRefreshInterval);
  const el = document.getElementById('widgetWeather');
  if (el) el.style.display = 'none';
}

// ══════════════════════════════════════════════════
// POMODORO WIDGET
// ══════════════════════════════════════════════════
const pomodoroState = {
  mode: 'work',   // 'work' | 'short_break' | 'long_break'
  running: false,
  timeLeft: 25 * 60,
  sessionCount: 0,
  settings: { work: 25, shortBreak: 5, longBreak: 15 },
  interval: null,
  audioCtx: null
};

export function initPomodoroWidget(settings = {}) {
  const el = document.getElementById('widgetPomodoro');
  if (!el) return;
  el.style.display = 'block';
  pomodoroState.settings = { ...pomodoroState.settings, ...settings };
  pomodoroState.timeLeft = pomodoroState.settings.work * 60;
  renderPomodoro();
}

function renderPomodoro() {
  const timeEl    = document.getElementById('pomodoroTime');
  const labelEl   = document.getElementById('pomodoroLabel');
  const sessionEl = document.getElementById('pomodoroSessions');
  const ring      = document.getElementById('pomodoroRing');
  const startBtn  = document.getElementById('pomodoroStartBtn');

  const total = getCurrentPomoDuration() * 60;
  const fraction = pomodoroState.timeLeft / total;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - fraction);

  const mins = Math.floor(pomodoroState.timeLeft / 60);
  const secs = pomodoroState.timeLeft % 60;

  if (timeEl) timeEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

  if (ring) {
    const progress = ring.querySelector('.ring-progress');
    if (progress) {
      progress.style.strokeDasharray = circumference;
      progress.style.strokeDashoffset = offset;
      // Color: red=work, green=break
      progress.style.stroke = pomodoroState.mode === 'work'
        ? 'var(--danger)' : 'var(--success)';
    }
    const track = ring.querySelector('.ring-track');
    if (track) track.style.strokeDasharray = circumference;
  }

  const labels = { work: 'Work Session', short_break: 'Short Break', long_break: 'Long Break' };
  if (labelEl) labelEl.textContent = labels[pomodoroState.mode] || 'Work';
  if (sessionEl) sessionEl.textContent = `Session ${pomodoroState.sessionCount + 1} · ${pomodoroState.sessionCount} done`;
  if (startBtn) {
    startBtn.innerHTML = pomodoroState.running
      ? '<i class="bi bi-pause-fill"></i> Pause'
      : '<i class="bi bi-play-fill"></i> Start';
  }
}

export function pomodoroToggle() {
  if (pomodoroState.running) {
    clearInterval(pomodoroState.interval);
    pomodoroState.running = false;
  } else {
    pomodoroState.running = true;
    pomodoroState.interval = setInterval(() => {
      pomodoroState.timeLeft--;
      if (pomodoroState.timeLeft <= 0) {
        pomodoroSessionEnd();
      }
      renderPomodoro();
    }, 1000);
  }
  renderPomodoro();
}

export function pomodoroReset() {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  pomodoroState.timeLeft = getCurrentPomoDuration() * 60;
  renderPomodoro();
}

function pomodoroSessionEnd() {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  pomodoroPlayBeep();
  pomodoroNotify();

  if (pomodoroState.mode === 'work') {
    pomodoroState.sessionCount++;
    // Long break after every 4 sessions
    pomodoroState.mode = (pomodoroState.sessionCount % 4 === 0) ? 'long_break' : 'short_break';
  } else {
    pomodoroState.mode = 'work';
  }

  pomodoroState.timeLeft = getCurrentPomoDuration() * 60;
  renderPomodoro();
}

function getCurrentPomoDuration() {
  const map = {
    work: pomodoroState.settings.work,
    short_break: pomodoroState.settings.shortBreak,
    long_break: pomodoroState.settings.longBreak
  };
  return map[pomodoroState.mode] || 25;
}

function pomodoroPlayBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch(e) {}
}

function pomodoroNotify() {
  const labels = { work: 'Work session ended!', short_break: 'Short break over!', long_break: 'Long break over!' };
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🍅 NovaDash Pomodoro', {
      body: labels[pomodoroState.mode],
      icon: 'assets/icons/icon-192.png'
    });
  }
  showToast(`🍅 ${labels[pomodoroState.mode]}`, 'info', 4000);
}

export function requestPomodoroNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ══════════════════════════════════════════════════
// COUNTDOWN WIDGET
// ══════════════════════════════════════════════════
let countdownInterval = null;
let _countdowns = [];
let _countdownIndex = 0;

export function initCountdownWidget(countdowns) {
  const el = document.getElementById('widgetCountdown');
  if (!el || !countdowns.length) { if (el) el.style.display = 'none'; return; }
  el.style.display = 'block';
  _countdowns = countdowns;
  _countdownIndex = 0;
  updateCountdownDisplay();
  clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdownDisplay, 1000);
}

function updateCountdownDisplay() {
  if (!_countdowns.length) return;
  const countdown = _countdowns[_countdownIndex];
  if (!countdown) return;

  const target = countdown.targetDate?.toDate ? countdown.targetDate.toDate() : new Date(countdown.targetDate);
  const now = new Date();
  const diff = target - now;

  const emojiEl = document.getElementById('countdownEmoji');
  const titleEl = document.getElementById('countdownTitle');
  const valueEl = document.getElementById('countdownValue');
  const dateEl  = document.getElementById('countdownDate');

  if (emojiEl) emojiEl.textContent = countdown.emoji || '⏳';
  if (titleEl) titleEl.textContent = countdown.title || '';
  if (dateEl)  dateEl.textContent = target.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  if (diff <= 0) {
    if (valueEl) valueEl.textContent = '🎉 Today!';
    if (window.launchConfetti) window.launchConfetti({ count: 60, duration: 3000 });
  } else {
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (valueEl) valueEl.textContent = days > 0
      ? `${days}d ${hours}h ${mins}m`
      : `${hours}h ${mins}m`;
  }
}

export function countdownNext() {
  _countdownIndex = (_countdownIndex + 1) % _countdowns.length;
  updateCountdownDisplay();
}

// ══════════════════════════════════════════════════
// HABIT STRIP
// ══════════════════════════════════════════════════
let _habits = [];
let _habitUid = null;

export function initHabitStrip(habits, uid) {
  _habits = habits;
  _habitUid = uid;
  renderHabitStrip();
}

export function renderHabitStrip() {
  const strip = document.getElementById('habitStrip');
  if (!strip) return;

  if (!_habits.length) { strip.style.display = 'none'; return; }
  strip.style.display = 'block';

  const today = todayStr();
  const done  = _habits.filter(h => h.completions?.[today]).length;
  const total = _habits.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const inner = strip.querySelector('.habit-strip-inner') || strip;

  let html = `<span class="habit-strip-summary">Today · <strong style="color:var(--text-primary)">${done}/${total}</strong> done · ${pct}%</span>`;

  _habits.forEach(habit => {
    const isDone = !!habit.completions?.[today];
    html += `
      <div class="habit-chip ${isDone ? 'done' : ''}" 
           onclick="toggleHabit('${habit.id}')"
           title="${isDone ? 'Mark incomplete' : 'Mark complete'}"
           role="checkbox"
           aria-checked="${isDone}"
           tabindex="0">
        <span>${habit.emoji || '✅'}</span>
        <span>${habit.name}</span>
        <span class="habit-check">${isDone ? '✓' : '○'}</span>
      </div>
    `;
  });

  html += `<button class="habit-chip" onclick="openAddHabitModal()" aria-label="Add new habit" style="border-style:dashed">+ New Habit</button>`;

  const innerEl = strip.querySelector('.habit-strip-inner');
  if (innerEl) innerEl.innerHTML = html;

  // Celebrate if all done
  if (done === total && total > 0 && !strip.dataset.celebrated) {
    strip.dataset.celebrated = 'true';
    if (window.launchConfetti) window.launchConfetti({ count: 80, duration: 3000 });
    showToast('🎉 All habits done for today! Amazing!', 'success', 4000);
  } else if (done < total) {
    delete strip.dataset.celebrated;
  }
}

export async function toggleHabit(habitId) {
  if (!_habitUid) return;
  const today  = todayStr();
  const habit  = _habits.find(h => h.id === habitId);
  if (!habit) return;

  const isDone = !!habit.completions?.[today];

  try {
    if (isDone) {
      await unmarkHabitComplete(_habitUid, habitId, today);
      habit.completions[today] = false;
    } else {
      await markHabitComplete(_habitUid, habitId, today);
      if (!habit.completions) habit.completions = {};
      habit.completions[today] = true;
    }
    renderHabitStrip();
  } catch(e) {
    showToast('Failed to update habit', 'error');
  }
}

// ══════════════════════════════════════════════════
// RSS FEED WIDGET
// ══════════════════════════════════════════════════
const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
let _rssFeeds = [];
let _rssFeedIndex = 0;
const _rssCache = {};

export async function initRssTicker(feeds) {
  const ticker = document.getElementById('rssTicker');
  if (!feeds.length || !ticker) return;

  _rssFeeds = feeds;
  ticker.classList.add('visible');

  await fetchAndRenderTicker(feeds[0]);
}

async function fetchAndRenderTicker(feed) {
  const cacheKey = feed.url;
  let items = _rssCache[cacheKey];

  if (!items) {
    try {
      const res = await fetch(`${RSS_PROXY}${encodeURIComponent(feed.url)}&count=20`);
      const data = await res.json();
      items = (data.items || []).slice(0, 20);
      _rssCache[cacheKey] = items;
    } catch(e) {
      items = [];
    }
  }

  const track = document.querySelector('.rss-ticker-items');
  if (!track || !items.length) return;

  const itemsHtml = [...items, ...items].map(item =>
    `<span class="rss-ticker-item" onclick="window.open('${item.link}','_blank','noopener')">${item.title}</span>`
  ).join('');

  track.innerHTML = itemsHtml;
}

export async function initRssFeedWidget(feeds, container) {
  if (!container || !feeds.length) return;

  const feed = feeds[_rssFeedIndex];
  const cacheKey = feed.url;
  let items = _rssCache[cacheKey];

  if (!items) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem">Loading feed...</div>';
    try {
      const res = await fetch(`${RSS_PROXY}${encodeURIComponent(feed.url)}&count=8`);
      const data = await res.json();
      items = (data.items || []).slice(0, 8);
      _rssCache[cacheKey] = items;
    } catch(e) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem">Failed to load feed.</div>';
      return;
    }
  }

  container.innerHTML = `
    <div class="rss-feed-header" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
      <i class="bi bi-rss" style="color:var(--accent-primary);font-size:0.8rem"></i>
      <span style="font-size:0.8rem;font-weight:600;color:var(--text-secondary)">${feed.name}</span>
      ${feeds.length > 1 ? `<button class="btn-nd btn-nd-ghost btn-nd-sm" style="margin-left:auto;padding:2px 8px;font-size:0.7rem" onclick="rssNextFeed()">Next ›</button>` : ''}
    </div>
    ${items.map(item => {
      const age = timeAgo(new Date(item.pubDate));
      return `<div class="rss-item">
        <span class="rss-item-title" onclick="window.open('${item.link}','_blank','noopener')" title="${item.title}">${item.title.slice(0, 80)}${item.title.length > 80 ? '…' : ''}</span>
        <span class="rss-item-age">${age}</span>
      </div>`;
    }).join('')}
  `;
}

export function rssNextFeed(widgetContainerId) {
  _rssFeedIndex = (_rssFeedIndex + 1) % _rssFeeds.length;
  const container = document.getElementById(widgetContainerId || 'rssFeedContent');
  if (container) initRssFeedWidget(_rssFeeds, container);
}

// ══════════════════════════════════════════════════
// QUOTES WIDGET
// ══════════════════════════════════════════════════
let _lastQuoteTime = 0;

export async function initQuotesWidget() {
  const el = document.getElementById('widgetQuotes');
  if (!el) return;
  el.style.display = 'block';
  await fetchQuote();
}

export async function fetchQuote() {
  const quoteEl  = document.getElementById('quoteText');
  const authorEl = document.getElementById('quoteAuthor');
  if (!quoteEl) return;

  // Cache: don't re-fetch within 10 minutes
  const now = Date.now();
  if (now - _lastQuoteTime < 10 * 60 * 1000) return;

  try {
    // ZenQuotes API (CORS-friendly)
    const res  = await fetch('https://zenquotes.io/api/random');
    const data = await res.json();
    const [{ q: quote, a: author }] = data;
    quoteEl.textContent  = `"${quote}"`;
    if (authorEl) authorEl.textContent = `— ${author}`;
    _lastQuoteTime = now;
  } catch(e) {
    quoteEl.textContent = '"The best way to predict the future is to invent it."';
    if (authorEl) authorEl.textContent = '— Alan Kay';
  }
}

// ══════════════════════════════════════════════════
// WIDGET ZONE RENDER
// ══════════════════════════════════════════════════
export function renderWidgetZone(workspace) {
  const zone = document.getElementById('widgetZone');
  if (!zone) return;

  const w = workspace?.widgetsEnabled || {};
  zone.innerHTML = '';

  if (w.clock) zone.innerHTML += `
    <div class="widget widget-clock" id="widgetClock">
      <div class="clock-time" id="clockTime">00:00:00</div>
      <div class="clock-date" id="clockDate"></div>
    </div>`;

  if (w.weather) zone.innerHTML += `
    <div class="widget widget-weather" id="widgetWeather">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div class="weather-icon" id="weatherIcon">⏳</div>
        <div>
          <div class="weather-temp" id="weatherTemp">--°C</div>
          <div class="weather-desc" id="weatherDesc">Loading...</div>
          <div class="weather-location" id="weatherLocation"></div>
        </div>
      </div>
    </div>`;

  if (w.pomodoro) zone.innerHTML += `
    <div class="widget widget-pomodoro" id="widgetPomodoro">
      <div class="pomodoro-ring">
        <svg width="90" height="90" viewBox="0 0 90 90" id="pomodoroRing">
          <circle class="ring-track" cx="45" cy="45" r="40" stroke-dasharray="251.2" stroke-dashoffset="0"/>
          <circle class="ring-progress" cx="45" cy="45" r="40" stroke-dasharray="251.2" stroke-dashoffset="0"/>
        </svg>
        <div class="pomodoro-time-display" id="pomodoroTime">25:00</div>
      </div>
      <div class="pomodoro-label" id="pomodoroLabel">Work Session</div>
      <div class="d-flex gap-2 justify-content-center">
        <button class="btn-nd btn-nd-primary btn-nd-sm" id="pomodoroStartBtn" onclick="pomodoroToggle()">
          <i class="bi bi-play-fill"></i> Start
        </button>
        <button class="btn-nd btn-nd-secondary btn-nd-sm" onclick="pomodoroReset()">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
      <div class="pomodoro-session-count" id="pomodoroSessions">Session 1</div>
    </div>`;

  if (w.countdown) zone.innerHTML += `
    <div class="widget widget-countdown" id="widgetCountdown" style="display:none">
      <div style="font-size:1.5rem;margin-bottom:0.3rem" id="countdownEmoji">⏳</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.2rem" id="countdownTitle"></div>
      <div class="countdown-value" id="countdownValue">--</div>
      <div class="countdown-date" id="countdownDate"></div>
      <button class="btn-nd btn-nd-ghost btn-nd-sm mt-2" onclick="countdownNext()">Next ›</button>
    </div>`;

  if (w.quotes) zone.innerHTML += `
    <div class="widget widget-quotes" id="widgetQuotes">
      <div style="font-size:0.75rem;letter-spacing:0.08em;color:var(--accent-primary);text-transform:uppercase;margin-bottom:0.5rem;font-weight:700;">✨ Quote</div>
      <div class="quote-text" id="quoteText">Loading...</div>
      <div class="quote-author" id="quoteAuthor"></div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn-nd btn-nd-ghost btn-nd-sm" onclick="fetchQuote()" aria-label="Refresh quote">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn-nd btn-nd-ghost btn-nd-sm" onclick="copyQuote()" aria-label="Copy quote">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>
    </div>`;

  if (w.rss) zone.innerHTML += `
    <div class="widget widget-rss" id="widgetRss" style="min-width:280px;max-width:360px">
      <div id="rssFeedContent">
        <div style="color:var(--text-muted);font-size:0.8rem">Loading RSS feed...</div>
      </div>
    </div>`;
}

// Copy quote to clipboard
export function copyQuote() {
  const text = document.getElementById('quoteText')?.textContent;
  const author = document.getElementById('quoteAuthor')?.textContent;
  if (text) {
    navigator.clipboard?.writeText(`${text} ${author || ''}`).then(() => {
      showToast('Quote copied!', 'success', 2000);
    });
  }
}

// ══════════════════════════════════════════════════
// NOTES WIDGET RENDER
// ══════════════════════════════════════════════════
export function renderNotesWidget(notes, uid, wsId) {
  const container = document.getElementById('notesWidgetContainer');
  if (!container) return;

  if (!notes.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:1.5rem">
        <div class="empty-state-icon" style="font-size:1.5rem">📝</div>
        <div class="empty-state-desc">No notes yet</div>
        <button class="btn-nd btn-nd-primary btn-nd-sm mt-2" onclick="openAddNoteModal()">+ Add Note</button>
      </div>`;
    return;
  }

  const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  container.innerHTML = `
    <div class="notes-grid">
      ${sorted.map(note => `
        <div class="note-card ${note.pinned ? 'pinned' : ''}" 
             onclick="openEditNoteModal('${note.id}')"
             style="${note.color ? `border-left: 3px solid ${note.color}` : ''}">
          ${note.pinned ? '<div style="font-size:0.7rem;color:var(--accent-primary);margin-bottom:0.25rem">📌 Pinned</div>' : ''}
          ${note.title ? `<div class="note-title">${escHtml(note.title)}</div>` : ''}
          <div class="note-content" id="noteContent_${note.id}">${renderMarkdown(note.content || '')}</div>
          ${note.tags?.length ? `<div style="margin-top:0.5rem;display:flex;gap:0.3rem;flex-wrap:wrap">${note.tags.map(t => `<span class="link-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      `).join('')}
      <div class="note-card" onclick="openAddNoteModal()" style="display:flex;align-items:center;justify-content:center;opacity:0.5;border-style:dashed;cursor:pointer;min-height:100px">
        <div style="text-align:center">
          <div style="font-size:1.5rem">+</div>
          <div style="font-size:0.75rem">New Note</div>
        </div>
      </div>
    </div>`;
}

function renderMarkdown(text) {
  if (window.marked) {
    try { return window.marked.parse(text, { breaks: true }); } catch(e) {}
  }
  // Basic fallback
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ══════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════
function timeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 60)     return `${Math.floor(diff)}s`;
  if (diff < 3600)   return `${Math.floor(diff/60)}m`;
  if (diff < 86400)  return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
