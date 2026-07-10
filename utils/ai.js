/**
 * AI Utility Module
 * Manages API requests, model resolution, and CV parsing.
 */
import { t, getLanguage } from './i18n.js';

// ─── Model Cache ──────────────────────────────────────────────────────────────
// Cache resolved model names to avoid hitting the models list API every single call
const modelCache = {
  gemini: { name: null, expiry: 0 },
  openai: { name: null, expiry: 0 },
  groq: { name: null, expiry: 0 },
  custom: { name: null, expiry: 0 }
};
const MODEL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedModel(provider) {
  const entry = modelCache[provider];
  if (entry && entry.name && Date.now() < entry.expiry) {
    console.log(`[UJA] Using cached model for ${provider}: ${entry.name}`);
    return entry.name;
  }
  return null;
}

function setCachedModel(provider, name) {
  modelCache[provider] = { name, expiry: Date.now() + MODEL_CACHE_TTL };
}

// ─── Retry Helper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    
    if (res.status === 429 && attempt < maxRetries) {
      // Use Retry-After header if available, otherwise exponential backoff
      const retryAfter = res.headers.get('Retry-After');
      let waitMs;
      if (retryAfter && !isNaN(Number(retryAfter))) {
        waitMs = Number(retryAfter) * 1000; // Retry-After is in seconds
      } else {
        waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
      }
      waitMs = Math.min(waitMs, 15000); // Cap at 15 seconds max
      console.warn(`[UJA] Rate limited (429). Retry ${attempt + 1}/${maxRetries} in ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    
    return res;
  }
  // All retries exhausted — return last response so caller can handle the error
  return await fetch(url, options);
}

// ─── Public: Fetch Available Models (for Settings dropdown) ───────────────────
export async function fetchAvailableModels(apiProvider, baseUrl, apiKey) {
  try {
    if (apiProvider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || !data.models) return [];
      
      const models = data.models
        .filter(m => 
          m.name.includes('gemini-') && 
          !m.name.includes('vision') && 
          !m.name.includes('embedding') &&
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map(m => m.name.replace('models/', ''));
      models.sort((a, b) => b.localeCompare(a));
      return models;
    } else {
      const modelsUrl = baseUrl.replace(/\/chat\/completions\/?$/, '/models');
      if (modelsUrl === baseUrl) return [];
      
      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || !data.data || !Array.isArray(data.data)) return [];
      
      const models = data.data.map(m => m.id);
      return models.filter(m => 
        !m.includes('embedding') && !m.includes('whisper') && 
        !m.includes('tts') && !m.includes('dall-e') && !m.includes('babbage') && !m.includes('davinci')
      ).sort((a, b) => b.localeCompare(a));
    }
  } catch(err) {
    console.error('[UJA] Error fetching available models:', err);
    return [];
  }
}

// ─── Private: Get Best Model (with cache) ─────────────────────────────────────
async function getBestModel(apiProvider, baseUrl, apiKey) {
  // Check cache first
  const cached = getCachedModel(apiProvider);
  if (cached) return cached;
  
  try {
    if (apiProvider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        setCachedModel('gemini', 'gemini-2.0-flash');
        return 'gemini-2.0-flash';
      }
      const data = await res.json();
      if (!data || !data.models) {
        setCachedModel('gemini', 'gemini-2.0-flash');
        return 'gemini-2.0-flash';
      }
      
      const models = data.models
        .filter(m => 
          m.name.includes('gemini-') && 
          !m.name.includes('vision') && 
          !m.name.includes('embedding') &&
          m.supportedGenerationMethods && 
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map(m => m.name.replace('models/', ''));
        
      if (models.length === 0) {
        setCachedModel('gemini', 'gemini-2.0-flash');
        return 'gemini-2.0-flash';
      }
      
      models.sort((a, b) => b.localeCompare(a));
      const best = models.find(m => m.includes('flash') && !m.includes('thinking')) || models[0];
      console.log('[UJA] Gemini best model selected:', best);
      setCachedModel('gemini', best);
      return best;
    } else {
      // OpenAI / Groq / Custom
      const modelsUrl = baseUrl.replace(/\/chat\/completions\/?$/, '/models');
      if (modelsUrl === baseUrl) return null;
      
      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.data || data.data.length === 0) return null;
      
      const models = data.data.map(m => m.id);
      const chatModels = models.filter(m => 
        !m.includes('embedding') && !m.includes('whisper') && 
        !m.includes('tts') && !m.includes('dall-e') && !m.includes('babbage') && !m.includes('davinci')
      );
      
      if (chatModels.length === 0) return models[0];
      
      if (apiProvider === 'groq') {
        const mixtral = chatModels.find(m => m.includes('mixtral'));
        const llama = chatModels.find(m => m.includes('llama3') && m.includes('70b'));
        const best = mixtral || llama || chatModels[0];
        setCachedModel('groq', best);
        return best;
      }
      
      chatModels.sort((a, b) => b.localeCompare(a));
      const mini = chatModels.find(m => m.includes('mini'));
      const gpt4o = chatModels.find(m => m.includes('gpt-4o'));
      const best = mini || gpt4o || chatModels[0];
      setCachedModel(apiProvider, best);
      return best;
    }
  } catch (err) {
    console.error('[UJA] Failed to fetch models dynamically:', err);
    return null;
  }
}

// ─── Public: Main AI Entry Point ──────────────────────────────────────────────
export async function callAI(messages, profile) {
  const openAIApiKey = (profile.openAIApiKey || '').trim();
  let apiBaseUrl = (profile.apiBaseUrl || '').trim();
  let apiModel = (profile.apiModel || '').trim();
  let apiProvider = profile.apiProvider || 'auto';
  
  if (!openAIApiKey) {
    throw new Error(t('api.errorMissingKey') || 'API Key missing. Please enter it in Settings.');
  }

  // Auto-detect provider if needed
  if (apiProvider === 'auto') {
    if (openAIApiKey.startsWith('AIza') || openAIApiKey.startsWith('AQ.')) apiProvider = 'gemini';
    else if (openAIApiKey.startsWith('gsk_')) apiProvider = 'groq';
    else apiProvider = 'openai';
  }

  try {
    if (apiProvider === 'gemini') {
      return await callGemini(messages, openAIApiKey, apiModel);
    } else {
      if (apiProvider === 'groq' && (!apiBaseUrl || apiBaseUrl.includes('api.openai.com'))) {
        apiBaseUrl = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (!apiBaseUrl) {
        apiBaseUrl = 'https://api.openai.com/v1/chat/completions';
      }
      return await callOpenAICompatible(messages, openAIApiKey, apiBaseUrl, apiModel, apiProvider);
    }
  } catch (err) {
    console.error('[UJA] callAI error:', err);
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error(t('api.errorNetwork') || 'Network error (Failed to fetch). Check your connection, VPN, or if the API URL is correct.');
    }
    throw err;
  }
}

// ─── Gemini Native API ────────────────────────────────────────────────────────
async function callGemini(messages, apiKey, apiModel) {
  let modelToUse = apiModel;
  
  // If no model specified, or model belongs to another provider, dynamically find the best one
  // getBestModel is safe to call because it caches the result for 10 minutes.
  if (!modelToUse || modelToUse.toLowerCase().includes('gpt-') || modelToUse.toLowerCase().includes('claude-') || modelToUse.toLowerCase().includes('llama')) {
    modelToUse = await getBestModel('gemini', null, apiKey);
  }
  
  if (!modelToUse) modelToUse = 'gemini-2.0-flash';
  
  console.log('[UJA] Calling Gemini with model:', modelToUse);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
  
  // Build Gemini-native format with system instruction
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');
  
  const payload = {
    contents: userMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: { temperature: 0.3 }
  };
  
  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  // Use retry wrapper for 429 handling
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errorBody = '';
    try { errorBody = await res.text(); } catch(e) {}
    let errorDetail = '';
    try {
      const parsed = JSON.parse(errorBody);
      errorDetail = parsed.error?.message || '';
    } catch(e) { errorDetail = errorBody.substring(0, 200); }
    
    console.error(`[UJA] Gemini API Error ${res.status}:`, errorDetail);
    
    if (res.status === 403) {
      throw new Error(t('api.errorAuth', { provider: 'Gemini' }) || 'Gemini API Auth error. Check your API Key.');
    }
    if (res.status === 400) {
      throw new Error(`Gemini API Hatası: ${errorDetail || 'Geçersiz istek (400). Model adını kontrol edin.'}`);
    }
    if (res.status === 429) {
      throw new Error(t('api.errorQuota', { provider: 'Gemini' }) || 'Gemini API Quota Exceeded (429).');
    }
    const genericMsg = t('api.errorGeneric', { provider: 'Gemini' }) || 'Gemini API Error: {{status}} {{text}}';
    throw new Error(genericMsg.replace('{{status}}', res.status).replace('{{text}}', errorDetail || res.statusText));
  }
  
  const data = await res.json();
  
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini içerik engeli: ${data.promptFeedback.blockReason}`);
  }
  
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  
  console.error('[UJA] Gemini unexpected response:', JSON.stringify(data).substring(0, 500));
  throw new Error(t('api.errorInvalidResponse') || 'Invalid Gemini API response.');
}

