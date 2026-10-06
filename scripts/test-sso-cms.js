const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');

async function runSsoAndCmsTests() {
  console.log('🧪 Running Ecosystem SSO & Founder CMS Integration Tests...\n');

  let failures = 0;

  let lastSetSessionPayload = null;
  let lastUpsertPayload = null;

  const mockSession = {
    access_token: 'mock-access-token-123',
    refresh_token: 'mock-refresh-token-456',
    user: { id: 'founder-1', email: 'founder@cosylanguages.com' }
  };

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    if (err.message && err.message.includes('Could not load')) return;
    console.error('JSDOM Error:', err.message);
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Test Page</title>
      <script src="shared/js/config.js"></script>
    </head>
    <body>
      <main id="app-root">
        <h1 id="heading">Original Title</h1>
        <p id="subheading">Original Subtitle</p>
      </main>
      <footer class="cosy-ecosystem-strip-footer">
        <a id="eco-link" href="https://cosylanguages.github.io/COSYlanguages/">COSYlanguages 🏠</a>
      </footer>
    </body>
    </html>
  `;

  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:3000/index.html#access_token=token-abc&refresh_token=token-xyz',
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(window) {
      window.COSY_CONFIG = {
        SUPABASE_URL: 'https://iajkejcmoykubthlwfra.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      };

      // Mock innerText
      Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
        get() { return this.textContent; },
        set(v) { this.textContent = v; },
        configurable: true
      });

      // Mock Supabase client
      const mockClient = {
        auth: {
          getSession: async () => ({ data: { session: mockSession }, error: null }),
          setSession: async (payload) => {
            lastSetSessionPayload = payload;
            return { data: { session: mockSession }, error: null };
          }
        },
        from: (table) => {
          if (table === 'cms_page_overrides') {
            return {
              select: (cols) => ({
                eq: (col, val) => ({
                  maybeSingle: async () => ({
                    data: { page_path: '/index.html', content_html: '<h1 id="heading">CMS Overridden Title</h1><p id="subheading">CMS Overridden Subtitle</p>' },
                    error: null
                  })
                })
              }),
              upsert: async (payload) => {
                lastUpsertPayload = payload;
                return { error: null };
              }
            };
          }
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'founder' }, error: null }) }) })
          };
        }
      };

      Object.defineProperty(window, 'supabase', {
        get: () => ({ createClient: () => mockClient }),
        configurable: true
      });
    }
  });

  const window = dom.window;
  const document = window.document;

  // Load auth-sso.js script content
  const ssoScriptCode = fs.readFileSync(path.join(ROOT_DIR, 'shared', 'js', 'auth-sso.js'), 'utf8');
  window.eval(ssoScriptCode);

  // Wait for SSO session restore
  await new Promise(r => setTimeout(r, 100));

  // TEST 1: Hash token session restore
  console.log('🔹 Test 1: Hash token session restore in auth-sso.js...');
  if (!lastSetSessionPayload) {
    console.error('❌ FAIL: supabase.auth.setSession was not called on page load with hash token.');
    failures++;
  } else if (lastSetSessionPayload.access_token !== 'token-abc' || lastSetSessionPayload.refresh_token !== 'token-xyz') {
    console.error(`❌ FAIL: Expected tokens token-abc/token-xyz, but got: ${JSON.stringify(lastSetSessionPayload)}`);
    failures++;
  } else if (window.location.hash.includes('access_token=')) {
    console.error(`❌ FAIL: URL hash fragment was not cleaned. Found: ${window.location.hash}`);
    failures++;
  } else {
    console.log('  ✅ PASS: Session restored from URL hash and hash fragment seamlessly cleaned.');
  }

  // TEST 2: Ecosystem link click intercepting
  console.log('\n🔹 Test 2: Intercepting ecosystem link click to append session token...');
  const ecoLink = document.getElementById('eco-link');
  if (!ecoLink) {
    console.error('❌ FAIL: Ecosystem link #eco-link not found in DOM.');
    failures++;
  } else {
    ecoLink.addEventListener('click', (e) => e.preventDefault());
    const clickEvent = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    ecoLink.dispatchEvent(clickEvent);
    await new Promise(r => setTimeout(r, 100));

    const updatedHref = ecoLink.getAttribute('href');
    if (!updatedHref.includes('access_token=mock-access-token-123') || !updatedHref.includes('refresh_token=mock-refresh-token-456')) {
      console.error(`❌ FAIL: Ecosystem link href was not updated with session tokens. Found: ${updatedHref}`);
      failures++;
    } else {
      console.log('  ✅ PASS: Ecosystem link click intercepted and session transfer tokens appended.');
    }
  }

  // Load cms-editor.js script content
  const cmsScriptCode = fs.readFileSync(path.join(ROOT_DIR, 'shared', 'js', 'cms-editor.js'), 'utf8');
  window.eval(cmsScriptCode);

  // Wait for CMS initialization
  await new Promise(r => setTimeout(r, 200));

  // TEST 3: Founder CMS floating toolbar rendering
  console.log('\n🔹 Test 3: Floating Founder CMS toolbar rendering for authorized role...');
  const cmsToolbar = document.getElementById('cms-toolbar');
  const editBtn = document.getElementById('cms-edit-btn');
  const saveBtn = document.getElementById('cms-save-btn');

  if (!cmsToolbar) {
    console.error('❌ FAIL: Floating toolbar #cms-toolbar was not rendered.');
    failures++;
  } else if (!editBtn || !saveBtn) {
    console.error('❌ FAIL: Missing #cms-edit-btn or #cms-save-btn in Founder CMS toolbar.');
    failures++;
  } else if (!editBtn.textContent.includes('Edit Page Content') || !saveBtn.textContent.includes('Save & Publish Live')) {
    console.error(`❌ FAIL: CMS buttons missing expected labels. Edit: "${editBtn.textContent}", Save: "${saveBtn.textContent}"`);
    failures++;
  } else {
    console.log('  ✅ PASS: Floating Founder CMS toolbar rendered with Edit Page Content and Save & Publish Live buttons.');
  }

  // TEST 4: Fetching and applying page overrides from Supabase
  console.log('\n🔹 Test 4: Live page content overrides loaded from Supabase cms_page_overrides...');
  const heading = document.getElementById('heading');
  if (!heading || heading.textContent !== 'CMS Overridden Title') {
    console.error(`❌ FAIL: Expected heading to be "CMS Overridden Title", but found: "${heading ? heading.textContent : 'null'}"`);
    failures++;
  } else {
    console.log('  ✅ PASS: Live page overrides loaded from Supabase and applied to DOM elements.');
  }

  // TEST 5: Inline visual editing toggle (contenteditable)
  console.log('\n🔹 Test 5: Inline visual editing (contenteditable) mode toggling...');
  editBtn.click();
  const subheading = document.getElementById('subheading');
  if (!subheading || subheading.getAttribute('contenteditable') !== 'true') {
    console.error('❌ FAIL: Element did not receive contenteditable="true" when edit mode was enabled.');
    failures++;
  } else {
    console.log('  ✅ PASS: Inline visual editing enabled (contenteditable="true") on page elements.');
  }

  // TEST 6: Save & Publish Live upsert
  console.log('\n🔹 Test 6: Upserting page edits to Supabase cms_page_overrides...');
  subheading.textContent = 'Modified Subtitle via CMS';
  saveBtn.click();
  await new Promise(r => setTimeout(r, 200));

  if (!lastUpsertPayload) {
    console.error('❌ FAIL: Supabase upsert was not executed on clicking Save & Publish Live.');
    failures++;
  } else if (lastUpsertPayload.page_path !== '/index.html' || !lastUpsertPayload.content_html.includes('Modified Subtitle via CMS')) {
    console.error(`❌ FAIL: Upsert payload invalid. Payload: ${JSON.stringify(lastUpsertPayload)}`);
    failures++;
  } else {
    console.log('  ✅ PASS: Edits upserted to Supabase cms_page_overrides table successfully.');
  }

  console.log('\n---------------------------------------------------');
  if (failures > 0) {
    console.error(`❌ Ecosystem SSO & CMS integration tests failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✨ All Ecosystem SSO & Founder CMS integration tests passed successfully!');
  }
}

runSsoAndCmsTests().catch((err) => {
  console.error('❌ Unhandled error in SSO/CMS tests:', err);
  process.exit(1);
});
