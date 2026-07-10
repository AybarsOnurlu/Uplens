const fs = require('fs');
const path = require('path');

const contentJsPath = path.join(__dirname, 'content', 'content.js');
let contentJs = fs.readFileSync(contentJsPath, 'utf8');

const waitLogic = `let extractionTries = 0;
function extractAndAnalyze() {
  const url = window.location.href;
  lastExtractedUrl = url;

  if (url.includes('/jobs/~')) {
    const text = document.body.innerText;
    if (!text.includes('About the client') && !text.includes('Payment method') && extractionTries < 5) {
      extractionTries++;
      setTimeout(extractAndAnalyze, 1000);
      return;
    }
    extractionTries = 0;
    extractJobDetailPage();
  } else if (url.includes('/nx/search/jobs/') || url.includes('/nx/find-work/') || url.includes('/ab/jobs/search/')) {
    extractSearchResults();
  }
}`;

contentJs = contentJs.replace(/function extractAndAnalyze\(\) \{[\s\S]*?\}\s*(?=\/\/ Extract data from search results)/, waitLogic + '\n\n');
fs.writeFileSync(contentJsPath, contentJs);

// Icon replacements
const ICONS = {
  '💰': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  '⚠️': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  '📉': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-orange-400"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>',
  '✅': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block mr-1 shrink-0 text-green-500"><polyline points="20 6 9 17 4 12"/></svg>',
  '📊': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-blue-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  '🌟': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  '🚩': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  '👍': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-emerald-400"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
  '📋': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/></svg>',
  '📅': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  '🔴': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-red-500"><circle cx="12" cy="12" r="10"/></svg>'
};

function replaceEmojis(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [emoji, svg] of Object.entries(ICONS)) {
    // Escape emoji for regex if needed, though split/join is safer
    content = content.split(emoji + ' ').join(svg + ' ');
    content = content.split(emoji).join(svg);
  }
  fs.writeFileSync(filePath, content);
}

replaceEmojis(path.join(__dirname, 'analysis', 'budget.js'));
replaceEmojis(path.join(__dirname, 'analysis', 'client.js'));
replaceEmojis(path.join(__dirname, 'analysis', 'scorer.js'));

// End of script

console.log('Update2 complete!');