// ─── OpenAI-Compatible API (OpenAI / Groq / Custom) ──────────────────────────
async function callOpenAICompatible(messages, apiKey, apiBaseUrl, apiModel, apiProvider) {
  let finalModel = apiModel;
  if (!finalModel) {
    const fetchedModel = await getBestModel(apiProvider, apiBaseUrl, apiKey);
    finalModel = fetchedModel || 'gpt-4o-mini';
  }
  
  const payload = {
    model: finalModel,
    messages: messages,
    temperature: 0.3
  };
  
  const res = await fetchWithRetry(apiBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorData = await res.text();
    let parsedError;
    try { parsedError = JSON.parse(errorData); } catch (e) {}
    
    const provName = apiProvider === 'groq' ? 'Groq' : 'OpenAI';

    if (res.status === 401 || res.status === 403) {
      throw new Error(t('api.errorAuth', { provider: provName }) || `API Auth error. Check your API Key.`);
    }
    if (res.status === 429) {
      throw new Error(t('api.errorQuota', { provider: provName }) || `API Quota Exceeded.`);
    }
    
    const msg = (parsedError && parsedError.error && parsedError.error.message) ? parsedError.error.message : res.statusText;
    const genericMsg = t('api.errorGeneric', { provider: provName }) || `API Error: {{status}} {{text}}`;
    throw new Error(genericMsg.replace('{{status}}', res.status).replace('{{text}}', msg));
  }
  
  const data = await res.json();
  if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(t('api.errorInvalidResponse') || 'Invalid API response.');
  }
  
  return data.choices[0].message.content.trim();
}

// ─── CV Skill Extraction ─────────────────────────────────────────────────────
export async function extractSkillsFromCV(cvText, profile) {
  const langMap = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', pt: 'Portekizce', ar: 'Arapça' };
  const currentLang = getLanguage();
  const langName = langMap[currentLang] || 'İngilizce';
  const messages = [
    { 
      role: 'system', 
      content: `Sen uzman bir İK asistanısın. Verilen CV metnini analiz et ve aday için en önemli 10 teknik yeteneği çıkar. Sadece bu yetenekleri aralarında virgül olacak şekilde tek bir satır olarak döndür. Hiçbir ek açıklama, giriş veya çıkış cümlesi kullanma. LÜTFEN YETENEKLERİ ${langName} DİLİNDE VEYA ORİJİNAL TEKNİK ADIYLA YAZ!` 
    },
    { 
      role: 'user', 
      content: cvText 
    }
  ];
  return await callAI(messages, profile);
}
