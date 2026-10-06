const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.join(__dirname, '..');

async function runAuthSsoTests() {
  console.log('🧪 Running SSO Authentication Handler Tests (scripts/test-auth-sso.js)...\n');

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
        <a id="eco-link-1" href="https://cosylanguages.github.io/COSYlanguages/hub.html">COSYlanguages Hub</a>
        <a id="eco-link-2" href="https://cosylanguages.github.io/COSYdata/">COSYdata</a>
        <a id="regular-link" href="https://example.com/about">Other Site</a>
      </body>
    </html>
  `;

  let mockSetSessionCalledWith = null;

  const mockSession = {
    access_token: 'acc_token_12345',
    refresh_token: 'ref_token_67890'
  };

  const dom = new JSDOM(html, {
    url: 'https://cosylanguages.github.io/COSYplatform/index.html#access_token=acc_token_12345&refresh_token=ref_token_67890',
    runScripts: 'dangerously'
  });

  const { window } = dom;

  // Mock Supabase
  const mockClient = {
    auth: {
      setSession: async (tokens) => {
        mockSetSessionCalledWith = tokens;
        return { data: { session: { user: { id: 'u1' }, ...tokens } }, error: null };
      },
      getSession: async () => {
        return { data: { session: mockSession }, error: null };
      }
    }
  };

  window.supabase = {
    createClient: () => mockClient
  };

  // Load auth-sso.js
  const ssoCode = fs.readFileSync(path.join(ROOT_DIR, 'shared/js/auth-sso.js'), 'utf8');
  window.eval(ssoCode);

  // Test 1: parseHashTokens
  console.log('🔹 Test 1: parseHashTokens function...');
  const tokens = window.CosySSO.parseHashTokens('#access_token=a1&refresh_token=r1&type=bearer');
  if (tokens && tokens.access_token === 'a1' && tokens.refresh_token === 'r1') {
    console.log('  ✅ PASS: Successfully parsed access_token and refresh_token from hash string.');
  } else {
    console.error(`  ❌ FAIL: Failed to parse tokens. Got: ${JSON.stringify(tokens)}`);
    failures++;
  }

  const invalidTokens = window.CosySSO.parseHashTokens('#access_token=a1');
  if (invalidTokens === null) {
    console.log('  ✅ PASS: Returned null for incomplete hash tokens.');
  } else {
    console.error(`  ❌ FAIL: Should return null for incomplete tokens. Got: ${JSON.stringify(invalidTokens)}`);
    failures++;
  }

  // Test 2: restoreSessionFromHash & URL cleaning
  console.log('\n🔹 Test 2: restoreSessionFromHash & hash cleaning...');
  await new Promise(r => setTimeout(r, 100)); // allow async restoreSessionFromHash to complete

  if (mockSetSessionCalledWith && mockSetSessionCalledWith.access_token === 'acc_token_12345') {
    console.log('  ✅ PASS: supabase.auth.setSession was called with restored tokens.');
  } else {
    console.error(`  ❌ FAIL: supabase.auth.setSession was not called correctly. Called with: ${JSON.stringify(mockSetSessionCalledWith)}`);
    failures++;
  }

  if (window.location.hash === '' || window.location.hash === '#') {
    console.log('  ✅ PASS: Hash fragment was cleaned seamlessly from URL after restore.');
  } else {
    console.error(`  ❌ FAIL: Hash was not cleaned. Current hash: "${window.location.hash}"`);
    failures++;
  }

  // Test 3: buildEcosystemUrlWithTokens
  console.log('\n🔹 Test 3: buildEcosystemUrlWithTokens...');
  const builtUrl = window.CosySSO.buildEcosystemUrlWithTokens(
    'https://cosylanguages.github.io/COSYlanguages/',
    'acc123',
    'ref456'
  );
  if (builtUrl.includes('access_token=acc123') && builtUrl.includes('refresh_token=ref456')) {
    console.log('  ✅ PASS: Transfer tokens correctly appended to destination URL hash.');
  } else {
    console.error(`  ❌ FAIL: URL building failed. Output: ${builtUrl}`);
    failures++;
  }

  // Test 4: Ecosystem Link Intercept
  console.log('\n🔹 Test 4: Ecosystem link click intercept...');
  const ecoLink = window.document.getElementById('eco-link-1');
  const clickEvent = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  ecoLink.dispatchEvent(clickEvent);

  await new Promise(r => setTimeout(r, 50));

  if (ecoLink.href.includes('access_token=acc_token_12345') && ecoLink.href.includes('refresh_token=ref_token_67890')) {
    console.log('  ✅ PASS: Click on ecosystem link appended active session tokens to href.');
  } else {
    console.error(`  ❌ FAIL: Ecosystem link href was not updated. Found: ${ecoLink.href}`);
    failures++;
  }

  console.log('\n---------------------------------------------------');
  if (failures > 0) {
    console.error(`❌ SSO Authentication Handler tests failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✨ All SSO Authentication Handler tests passed successfully!');
  }
}

runAuthSsoTests().catch(err => {
  console.error('❌ Unhandled error in SSO tests:', err);
  process.exit(1);
});
