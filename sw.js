import { analyzeJob } from './analysis/scorer.js';
import { StorageHelper, DEFAULT_USER_PROFILE } from './utils/storage.js';
import { MSG } from './utils/messaging.js';
import { setLanguage, t } from './utils/i18n.js';
import { callAI } from './utils/ai.js';

const AI_LANGUAGE_NAMES = {
  tr: 'Turkish',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic'
};

function hasAIConfiguration(profile) {
  if ((profile.openAIApiKey || '').trim()) return true;
  if (profile.apiProvider !== 'custom') return false;
  try {
    const url = new URL(profile.apiBaseUrl || '');
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await StorageHelper.saveUserProfile(DEFAULT_USER_PROFILE);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('[UJA] Message handler error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const { type, data } = message;
  
  switch (type) {
    case MSG.ANALYZE_JOB: {
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
            scoreText: t('ui.scoreText') || 'Score',
            risk: t('ui.redFlags') || 'Risk',
            classificationText: t(`score.${i18nLabel}`) || result.scoreLabel
          }
        };
      }
      
      // Auto AI Analysis (Only for Job Detail Pages)
      if (profile.aiAnalysisMode === 'auto' && hasAIConfiguration(profile)) {
        try {
          const langName = AI_LANGUAGE_NAMES[settings.language || 'en'] || 'English';
          const systemPrompt = t('ai.systemPrompt', {
            skills: (profile.skills || []).join(', '),
            lang: langName
          });
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
        clean: t('ui.clean') || 'Clean',
        scoreText: t('ui.score') || 'Score'
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
        if (!hasAIConfiguration(profile)) {
          return { success: false, error: t('api.errorMissingKey') || 'API Key is missing.' };
        }
        
        const langName = AI_LANGUAGE_NAMES[settings.language || 'en'] || 'English';
        const systemPrompt = t('ai.systemPrompt', { skills: (profile.skills || []).join(', '), lang: langName });
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
        return { success: false, error: err.message };
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
    default:
      return { success: false, error: 'Unknown message type: ' + type };
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
