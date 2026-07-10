const fs = require('fs');

const file = 'C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js';
let code = fs.readFileSync(file, 'utf8');

const errors = {
  tr: "aiError: 'Yapay Zeka Hatası',",
  en: "aiError: 'AI Error',",
  de: "aiError: 'KI-Fehler',",
  fr: "aiError: 'Erreur IA',",
  es: "aiError: 'Error de IA',",
  pt: "aiError: 'Erro de IA',",
  ar: "aiError: 'خطأ في الذكاء الاصطناعي',"
};

for (const [lang, val] of Object.entries(errors)) {
  const target = lang + ': {\n    api: {';
  // we will replace the first occurrence of `ui: {` after `lang + ': {'`
  const blockStart = code.indexOf(lang + ': {');
  if (blockStart !== -1) {
    const uiPos = code.indexOf('ui: {', blockStart);
    if (uiPos !== -1) {
      code = code.substring(0, uiPos) + 'ui: {\n      ' + val + code.substring(uiPos + 5);
    }
  }
}

fs.writeFileSync(file, code, 'utf8');
console.log('i18n updated successfully.');
