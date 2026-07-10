const fs = require('fs');

const file = 'C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js';
let code = fs.readFileSync(file, 'utf8');

const translations = {
  tr: {
    apiProviderLabel: 'API Sağlayıcı',
    apiProvAuto: 'Otomatik Algıla (Auto-Detect)',
    apiProvOpenAI: 'OpenAI Resmi (sk-...)',
    apiProvGemini: 'Google Gemini (AIza... vb)',
    apiProvCustom: 'Özel Uyumlu (Custom URL)'
  },
  en: {
    apiProviderLabel: 'API Provider',
    apiProvAuto: 'Auto-Detect',
    apiProvOpenAI: 'Official OpenAI (sk-...)',
    apiProvGemini: 'Google Gemini (AIza... etc)',
    apiProvCustom: 'Custom Compatible URL'
  },
  de: {
    apiProviderLabel: 'API-Anbieter',
    apiProvAuto: 'Automatisch erkennen',
    apiProvOpenAI: 'Offiziell OpenAI (sk-...)',
    apiProvGemini: 'Google Gemini',
    apiProvCustom: 'Benutzerdefinierte URL'
  },
  fr: {
    apiProviderLabel: 'Fournisseur API',
    apiProvAuto: 'Détection automatique',
    apiProvOpenAI: 'OpenAI Officiel',
    apiProvGemini: 'Google Gemini',
    apiProvCustom: 'URL personnalisée'
  },
  es: {
    apiProviderLabel: 'Proveedor de API',
    apiProvAuto: 'Detección automática',
    apiProvOpenAI: 'OpenAI Oficial',
    apiProvGemini: 'Google Gemini',
    apiProvCustom: 'URL personalizada'
  },
  pt: {
    apiProviderLabel: 'Provedor de API',
    apiProvAuto: 'Detectar automaticamente',
    apiProvOpenAI: 'OpenAI Oficial',
    apiProvGemini: 'Google Gemini',
    apiProvCustom: 'URL personalizada'
  },
  ar: {
    apiProviderLabel: 'مزود API',
    apiProvAuto: 'اكتشاف تلقائي',
    apiProvOpenAI: 'OpenAI رسمي',
    apiProvGemini: 'Google Gemini',
    apiProvCustom: 'رابط مخصص'
  }
};

for (const [lang, obj] of Object.entries(translations)) {
  const blockStart = code.indexOf(lang + ': {');
  if (blockStart !== -1) {
    const uiPos = code.indexOf('ui: {', blockStart);
    if (uiPos !== -1) {
      let inject = '';
      for (const [k, v] of Object.entries(obj)) {
        inject += `\n      ${k}: '${v}',`;
      }
      code = code.substring(0, uiPos + 5) + inject + code.substring(uiPos + 5);
    }
  }
}

fs.writeFileSync(file, code, 'utf8');
console.log('i18n updated successfully.');
