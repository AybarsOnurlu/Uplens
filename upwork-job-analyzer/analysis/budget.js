/**
 * Budget Analysis Module — Bütçe Analizi
 * 
 * İş ilanının bütçesini pazar oranlarına, deneyim seviyesine
 * ve kullanıcının minimum beklentilerine göre puanlar.
 */

import { t } from '../utils/i18n.js';

// ─── SVG Icon Constants ───────────────────────────────────────────
const ICON_WARNING = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_CREDIT_CARD = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
const ICON_TREND_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-orange-400"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>';
const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block mr-1 shrink-0 text-green-500"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_CHART = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-blue-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>';
const ICON_FLAG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
const ICON_STAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const ICON_THUMBS_UP = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-emerald-400"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';

// ─── Market Rate Level Labels ─────────────────────────────────────
const LEVEL_LABELS = {
  entry: () => t('budget.levelEntry'),
  intermediate: () => t('budget.levelIntermediate'),
  expert: () => t('budget.levelExpert')
};

// ─── Pazar Oranları (saatlik, USD) ────────────────────────────────
const MARKET_RATES = {
  entry: { min: 10, max: 25 },
  intermediate: { min: 25, max: 60 },
  expert: { min: 60, max: 150 }
};

// ─── Sabit fiyat karmaşıklık tahmini (kelime sayısına göre) ───────
const COMPLEXITY_THRESHOLDS = {
  simple: { maxWords: 100, minBudget: 50 },
  moderate: { maxWords: 300, minBudget: 200 },
  complex: { maxWords: 600, minBudget: 500 },
  enterprise: { maxWords: Infinity, minBudget: 1000 }
};


/**
 * İş ilanının bütçesini analiz eder
 * 
 * @param {object} jobData - İçerik scriptinden gelen iş verisi
 * @param {object} userProfile - Kullanıcı profili (minimum oranlar vb.)
 * @returns {{ score: number, label: string, details: string[] }}
 */
