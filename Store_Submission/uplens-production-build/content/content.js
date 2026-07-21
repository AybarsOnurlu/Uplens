const UJA_CONSTANTS = {
  MSG: {
    ANALYZE_JOB: 'ANALYZE_JOB',
    JOB_ANALYZED: 'JOB_ANALYZED'
  },
  DEBOUNCE_MS: 1500
};

let lastExtractedUrl = '';
let extractTimeout = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[UJA] Content script initialized on', window.location.href);
  setupMutationObserver();
  scheduleExtraction();
  
  // Listen for settings change
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REANALYZE_PAGE') {
      console.log('[UJA] Settings changed, re-analyzing page...');
      document.querySelectorAll('[data-uja-processed]').forEach(el => delete el.dataset.ujaProcessed);
      document.querySelectorAll('.uja-inline-badge').forEach(el => el.remove());
      scheduleExtraction();
    }
  });
}

// Watch for SPA navigation and dynamic DOM changes
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    // Check if URL changed
    if (window.location.href !== lastExtractedUrl) {
      scheduleExtraction();
      return;
    }

    // Check if new meaningful content was added
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Quick check if job-related elements might have been added
        const hasRelevantAdditions = Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === 1) { // Element node
            return node.matches && (
              node.matches('[data-test="job-title"]') || 
              node.querySelector('[data-test="job-title"]') ||
              node.matches('.job-tile') ||
              node.querySelector('.job-tile')
            );
          }
          return false;
        });

        if (hasRelevantAdditions) {
          scheduleExtraction();
          break;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function scheduleExtraction() {
  if (extractTimeout) {
    clearTimeout(extractTimeout);
  }
  extractTimeout = setTimeout(extractAndAnalyze, UJA_CONSTANTS.DEBOUNCE_MS);
}

let extractionTries = 0;
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
}

// Extract data from search results page
function extractSearchResults() {
  const jobListContainer = document.querySelector('[data-test="job-tile-list"]') || document.querySelector('.up-card-list');
  if (!jobListContainer) return;
  
  const jobTiles = jobListContainer.querySelectorAll('section, article, .job-tile, .up-card');
  
  jobTiles.forEach(tile => {
    if (tile.dataset.ujaProcessed) return;
    
    // Title & Link
    const titleLink = tile.querySelector('[data-test="job-tile-title-link"]') || tile.querySelector('h3 a') || tile.querySelector('h4 a');
    if (!titleLink) return;
    
    const url = titleLink.href;
    const title = titleLink.textContent.trim();
    
    // Budget
    let budget = { type: null, amount: null, min: null, max: null };
    const fixedPriceEl = tile.querySelector('[data-test="is-fixed-price"]');
    const jobTypeEl = tile.querySelector('[data-test="job-type-label"]');
    
    if (fixedPriceEl) {
      budget.type = 'fixed';
      const match = fixedPriceEl.textContent.match(/\$[\d,]+/);
      if (match) budget.amount = parseFloat(match[0].replace(/[\$,]/g, ''));
    } else if (jobTypeEl) {
      budget.type = 'hourly';
      const match = jobTypeEl.textContent.match(/\$[\d.]+\s*-\s*\$[\d.]+/);
      if (match) {
        const parts = match[0].match(/[\d.]+/g);
        if (parts && parts.length === 2) {
          budget.min = parseFloat(parts[0]);
          budget.max = parseFloat(parts[1]);
        }
      } else {
        const singleMatch = jobTypeEl.textContent.match(/\$[\d.]+/);
        if (singleMatch) budget.min = budget.max = parseFloat(singleMatch[0].replace('$', ''));
      }
    }
    
    // Skills
    const skills = [];
    const skillEls = tile.querySelectorAll('[data-test="token"] span, [data-test="skill"]');
    skillEls.forEach(el => skills.push(el.textContent.trim()));
    
    // Client Info & Red Flags
    const textContent = tile.innerText || '';
    
    // Total spent parsing
    const spentMatch = textContent.match(/\$[\dKkMm.]+\+?\s*spent/i);
    const totalSpent = textContent.includes('$0 spent') ? '$0' : (spentMatch?.[0] || '');
    let totalSpentNumeric = 0;
    if (totalSpent) {
      let numStr = totalSpent.replace(/[^\d.kKmM]/g, '');
      let multiplier = 1;
      if (numStr.toLowerCase().includes('k')) { multiplier = 1000; numStr = numStr.replace(/k/i, ''); }
      else if (numStr.toLowerCase().includes('m')) { multiplier = 1000000; numStr = numStr.replace(/m/i, ''); }
      totalSpentNumeric = parseFloat(numStr) * multiplier;
      if (isNaN(totalSpentNumeric)) totalSpentNumeric = 0;
    }
    
    // Rating parsing (e.g., "4.9" near the star)
    let rating = parseFloat(textContent.match(/([\d.]+)\s*of\s*5\s*reviews/i)?.[1] || '0');
    if (!rating) {
      // Look for a standalone rating like "4.9" often near a star or spent amount
      const starMatch = textContent.match(/(?:★|Star)\s*([\d.]+)/i) || textContent.match(/\b([1-5]\.\d)\b/);
      if (starMatch) rating = parseFloat(starMatch[1]);
    }

    const client = {
      paymentVerified: textContent.includes('Payment method verified') || textContent.includes('Payment verified'),
      totalSpent,
      totalSpentNumeric,
      hireRate: parseInt((textContent.match(/(\d+)%\s*hire rate/i)?.[1] || '0'), 10),
      rating
    };

    // Experience Level
    let experienceLevel = null;
    if (textContent.includes('Expert')) experienceLevel = 'expert';
    else if (textContent.includes('Intermediate')) experienceLevel = 'intermediate';
    else if (textContent.includes('Entry level')) experienceLevel = 'entry';

    // Project Length
    const lengthMatch = textContent.match(/Less than \d+ months|More than \d+ months|\d+ to \d+ months/i);
    const projectLength = lengthMatch ? lengthMatch[0] : null;
    
    // Proposals
    const proposalsMatch = textContent.match(/Proposals:\s*([^\n]+)/i);
    const proposals = proposalsMatch ? proposalsMatch[1].trim() : null;
    
    const jobData = {
      id: extractJobId(url), url, title, budget, client, skills, proposals,
      experienceLevel, projectLength,
      description: tile.querySelector('.job-description-text')?.textContent || '',
      extractedAt: Date.now(), isSearchTile: true
    };
    
    // Calculate Job Quality Score via Service Worker
    chrome.runtime.sendMessage({ type: UJA_CONSTANTS.MSG.ANALYZE_JOB, data: jobData }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.success && response.analysis) {
        injectInlineBadge(tile, response.analysis, response.badgeLabels || {});
      }
    });
    
    tile.dataset.ujaProcessed = "true";
  });
}

