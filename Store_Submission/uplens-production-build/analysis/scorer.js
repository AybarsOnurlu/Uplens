/**
 * Job Scorer Module — Ana Puanlama Motoru
 * 
 * Tüm analiz alt modüllerini birleştirir ve ağırlıklı
 * genel skor hesaplar. Yetenek eşleştirmesi de burada yapılır.
 * 
 * Ağırlıklar:
 * - Bütçe: %25
 * - Müşteri: %30
 * - Kalite: %25
 * - Risk: %20
 */

import { detectRedFlags, SEVERITY_WEIGHTS } from './redflags.js';
import { analyzeBudget } from './budget.js';
import { analyzeClient } from './client.js';
import { t } from '../utils/i18n.js';

const WEIGHTS = {
  BUDGET: 0.25,
  CLIENT: 0.30,
  QUALITY: 0.25,
  RISK: 0.20
};

/**
 * İş ilanını tam kapsamlı analiz eder
 * 
 * @param {object} jobData - İçerik scriptinden gelen iş verisi
 * @param {object} userProfile - Kullanıcı profili (yetenekler, minimum oranlar)
 * @returns {object} Tam analiz sonucu (analysisResult formatında)
 */
export function analyzeJob(jobData, userProfile) {
  const { redFlags, greenFlags } = detectRedFlags(jobData);
  const budgetAnalysis = analyzeBudget(jobData, userProfile);
  const clientAnalysis = analyzeClient(jobData);
  const riskScore = calculateRiskScore(redFlags);
  const skillMatch = matchSkills(jobData.skills, jobData.description, userProfile?.skills);
  const qualityAnalysis = analyzeQuality(jobData, skillMatch);

  const overallScore = Math.round(
    budgetAnalysis.score * WEIGHTS.BUDGET +
    clientAnalysis.score * WEIGHTS.CLIENT +
    qualityAnalysis.score * WEIGHTS.QUALITY +
    riskScore * WEIGHTS.RISK
  );

  // Skor sınırlandırma
  const clampedScore = Math.max(0, Math.min(100, overallScore));

  const criticalFlags = redFlags.filter(f => f.severity === 'critical');
  let finalScore = clampedScore;

  if (criticalFlags.length > 0) {
    // Her kritik bayrak skoru %15 düşürür (minimum 5)
    const criticalPenalty = criticalFlags.length * 15;
    finalScore = Math.max(5, finalScore - criticalPenalty);
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  const analysisResult = {
    jobId: jobData.id || '',
    jobTitle: jobData.title || '',
    jobUrl: jobData.url || '',
    overallScore: finalScore,
    scoreLabel: getScoreLabel(finalScore),
    budgetAnalysis: {
      score: budgetAnalysis.score,
      label: budgetAnalysis.label,
      details: budgetAnalysis.details
    },
    clientAnalysis: {
      score: clientAnalysis.score,
      label: clientAnalysis.label,
      details: clientAnalysis.details
    },
    qualityAnalysis: {
      score: qualityAnalysis.score,
      label: qualityAnalysis.label,
      details: qualityAnalysis.details
    },
    redFlags,
    greenFlags,
    skillMatch,
    rawData: jobData,
    analyzedAt: Date.now()
  };

  return analysisResult;
}

/**
 * İlan kalitesini analiz eder (açıklama uzunluğu, yetenek, deneyim eşleşmesi)
 * 
 * @param {object} jobData
 * @param {object} skillMatch
 * @returns {{ score: number, label: string, details: string[] }}
 */
function analyzeQuality(jobData, skillMatch) {
  const details = [];
  let score = 50;

  const description = jobData.description || '';
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const ICON_FLAG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-red-500"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  const ICON_TREND_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-orange-400"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>';
  const ICON_WARNING = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  const ICON_CHART = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-blue-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>';
  const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block mr-1 shrink-0 text-green-500"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_STAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const ICON_CLIPBOARD = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 shrink-0 text-slate-400"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/></svg>';

  if (jobData.isSearchTile) {
    // Search page only has excerpts, so don't penalize. Give neutral/good score.
    score += 10;
    details.push(`${ICON_CHECK} Arama sonuçlarında özet gösteriliyor`);
  } else {
    if (wordCount === 0) {
      score -= 30;
      details.push(`${ICON_FLAG} ${t('quality.veryShort', { count: wordCount })}`);
    } else if (wordCount < 30) {
      score -= 20;
      details.push(`${ICON_TREND_DOWN} ${t('quality.veryShort', { count: wordCount })}`);
    } else if (wordCount < 50) {
      score -= 10;
      details.push(`${ICON_WARNING} ${t('quality.short', { count: wordCount })}`);
    } else if (wordCount >= 50 && wordCount < 150) {
      score += 5;
      details.push(`${ICON_CHART} ${t('quality.medium', { count: wordCount })}`);
    } else if (wordCount >= 150 && wordCount < 300) {
      score += 15;
      details.push(`${ICON_CHECK} ${t('quality.detailed', { count: wordCount })}`);
    } else if (wordCount >= 300) {
      score += 20;
      details.push(`${ICON_STAR} ${t('quality.veryDetailed', { count: wordCount })}`);
    }
  }

  const skills = jobData.skills || [];

  if (skillMatch && skillMatch.hasUserSkills && skillMatch.matchPercentage > 0) {
    if (skillMatch.matchPercentage >= 50) {
      score += 15;
      details.push(`${ICON_STAR} Yetenekleriniz ilanla çok uyumlu (%${skillMatch.matchPercentage})`);
    } else {
      score += 5;
      details.push(`${ICON_CHECK} Yetenekleriniz kısmen eşleşiyor (%${skillMatch.matchPercentage})`);
    }
  } else if (skillMatch && skillMatch.hasUserSkills && skillMatch.unmatched && skillMatch.unmatched.length > 0 && skills.length > 0) {
    score -= 10;
    details.push(`${ICON_WARNING} Yetenekleriniz ilanla eşleşmiyor`);
  } else if (skills.length === 0) {
    score -= 10;
    details.push(`${ICON_WARNING} ${t('quality.noSkills')}`);
  } else if (skills.length >= 1 && skills.length <= 5) {
    score += 10;
    details.push(`${ICON_CHECK} ${t('quality.goodSkillCount', { count: skills.length })}`);
  } else if (skills.length > 5 && skills.length <= 10) {
    score += 5;
    details.push(`${ICON_CHART} ${t('quality.goodSkillCount', { count: skills.length })}`);
  } else if (skills.length > 10) {
    score -= 5;
    details.push(`${ICON_WARNING} ${t('quality.tooManySkills', { count: skills.length })}`);
  }

  if (jobData.experienceLevel) {
    const levelLabels = {
      entry: () => t('quality.levelEntry'),
      intermediate: () => t('quality.levelIntermediate'),
      expert: () => t('quality.levelExpert')
    };
    const levelText = levelLabels[jobData.experienceLevel] ? levelLabels[jobData.experienceLevel]() : jobData.experienceLevel;
    details.push(`${ICON_CLIPBOARD} ${t('quality.hasExpLevel', { level: levelText })}`);
    score += 5; // Deneyim seviyesi belirtilmesi olumlu
  } else {
    details.push(`${ICON_WARNING} ${t('quality.noSkills')}`);
  }

  if (jobData.projectLength) {
    details.push(`⏱️ ${t('quality.hasProjectLength', { length: jobData.projectLength })}`);
    score += 3;
  }

  if (jobData.weeklyHours) {
    details.push(`🕐 Haftalık saat: ${jobData.weeklyHours}`);
    score += 2;
  }

  if (jobData.category) {
    details.push(`📂 Kategori: ${jobData.category}`);
  }

  if (jobData.proposalCount !== null && jobData.proposalCount !== undefined) {
    if (jobData.proposalCount < 5) {
      score += 10;
      details.push(`${ICON_STAR} Az teklif: ${jobData.proposalCount} — Düşük rekabet`);
    } else if (jobData.proposalCount >= 5 && jobData.proposalCount <= 15) {
      score += 5;
      details.push(`${ICON_CHART} Normal teklif sayısı: ${jobData.proposalCount}`);
    } else if (jobData.proposalCount > 15 && jobData.proposalCount <= 50) {
      details.push(`${ICON_WARNING} Yüksek teklif sayısı: ${jobData.proposalCount}`);
    } else if (jobData.proposalCount > 50) {
      score -= 10;
      details.push(`${ICON_FLAG} Çok yüksek rekabet: ${jobData.proposalCount}+ teklif`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: qualityLabel(score),
    details
  };
}

/**
 * Kırmızı bayrakların ağırlığına göre risk skoru hesaplar
 * Yüksek skor = düşük risk (iyi)
 * 
 * @param {object[]} redFlags
 * @returns {number} 0-100 risk skoru (100 = risksiz)
 */
function calculateRiskScore(redFlags) {
  if (redFlags.length === 0) return 100;

  // Toplam risk puanını hesapla
  let totalPenalty = 0;
  for (const flag of redFlags) {
    totalPenalty += SEVERITY_WEIGHTS[flag.severity] || 5;
  }

  // Maksimum ceza sınırı
  const maxPenalty = 100;
  const normalizedPenalty = Math.min(totalPenalty, maxPenalty);

  // 100'den çıkar (yüksek skor = düşük risk)
  return Math.max(0, 100 - normalizedPenalty);
}

/**
 * Kullanıcı yetenekleri ile ilan yeteneklerini eşleştirir
 * 
 * @param {string[]} jobSkills - İlandaki yetenekler
 * @param {string} jobDescription - İlan metni (açıklamadan da yetenek aramak için)
 * @param {string[]} userSkills - Kullanıcının yetenekleri
 * @returns {{ matched: string[], unmatched: string[], matchPercentage: number }}
 */
function matchSkills(jobSkills = [], jobDescription = '', userSkills = []) {
  if (!jobSkills) jobSkills = [];
  if (!userSkills || !userSkills.length) {
    return {
      matched: [],
      unmatched: jobSkills,
      matchPercentage: 0,
      hasUserSkills: false
    };
  }

  // Kullanıcı yeteneklerini gruplara ayırarak eşanlamlı kelimeleri (synonyms) destekle
  // Örn: "Leadership (team management, manager)" -> { original: "...", aliases: ["leadership", "team management", "manager"] }
  const skillGroups = userSkills.map(skillStr => {
    const group = { original: skillStr, aliases: [] };
    const parenMatch = skillStr.match(/^(.*?)\((.*?)\)$/);
    const colonMatch = skillStr.match(/^(.*?):(.*)$/);
    
    if (parenMatch) {
      group.aliases.push(parenMatch[1].toLowerCase().trim());
      parenMatch[2].split(',').forEach(a => group.aliases.push(a.toLowerCase().trim()));
    } else if (colonMatch) {
      group.aliases.push(colonMatch[1].toLowerCase().trim());
      colonMatch[2].split(',').forEach(a => group.aliases.push(a.toLowerCase().trim()));
    } else {
      group.aliases.push(skillStr.toLowerCase().trim());
    }
    group.aliases = group.aliases.filter(Boolean);
    return group;
  });

  const matchedJobSkills = [];
  const unmatchedJobSkills = [];
  const matchedUserGroups = new Set(); // Hangi yetenek gruplarından puan aldığımızı takip et

  // 1. İlan etiketlerini (tags) kontrol et
  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = jobSkill.toLowerCase().trim();
    let isMatch = false;
    
    for (const group of skillGroups) {
      const groupMatches = group.aliases.some(alias => 
        alias === normalizedJobSkill || 
        normalizedJobSkill.includes(alias) || 
        alias.includes(normalizedJobSkill)
      );
      
      if (groupMatches) {
        isMatch = true;
        matchedUserGroups.add(group);
        break;
      }
    }

    if (isMatch) matchedJobSkills.push(jobSkill);
    else unmatchedJobSkills.push(jobSkill);
  }

  // 2. Kalan kullanıcı yeteneklerini ilan metninde (description) ara
  const descLower = (jobDescription || '').toLowerCase();
  let descMatchCount = 0;
  
  for (const group of skillGroups) {
    if (!matchedUserGroups.has(group)) {
      // Eğer bu yetenek grubundan henüz puan almadıysak açıklama metnine bak
      // Kelimenin tek başına geçmesine dikkat et (opsiyonel ama sağlıklı)
      const groupMatchesDesc = group.aliases.some(alias => descLower.includes(alias));
      if (groupMatchesDesc) {
        descMatchCount++;
        matchedUserGroups.add(group);
      }
    }
  }

  const totalPossible = Math.max(jobSkills.length, 1);
  const matchPercentage = Math.round(((matchedJobSkills.length + descMatchCount) / totalPossible) * 100);

  return {
    matched: matchedJobSkills,
    unmatched: unmatchedJobSkills,
    matchPercentage: Math.min(100, matchPercentage),
    hasUserSkills: true
  };
}

/**
 * Genel skoru etikete çevirir
 * @param {number} score
 * @returns {'high-risk' | 'caution' | 'decent' | 'good'}
 */
function getScoreLabel(score) {
  if (score <= 30) return 'high-risk';
  if (score <= 60) return 'caution';
  if (score <= 80) return 'decent';
  return 'good';
}

/**
 * Kalite skorunu etikete çevirir
 * @param {number} score
 * @returns {string}
 */
function qualityLabel(score) {
  if (score <= 30) return t('quality.labelLow');
  if (score <= 60) return t('quality.labelMedium');
  if (score <= 80) return t('quality.labelGood');
  return t('quality.labelGood');
}