export function analyzeBudget(jobData, userProfile) {
  const details = [];
  let score = 50; // Nötr başlangıç

  const budget = jobData.budget;
  const level = jobData.experienceLevel;
  const description = jobData.description || '';
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  // ─── Bütçe bilgisi yoksa ─────────────────────────────────────
  if (!budget || (!budget.type && !budget.amount && !budget.min && !budget.max)) {
    if (jobData.isSearchTile) {
      details.push(`${ICON_WARNING} Bütçe detayı ana sayfada görünmüyor`);
      return {
        score: 50,
        label: scoreToLabel(50),
        details
      };
    } else {
      details.push(`${ICON_WARNING} ${t('budget.noInfo')}`);
      return {
        score: 40,
        label: scoreToLabel(40),
        details
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SAATLİK BÜTÇE ANALİZİ
  // ═══════════════════════════════════════════════════════════════
  if (budget.type === 'hourly') {
    const hourlyMin = budget.min || 0;
    const hourlyMax = budget.max || hourlyMin;
    const avgRate = hourlyMin && hourlyMax ? (hourlyMin + hourlyMax) / 2 : hourlyMin || hourlyMax;

    details.push(`${ICON_CREDIT_CARD} ${t('budget.hourlyRange', { min: hourlyMin, max: hourlyMax })}`);

    // Kullanıcının minimum saatlik ücretiyle karşılaştır
    const userMinRate = userProfile?.minimumHourlyRate || 25;

    if (hourlyMax > 0 && hourlyMax < userMinRate) {
      const diff = userMinRate - hourlyMax;
      score -= Math.min(25, Math.round(diff * 1.5));
      details.push(`${ICON_TREND_DOWN} ${t('budget.belowMinHourly', { max: hourlyMax, userMin: userMinRate })}`);
    } else if (hourlyMin >= userMinRate) {
      score += 15;
      details.push(`${ICON_CHECK} ${t('budget.meetsMinHourly', { min: hourlyMin, userMin: userMinRate })}`);
    }

    // Pazar oranlarıyla karşılaştır
    if (level && MARKET_RATES[level]) {
      const marketRate = MARKET_RATES[level];
      const levelLabel = LEVEL_LABELS[level] ? LEVEL_LABELS[level]() : level;
      details.push(`${ICON_CHART} ${t('budget.marketRate', { level: levelLabel, min: marketRate.min, max: marketRate.max })}`);

      if (avgRate > 0) {
        if (avgRate < marketRate.min) {
          // Pazar ortalamasının altında
          const ratio = avgRate / marketRate.min;
          const penalty = Math.round((1 - ratio) * 30);
          score -= penalty;
          details.push(`${ICON_WARNING} ${t('budget.belowMarket', { percent: Math.round(ratio * 100) })}`);
        } else if (avgRate >= marketRate.min && avgRate <= marketRate.max) {
          score += 10;
          details.push(`${ICON_CHECK} ${t('budget.withinMarket')}`);
        } else if (avgRate > marketRate.max) {
          score += 20;
          details.push(`${ICON_STAR} ${t('budget.aboveMarket')}`);
        }
      }
    }

    // Deneyim / bütçe uyumsuzluğu
    if (level === 'expert' && avgRate < 30) {
      score -= 15;
      details.push(`${ICON_FLAG} ${t('budget.expertLowHourly')}`);
    } else if (level === 'entry' && avgRate > 50) {
      score += 10;
      details.push(`${ICON_STAR} ${t('budget.entryGenerous')}`);
    }

    // $0 saatlik ücret uyarısı
    if (hourlyMax === 0 && hourlyMin === 0) {
      score -= 20;
      details.push(`${ICON_FLAG} ${t('budget.zeroHourly')}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SABİT FİYAT BÜTÇE ANALİZİ
  // ═══════════════════════════════════════════════════════════════
  else if (budget.type === 'fixed') {
    const amount = budget.amount || 0;
    details.push(`${ICON_CREDIT_CARD} ${t('budget.fixedAmount', { amount })}`);

    // Kullanıcının minimum sabit bütçesiyle karşılaştır
    const userMinFixed = userProfile?.minimumFixedBudget || 100;

    if (amount > 0 && amount < userMinFixed) {
      score -= 15;
      details.push(`${ICON_TREND_DOWN} ${t('budget.belowMinFixed', { amount, userMin: userMinFixed })}`);
    } else if (amount >= userMinFixed) {
      score += 10;
      details.push(`${ICON_CHECK} ${t('budget.meetsMinFixed', { amount, userMin: userMinFixed })}`);
    }

    // Açıklama karmaşıklığına göre bütçe uygunluğu
    const complexity = estimateComplexity(wordCount);
    const minExpected = complexity.minBudget;

    if (amount > 0 && amount < minExpected) {
      score -= 10;
      details.push(`${ICON_WARNING} ${t('budget.complexityLow', { min: minExpected })}`);
    } else if (amount >= minExpected * 2) {
      score += 10;
      details.push(`${ICON_CHECK} ${t('budget.complexityOk')}`);
    }

    // Deneyim / bütçe uyumsuzluğu (sabit fiyat)
    if (level === 'expert' && amount < 200) {
      score -= 15;
      details.push(`${ICON_FLAG} ${t('budget.expertLowFixed')}`);
    }

    // $0 veya çok düşük sabit bütçe
    if (amount === 0) {
      score -= 20;
      details.push(`${ICON_FLAG} ${t('budget.zeroFixed')}`);
    } else if (amount < 25) {
      score -= 15;
      details.push(`${ICON_WARNING} ${t('budget.veryLow')}`);
    }

    // Yüksek bütçe bonusu
    if (amount >= 5000) {
      score += 10;
      details.push(`${ICON_STAR} ${t('budget.highBudget')}`);
    } else if (amount >= 1000) {
      score += 5;
      details.push(`${ICON_THUMBS_UP} ${t('budget.midHighBudget')}`);
    }
  }

  // ─── Skor sınırlandırma ──────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: scoreToLabel(score),
    details
  };
}


/**
 * Kelime sayısına göre proje karmaşıklığını tahmin eder
 * @param {number} wordCount
 * @returns {{ minBudget: number }}
 */
function estimateComplexity(wordCount) {
  if (wordCount <= COMPLEXITY_THRESHOLDS.simple.maxWords) {
    return COMPLEXITY_THRESHOLDS.simple;
  }
  if (wordCount <= COMPLEXITY_THRESHOLDS.moderate.maxWords) {
    return COMPLEXITY_THRESHOLDS.moderate;
  }
  if (wordCount <= COMPLEXITY_THRESHOLDS.complex.maxWords) {
    return COMPLEXITY_THRESHOLDS.complex;
  }
  return COMPLEXITY_THRESHOLDS.enterprise;
}


/**
 * Skoru etikete çevirir
 * @param {number} score
 * @returns {string}
 */
function scoreToLabel(score) {
  if (score <= 30) return t('budget.labelLow');
  if (score <= 60) return t('budget.labelCaution');
  if (score <= 80) return t('budget.labelOk');
  return t('budget.labelGood');
}
