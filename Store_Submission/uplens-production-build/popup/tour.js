import { StorageHelper } from '../utils/storage.js';
import { t } from '../utils/i18n.js';

export async function initTour() {
  const settings = await StorageHelper.getSettings();
  if (settings.hasSeenTour) return;

  // Start Tour
  const tour = new OnboardingTour();
  tour.start();
}

class OnboardingTour {
  constructor() {
    this.steps = [
      {
        isLanguageSelect: true
      },
      {
        target: '#api-key',
        tab: 'panel-settings',
        text: () => t('ui.tourStep1')
      },
      {
        target: '#cv-text',
        tab: 'panel-settings',
        text: () => t('ui.tourStep2')
      },
      {
        target: '[data-tab="panel-analysis"]',
        tab: 'panel-analysis',
        text: () => t('ui.tourStep3')
      }
    ];
    this.currentStep = 0;
    this.overlay = null;
    this.tooltip = null;
    this.activeTarget = null;
    this.originalStyles = new Map();
  }

  start() {
    this.createOverlay();
    this.createTooltip();
    this.showStep();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'fixed inset-0 bg-black/70 z-[100] transition-opacity duration-300';
    document.body.appendChild(this.overlay);
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'absolute z-[101] w-64 bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-2xl opacity-0 transition-opacity duration-300 pointer-events-auto';
    
    this.tooltip.innerHTML = `
      <p id="tour-text" class="text-sm text-slate-200 mb-4 font-medium leading-relaxed"></p>
      <div class="flex justify-between items-center">
        <button id="tour-skip" class="text-xs text-slate-400 hover:text-slate-300 font-medium"></button>
        <div class="flex items-center gap-2">
          <span id="tour-indicator" class="text-[10px] text-slate-500 font-bold"></span>
          <button id="tour-next" class="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors"></button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.tooltip);

    document.getElementById('tour-skip').addEventListener('click', () => this.end());
    document.getElementById('tour-next').addEventListener('click', () => {
      this.currentStep++;
      if (this.currentStep >= this.steps.length) {
        this.end();
      } else {
        this.showStep();
      }
    });
  }

  showStep() {
    this.clearHighlight();
    const step = this.steps[this.currentStep];

    if (step.isLanguageSelect) {
      this.showLanguageSelect();
      return;
    }

    // Switch tab
    const tabBtn = document.querySelector(`[data-tab="${step.tab}"]`);
    if (tabBtn) tabBtn.click();

    setTimeout(() => {
      const targetEl = document.querySelector(step.target);
      if (!targetEl) {
        this.end();
        return;
      }

      this.highlight(targetEl);
      
      // Update Tooltip content
      document.getElementById('tour-text').textContent = step.text();
      document.getElementById('tour-skip').textContent = t('ui.tourSkip');
      document.getElementById('tour-indicator').textContent = `${this.currentStep + 1} / ${this.steps.length}`;
      document.getElementById('tour-next').textContent = this.currentStep === this.steps.length - 1 ? t('ui.tourFinish') : t('ui.tourNext');

      this.positionTooltip(targetEl);
      this.tooltip.classList.remove('opacity-0');
      this.tooltip.classList.add('opacity-100');
    }, 50); // Wait for tab switch
  }

  showLanguageSelect() {
    this.tooltip.classList.add('opacity-0');
    
    const box = document.createElement('div');
    box.id = 'tour-lang-box';
    box.className = 'absolute z-[101] bg-slate-800 border border-slate-600 rounded-xl p-6 shadow-2xl flex flex-col items-center justify-center gap-4 pointer-events-auto';
    box.style.top = '50%';
    box.style.left = '50%';
    box.style.transform = 'translate(-50%, -50%)';
    box.style.width = '320px';

    box.innerHTML = `
      <h2 class="text-lg font-bold text-white text-center">Welcome to UpLens!</h2>
      <p class="text-sm text-slate-300 text-center mb-2">Please select your language:</p>
      <select id="tour-lang-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:outline-none mb-2">
        <option value="en">English (EN)</option>
        <option value="tr">Türkçe (TR)</option>
        <option value="de">Deutsch (DE)</option>
        <option value="fr">Français (FR)</option>
        <option value="es">Español (ES)</option>
        <option value="pt">Português (PT)</option>
        <option value="ar">العربية (SA)</option>
      </select>
      <button id="tour-lang-start" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors mt-2 flex justify-center items-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </button>
    `;
    
    document.body.appendChild(box);

    document.getElementById('tour-lang-start').addEventListener('click', async () => {
      const selectedLang = document.getElementById('tour-lang-select').value;
      const settings = await StorageHelper.getSettings();
      await StorageHelper.saveSettings({ ...settings, language: selectedLang });
      
      // Dispatch event to popup.js to update UI and apply language
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: selectedLang }));
      
      // Clean up box and move to next step
      box.remove();
      this.currentStep++;
      this.showStep();
    });
  }

  highlight(el) {
    this.activeTarget = el;
    
    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Store original styles that we might change
    this.originalStyles.set(el, {
      position: el.style.position,
      zIndex: el.style.zIndex,
      backgroundColor: el.style.backgroundColor
    });

    // Make element pop over overlay
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.position === 'static') {
      el.style.position = 'relative';
    }
    el.style.zIndex = '102';
    
    // Add white/light bg if it's transparent or dark so it stands out better
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.style.backgroundColor = '#1e293b'; // slate-800
    } else {
      el.style.backgroundColor = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computedStyle.backgroundColor : '#0f172a';
      el.style.borderRadius = '8px';
      el.style.padding = '4px';
    }
  }

  clearHighlight() {
    if (this.activeTarget && this.originalStyles.has(this.activeTarget)) {
      const orig = this.originalStyles.get(this.activeTarget);
      this.activeTarget.style.position = orig.position;
      this.activeTarget.style.zIndex = orig.zIndex;
      this.activeTarget.style.backgroundColor = orig.backgroundColor;
      this.activeTarget.style.borderRadius = '';
      this.activeTarget.style.padding = '';
      this.activeTarget = null;
    }
    this.tooltip.classList.remove('opacity-100');
    this.tooltip.classList.add('opacity-0');
  }

  positionTooltip(targetEl) {
    // Need a tiny delay to ensure element is in viewport after scrollIntoView
    setTimeout(() => {
      const rect = targetEl.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      
      let top = rect.bottom + 10;
      let left = rect.left;

      // If tooltip goes below window, put it above target
      if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 10;
      }
      
      // If it goes above window (very rare), adjust
      if (top < 0) {
        top = 10;
      }

      // If tooltip goes off right edge
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
      }

      this.tooltip.style.top = `${top}px`;
      this.tooltip.style.left = `${left}px`;
    }, 100);
  }

  async end() {
    this.clearHighlight();
    if (this.overlay) this.overlay.remove();
    if (this.tooltip) this.tooltip.remove();
    
    const settings = await StorageHelper.getSettings();
    await StorageHelper.saveSettings({ ...settings, hasSeenTour: true });
  }
}
