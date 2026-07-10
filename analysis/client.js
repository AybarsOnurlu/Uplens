/**
 * Client Analysis Module — Müşteri Analizi
 * 
 * Müşterinin güvenilirliğini ödeme doğrulama, harcama geçmişi,
 * işe alım oranı, puan ve değerlendirme sayısı gibi faktörlere göre puanlar.
 */

import { t } from '../utils/i18n.js';

// ─── SVG Icon Constants ────────────────────────────────────────────
const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block mr-1 shrink-0 text-green-500"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_WARN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_FLAG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
const ICON_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-orange-400"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>';
const ICON_STAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const ICON_THUMB = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-emerald-400"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
const ICON_CHART = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-blue-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>';
const ICON_CAL = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
const ICON_CLIP = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/></svg>';
const ICON_LOCATION = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';


/**
 * Müşteri verilerini analiz eder ve güvenilirlik skoru üretir
 * 
 * Puanlama sistemi:
 * - Baz skor: 50 (nötr başlangıç)
 * - Ödeme doğrulama: +20 / 0
 * - Toplam harcama: -20 ile +20 arası
 * - İşe alım oranı: -30 ile +20 arası
 * - Puan: -20 ile +20 arası
 * - Değerlendirme sayısı: -10 ile +15 arası
 * 
 * @param {object} jobData - İçerik scriptinden gelen iş verisi
 * @returns {{ score: number, label: string, details: string[] }}
 */
