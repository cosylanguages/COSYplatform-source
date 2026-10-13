const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { sanitizeStudentLessonContent } = require('./sanitize-student-lesson');
const { buildPagesSite, EXCLUDED_PATHS } = require('./build-pages-site');

const ROOT_DIR = path.join(__dirname, '..');

const COMBINATIONS = [
  // Student role
  { role: 'student', url: 'student.html' },
  { role: 'student', url: 'student.html?course=general-en-a1' },
  { role: 'student', url: 'student.html?course=general-en-b2' },
  { role: 'student', url: 'student.html?course=pronunciation-fr-a1&ui=en' },
  { role: 'student', url: 'student.html?lesson=lessons/general-english-a1/nice-to-meet-you.json&course=general-en-a1' },

  // Teacher role
  { role: 'teacher', url: 'teacher.html' },
  { role: 'teacher', url: 'teacher.html?lang=en' },
  { role: 'teacher', url: 'teacher.html?lang=fr' },
  { role: 'teacher', url: 'teacher.html?lang=ru' },
  { role: 'teacher', url: 'teacher.html?course=general-en-a1' },
  { role: 'teacher', url: 'teacher.html?course=pronunciation-fr-a1&ui=en' },
  { role: 'teacher', url: 'teacher-english.html' },
  { role: 'teacher', url: 'teacher-french.html' },
  { role: 'teacher', url: 'teacher-russian.html' },

  // Founder role
  { role: 'founder', url: 'founder.html' },
  { role: 'founder', url: 'teacher.html' },
  { role: 'founder', url: 'teacher.html?lang=en' },
  { role: 'founder', url: 'teacher.html?lang=fr' },
  { role: 'founder', url: 'teacher.html?lang=ru' },
  { role: 'founder', url: 'teacher.html?course=pronunciation-fr-a1&ui=en' },
  { role: 'founder', url: 'hub.html' },
  { role: 'founder', url: 'index.html' }
];

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

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

function getVisibleText(dom) {
  const doc = dom.window.document;
  const targetEl = doc.getElementById('app-root') || doc.querySelector('main');

  let text = '';
  if (targetEl) {
    const clone = targetEl.cloneNode(true);
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(node => node.remove());
    text = clone.textContent || '';
  } else {
    const clone = doc.body.cloneNode(true);
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(node => node.remove());
    text = clone.textContent || '';
  }

  return text.replace(/\s+/g, ' ').trim();
}

