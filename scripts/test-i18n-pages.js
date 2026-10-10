const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');
const PAGES = ['login.html', '404.html', 'hub.html', 'index.html', 'founder.html'];
const NON_ENGLISH_LANGS = ['fr', 'ru', 'it', 'el'];

const ALLOWLIST_WORDS = new Set([
  'COSYlanguages',
  'COSYtools',
  'COSYgames',
  'COSYevents',
  'COSYdata',
  'COSYlanguages 🏠',
  'COSYdata 📚',
  'COSYtools 🔎',
  'COSYgames 🎮',
  'COSYevents 🎉',
  'COSY',
  'CEFR',
  'A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
  'BA', 'BR', 'DE', 'EL', 'EN', 'ES', 'FR', 'HY', 'IT', 'KA', 'PT', 'RU', 'TT',
  'HTML', 'CSS', 'JS', 'JSON', 'XML', 'URL', 'UUID', 'ID', 'Action', 'Email', 'Password',
  'Auto', 'English', 'Français', 'Русский', 'Italiano', 'Ελληνικά'
]);

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'text/plain';
  }
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let cleanPath = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
    if (!cleanPath) cleanPath = 'index.html';

    const filePath = path.join(ROOT_DIR, cleanPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': getContentType(filePath) });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

function loadPageDom(port, pageUrl, role = 'founder') {
  const htmlFileName = pageUrl.split('?')[0];
  const filePath = path.join(ROOT_DIR, htmlFileName);
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});

  const storageMap = new Map();

  const dom = new JSDOM(fileContent, {
    url: `http://127.0.0.1:${port}/${pageUrl}`,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole,
    beforeParse(window) {
      const mockUser = { id: '00000000-0000-0000-0000-000000000001', email: 'test@cosylanguages.com' };
      const mockSession = { user: mockUser, access_token: 'mock-token' };
      const mockProfile = {
        id: '00000000-0000-0000-0000-000000000001',
        role: role,
        language_access: ['*'],
        course_level: '*'
      };

      const mockClient = {
        auth: {
          getSession: async () => ({ data: { session: mockSession }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => ({ error: null }),
          signInWithPassword: async ({ email }) => {
            if (email.includes('error')) return { data: null, error: { message: 'Invalid credentials' } };
            return { data: { user: mockUser }, error: null };
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockProfile, error: null }),
              single: async () => ({ data: mockProfile, error: null }),
              select: () => ({ data: [mockProfile], error: null })
            }),
            order: () => Promise.resolve({ data: [mockProfile], error: null })
          }),
          update: () => ({
            eq: () => ({
              select: async () => ({ data: [{ id: mockProfile.id }], error: null })
            })
          })
        })
      };

      Object.defineProperty(window, 'supabase', {
        get: () => ({ createClient: () => mockClient }),
        configurable: true
      });

      // Polyfill innerText
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() { return this.textContent; },
        set(v) { this.textContent = v; },
        configurable: true
      });

      window.localStorage = {
        getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        clear: () => storageMap.clear()
      };

      const customFetch = async (input) => {
        const reqUrl = typeof input === 'string' ? input : (input.url || '');
        let cleanPath = reqUrl.replace(/^https?:\/\/[^\/]+\//, '').split('?')[0];
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
        const localPath = path.join(ROOT_DIR, cleanPath);

        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const data = fs.readFileSync(localPath, 'utf8');
          return {
            ok: true,
            status: 200,
            text: async () => data,
            json: async () => JSON.parse(data)
          };
        }
        return { ok: false, status: 404, text: async () => '404', json: async () => ({}) };
      };

      Object.defineProperty(window, 'fetch', {
        value: customFetch,
        writable: true,
        configurable: true
      });
    }
  });

  return dom;
}