export function analyzeClient(jobData) {
  const details = [];
  let score = 50; // Nötr başlangıç

  const client = jobData.client;

  // ─── Müşteri verisi yoksa ────────────────────────────────────
  if (!client) {
    details.push(ICON_WARN + ' ' + t('client.noInfo'));
    return {
      score: 30,
      label: scoreToLabel(30),
      details
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. ÖDEME DOĞRULAMA (+20 / 0)
  // ═══════════════════════════════════════════════════════════════
  if (client.paymentVerified === true) {
    score += 20;
    details.push(ICON_CHECK + ' ' + t('client.paymentVerified'));
  } else if (client.paymentVerified === false) {
    // Doğrulanmamış — puan eklemiyoruz, ama uyarı veriyoruz
    details.push(ICON_WARN + ' ' + t('client.paymentNotVerified'));
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. TOPLAM HARCAMA (-20 ile +20)
  // ═══════════════════════════════════════════════════════════════
  const totalSpent = client.totalSpentNumeric;

  if (totalSpent !== null && totalSpent !== undefined) {
    if (totalSpent === 0) {
      score -= 20;
      details.push(ICON_FLAG + ' ' + t('client.spentZero'));
    } else if (totalSpent < 1000) {
      score -= 10;
      details.push(ICON_DOWN + ' ' + t('client.spentLow', { amount: formatMoney(totalSpent) }));
    } else if (totalSpent >= 1000 && totalSpent < 10000) {
      score += 10;
      details.push(ICON_THUMB + ' ' + t('client.spentMid', { amount: formatMoney(totalSpent) }));
    } else if (totalSpent >= 10000) {
      score += 20;
      details.push(ICON_STAR + ' ' + t('client.spentHigh', { amount: formatMoney(totalSpent) }));
    }
  } else {
    details.push(ICON_WARN + ' ' + t('client.spentUnknown'));
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. İŞE ALIM ORANI (-30 ile +20)
  // ═══════════════════════════════════════════════════════════════
  const hireRate = client.hireRate;

  if (hireRate !== null && hireRate !== undefined) {
    if (hireRate === 0) {
      if (!jobData.isSearchTile) {
        score -= 30;
        details.push(ICON_FLAG + ' ' + t('client.hireZero'));
      }
    } else if (hireRate < 30) {
      score -= 15;
      details.push(ICON_DOWN + ' ' + t('client.hireLow', { rate: hireRate }));
    } else if (hireRate >= 30 && hireRate <= 60) {
      // Nötr — puan değişmez
      details.push(ICON_CHART + ' ' + t('client.hireMid', { rate: hireRate }));
    } else if (hireRate > 60 && hireRate <= 80) {
      score += 15;
      details.push(ICON_CHECK + ' ' + t('client.hireGood', { rate: hireRate }));
    } else if (hireRate > 80) {
      score += 20;
      details.push(ICON_STAR + ' ' + t('client.hireGreat', { rate: hireRate }));
    }
  } else {
    if (!jobData.isSearchTile) {
      details.push(ICON_WARN + ' ' + t('client.hireUnknown'));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. MÜŞTERİ PUANI (-20 ile +20)
  // ═══════════════════════════════════════════════════════════════
  const rating = client.rating;

  if (rating !== null && rating !== undefined) {
    if (rating === 0 && jobData.isSearchTile) {
      // Search tiles often fail to parse the rating properly or it's missing, ignore.
    } else if (rating < 3.0 && rating > 0) {
      score -= 20;
      details.push(ICON_FLAG + ' ' + t('client.ratingLow', { rating }));
    } else if (rating < 3.0 && rating === 0) {
      score -= 20;
      details.push(ICON_FLAG + ' ' + t('client.ratingLow', { rating }));
    } else if (rating >= 3.0 && rating < 4.0) {
      score -= 5;
      details.push(ICON_DOWN + ' ' + t('client.ratingBelowAvg', { rating }));
    } else if (rating >= 4.0 && rating <= 4.5) {
      score += 10;
      details.push(ICON_CHECK + ' ' + t('client.ratingGood', { rating }));
    } else if (rating > 4.5) {
      score += 20;
      details.push(ICON_STAR + ' ' + t('client.ratingExcellent', { rating }));
    }
  } else {
    if (!jobData.isSearchTile) {
      score -= 10;
      details.push(ICON_WARN + ' ' + t('client.ratingNone'));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. DEĞERLENDİRME SAYISI (-10 ile +15)
  // ═══════════════════════════════════════════════════════════════
  const reviewCount = client.reviewCount;

  if (reviewCount !== null && reviewCount !== undefined) {
    if (reviewCount === 0) {
      if (!jobData.isSearchTile) {
        score -= 10;
        details.push(ICON_DOWN + ' ' + t('client.reviewsZero'));
      }
    } else if (reviewCount > 0 && reviewCount <= 5) {
      // Az ama var — nötr
      details.push(ICON_CHART + ' ' + t('client.reviewsFew', { count: reviewCount }));
    } else if (reviewCount > 5 && reviewCount <= 20) {
      score += 10;
      details.push(ICON_CHECK + ' ' + t('client.reviewsGood', { count: reviewCount }));
    } else if (reviewCount > 20) {
      score += 15;
      details.push(ICON_STAR + ' ' + t('client.reviewsGreat', { count: reviewCount }));
    }
  } else {
    if (!jobData.isSearchTile) {
      details.push(ICON_WARN + ' ' + t('client.reviewsUnknown'));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EK FAKTÖRLER
  // ═══════════════════════════════════════════════════════════════

  // Müşteri ülkesi (bilgi amaçlı, skora etki etmez)
  if (client.country) {
    details.push(ICON_LOCATION + ' ' + t('client.location', { country: client.country }));
  }

  // Üyelik süresi
  if (client.memberSince) {
    details.push(ICON_CAL + ' ' + t('client.memberSince', { date: client.memberSince }));
  }

  // İlan sayısı
  if (client.jobsPosted) {
    details.push(ICON_CLIP + ' ' + t('client.jobsPosted', { count: client.jobsPosted }));
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
 * Skoru etikete çevirir
 * @param {number} score
 * @returns {string}
 */
function scoreToLabel(score) {
  if (score <= 30) return t('client.labelRisky');
  if (score <= 60) return t('client.labelCaution');
  if (score <= 80) return t('client.labelTrusted');
  return t('client.labelVeryTrusted');
}


/**
 * Para miktarını okunabilir formata çevirir
 * @param {number} amount
 * @returns {string}
 */
function formatMoney(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString('en-US');
}