async function testCombination(port, { role, url }) {
  const parsedUrl = new URL(`http://127.0.0.1:${port}/${url}`);
  const htmlFileName = parsedUrl.pathname.replace(/^\//, '');
  const filePath = path.join(ROOT_DIR, htmlFileName);

  if (!fs.existsSync(filePath)) {
    return { pass: false, reason: `File not found on disk: ${htmlFileName}` };
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');

  let uncaughtError = null;

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    const msg = err.message || '';
    if (
      msg.includes('Could not load script') ||
      msg.includes('Could not load stylesheet') ||
      msg.includes('Failed to load') ||
      msg.includes('Error: Could not load') ||
      msg.includes('Not implemented: navigation')
    ) {
      return;
    }
    if (!uncaughtError) {
      uncaughtError = `JSDOM Error: ${msg}`;
    }
  });

  const dom = new JSDOM(fileContent, {
    url: `http://127.0.0.1:${port}/${url}`,
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole,
    beforeParse(window) {
      // Fake window.supabase
      const mockUser = { id: 'test-user-id', email: 'test@cosylanguages.com' };
      const mockSession = { user: mockUser, access_token: 'mock-token' };
      const mockProfile = {
        id: 'test-user-id',
        role: role,
        language_access: ['*'],
        course_level: '*'
      };

      const mockClient = {
        auth: {
          getSession: async () => ({ data: { session: mockSession }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => ({ error: null })
        },
        from: (table) => {
          let selectedColumn = '';
          let lessonPath = '';
          return {
            select: (cols) => {
              selectedColumn = cols;
              const query = {
                eq: (col, val) => {
                  if (col === 'lesson_id') lessonPath = val;
                  return query;
                },
                order: (col, opts) => query,
                single: async () => ({ data: mockProfile, error: null }),
                maybeSingle: async () => {
                  if (table === 'profiles') return { data: mockProfile, error: null };
                  if (table === 'student_lesson_content' || table === 'lesson_content') {
                    const contentPath = path.join(ROOT_DIR, lessonPath);
                    if (!fs.existsSync(contentPath)) return { data: null, error: null };
                    const source = fs.readFileSync(contentPath, 'utf8');
                    const content = table === 'student_lesson_content'
                      ? sanitizeStudentLessonContent(lessonPath, source)
                      : source;
                    return { data: { [selectedColumn]: content }, error: null };
                  }
                  return { data: mockProfile, error: null };
                },
                then: (onRes, onRej) => Promise.resolve({ data: [mockProfile], error: null }).then(onRes, onRej)
              };
              return query;
            }
          };
        }
      };

      const mockSupabase = {
        createClient: () => mockClient
      };

      Object.defineProperty(window, 'supabase', {
        get: () => mockSupabase,
        set: () => {},
        configurable: true
      });

      window.addEventListener('error', (event) => {
        const msg = event.message || (event.error ? event.error.message : 'Unknown window error');
        if (msg.includes('script error') || msg.includes('Could not load')) return;
        if (!uncaughtError) {
          uncaughtError = `Window Error: ${msg}`;
        }
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason ? (event.reason.message || event.reason) : 'Unknown promise rejection';
        if (!uncaughtError) {
          uncaughtError = `Unhandled Rejection: ${reason}`;
        }
      });

      // Polyfill innerText
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() {
          return this.textContent;
        },
        set(v) {
          this.textContent = v;
        },
        configurable: true
      });

      // Map-based localStorage
      const storageMap = new Map();
      window.localStorage = {
        getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
        setItem: (k, v) => storageMap.set(k, String(v)),
        removeItem: (k) => storageMap.delete(k),
        clear: () => storageMap.clear(),
        key: (i) => Array.from(storageMap.keys())[i] || null,
        get length() { return storageMap.size; }
      };

      // Local fetch stub
      window.fetch = async (input, init) => {
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
        } else {
          return {
            ok: false,
            status: 404,
            text: async () => '404 Not Found',
            json: async () => { throw new Error('404 Not Found'); }
          };
        }
      };
    }
  });

  // Wait 2 seconds for scripts and async renders to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (uncaughtError) {
    return { pass: false, reason: uncaughtError };
  }

  const isRedirectPage = ['teacher-english.html', 'teacher-french.html', 'teacher-russian.html'].includes(htmlFileName);
  const visibleText = getVisibleText(dom);
  if (!isRedirectPage && visibleText.length < 40) {
    return { pass: false, reason: `Main content area has fewer than 40 characters of visible text (found ${visibleText.length}): "${visibleText}"` };
  }

  if (parsedUrl.searchParams.has('lesson') && !visibleText.includes('Nice to meet you!')) {
    return { pass: false, reason: `Lesson content did not render from the role-specific Supabase table: "${visibleText}"` };
  }

  // Assert redirects for teacher-<lang>.html
  if (['teacher-english.html', 'teacher-french.html', 'teacher-russian.html'].includes(htmlFileName)) {
    const codeMap = { 'teacher-english.html': 'en', 'teacher-french.html': 'fr', 'teacher-russian.html': 'ru' };
    const expectedLang = codeMap[htmlFileName];
    if (!fileContent.includes(`teacher.html?lang=${expectedLang}`)) {
      return { pass: false, reason: `${htmlFileName} does not contain redirect target teacher.html?lang=${expectedLang}` };
    }
  }

  // Assert check (a): for each of en/fr/ru the set of course ids shown by teacher.html?lang=<code> as founder equals manifest courses of that language
  if (htmlFileName === 'teacher.html' && parsedUrl.searchParams.has('lang') && role === 'founder') {
    const lang = parsedUrl.searchParams.get('lang').toLowerCase();
    if (['en', 'fr', 'ru'].includes(lang)) {
      const fullManifest = dom.window.CosyAuth ? dom.window.CosyAuth.FULL_MANIFEST : [];
      const expectedIds = fullManifest.filter(c => c.lang.toLowerCase() === lang).map(c => c.id).sort();
      const doc = dom.window.document;
      const renderedCards = Array.from(doc.querySelectorAll('.course-item-card[data-course-id]'));
      const renderedIds = renderedCards.map(el => el.getAttribute('data-course-id')).sort();

      const missing = expectedIds.filter(id => !renderedIds.includes(id));
      const extra = renderedIds.filter(id => !expectedIds.includes(id));

      if (missing.length > 0 || extra.length > 0 || renderedIds.length !== expectedIds.length) {
        return {
          pass: false,
          reason: `teacher.html?lang=${lang} as founder course mismatch. Expected (${expectedIds.length}): [${expectedIds.join(', ')}]. Rendered (${renderedIds.length}): [${renderedIds.join(', ')}]. Missing: [${missing.join(', ')}], Extra: [${extra.join(', ')}]`
        };
      }
    }
  }

  // Assert check (b): student.html, teacher.html and hub.html contain no vocab-index.js or irregular-verbs.js <script> at load
  if (['student.html', 'teacher.html', 'hub.html'].includes(htmlFileName)) {
    const doc = dom.window.document;
    const eagerScripts = doc.querySelectorAll('script[src*="vocab-index.js"], script[src*="irregular-verbs.js"]');
    if (eagerScripts.length > 0) {
      return {
        pass: false,
        reason: `${htmlFileName} contains eager script tags for vocab-index.js or irregular-verbs.js at page load`
      };
    }
  }

  // Assert check (c): vocabulary script is requested only after the first dictionary search on student.html and teacher.html
  if (['student.html', 'teacher.html'].includes(htmlFileName) && !parsedUrl.search) {
    const doc = dom.window.document;
    const vocabScriptsBefore = doc.querySelectorAll('script[src*="vocab-index.js"]');
    if (vocabScriptsBefore.length > 0) {
      return { pass: false, reason: `${htmlFileName} had vocab-index.js script tag at load time before search` };
    }

    if (typeof dom.window.searchCosyDict === 'function') {
      dom.window.searchCosyDict('family');
      const vocabScriptsAfter = doc.querySelectorAll('script[src*="vocab-index.js"]');
      if (vocabScriptsAfter.length === 0) {
        return { pass: false, reason: `${htmlFileName} did not inject vocab-index.js script tag after searchCosyDict()` };
      }
    } else {
      return { pass: false, reason: `${htmlFileName} missing searchCosyDict function` };
    }
  }

  // Specific assertions based on requirements:
  // 1. founder.html must match numbers from data/platform-stats.json
  if (htmlFileName === 'founder.html') {
    const statsPath = path.join(ROOT_DIR, 'data/platform-stats.json');
    if (!fs.existsSync(statsPath)) {
      return { pass: false, reason: 'data/platform-stats.json not found for founder.html assertion' };
    }
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    const expectedStrings = [
      `live of ${stats.languages.total.toLocaleString()} planned (${stats.languages.codes.map(c => c.toUpperCase()).join(', ')})`,
      `available of ${stats.courses.total.toLocaleString()} in catalog`,
      `available of ${stats.lessons.total.toLocaleString()} planned`,
      `${stats.unlinkedLessonFiles.toLocaleString()} lesson files not yet linked to a course`
    ];

    for (const expStr of expectedStrings) {
      if (!visibleText.includes(expStr)) {
        return { pass: false, reason: `founder.html visible text missing expected stats string: "${expStr}"` };
      }
    }
  }

  // 2. teacher.html: founder profile has "Founder Portal" link, teacher profile does NOT
  if (htmlFileName === 'teacher.html' && !parsedUrl.search) {
    const hasFounderLink = visibleText.includes('Founder Portal');

    if (role === 'founder' && !hasFounderLink) {
      return { pass: false, reason: 'teacher.html with founder profile should display Founder Portal link, but link was missing.' };
    }
    if (role === 'teacher' && hasFounderLink) {
      return { pass: false, reason: 'teacher.html with teacher profile should NOT display Founder Portal link, but link was found.' };
    }
  }

  // 3. student.html?course=general-en-b2: shows an "Open lesson" link for "Relaxation and Hygge" pointing to an existing file
  if (htmlFileName === 'student.html' && parsedUrl.searchParams.get('course') === 'general-en-b2') {
    const doc = dom.window.document;
    const cards = Array.from(doc.querySelectorAll('.unit-card'));
    const hyggeCard = cards.find(card => card.textContent.includes('Relaxation and Hygge'));
    if (!hyggeCard) {
      return { pass: false, reason: 'student.html?course=general-en-b2 missing card for Relaxation and Hygge' };
    }
    const link = hyggeCard.querySelector('a');
    if (!link || !link.textContent.includes('Open lesson')) {
      return { pass: false, reason: 'student.html?course=general-en-b2 missing Open lesson link for Relaxation and Hygge' };
    }
    const href = link.getAttribute('href');
    const hrefUrl = new URL(href, `http://127.0.0.1:${port}/`);
    const lessonParam = hrefUrl.searchParams.get('lesson');
    if (!lessonParam) {
      return { pass: false, reason: 'Relaxation and Hygge link missing "lesson" parameter' };
    }
    const targetFilePath = path.join(ROOT_DIR, lessonParam);
    if (!fs.existsSync(targetFilePath)) {
      return { pass: false, reason: `Relaxation and Hygge link points to non-existent file: ${lessonParam}` };
    }
  }

  // 4. teacher-led course counter wording by role
  if (parsedUrl.searchParams.get('course') === 'pronunciation-fr-a1') {
    if (role === 'teacher' || role === 'founder') {
      if (!visibleText.includes('Teacher-led course · 18 lessons')) {
        return { pass: false, reason: `Teacher/founder role view on teacher-led roadmap should display "Teacher-led course · 18 lessons", got text: "${visibleText}"` };
      }
    } else if (role === 'student') {
      if (!visibleText.includes('Taught live with your teacher · 18 lessons')) {
        return { pass: false, reason: `Student role view on teacher-led roadmap should display "Taught live with your teacher · 18 lessons", got text: "${visibleText}"` };
      }
    }
  }

  return { pass: true, textLength: visibleText.length };
}

