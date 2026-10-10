const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');
const LANGS = ['fr', 'ru', 'it', 'el'];
const { allowed } = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-identical-allowed.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'shared/i18n/en.json'), 'utf8'));
console.log('🧪 Running untranslated-string check (scripts/test-i18n-untranslated.js)...');
let failures = 0;
for (const lang of LANGS) {
  const dict = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, `shared/i18n/${lang}.json`), 'utf8'));
  for (const [key, value] of Object.entries(en)) {
    if (key === '_meta' || typeof value !== 'string') continue;
    const words = value.replace(/\{[a-zA-Z0-9_]+\}/g, '');
    if (!/[A-Za-z]{3,}/.test(words)) continue;
    if (dict[key] !== value) continue;
    if ((allowed[key] || []).includes(lang)) continue;
    failures++;
    console.error(`❌ ${lang}.json: "${key}" is identical to English: "${value}"`);
  }
}
if (failures) { console.error(`\n❌ ${failures} untranslated string(s).`); process.exit(1); }
console.log('✅ No untranslated strings.');
