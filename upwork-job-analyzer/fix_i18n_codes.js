const fs = require('fs');

const file = 'C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js';
let code = fs.readFileSync(file, 'utf8');

// Remove hardcoded status codes from translation strings
code = code.replace(/ \(401\)/g, '');
code = code.replace(/ \(429\)/g, '');

fs.writeFileSync(file, code, 'utf8');
console.log('i18n updated successfully.');
