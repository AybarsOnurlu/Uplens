const fs = require('fs');
let code = fs.readFileSync('C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js', 'utf8');

const newKeys = {
  tr: `tourReplay: 'Ürün Turunu Tekrar Başlat',`,
  en: `tourReplay: 'Restart Product Tour',`,
  de: `tourReplay: 'Produkttour neu starten',`,
  fr: `tourReplay: 'Redémarrer la visite du produit',`,
  es: `tourReplay: 'Reiniciar el recorrido del producto',`,
  pt: `tourReplay: 'Reiniciar o tour do produto',`,
  ar: `tourReplay: 'إعادة تشغيل جولة المنتج',`
};

for (const lang of Object.keys(newKeys)) {
  const regex = new RegExp(`(\\b${lang}: \\{\\s*ui: \\{)`);
  code = code.replace(regex, `$1\n      ${newKeys[lang]}`);
}

fs.writeFileSync('C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js', code);
console.log('updated i18n again');