async function runPageI18nTests() {
  console.log('🧪 Running Page i18n Verification Tests (scripts/test-i18n-pages.js)...');

  const { server, port } = await startStaticServer();

  try {
    // Test Switcher Behavior
    console.log('  Testing language switcher behavior...');
    const dom = loadPageDom(port, 'index.html');
    await new Promise(r => setTimeout(r, 1000));
    const win = dom.window;

    if (!win.CosyLangSwitcher || !win.CosyI18n) {
      console.error('❌ CosyLangSwitcher or CosyI18n missing on index.html!');
      process.exit(1);
    }

    win.CosyI18n.setLang('fr');
    if (win.localStorage.getItem('cosy_ui_lang') !== 'fr') {
      console.error('❌ Choosing French did not pin "cosy_ui_lang" to "fr"!');
      process.exit(1);
    }

    win.CosyI18n.setLang('auto');
    if (win.localStorage.getItem('cosy_ui_lang') !== null) {
      console.error('❌ Choosing Auto did not remove "cosy_ui_lang" key!');
      process.exit(1);
    }
    console.log('  ✅ Switcher test passed.');

    // Test Pseudo-Locale ?ui=pseudo on converted pages
    console.log('  Testing pseudo-locale ?ui=pseudo on converted pages...');
    for (const page of PAGES) {
      let pageUrl = `${page}?ui=pseudo`;
      if (page === 'index.html') pageUrl += '&course=general-en-a1&level=a1';
      if (page === 'hub.html') pageUrl += '&course=general-en-a1&level=a1';

      const domPseudo = loadPageDom(port, pageUrl);
      await new Promise(r => setTimeout(r, 1500));

      const doc = domPseudo.window.document;
      const clone = doc.body.cloneNode(true);

      // Remove scripts, styles, data-i18n-skip elements
      clone.querySelectorAll('script, style, [data-i18n-skip]').forEach(el => el.remove());

      const visibleText = (clone.textContent || '').replace(/\s+/g, ' ').trim();

      // Strip all ⟦...⟧ blocks
      const strippedText = visibleText.replace(/⟦[^⟧]+⟧/g, ' ');

      // Find any remaining Latin words >= 3 letters
      const words = strippedText.match(/[a-zA-Z]{3,}/g) || [];
      const forbiddenWords = words.filter(w => !ALLOWLIST_WORDS.has(w) && !ALLOWLIST_WORDS.has(w.toUpperCase()));

      if (forbiddenWords.length > 0) {
        console.error(`❌ Pseudo-locale test failed on ${page}! Untranslated English words found:`, forbiddenWords.slice(0, 10));
        process.exit(1);
      }
      console.log(`  ✅ Pseudo-locale test passed for ${page}`);
    }

    // Test Non-English pages for untranslated English dictionary strings
    console.log('  Testing non-English pages for untranslated English strings...');
    const enDict = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'shared/i18n/en.json'), 'utf8'));
    const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const lang of NON_ENGLISH_LANGS) {
      const langDict = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, `shared/i18n/${lang}.json`), 'utf8'));
      const checkValues = Object.entries(enDict)
        .filter(([k, v]) => k !== '_meta' && typeof v === 'string' && langDict[k] !== v)
        .map(([k, v]) => v.replace(/\{[a-zA-Z0-9_]+\}/g, '').trim())
        .filter(v => v.length >= 4 && !ALLOWLIST_WORDS.has(v));

      for (const page of PAGES) {
        const domLang = loadPageDom(port, `${page}?ui=${lang}`);
        await new Promise(r => setTimeout(r, 1200));

        const doc = domLang.window.document;
        const clone = doc.body.cloneNode(true);
        clone.querySelectorAll('script, style, [data-i18n-skip]').forEach(el => el.remove());

        const visibleText = (clone.textContent || '').replace(/\s+/g, ' ');

        for (const enVal of checkValues) {
          const rx = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegExp(enVal) + '(?=$|[^\\p{L}\\p{N}])', 'u');
          if (rx.test(visibleText)) {
            console.error(`❌ Non-English test failed on ${page} (?ui=${lang})! Found untranslated English text: "${enVal}"`);
            process.exit(1);
          }
        }
      }
      console.log(`  ✅ Non-English test passed for ui=${lang}`);
    }

  } finally {
    server.close();
  }

  console.log('✅ All page i18n tests passed!');
}

if (require.main === module) {
  runPageI18nTests();
}

module.exports = { runPageI18nTests };
