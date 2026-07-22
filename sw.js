import { analyzeJob } from './analysis/scorer.js';
import { StorageHelper, DEFAULT_USER_PROFILE } from './utils/storage.js';
import { MSG } from './utils/messaging.js';
import { setLanguage, t } from './utils/i18n.js';
import { callAI } from './utils/ai.js';

// Anti-spam & Caching for API protection
const requestCache = new Map();
const CACHE_TTL = 60000; // 1 dakika (60,000 ms)

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await StorageHelper.saveUserProfile(DEFAULT_USER_PROFILE);
    console.log('[UJA] Extension installed, default settings saved.');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('[UJA] Message handler error:', err);
    sendResponse({ error: err.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const { type, data } = message;
  
  switch (type) {
    case MSG.ANALYZE_JOB: {
      const jobId = data.id || 'unknown';
      
      // Check Anti-Spam Cache
      if (jobId !== 'unknown' && requestCache.has(jobId)) {
        const lastReqTime = requestCache.get(jobId);
        if (Date.now() - lastReqTime < CACHE_TTL) {
          console.log(`[UJA] Rate limited: Skipping duplicate request for ${jobId} within 1 minute.`);
          const existingAnalysis = await StorageHelper.getAnalysisById(jobId);
          if (existingAnalysis) {
             return { success: true, analysis: existingAnalysis, cached: true };
          }
        }
      }
      
      // Update cache timestamp
      if (jobId !== 'unknown') {
        requestCache.set(jobId, Date.now());
      }
      
      const profile = await StorageHelper.getUserProfile();
      const settings = await StorageHelper.getSettings();
      // Set language before analysis so strings are in correct language
      if (settings.language) setLanguage(settings.language);
      
      const result = analyzeJob(data, profile);
      
      // If it's a search page tile, just return the basic score for the inline badge
      // Do NOT run AI, do NOT save to history, do NOT override last analysis.
      if (data.isSearchTile) {
        let i18nLabel = result.scoreLabel === 'high-risk' ? 'highRisk' : result.scoreLabel;
        return { 
          success: true, 
          analysis: result,
          badgeLabels: {
            scoreText: t('ui.scoreText') || 'Skor',
            risk: t('ui.redFlags') || 'Risk',
            classificationText: t(`score.${i18nLabel}`) || result.scoreLabel
          }
        };
      }
      
      // Auto AI Analysis (Only for Job Detail Pages)
      if (profile.aiAnalysisMode === 'auto' && profile.openAIApiKey) {
        try {
          const langMap = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', pt: 'Portekizce', ar: 'Arapça' };
          const langName = langMap[settings.language || 'en'] || 'İngilizce';
          const systemPrompt = `Sen kıdemli bir Upwork ilan analiz botusun. Kullanıcının yetenekleri: ${(profile.skills || []).join(', ')}. Verilen ilanı oku. Sadece 3 kısa madde halinde, 50 kelimeyi geçmeyecek şekilde ilandaki en büyük riskleri ve kullanıcının yetenekleriyle uyuşup uyuşmadığını yaz. Asla gereksiz açıklama yapma. LÜTFEN CEVABINI KESİNLİKLE ${langName} DİLİNDE VER!`;
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Job Title: ${data.title}\nJob Description: ${data.description}` }
          ];
          result.aiSummary = await callAI(messages, profile);
        } catch (err) {
          console.error('[UJA] Auto AI Analysis Error:', err);
          result.aiSummary = (t('ui.aiError') || 'AI Error') + ': ' + err.message;
        }
      }
      
      await StorageHelper.saveAnalysis(result);
      updateBadge(result.overallScore, sender.tab?.id);
      
      const badgeLabels = {
        scoreLabel: t('score.' + (result.scoreLabel === 'high-risk' ? 'highRisk' : result.scoreLabel)) || result.scoreLabel,
        risk: t('ui.risk') || 'Risk',
        clean: t('ui.clean') || 'Temiz',
        scoreText: t('ui.score') || 'Skor'
      };
      
      return { success: true, analysis: result, badgeLabels };
    }
    case MSG.GET_ANALYSIS:
      return { success: true, analysis: await StorageHelper.getLastAnalysis() };
      
    case MSG.RUN_AI_ANALYSIS: {
      const profile = await StorageHelper.getUserProfile();
      const settings = await StorageHelper.getSettings();
      if (settings.language) setLanguage(settings.language);
      const analysisData = data; // the existing analysis object
      
      try {
        if (!profile.openAIApiKey) {
          return { success: false, error: t('api.errorMissingKey') || 'API Key is missing.' };
        }
        
        const langMap = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', pt: 'Portekizce', ar: 'Arapça' };
        const langName = langMap[settings.language || 'en'] || 'İngilizce';
        const systemPrompt = `Sen kıdemli bir Upwork ilan analiz botusun. Kullanıcının yetenekleri: ${(profile.skills || []).join(', ')}. Verilen ilanı oku. Sadece 3 kısa madde halinde, 50 kelimeyi geçmeyecek şekilde ilandaki en büyük riskleri ve kullanıcının yetenekleriyle uyuşup uyuşmadığını yaz. Asla gereksiz açıklama yapma. LÜTFEN CEVABINI KESİNLİKLE ${langName} DİLİNDE VER!`;
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Job Title: ${analysisData.jobTitle}\nJob Description: ${analysisData.rawData?.description || ''}` }
        ];
        
        analysisData.aiSummary = await callAI(messages, profile);
        
        // Save the updated analysis
        await StorageHelper.saveAnalysis(analysisData);
        
        return { success: true, analysis: analysisData };
      } catch (err) {
        console.error('[UJA] Manual AI fetch error:', err);
        return { error: err.message };
      }
    }
      
    case MSG.GET_HISTORY:
      return { success: true, history: await StorageHelper.getHistory() };
    case MSG.CLEAR_HISTORY:
      await StorageHelper.clearHistory();
      return { success: true };
    case MSG.REANALYZE_ALL: {
      const profile = await StorageHelper.getUserProfile();
      const settings = await StorageHelper.getSettings();
      if (settings.language) setLanguage(settings.language);
      
      const history = await StorageHelper.getHistory();
      for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item.rawData) {
           const updated = analyzeJob(item.rawData, profile);
           updated.analyzedAt = item.analyzedAt; // preserve original time
           await StorageHelper.saveAnalysis(updated);
        }
      }
      return { success: true };
    }
    case MSG.GET_SETTINGS:
      return { success: true, profile: await StorageHelper.getUserProfile() };
    case MSG.UPDATE_SETTINGS:
      await StorageHelper.saveUserProfile(data);
      return { success: true };
    case MSG.VERIFY_LICENSE:
      try {
        const response = await fetch("http://localhost:8787", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: data.licenseKey })
        });
        const result = await response.json();
        
        if (result.valid) {
          await StorageHelper.saveUserProfile({ licenseKey: data.licenseKey, isPremium: true });
          return { success: true, valid: true };
        } else {
          await StorageHelper.saveUserProfile({ isPremium: false });
          return { success: false, valid: false, error: result.error || "Geçersiz lisans" };
        }
      } catch (err) {
        return { success: false, error: "Bağlantı hatası: " + err.message };
      }
    default:
      return { error: 'Unknown message type: ' + type };
  }
}

function updateBadge(score, tabId) {
  const text = String(score);
  let color;
  if (score <= 30) color = '#ef4444'; // red
  else if (score <= 60) color = '#f59e0b'; // amber
  else if (score <= 80) color = '#22c55e'; // green
  else color = '#14a800'; // upwork green
  
  const target = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text, ...target });
  chrome.action.setBadgeBackgroundColor({ color, ...target });
  chrome.action.setBadgeTextColor({ color: '#ffffff', ...target });
}
