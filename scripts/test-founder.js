const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');
const htmlFilePath = path.join(ROOT_DIR, 'founder.html');
const fileContent = fs.readFileSync(htmlFilePath, 'utf8');

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
    if (!cleanPath) cleanPath = 'founder.html';

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

async function runFounderTests() {
  console.log('🧪 Running Founder Portal Unit & Integration Tests...\n');

  const { server, port } = await startStaticServer();

  let lastUpdatePayload = null;
  let updateResultRows = [{ id: 'student-456' }];

  const mockFounderUser = { id: 'founder-123', email: 'founder@cosylanguages.com' };
  const mockSession = { user: mockFounderUser, access_token: 'mock-token' };

  const mockProfilesData = [
    { id: 'founder-123', role: 'founder', language_access: ['*'], course_level: '*', hosted_sessions: [], created_at: '2026-01-01' },
    { id: 'student-456', role: 'student', language_access: ['en'], course_level: 'a1', hosted_sessions: [], created_at: '2026-01-02' }
  ];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    if (err.message && err.message.includes('Could not load')) return;
    console.error('JSDOM Error:', err.message);
  });

  let failures = 0;
  try {
    const dom = new JSDOM(fileContent, {
      url: `http://127.0.0.1:${port}/founder.html`,
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
      beforeParse(window) {
        // Mock local fetch
        const origFetch = window.fetch;
        window.fetch = async (input) => {
          const reqUrl = typeof input === 'string' ? input : (input.url || '');
          if (reqUrl.includes('data/platform-stats.json')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                languages: { total: 13, withAvailableCourse: 1, codes: ['en'] },
                courses: { available: 11, total: 182 },
                lessons: { available: 495, planned: 924, total: 1419 },
                lessonFilesOnDisk: 1289,
                unlinkedLessonFiles: 796,
                generatedAt: '2026-10-01'
              })
            };
          }
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

        // Polyfill innerText
        Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
          get() { return this.textContent; },
          set(v) { this.textContent = v; },
          configurable: true
        });

        // Mock Supabase client
        const mockClient = {
          auth: {
            getSession: async () => ({ data: { session: mockSession }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => ({ error: null })
          },
          from: (table) => {
            return {
              select: (cols) => {
                const query = {
                  eq: (col, val) => query,
                  order: (col, opts) => query,
                  single: async () => ({ data: mockProfilesData[0], error: null }),
                  maybeSingle: async () => ({ data: mockProfilesData[0], error: null }),
                  then: (onRes, onRej) => Promise.resolve({ data: mockProfilesData, error: null }).then(onRes, onRej)
                };
                return query;
              },
              update: (payload) => {
                lastUpdatePayload = payload;
                return {
                  eq: (col, val) => ({
                    select: (cols) => Promise.resolve({ data: updateResultRows, error: null })
                  })
                };
              }
            };
          }
        };

        Object.defineProperty(window, 'supabase', {
          get: () => ({ createClient: () => mockClient }),
          configurable: true
        });
      }
    });

    // Wait for scripts and async renders
    await new Promise(resolve => setTimeout(resolve, 1500));

    const document = dom.window.document;

    // TEST (c): Founder's own role select is disabled and others are not
    console.log('🔹 Test (c): Founder own role protection check...');
    const founderRoleSelect = document.getElementById('role-founder-123');
    const studentRoleSelect = document.getElementById('role-student-456');

    if (!founderRoleSelect) {
      console.error('❌ FAIL: #role-founder-123 element not found.');
      failures++;
    } else if (!founderRoleSelect.disabled) {
      console.error('❌ FAIL: Founder own role select is NOT disabled.');
      failures++;
    } else if (founderRoleSelect.getAttribute('title') !== 'You cannot change your own role here') {
      console.error(`❌ FAIL: Founder own role select missing expected title attribute. Found: "${founderRoleSelect.getAttribute('title')}"`);
      failures++;
    } else {
      console.log('  ✅ PASS: Founder own role select is disabled with title="You cannot change your own role here".');
    }

    if (!studentRoleSelect) {
      console.error('❌ FAIL: #role-student-456 element not found.');
      failures++;
    } else if (studentRoleSelect.disabled) {
      console.error('❌ FAIL: Other user role select SHOULD NOT be disabled.');
      failures++;
    } else {
      console.log('  ✅ PASS: Other user role select is enabled.');
    }

    // TEST (a): Saving with an empty language field sends language_access: []
    console.log('\n🔹 Test (a): Saving empty language access sends []...');
    const langsInput = document.getElementById('langs-student-456');
    if (langsInput) {
      langsInput.value = '   '; // empty/whitespace input
    }
    updateResultRows = [{ id: 'student-456' }]; // successful update returning 1 row

    await dom.window.saveUserProfile('student-456');

    if (!lastUpdatePayload) {
      console.error('❌ FAIL: saveUserProfile did not execute update call.');
      failures++;
    } else if (!Array.isArray(lastUpdatePayload.language_access) || lastUpdatePayload.language_access.length !== 0) {
      console.error(`❌ FAIL: Expected language_access to be [], but got: ${JSON.stringify(lastUpdatePayload.language_access)}`);
      failures++;
    } else {
      console.log('  ✅ PASS: Empty language field correctly sent language_access: [].');
    }

    // TEST (b): When update().select() returns 0 rows, shows "Not saved..." message in red and never "Saved"
    console.log('\n🔹 Test (b): Permission failure (0 rows returned from update)...');
    updateResultRows = []; // 0 rows returned (RLS blocked or no match)

    await dom.window.saveUserProfile('student-456');

    const statusEl = document.getElementById('status-student-456');
    const statusHtml = statusEl ? statusEl.innerHTML : '';
    const statusText = statusEl ? statusEl.textContent : '';

    if (!statusText.includes('Not saved. You may not have permission to change this profile.')) {
      console.error(`❌ FAIL: Expected "Not saved..." status message, but found: "${statusText}"`);
      failures++;
    } else if (statusText.includes('Saved ✔️')) {
      console.error('❌ FAIL: Status displayed "Saved" when 0 rows were updated!');
      failures++;
    } else if (!statusHtml.includes('#ef4444') && !statusHtml.includes('var(--cosy-color-ink-error)')) {
      console.error(`❌ FAIL: "Not saved" message was not formatted in red (#ef4444 or --cosy-color-ink-error). Found: "${statusHtml}"`);
      failures++;
    } else {
      console.log('  ✅ PASS: 0 rows returned correctly displayed red "Not saved. You may not have permission to change this profile." message and never "Saved".');
    }

  } finally {
    server.close();
  }

  console.log('\n---------------------------------------------------');
  if (failures > 0) {
    console.error(`❌ Founder Portal unit tests failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✨ All Founder Portal unit tests passed successfully!');
    process.exit(0);
  }
}

runFounderTests().catch(err => {
  console.error('❌ Unhandled error in founder tests:', err);
  process.exit(1);
});
