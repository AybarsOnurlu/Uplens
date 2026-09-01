import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANGUAGES, TRANSLATIONS } from '../utils/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

const expectedOptionalHosts = [
  'https://api.openai.com/*',
  'https://generativelanguage.googleapis.com/*',
  'https://api.groq.com/*',
  'https://api.mistral.ai/*',
  'https://api.together.xyz/*',
  'https://openrouter.ai/*',
  'https://api.deepseek.com/*',
  'https://api.perplexity.ai/*',
  'https://dashscope.aliyuncs.com/*',
  'https://api.x.ai/*',
  'http://localhost/*',
  'http://127.0.0.1/*'
];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? flattenKeys(child, current) : [current];
  });
}

function countTags(html, tag, closing = false) {
  const expression = closing ? new RegExp(`</${tag}>`, 'gi') : new RegExp(`<${tag}\\b`, 'gi');
  return (html.match(expression) || []).length;
}

check(manifest.manifest_version === 3, 'manifest_version must be 3');
check(manifest.version === packageJson.version, 'manifest and package versions must match');
check(/^\d+\.\d+\.\d+(\.\d+)?$/.test(manifest.version), 'manifest version format is invalid');
check(typeof manifest.description === 'string' && manifest.description.length <= 132, 'manifest description must be present and at most 132 characters');
check(JSON.stringify(manifest.permissions) === JSON.stringify(['storage']), 'only the storage API permission should be required');
check(JSON.stringify(manifest.host_permissions) === JSON.stringify(['https://*.upwork.com/*']), 'only Upwork should be a required host');
check(JSON.stringify(manifest.optional_host_permissions) === JSON.stringify(expectedOptionalHosts), 'optional API hosts differ from the audited allowlist');
check(manifest.content_security_policy?.extension_pages === "script-src 'self'; object-src 'self'", 'extension CSP must prohibit remote code');

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon || {}),
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap((script) => [...(script.js || []), ...(script.css || [])])
].filter(Boolean);

for (const relativePath of new Set(referencedFiles)) {
  check(existsSync(path.join(root, relativePath)), `manifest references missing file: ${relativePath}`);
}

for (const script of manifest.content_scripts || []) {
  check(script.matches.every((match) => match.startsWith('https://www.upwork.com/')), `content script contains a non-Upwork match: ${script.matches.join(', ')}`);
}

const sourceRoots = ['analysis', 'content', 'popup', 'utils'];
const jsFiles = sourceRoots
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((file) => file.endsWith('.js'));
jsFiles.push(path.join(root, 'sw.js'));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  check(result.status === 0, `${path.relative(root, file)} failed syntax check: ${result.stderr.trim()}`);
  const source = readFileSync(file, 'utf8');
  check(!/\beval\s*\(|new\s+Function\s*\(/.test(source), `${path.relative(root, file)} contains dynamic code execution`);
}

const popupHtml = readFileSync(path.join(root, 'popup', 'popup.html'), 'utf8');
const popupJs = readFileSync(path.join(root, 'popup', 'popup.js'), 'utf8');
const tourJs = readFileSync(path.join(root, 'popup', 'tour.js'), 'utf8');
const contentJs = readFileSync(path.join(root, 'content', 'content.js'), 'utf8');
const privacy = readFileSync(path.join(root, 'privacy.md'), 'utf8');
const gitignore = readFileSync(path.join(root, '.gitignore'), 'utf8');

for (const tag of ['div', 'section', 'button', 'label']) {
  check(countTags(popupHtml, tag) === countTags(popupHtml, tag, true), `popup HTML has unbalanced <${tag}> tags`);
}

const ids = [...popupHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
check(new Set(ids).size === ids.length, 'popup HTML contains duplicate ids');
const staticIds = new Set(ids);
for (const [, id] of popupJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
  check(staticIds.has(id), `popup.js references missing static id: ${id}`);
}

check(!/(?:<script[^>]+src|<link[^>]+href)=["']https?:\/\//i.test(popupHtml), 'popup must not load remote scripts or styles');
check(popupHtml.includes('id="empty-ready-label"'), 'popup must expose a functional ready state');
check(popupHtml.includes('id="open-upwork-jobs"'), 'popup must provide a direct Upwork action');
check(!popupJs.includes("getElementById('openai-api-key')"), 'stale API key element id remains');
check(tourJs.includes("t('ui.tourStart')") && tourJs.includes("t('ui.tourSkipSetup')"), 'tour start/skip labels must use i18n');
check(contentJs.includes("url.includes('/freelance-jobs/')"), 'public Upwork job listings must be handled by the content script');
check(!/'Skor'|'Temiz'|'İsimsiz İlan'|Gemini API Hatası|Gemini içerik engeli/.test(`${popupJs}\n${contentJs}\n${readFileSync(path.join(root, 'sw.js'), 'utf8')}`), 'production runtime contains a Turkish-only fallback');
check(privacy.includes('Optional Third-Party AI Services'), 'privacy policy must disclose optional AI transfers');
check(privacy.includes('visible Upwork job content'), 'privacy policy must disclose website-content handling');
check(gitignore.split(/\r?\n/).includes('Store_Submission/'), 'Store_Submission must stay out of the public source tree');

const englishKeys = flattenKeys(TRANSLATIONS.en).sort();
check(Object.keys(TRANSLATIONS).sort().join(',') === Object.keys(LANGUAGES).sort().join(','), 'translation and language locale sets differ');
for (const language of Object.keys(LANGUAGES)) {
  const localeKeys = flattenKeys(TRANSLATIONS[language]).sort();
  check(JSON.stringify(localeKeys) === JSON.stringify(englishKeys), `${language} translation keys differ from English`);
}

const git = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
if (git.status === 0) {
  const tracked = git.stdout.split(/\r?\n/).filter(Boolean).map((item) => item.replaceAll('\\', '/'));
  check(!tracked.some((item) => item.startsWith('Store_Submission/')), 'Store_Submission files must not be tracked');
  check(!tracked.some((item) => item.includes('/.wrangler/')), 'Wrangler cache files must not be tracked');
  check(!tracked.some((item) =>
    (item.startsWith('options/') || item.startsWith('cloudflare-worker/'))
    && existsSync(path.join(root, item))
  ), 'dead options/license prototype files must not be tracked');
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validation passed: ${jsFiles.length} production JavaScript files, ${englishKeys.length} i18n keys × ${Object.keys(LANGUAGES).length} locales, and ${new Set(referencedFiles).size} manifest assets checked.`);