function injectInlineBadge(tile, analysis, badgeLabels = {}) {
  if (tile.querySelector('.uja-inline-badge')) return;
  
  const { overallScore, redFlags } = analysis;
  const scoreText = badgeLabels.scoreText || 'Skor';
  const riskText = badgeLabels.risk || 'Risk';
  
  let color = '#14a800';
  if (overallScore <= 30) color = '#ef4444';
  else if (overallScore <= 60) color = '#f59e0b';
  else if (overallScore <= 80) color = '#22c55e';
  
  const redFlagCount = redFlags ? redFlags.length : 0;
  
  const badge = document.createElement('div');
  badge.className = 'uja-inline-badge';
  badge.style.cssText = `
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; 
    border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 10px;
    background: ${color}15; color: ${color}; border: 1px solid ${color}30;
  `;
  
  // If we have classificationText (search page), show it instead of the number
  const classificationText = badgeLabels.classificationText;
  const displayHtml = classificationText ? 
    `<span>${classificationText}</span>` : 
    `<span>${scoreText}: ${overallScore}</span>`;

  badge.innerHTML = `
    ${displayHtml}
    ${redFlagCount > 0 ? `<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 4px; border-radius: 4px; font-size: 10px;">🚩 ${redFlagCount}</span>` : ''}
  `;
  
  const titleEl = tile.querySelector('[data-test="job-tile-title-link"]') || tile.querySelector('h3, h4');
  if (titleEl && titleEl.parentNode) {
    titleEl.parentNode.appendChild(badge);
  } else {
    tile.prepend(badge);
  }
}

// Extract data from a specific job detail page
function extractJobDetailPage() {
  console.log('[UJA] Extracting job details...');
  
  const jobData = {
    id: extractJobId(window.location.href),
    url: window.location.href,
    title: extractTitle(),
    description: extractDescription(),
    budget: extractBudget(),
    client: extractClientInfo(),
    skills: extractSkills(),
    experienceLevel: extractExperienceLevel(),
    projectLength: extractProjectLength(),
    proposals: extractProposals(),
    extractedAt: Date.now()
  };

  console.log('[UJA] Extracted Job Data:', jobData);
  sendForAnalysis(jobData);
}

// --- Extraction Strategies ---

function extractJobId(url) {
  const match = url.match(/~([a-zA-Z0-9]+)/);
  return match ? match[0] : null;
}

function extractTitle() {
  const el = document.querySelector('[data-test="job-title"]') || 
             document.querySelector('h1.job-title') ||
             document.querySelector('h1') || 
             document.querySelector('h2.job-title');
  if (el && el.textContent.trim()) {
    return el.textContent.trim();
  }
  
  // Robust fallback
  let docTitle = document.title;
  docTitle = docTitle.replace(/\s*-\s*Upwork\s*$/i, '').trim();
  return docTitle || 'İsimsiz İlan';
}

function extractDescription() {
  const el = document.querySelector('[data-test="job-description"]') || 
             document.querySelector('[data-test="description"]') ||
             document.querySelector('.job-description');
  return el ? el.textContent.trim() : '';
}

function extractBudget() {
  const budget = { type: null, amount: null, min: null, max: null };
  
  // Restrict search to job features/details to avoid picking up past job budgets in Client History
  const featuresEl = document.querySelector('ul[data-test="job-details-features"]') || 
                     document.querySelector('section.up-card-section') || 
                     document.querySelector('main');
  let html = featuresEl ? featuresEl.innerText : document.body.innerText;
  
  // If we grabbed the whole body, cut off the history section
  const historyIndex = html.toLowerCase().indexOf('client\'s recent history');
  if (historyIndex !== -1) html = html.substring(0, historyIndex);
  
  // Try to find Fixed-price pattern: "Fixed-price \n $500" or "Fixed-price $500"
  const fixedMatch = html.match(/Fixed-price[\s\n]*\$([\d,]+)/i);
  if (fixedMatch) {
    budget.type = 'fixed';
    budget.amount = parseFloat(fixedMatch[1].replace(/,/g, ''));
    return budget;
  }
  
  // Try to find Hourly range pattern: "Hourly: $15.00 - $30.00" or "Hourly \n $15.00 - $30.00"
  const hourlyRangeMatch = html.match(/Hourly.{0,50}?\$([\d.,]+)\s*-\s*\$([\d.,]+)/is);
  if (hourlyRangeMatch) {
    budget.type = 'hourly';
    budget.min = parseFloat(hourlyRangeMatch[1].replace(/,/g, ''));
    budget.max = parseFloat(hourlyRangeMatch[2].replace(/,/g, ''));
    return budget;
  }
  
  // Try to find single Hourly pattern: "Hourly \n $15.00"
  const tightMatch = html.match(/Hourly[\s\n:]*\$([\d.,]+)/i);
  if (tightMatch) {
    budget.type = 'hourly';
    budget.min = parseFloat(tightMatch[1].replace(/,/g, ''));
    budget.max = budget.min;
    return budget;
  }
  
  // Fallback: If it just says "Hourly" in a prominent way (but no rate)
  if (html.match(/(?:^|\n)\s*Hourly\s*(?:\n|$)/i)) {
    budget.type = 'hourly';
    return budget;
  }
  
  // Fallback: If it just says "Fixed-price" 
  if (html.match(/(?:^|\n)\s*Fixed-price\s*(?:\n|$)/i)) {
    budget.type = 'fixed';
    return budget;
  }
  
  return budget;
}

function extractClientInfo() {
  const client = {
    country: '',
    paymentVerified: false,
    rating: null,
    reviewCount: 0,
    totalSpent: '',
    totalSpentNumeric: 0,
    hireRate: null,
    memberSince: null
  };
  
  const text = document.body.innerText;
  if (text.includes('Payment method verified') || text.includes('Payment verified')) {
    client.paymentVerified = true;
  }
  
  // Total spent e.g. "$10K+ spent" or "$2K total spent"
  const spentMatch = text.match(/\$[\dKkMm.]+\+?\s*(?:total\s*)?spent/i);
  if (spentMatch) {
    client.totalSpent = spentMatch[0].split(' ')[0];
    
    // Parse numeric value
    let numStr = spentMatch[0].replace(/[^\d.kKmM]/g, '');
    let multiplier = 1;
    if (numStr.toLowerCase().includes('k')) { multiplier = 1000; numStr = numStr.replace(/k/i, ''); }
    else if (numStr.toLowerCase().includes('m')) { multiplier = 1000000; numStr = numStr.replace(/m/i, ''); }
    client.totalSpentNumeric = parseFloat(numStr) * multiplier;
    if (isNaN(client.totalSpentNumeric)) client.totalSpentNumeric = 0;
  }

  // Hire rate e.g. "80% hire rate"
  const hireMatch = text.match(/(\d+)%\s*hire rate/i);
  if (hireMatch) {
    client.hireRate = parseInt(hireMatch[1], 10);
  }
  
  // Rating e.g. "4.89 of 121 reviews" or "5.00 of 9 reviews"
  const ratingMatch = text.match(/([\d.]+)\s*(?:out)?\s*of\s*([\d,]+)\s*reviews/i);
  if (ratingMatch) {
    client.rating = parseFloat(ratingMatch[1]);
    client.reviewCount = parseInt(ratingMatch[2].replace(/,/g, ''), 10);
  } else {
    // Fallback if no reviews but has stars
    const starMatch = text.match(/([\d.]+)\s*stars/i);
    if (starMatch) client.rating = parseFloat(starMatch[1]);
  }

  return client;
}

function extractSkills() {
  const skills = [];
  const skillEls = document.querySelectorAll(
    '[data-test="skill"], [data-test="token"] span, a[href*="/freelance-jobs/"], .skill-element'
  );
  skillEls.forEach(el => {
    const text = el.textContent.trim();
    if (text && !skills.includes(text) && text.length < 40) {
      skills.push(text);
    }
  });
  return skills;
}

function extractExperienceLevel() {
  const text = document.body.innerText;
  if (text.includes('Expert')) return 'expert';
  if (text.includes('Intermediate')) return 'intermediate';
  if (text.includes('Entry level')) return 'entry';
  return null;
}

function extractProjectLength() {
  const text = document.body.innerText;
  const match = text.match(/Less than \d+ months|More than \d+ months|\d+ to \d+ months/i);
  return match ? match[0] : null;
}

function extractProposals() {
  const text = document.body.innerText;
  const match = text.match(/Proposals:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

// --- Analysis & Overlay ---

function sendForAnalysis(jobData) {
  chrome.runtime.sendMessage({ type: UJA_CONSTANTS.MSG.ANALYZE_JOB, data: jobData }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[UJA] Service worker not ready or error:', chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success && response.analysis) {
      injectOverlay(response.analysis, response.badgeLabels || {});
    }
  });
}

function injectOverlay(analysis, badgeLabels = {}) {
  let overlay = document.getElementById('uja-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'uja-overlay';
    overlay.className = 'uja-overlay uja-minimized';
    document.body.appendChild(overlay);
  }

  const { overallScore, redFlags } = analysis;
  const scoreLabel = badgeLabels.scoreLabel || analysis.scoreLabel;
  const riskText = badgeLabels.risk || 'Risk';
  const cleanText = badgeLabels.clean || 'Temiz';
  
  let color = '#14a800'; // good
  if (overallScore <= 30) color = '#ef4444'; // high-risk
  else if (overallScore <= 60) color = '#f59e0b'; // caution
  else if (overallScore <= 80) color = '#22c55e'; // decent

  const redFlagCount = redFlags ? redFlags.length : 0;
  
  overlay.innerHTML = `
    <div class="uja-overlay-inner" style="--score-color: ${color}">
      <div class="uja-score-ring-container">
        <svg class="uja-score-ring" viewBox="0 0 36 36">
          <path class="uja-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="uja-score-path" stroke-dasharray="${overallScore}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div class="uja-score-value">${overallScore}</div>
      </div>
      <div class="uja-details">
        <div class="uja-label">${String(scoreLabel).toUpperCase()}</div>
        ${redFlagCount > 0 ? `<div class="uja-flags-badge">🚩 ${redFlagCount} ${riskText}</div>` : `<div class="uja-flags-badge uja-safe">✅ ${cleanText}</div>`}
      </div>
    </div>
  `;

  overlay.onclick = () => {
    // Attempt to open the popup (Chrome doesn't allow programmatic popup opening from content scripts easily, 
    // but we can toggle minimize state for now)
    overlay.classList.toggle('uja-minimized');
  };
}
