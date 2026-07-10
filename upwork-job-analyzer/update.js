const fs = require('fs');
const path = require('path');

const popupHtmlPath = path.join(__dirname, 'popup', 'popup.html');
let html = fs.readFileSync(popupHtmlPath, 'utf8');

// Replace tabs
html = html.replace('📊 Analiz', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> Analiz');
html = html.replace('📋 Geçmiş', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/></svg> Geçmiş');
html = html.replace('⚙️ Ayarlar', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> Ayarlar');

// Empty state
html = html.replace('<div class="text-5xl mb-4">🔍</div>', '<div class="flex justify-center mb-4 text-slate-400"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>');

// Red flags section
html = html.replace('🚩 Kırmızı Bayraklar', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Kırmızı Bayraklar');

// Green flags section
html = html.replace('✅ Olumlu Göstergeler', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Olumlu Göstergeler');

// Analysis Cards
html = html.replace('<span class="text-sm">💰</span>', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>');
html = html.replace('<span class="text-sm">👤</span>', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');
html = html.replace('<span class="text-sm">🎯</span>', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>');

// History Empty
html = html.replace('<div class="text-4xl mb-3">📋</div>', '<div class="flex justify-center mb-3 text-slate-400"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/></svg></div>');

// Clear History
html = html.replace('🗑️ Geçmişi Temizle', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Geçmişi Temizle');

// Settings labels
html = html.replace('🏷️ Becerileriniz', 'Becerileriniz');
html = html.replace('💵 Min. Saatlik ($)', 'Min. Saatlik ($)');
html = html.replace('💰 Min. Sabit ($)', 'Min. Sabit ($)');
html = html.replace('🎨 Tema', 'Tema');

// Theme options
html = html.replace('🌗 Otomatik', 'Otomatik');
html = html.replace('☀️ Açık', 'Açık');
html = html.replace('🌙 Koyu', 'Koyu');
html = html.replace('✅ Ayarlar kaydedildi!', 'Ayarlar kaydedildi!');

fs.writeFileSync(popupHtmlPath, html);

const popupJsPath = path.join(__dirname, 'popup', 'popup.js');
let js = fs.readFileSync(popupJsPath, 'utf8');

// Fix theme bug
js = js.replace("document.body.classList.toggle('dark', isDark);", "document.body.classList.toggle('dark', isDark);\n  document.body.classList.toggle('light', !isDark);");

// Fix red flag icons
const oldGetSeverityIcon = `function getSeverityIcon(severity) {
  const map = { critical: '⛔', high: '🔴', medium: '🟠', low: '🟡' };
  return map[severity] || '⚠️';
}`;

const newGetSeverityIcon = `function getSeverityIcon(severity) {
  const map = {
    critical: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" class="inline-block"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    high: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" class="inline-block"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    medium: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" class="inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    low: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" class="inline-block"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  return map[severity] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" class="inline-block"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
}`;
js = js.replace(oldGetSeverityIcon, newGetSeverityIcon);

// Fix green flag icon
js = js.replace('<span class="text-green-500">✓</span>', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-green-500 inline-block shrink-0"><polyline points="20 6 9 17 4 12"/></svg>');

// Fix skill match icon
js = js.replace('${skill} ✓</span>', '${skill}</span>');

fs.writeFileSync(popupJsPath, js);
console.log('Update complete!');
