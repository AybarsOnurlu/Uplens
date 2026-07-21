/**
 * Red Flag Detection Module — Kırmızı / Yeşil Bayrak Tespiti
 * 
 * İş ilanlarındaki risk göstergelerini ve olumlu sinyalleri tespit eder.
 * Her bayrak severity (önem), category (kategori) ve açıklama içerir.
 */

import { t } from '../utils/i18n.js';

const SEVERITY = {
  CRITICAL: 'critical',   // Kesinlikle kaçınılmalı
  HIGH: 'high',           // Yüksek risk
  MEDIUM: 'medium',       // Dikkat edilmeli
  LOW: 'low'              // Hafif uyarı
};

export const SEVERITY_WEIGHTS = {
  [SEVERITY.CRITICAL]: 25,
  [SEVERITY.HIGH]: 15,
  [SEVERITY.MEDIUM]: 8,
  [SEVERITY.LOW]: 3
};

/**
 * İş ilanındaki kırmızı bayrakları tespit eder
 * 
 * @param {object} jobData - İçerik scriptinden gelen iş verisi
 * @returns {{ redFlags: object[], greenFlags: object[] }}
 */
export function detectRedFlags(jobData) {
  const redFlags = [];
  const greenFlags = [];

  const description = (jobData.description || '').toLowerCase();
  const title = (jobData.title || '').toLowerCase();
  const fullText = `${title} ${description}`;
  const wordCount = (jobData.description || '').trim().split(/\s+/).filter(Boolean).length;

  let flagIdCounter = 0;
  const addRedFlag = (severity, titleText, desc, category) => {
    redFlags.push({
      id: `rf-${++flagIdCounter}`,
      severity,
      title: titleText,
      description: desc,
      category
    });
  };

  const addGreenFlag = (titleText, desc) => {
    greenFlags.push({ title: titleText, description: desc });
  };

  // ═══════════════════════════════════════════════════════════════
  // CRITICAL FLAGS — Kesinlikle kaçınılması gereken durumlar
  // ═══════════════════════════════════════════════════════════════

  // 1. Platform dışı iletişim istekleri
  const offPlatformPatterns = [
    /\b(telegram|whatsapp|whats\s*app)\b/i,
    /\b(skype|discord|signal)\b/i,
    /\b(contact\s+me\s+(at|on|via))\b/i,
    /\b(reach\s+(me|out)\s+(at|on|via))\b/i,
    /\b(email\s+me|send\s+(me\s+)?(an?\s+)?email)\b/i,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/  // email adresi
  ];

  for (const pattern of offPlatformPatterns) {
    if (pattern.test(fullText)) {
      addRedFlag(
        SEVERITY.CRITICAL,
        t('redflags.offPlatform.title'),
        t('redflags.offPlatform.desc'),
        'communication'
      );
      break; // Aynı kategoriden bir tane yeter
    }
  }

  // 2. Ön ödeme / para istekleri
  const paymentRequestPatterns = [
    /\b(upfront\s+(payment|fee|cost|deposit))\b/i,
    /\b(pay\s+(before|first|upfront))\b/i,
    /\b(deposit\s+required)\b/i,
    /\b(registration\s+fee)\b/i,
    /\b(buy\s+(the\s+)?(software|license|tool|equipment))\b/i,
    /\b(invest(ment)?\s+required)\b/i,
    /\b(purchase\s+required)\b/i
  ];

  for (const pattern of paymentRequestPatterns) {
    if (pattern.test(fullText)) {
      addRedFlag(
        SEVERITY.CRITICAL,
        t('redflags.upfrontPayment.title'),
        t('redflags.upfrontPayment.desc'),
        'payment'
      );
      break;
    }
  }

  // 3. Kişisel bilgi istekleri
  const personalInfoPatterns = [
    /\b(ssn|social\s+security)\b/i,
    /\b(bank\s+(account|details|information|routing))\b/i,
    /\b(credit\s+card\s+(number|info|details))\b/i,
    /\b(password|login\s+credentials)\b/i,
    /\b(passport\s+(number|copy|scan))\b/i,
    /\b(identity\s+(card|document|verification))\b/i,
    /\b(driver'?s?\s+licen[sc]e)\b/i
  ];

  for (const pattern of personalInfoPatterns) {
    if (pattern.test(fullText)) {
      addRedFlag(
        SEVERITY.CRITICAL,
        t('redflags.personalInfo.title'),
        t('redflags.personalInfo.desc'),
        'personal_info'
      );
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HIGH FLAGS — Yüksek risk göstergeleri
  // ═══════════════════════════════════════════════════════════════

  // 4. Şüpheli dış bağlantılar
  const suspiciousLinkPatterns = [
    /\b(bit\.ly|tinyurl|goo\.gl|t\.co|shorturl)\b/i,
    /\b(click\s+(here|this\s+link))\b/i,
    /\b(fill\s+(out|in)\s+(this|the)\s+form)\b/i,
    /\b(apply\s+(here|at|via|through)\s+(this|the)?\s*(link|form|website|url))\b/i
  ];

  for (const pattern of suspiciousLinkPatterns) {
    if (pattern.test(fullText)) {
      addRedFlag(
        SEVERITY.HIGH,
        t('redflags.suspiciousLink.title'),
        t('redflags.suspiciousLink.desc'),
        'links'
      );
      break;
    }
  }

  // 5. Ödeme yöntemi doğrulanmamış
  if (jobData.client && !jobData.client.paymentVerified) {
    addRedFlag(
      SEVERITY.HIGH,
      t('redflags.paymentUnverified.title'),
      t('redflags.paymentUnverified.desc'),
      'client'
    );
  }

  // 6. Düşük işe alım oranı
  if (jobData.client?.hireRate !== null && jobData.client?.hireRate !== undefined) {
    if (jobData.client.hireRate < 20 && jobData.client.hireRate > 0) {
      addRedFlag(
        SEVERITY.HIGH,
        t('redflags.lowHireRate.title'),
        t('redflags.lowHireRate.desc', { rate: jobData.client.hireRate }),
        'client'
      );
    }
  }

  // 7. Test projesi / bedava çalışma
  const freeWorkPatterns = [
    /\b(free\s+(sample|trial|test|work))\b/i,
    /\b(unpaid\s+(test|trial|sample|task))\b/i,
    /\b(test\s+project\s+(first|before))\b/i,
    /\b(do\s+(a|this)\s+test\s+(first|task))\b/i,
    /\b(prove\s+(yourself|your\s+skills))\b/i,
    /\b(work\s+for\s+free)\b/i,
    /\b(no\s+pay(ment)?\s+(for|until))\b/i
  ];

  for (const pattern of freeWorkPatterns) {
    if (pattern.test(fullText)) {
      addRedFlag(
        SEVERITY.HIGH,
        t('redflags.freeWork.title'),
        t('redflags.freeWork.desc'),
        'exploitation'
      );
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MEDIUM FLAGS — Dikkat edilmesi gereken durumlar
  // ═══════════════════════════════════════════════════════════════

  // 8. Toplam harcama $0
  if (jobData.client?.totalSpentNumeric === 0) {
    addRedFlag(
      SEVERITY.MEDIUM,
      t('redflags.noSpending.title'),
      t('redflags.noSpending.desc'),
      'client'
    );
  }

  // 9. Müşteri puanı yok
  if (jobData.client && (jobData.client.rating === null || jobData.client.rating === undefined)) {
    addRedFlag(
      SEVERITY.MEDIUM,
      t('redflags.noRating.title'),
      t('redflags.noRating.desc'),
      'client'
    );
  }

  // 10. Çok kısa açıklama
  if (wordCount > 0 && wordCount < 50) {
    addRedFlag(
      SEVERITY.MEDIUM,
      t('redflags.shortDesc.title'),
      t('redflags.shortDesc.desc', { count: wordCount }),
      'quality'
    );
  }

  // 11. Gerçekçi olmayan aciliyet
  const urgencyPatterns = [
    /\bURGENT\b/,                       // Büyük harflerle URGENT
    /\bASAP\b/,                         // Büyük harflerle ASAP
    /\bIMMEDIATELY\b/,                  // Büyük harflerle IMMEDIATELY
    /!!!+/,                             // Çoklu ünlem
    /\b(need(ed)?\s+(right\s+)?now)\b/i,
    /\b(start\s+(immediately|today|right\s+now))\b/i
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(jobData.description || '') || pattern.test(jobData.title || '')) {
      addRedFlag(
        SEVERITY.MEDIUM,
        t('redflags.urgency.title'),
        t('redflags.urgency.desc'),
        'quality'
      );
      break;
    }
  }

  // 12. Bütçe / Deneyim uyumsuzluğu
  if (jobData.experienceLevel === 'expert' && jobData.budget) {
    const budget = jobData.budget;
    let isMismatch = false;

    if (budget.type === 'hourly' && budget.max && budget.max < 25) {
      isMismatch = true;
    } else if (budget.type === 'fixed' && budget.amount && budget.amount < 100) {
      isMismatch = true;
    }

    if (isMismatch) {
      addRedFlag(
        SEVERITY.MEDIUM,
        t('redflags.budgetMismatch.title'),
        t('redflags.budgetMismatch.desc'),
        'budget'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LOW FLAGS — Hafif uyarılar
  // ═══════════════════════════════════════════════════════════════

  // 13. Çok fazla teklif (50+)
  if (jobData.proposalCount !== null && jobData.proposalCount !== undefined && jobData.proposalCount >= 50) {
    addRedFlag(
      SEVERITY.LOW,
      t('redflags.highCompetition.title'),
      t('redflags.highCompetition.desc', { count: jobData.proposalCount }),
      'competition'
    );
  }

  // 14. Yetenek belirtilmemiş
  if (!jobData.skills || jobData.skills.length === 0) {
    addRedFlag(
      SEVERITY.LOW,
      t('redflags.noSkills.title'),
      t('redflags.noSkills.desc'),
      'quality'
    );
  }

  // 15. Çok fazla yetenek isteniyor (10+)
  if (jobData.skills && jobData.skills.length > 10) {
    addRedFlag(
      SEVERITY.LOW,
      t('redflags.tooManySkills.title'),
      t('redflags.tooManySkills.desc', { count: jobData.skills.length }),
      'quality'
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GREEN FLAGS — Olumlu göstergeler
  // ═══════════════════════════════════════════════════════════════

  // Ödeme doğrulanmış
  if (jobData.client?.paymentVerified) {
    addGreenFlag(
      t('greenflags.paymentVerified.title'),
      t('greenflags.paymentVerified.desc')
    );
  }

  // Yüksek işe alım oranı (>70%)
  if (jobData.client?.hireRate > 70) {
    addGreenFlag(
      t('greenflags.highHireRate.title'),
      t('greenflags.highHireRate.desc', { rate: jobData.client.hireRate })
    );
  }

  // Yüksek toplam harcama (>$10K)
  if (jobData.client?.totalSpentNumeric > 10000) {
    addGreenFlag(
      t('greenflags.highSpending.title'),
      t('greenflags.highSpending.desc', { amount: formatMoney(jobData.client.totalSpentNumeric) })
    );
  }

  // İyi puan (>4.5)
  if (jobData.client?.rating > 4.5) {
    addGreenFlag(
      t('greenflags.highRating.title'),
      t('greenflags.highRating.desc', { rating: jobData.client.rating })
    );
  }

  // Detaylı açıklama (>200 kelime)
  if (wordCount > 200) {
    addGreenFlag(
      t('greenflags.detailedDesc.title'),
      t('greenflags.detailedDesc.desc', { count: wordCount })
    );
  }

  // Makul bütçe kontrolü
  if (jobData.budget) {
    const budget = jobData.budget;
    let isReasonable = false;

    if (budget.type === 'hourly') {
      if (jobData.experienceLevel === 'entry' && budget.min >= 10) isReasonable = true;
      if (jobData.experienceLevel === 'intermediate' && budget.min >= 25) isReasonable = true;
      if (jobData.experienceLevel === 'expert' && budget.min >= 60) isReasonable = true;
      if (!jobData.experienceLevel && budget.min >= 15) isReasonable = true;
    } else if (budget.type === 'fixed' && budget.amount >= 500) {
      isReasonable = true;
    }

    if (isReasonable) {
      addGreenFlag(
        t('greenflags.reasonableBudget.title'),
        t('greenflags.reasonableBudget.desc')
      );
    }
  }

  return { redFlags, greenFlags };
}

/**
 * Para miktarını okunabilir formata çevirir
 * @param {number} amount
 * @returns {string}
 */
function formatMoney(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
}
