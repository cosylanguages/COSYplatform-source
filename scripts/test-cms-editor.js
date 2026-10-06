const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');

async function runCmsEditorTests() {
  console.log('🧪 Running Founder Visual CMS Editor Tests (scripts/test-cms-editor.js)...\n');

  let failures = 0;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          window.COSY_CONFIG = {
            SUPABASE_URL: "https://test.supabase.co",
            SUPABASE_ANON_KEY: "test-anon-key"
          };
        </script>
      </head>
      <body>
        <h1 data-cms-id="hero-heading">Default Title</h1>
        <p data-cms-id="subtext">Default Paragraph text.</p>
      </body>
    </html>
  `;

  let upsertCalledWith = null;

  const mockOverrides = {
    'hero-heading': 'Updated Live Title',
    'subtext': 'Updated Live Paragraph text.'
  };

  const dom = new JSDOM(html, {
    url: 'https://cosylanguages.github.io/COSYlanguages/index.html',
    runScripts: 'dangerously'
  });

  const { window } = dom;

  // Mock Supabase Client
  const mockClient = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'founder-1' } } },
        error: null
      })
    },
    from: (tableName) => {
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'founder' }, error: null })
            })
          })
        };
      }
      if (tableName === 'cms_page_overrides') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { page_path: '/COSYlanguages/index.html', overrides: mockOverrides },
                error: null
              })
            })
          }),
          upsert: async (payload) => {
            upsertCalledWith = payload;
            return { error: null };
          }
        };
      }
      return {};
    }
  };

  window.supabase = {
    createClient: () => mockClient
  };

  // Load cms-editor.js
  const cmsCode = fs.readFileSync(path.join(ROOT_DIR, 'shared/js/cms-editor.js'), 'utf8');
  window.eval(cmsCode);

  // Test 1: Role detection helper
  console.log('🔹 Test 1: Role Authorization Check...');
  if (
    window.CosyCMS.isAuthorisedRole('admin') &&
    window.CosyCMS.isAuthorisedRole('founder') &&
    window.CosyCMS.isAuthorisedRole('owner') &&
    !window.CosyCMS.isAuthorisedRole('student') &&
    !window.CosyCMS.isAuthorisedRole('teacher')
  ) {
    console.log('  ✅ PASS: Authorized roles (admin, founder, owner) verified correctly.');
  } else {
    console.error('  ❌ FAIL: Role authorization check failed.');
    failures++;
  }

  // Test 2: Fetch and Apply Overrides
  console.log('\n🔹 Test 2: Fetching and Applying Page Overrides...');
  await window.CosyCMS.fetchAndApplyOverrides();

  const h1El = window.document.querySelector('[data-cms-id="hero-heading"]');
  const pEl = window.document.querySelector('[data-cms-id="subtext"]');

  if (h1El.innerHTML === 'Updated Live Title' && pEl.innerHTML === 'Updated Live Paragraph text.') {
    console.log('  ✅ PASS: Page content overrides fetched and applied to DOM elements.');
  } else {
    console.error(`  ❌ FAIL: Overrides not applied correctly. h1="${h1El.innerHTML}", p="${pEl.innerHTML}"`);
    failures++;
  }

  // Test 3: Founder CMS Toolbar Rendering
  console.log('\n🔹 Test 3: Floating Founder CMS Toolbar...');
  await window.CosyCMS.init(); // runs detectUserRole & renders toolbar for founder

  const toolbar = window.document.getElementById('cosy-cms-toolbar');
  const editBtn = window.document.getElementById('cosy-cms-btn-edit');
  const saveBtn = window.document.getElementById('cosy-cms-btn-save');

  if (toolbar && editBtn && saveBtn) {
    console.log('  ✅ PASS: Floating Founder CMS toolbar rendered with Edit and Save buttons.');
  } else {
    console.error('  ❌ FAIL: Floating toolbar missing or buttons incomplete.');
    failures++;
  }

  // Test 4: Inline Visual Editing
  console.log('\n🔹 Test 4: Inline Visual Editing Toggle...');
  window.CosyCMS.toggleInlineEditing(); // enable edit mode

  if (h1El.getAttribute('contenteditable') === 'true' && pEl.getAttribute('contenteditable') === 'true') {
    console.log('  ✅ PASS: Inline visual editing enabled contenteditable="true" on elements.');
  } else {
    console.error('  ❌ FAIL: contenteditable not set on editable elements.');
    failures++;
  }

  // Modify content and Save & Publish Live
  console.log('\n🔹 Test 5: Save & Publish Live Upsert...');
  h1El.innerHTML = 'Brand New Founder Title';

  await window.CosyCMS.saveAndPublishLive();

  if (
    upsertCalledWith &&
    upsertCalledWith.page_path === '/COSYlanguages/index.html' &&
    upsertCalledWith.overrides['hero-heading'] === 'Brand New Founder Title'
  ) {
    console.log('  ✅ PASS: Edits successfully upserted to Supabase cms_page_overrides.');
  } else {
    console.error(`  ❌ FAIL: Upsert payload invalid. Found: ${JSON.stringify(upsertCalledWith)}`);
    failures++;
  }

  console.log('\n---------------------------------------------------');
  if (failures > 0) {
    console.error(`❌ Founder Visual CMS Editor tests failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✨ All Founder Visual CMS Editor tests passed successfully!');
  }
}

runCmsEditorTests().catch(err => {
  console.error('❌ Unhandled error in CMS Editor tests:', err);
  process.exit(1);
});
