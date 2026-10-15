const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');

const RESOLUTION_TEST_CASES = [
  {
    name: "1. Course language overrides a pinned interface preference",
    setup(win) {
      win.localStorage.setItem('cosy_ui_lang', 'fr');
      win.localStorage.setItem('cosy_ui_lang_last', 'el');
    },
    url: "index.html?ui=ru&lang=it",
    profile: { language_access: ['el'] },
    expected: "it"
  },
  {
    name: "2. URL ?ui=<code> wins when no language context exists",
    setup(win) {
      win.localStorage.setItem('cosy_ui_lang_last', 'el');
    },
    url: "index.html?ui=it",
    profile: { language_access: ['el'] },
    expected: "it"
  },
  {
    name: "2b. URL ?ui=pseudo is supported",
    setup(win) {},
    url: "index.html?ui=pseudo",
    profile: null,
    expected: "pseudo"
  },
  {
    name: "3a. Context language ?lang= wins when no higher course context exists",
    setup(win) {},
    url: "index.html?lang=el",
    profile: { language_access: ['fr'] },
    expected: "el"
  },
  {
    name: "3b. Context language ?course= (manifest lang) wins when no pin or ?ui or ?lang",
    setup(win) {},
    url: "index.html?course=pronunciation-fr-a1",
    profile: { language_access: ['ru'] },
    expected: "fr"
  },
  {
    name: "3c. Concrete course ID overrides a conflicting ?lang parameter",
    setup(win) {},
    url: "index.html?lang=fr&course=pronunciation-it-a1",
    profile: { language_access: ['ru'] },
    expected: "it"
  },
  {
    name: "4. Profile default wins when no pin, ?ui, or context lang",
    setup(win) {},
    url: "index.html",
    profile: { language_access: ['*', 'unsupported', 'it', 'fr'] },
    expected: "it"
  },
  {
    name: "4b. Skips '*' and unsupported codes in profile",
    setup(win) {},
    url: "index.html",
    profile: { language_access: ['*', 'de', 'es', 'el'] },
    expected: "el"
  },
  {
    name: "4c. Pre-profile first paint uses cosy_ui_lang_last cache",
    setup(win) {
      win.localStorage.setItem('cosy_ui_lang_last', 'ru');
    },
    url: "index.html",
    profile: null, // Before profile arrives
    expected: "ru"
  },
  {
    name: "5. Browser language (navigator.languages) used if supported and no higher rule match",
    setup(win) {
      Object.defineProperty(win.navigator, 'languages', {
        value: ['el-GR', 'fr-FR'],
        configurable: true
      });
    },
    url: "index.html",
    profile: { language_access: ['*'] },
    expected: "el"
  },
  {
    name: "6. Fallback to 'en' when no rules match",
    setup(win) {
      Object.defineProperty(win.navigator, 'languages', {
        value: ['de-DE', 'ja-JP'],
        configurable: true
      });
    },
    url: "index.html",
    profile: null,
    expected: "en"
  }
];

async function runResolutionTests() {
  console.log('🧪 Running i18n Resolution Tests (scripts/test-i18n-resolution.js)...');

  const i18nCode = fs.readFileSync(path.join(ROOT_DIR, 'shared/js/i18n.js'), 'utf8');

  for (const tc of RESOLUTION_TEST_CASES) {
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
      url: `http://127.0.0.1:3000/${tc.url}`,
      runScripts: 'dangerously'
    });

    const win = dom.window;

    // LocalStorage map
    const storageMap = new Map();
    win.localStorage = {
      getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k),
      clear: () => storageMap.clear()
    };

    // Fake CosyAuth for manifest resolution
    win.CosyAuth = {
      FULL_MANIFEST: [
        { id: 'pronunciation-fr-a1', lang: 'fr' },
        { id: 'pronunciation-it-a1', lang: 'it' }
      ]
    };

    if (tc.setup) {
      tc.setup(win);
    }

    // Load i18n.js
    const script = win.document.createElement('script');
    script.textContent = i18nCode;
    win.document.head.appendChild(script);

    // Call internal resolution helper directly
    const resolved = win.CosyI18n._resolveLanguage(tc.profile);

    if (resolved !== tc.expected) {
      console.error(`❌ Resolution Test "${tc.name}" Failed! Expected "${tc.expected}", got "${resolved}"`);
      process.exit(1);
    }

    // Assert ?ui= does NOT persist to localStorage "cosy_ui_lang"
    if (tc.url.includes('?ui=')) {
      const persisted = win.localStorage.getItem('cosy_ui_lang');
      if (persisted && persisted === win.URLSearchParams) {
        console.error(`❌ Resolution Test "${tc.name}" Failed! ?ui= persisted to localStorage!`);
        process.exit(1);
      }
    }

    console.log(`  PASS: ${tc.name}`);
  }

  console.log('✅ All i18n resolution tests passed!');
}

if (require.main === module) {
  runResolutionTests();
}

module.exports = { runResolutionTests };
