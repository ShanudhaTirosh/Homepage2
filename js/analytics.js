/**
 * NovaDash 3.0 — analytics.js
 * Link click tracking, analytics modal, Chart.js bar chart + heatmap
 */

import { getAnalyticsSummary, getTopLinks } from './firestore.js';
import { createModal } from './ui.js';

// ══════════════════════════════════════════════════
// OPEN ANALYTICS MODAL
// ══════════════════════════════════════════════════
export async function openAnalyticsModal(uid) {
  if (!uid) return;

  const content = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem">
      <div style="flex:1">
        <div style="font-size:0.75rem;color:var(--text-muted)">Loading analytics...</div>
      </div>
    </div>

    <!-- Summary stats -->
    <div class="d-flex gap-2 mb-3" id="analyticsStats">
      ${[1,2,3].map(() => `<div class="skeleton" style="height:64px;flex:1;border-radius:var(--radius-md)"></div>`).join('')}
    </div>

    <!-- Bar chart -->
    <div class="analytics-chart-wrap mb-3">
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.75rem">📊 Clicks — Last 14 Days</div>
      <canvas id="analyticsChart" height="120"></canvas>
    </div>

    <!-- Top links -->
    <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.5rem">🏆 Most Clicked Links</div>
    <div id="analyticsTopLinks">
      ${[1,2,3,4,5].map(() => `<div class="skeleton" style="height:32px;margin-bottom:4px;border-radius:var(--radius-sm)"></div>`).join('')}
    </div>

    <!-- Heatmap -->
    <div style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-top:1rem;margin-bottom:0.5rem">📈 Activity Heatmap</div>
    <div id="analyticsHeatmap" style="overflow-x:auto"></div>
  `;

  const modal = createModal({
    title: '📊 My Analytics',
    content,
    id: 'analyticsModal',
    maxWidth: '580px'
  });

  // Load data async
  try {
    const [summary, topLinks] = await Promise.all([
      getAnalyticsSummary(uid, 14),
      getTopLinks(uid, 10)
    ]);

    renderAnalyticsSummary(summary);
    renderAnalyticsChart(summary);
    renderTopLinks(topLinks);
    renderHeatmap(summary);
  } catch(e) {
    console.error('Analytics load error:', e);
  }
}

// ══════════════════════════════════════════════════
// SUMMARY STATS
// ══════════════════════════════════════════════════
function renderAnalyticsSummary(summary) {
  const el = document.getElementById('analyticsStats');
  if (!el) return;

  const totalClicks = summary.reduce((sum, d) => sum + d.total, 0);
  const avgPerDay = summary.length ? Math.round(totalClicks / summary.length) : 0;

  // Find most active day of week
  const byDow = [0,0,0,0,0,0,0];
  summary.forEach(d => {
    const dow = new Date(d.date).getDay();
    byDow[dow] += d.total;
  });
  const maxDow = byDow.indexOf(Math.max(...byDow));
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  el.innerHTML = `
    <div class="analytics-chart-wrap" style="flex:1;text-align:center">
      <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);font-family:var(--font-display)">${totalClicks}</div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Total Clicks</div>
    </div>
    <div class="analytics-chart-wrap" style="flex:1;text-align:center">
      <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);font-family:var(--font-display)">${avgPerDay}</div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Avg / Day</div>
    </div>
    <div class="analytics-chart-wrap" style="flex:1;text-align:center">
      <div style="font-size:1rem;font-weight:700;color:var(--text-primary);font-family:var(--font-display)">${days[maxDow]}</div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Most Active</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════
// BAR CHART (Chart.js)
// ══════════════════════════════════════════════════
let _chartInstance = null;

function renderAnalyticsChart(summary) {
  const canvas = document.getElementById('analyticsChart');
  if (!canvas || !window.Chart) return;

  // Destroy existing
  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }

  const labels = summary.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  });
  const data = summary.map(d => d.total);

  // Get accent color from CSS
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-primary').trim() || '#7c6ef7';

  _chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data,
        backgroundColor: `${accent}66`,
        borderColor: accent,
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: accent
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'var(--bg-elevated)',
          titleColor: 'var(--text-primary)',
          bodyColor: 'var(--text-secondary)',
          borderColor: 'var(--glass-border)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'var(--text-muted)', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'var(--text-muted)', font: { size: 10 }, stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════
// TOP LINKS
// ══════════════════════════════════════════════════
function renderTopLinks(links) {
  const el = document.getElementById('analyticsTopLinks');
  if (!el || !links.length) {
    if (el) el.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:0.5rem">No click data yet — start clicking your links!</div>';
    return;
  }

  const max = links[0]?.clickCount || 1;

  el.innerHTML = links.slice(0, 8).map((link, i) => `
    <div class="analytics-top-link">
      <span class="analytics-top-link-rank">${i+1}</span>
      <div style="width:24px;height:24px;flex-shrink:0">
        <img src="https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=32" 
             width="20" height="20" style="border-radius:4px;margin-top:2px"
             onerror="this.outerHTML='<i class=\\'bi bi-link-45deg\\'></i>'" alt="">
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(link.title)}</div>
        <div class="analytics-top-link-bar">
          <div class="analytics-top-link-fill" style="width:${Math.round((link.clickCount / max) * 100)}%"></div>
        </div>
      </div>
      <span class="analytics-top-link-count">${link.clickCount}</span>
    </div>
  `).join('');

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll('.analytics-top-link-fill').forEach(el => {
      el.style.transition = 'width 0.8s ease';
    });
  }, 50);
}