async function runSmokeSuite() {
  console.log('💨 Running COSYplatform Page Smoke Tests...\n');

  const pagesSite = buildPagesSite();
  const missingPages = ['index.html', 'student.html', 'teacher.html', 'classroom.html']
    .filter(file => !fs.existsSync(path.join(pagesSite, file)));
  const exposedGatedPaths = Array.from(EXCLUDED_PATHS)
    .filter(directory => fs.existsSync(path.join(pagesSite, directory)));
  if (missingPages.length || exposedGatedPaths.length) {
    throw new Error(`Unsafe Pages artifact. Missing pages: ${missingPages.join(', ')}. Exposed paths: ${exposedGatedPaths.join(', ')}.`);
  }
  console.log('  PASS: GitHub Pages artifact contains the portals and excludes gated content.');

  const { server, port } = await startStaticServer();

  let passedCount = 0;
  let failedCount = 0;

  try {
    for (const combo of COMBINATIONS) {
      const res = await testCombination(port, combo);
      if (res.pass) {
        passedCount++;
        console.log(`  PASS: [${combo.role.toUpperCase()}] ${combo.url} (${res.textLength} chars visible)`);
      } else {
        failedCount++;
        console.error(`  FAIL: [${combo.role.toUpperCase()}] ${combo.url} -> ${res.reason}`);
      }
    }
  } finally {
    server.close();
  }

  console.log(`\n---------------------------------------------------`);
  console.log(`Smoke Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${COMBINATIONS.length} combinations.`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeSuite().catch(err => {
  console.error('❌ Unhandled error running smoke test suite:', err);
  process.exit(1);
});