// ══════════════════════════════════════════════════
// ACTIVITY HEATMAP (GitHub-style, 7 rows × N cols)
// ══════════════════════════════════════════════════
function renderHeatmap(summary) {
  const el = document.getElementById('analyticsHeatmap');
  if (!el) return;

  // Build a 7-day grid for the last 14 days
  const maxClicks = Math.max(...summary.map(d => d.total), 1);
  const dowLabels = ['S','M','T','W','T','F','S'];

  // Group by week
  const weeks = [];
  let week = [];
  summary.forEach((d, i) => {
    const dow = new Date(d.date).getDay();
    if (i === 0 && dow > 0) {
      // Fill leading empty days
      for (let j = 0; j < dow; j++) week.push(null);
    }
    week.push(d);
    if (week.length === 7 || i === summary.length - 1) {
      weeks.push([...week]);
      week = [];
    }
  });

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-primary').trim() || '#7c6ef7';

  let html = `<div style="display:flex;gap:0.25rem;align-items:flex-start">`;
  // DOW labels
  html += `<div style="display:flex;flex-direction:column;gap:2px;margin-top:18px">`;
  dowLabels.forEach(d => {
    html += `<div style="width:12px;height:12px;font-size:0.6rem;color:var(--text-muted);line-height:12px;text-align:center">${d}</div>`;
  });
  html += `</div>`;

  weeks.forEach(week => {
    html += `<div style="display:flex;flex-direction:column;gap:2px">`;
    // Month label (first of column)
    const firstDay = week.find(d => d);
    const monthLabel = firstDay ? new Date(firstDay.date).toLocaleDateString([], { month: 'short' }) : '';
    html += `<div style="height:14px;font-size:0.6rem;color:var(--text-muted);white-space:nowrap">${monthLabel}</div>`;

    // 7 rows
    for (let i = 0; i < 7; i++) {
      const day = week[i];
      if (!day) {
        html += `<div style="width:12px;height:12px;border-radius:2px;background:var(--glass-bg)"></div>`;
        continue;
      }
      const intensity = day.total / maxClicks;
      const opacity = 0.15 + intensity * 0.85;
      html += `
        <div style="width:12px;height:12px;border-radius:2px;background:${accent};opacity:${opacity.toFixed(2)};cursor:default"
             title="${day.date}: ${day.total} click${day.total !== 1 ? 's' : ''}"></div>`;
    }
    html += `</div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════
function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Export data functions
export function exportData(format, links, sections) {
  switch(format) {
    case 'json':  exportJSON(links, sections); break;
    case 'markdown': exportMarkdown(links, sections); break;
    case 'html':  exportHTML(links, sections); break;
    case 'csv':   exportCSV(links, sections); break;
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJSON(links, sections) {
  const data = { version: '3.0', exportedAt: new Date().toISOString(), sections, links };
  downloadFile(JSON.stringify(data, null, 2), 'novadash-export.json', 'application/json');
}

function exportMarkdown(links, sections) {
  let md = `# NovaDash Export\n\n`;
  sections.forEach(s => {
    md += `## ${s.name}\n\n`;
    const slinks = links.filter(l => l.sectionId === s.id);
    slinks.forEach(l => { md += `- [${l.title}](${l.url})\n`; });
    md += '\n';
  });
  downloadFile(md, 'novadash-links.md', 'text/markdown');
}

function exportHTML(links, sections) {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This is an automatically generated file. -->\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks Menu</H1>\n<DL><p>\n`;
  sections.forEach(s => {
    html += `    <DT><H3>${s.name}</H3>\n    <DL><p>\n`;
    links.filter(l => l.sectionId === s.id).forEach(l => {
      html += `        <DT><A HREF="${l.url}">${l.title}</A>\n`;
    });
    html += `    </DL><p>\n`;
  });
  html += `</DL>`;
  downloadFile(html, 'novadash-bookmarks.html', 'text/html');
}

function exportCSV(links, sections) {
  const sectMap = Object.fromEntries(sections.map(s => [s.id, s.name]));
  const rows = [['Title','URL','Section','Tags','Clicks','Description']];
  links.forEach(l => rows.push([
    `"${(l.title||'').replace(/"/g,'""')}"`,
    `"${(l.url||'').replace(/"/g,'""')}"`,
    `"${(sectMap[l.sectionId]||'').replace(/"/g,'""')}"`,
    `"${(l.tags||[]).join(',').replace(/"/g,'""')}"`,
    l.clickCount || 0,
    `"${(l.description||'').replace(/"/g,'""')}"`
  ]));
  downloadFile(rows.map(r => r.join(',')).join('\n'), 'novadash-links.csv', 'text/csv');
}
