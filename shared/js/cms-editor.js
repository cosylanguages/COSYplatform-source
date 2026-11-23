/**
 * COSYlanguages Founder Visual CMS On-Page Editor
 * Enables inline live editing and fetches/saves page content overrides via Supabase cms_page_overrides.
 */

window.CosyCMS = window.CosyCMS || {};

(function () {
  // --- HTML sanitizer: ALLOW-LIST, rebuilds a clean tree instead of trying to remove bad parts -------------
  // Saved overrides are readable by every visitor and all COSY apps share one origin, so script injected
  // here could reach the sessions of every other app. Applied both when saving and when rendering.
  // Same approach as COSYtools' cms-editor.js, with table/definition/figure tags added for lesson pages.
  var CMS_SAFE_TAGS = new Set(['a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark', 'kbd', 'abbr', 'br',
    'p', 'span', 'div', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre',
    'small', 'sup', 'sub', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
    'section', 'article', 'header', 'footer', 'main', 'figure', 'figcaption', 'details', 'summary', 'img']);
  // Removed together with their content; other unknown tags are unwrapped (their text is kept).
  var CMS_DROP_TAGS = new Set(['script', 'style', 'svg', 'math', 'iframe', 'frame', 'frameset', 'object', 'embed',
    'applet', 'template', 'noscript', 'noembed', 'noframes', 'textarea', 'title', 'head', 'base', 'link', 'meta',
    'form', 'select', 'option', 'button', 'input', 'video', 'audio', 'source', 'canvas', 'xmp', 'plaintext']);
  var CMS_SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
  var CMS_IMG_PROTOCOLS = new Set(['http:', 'https:']);
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';

  function cmsSafeUrl(value, protocols) {
    var v = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!v) return null;
    try {
      // The WHATWG parser applies the scheme normalisation browsers use ("java\tscript:" is caught).
      var u = new URL(v, 'https://relative.invalid/');
      return protocols.has(u.protocol) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';
    var source = new DOMParser().parseFromString(html, 'text/html');
    var outDoc = document.implementation.createHTMLDocument('');
    var out = outDoc.createElement('div');

    (function copy(from, to) {
      Array.from(from.childNodes).forEach(function (node) {
        if (node.nodeType === 3) { to.appendChild(outDoc.createTextNode(node.nodeValue)); return; }
        if (node.nodeType !== 1) return;
        var tag = node.localName;
        if (node.namespaceURI !== XHTML_NS || CMS_DROP_TAGS.has(tag)) return;
        if (!CMS_SAFE_TAGS.has(tag)) { copy(node, to); return; }
        var el = outDoc.createElement(tag);
        ['class', 'lang', 'title', 'aria-label'].forEach(function (name) {
          if (node.hasAttribute(name)) el.setAttribute(name, node.getAttribute(name));
        });
        if (node.hasAttribute('dir') && /^(ltr|rtl|auto)$/i.test(node.getAttribute('dir'))) {
          el.setAttribute('dir', node.getAttribute('dir').toLowerCase());
        }
        if ((tag === 'td' || tag === 'th')) {
          ['colspan', 'rowspan'].forEach(function (name) {
            if (/^\d{1,2}$/.test(node.getAttribute(name) || '')) el.setAttribute(name, node.getAttribute(name));
          });
        }
        if (tag === 'a') {
          var href = node.hasAttribute('href') ? cmsSafeUrl(node.getAttribute('href'), CMS_SAFE_PROTOCOLS) : null;
          if (href) { el.setAttribute('href', href); el.setAttribute('rel', 'noopener noreferrer'); }
        }
        if (tag === 'img') {
          var src = node.hasAttribute('src') ? cmsSafeUrl(node.getAttribute('src'), CMS_IMG_PROTOCOLS) : null;
          if (!src) return;
          el.setAttribute('src', src);
          if (node.hasAttribute('alt')) el.setAttribute('alt', node.getAttribute('alt'));
          to.appendChild(el);
          return;
        }
        copy(node, el);
        to.appendChild(el);
      });
    })(source.body, out);

    return out.innerHTML;
  }

  let isEditing = false;
  let userRole = null;

  window.CosyCMS.sanitizeHTML = sanitizeHTML;

  function getSupabaseClient() {
    if (window.CosyAuth && window.CosyAuth.client) {
      return window.CosyAuth.client;
    }
    const config = window.COSY_CONFIG || {};
    const url = config.SUPABASE_URL || '';
    const key = config.SUPABASE_ANON_KEY || '';
    if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        const client = window.supabase.createClient(url, key);
        if (window.CosyAuth) window.CosyAuth.client = client;
        return client;
      } catch (e) {}
    }
    return null;
  }

  function getNormalizedPathname() {
    return window.location.pathname || '/';
  }

  /**
   * Role detection: admin, founder, owner
   */
  async function detectUserRole() {
    if (window.COSY_USER && window.COSY_USER.role) {
      userRole = window.COSY_USER.role.toLowerCase();
      return userRole;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session || !session.user) return null;

      const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile && profile.role) {
        userRole = profile.role.toLowerCase();
        window.COSY_USER = window.COSY_USER || {};
        window.COSY_USER.role = profile.role;
        return userRole;
      }
    } catch (e) {
      console.error('[CosyCMS] Error detecting user role:', e);
    }
    return null;
  }

  function isAuthorisedRole(role) {
    if (!role) return false;
    const normRole = role.toLowerCase();
    return ['admin', 'founder', 'owner'].includes(normRole);
  }

  /**
   * Fetches live page content overrides from Supabase cms_page_overrides
   */
  async function fetchAndApplyOverrides() {
    const client = getSupabaseClient();
    if (!client) return;

    const pagePath = getNormalizedPathname();

    try {
      const { data, error } = await client
        .from('cms_page_overrides')
        .select('overrides')
        .eq('page_path', pagePath)
        .maybeSingle();

      if (!error && data && data.overrides) {
        applyOverridesToDOM(data.overrides);
      }
    } catch (e) {
      console.error('[CosyCMS] Error fetching page overrides:', e);
    }
  }

  /**
   * Applies override mapping to DOM elements
   */
  function applyOverridesToDOM(overrides) {
    if (!overrides || typeof overrides !== 'object') return;

    Object.keys(overrides).forEach(key => {
      const content = overrides[key];
      const htmlContent = (typeof content === 'object' && content !== null) ? content.html : content;
      if (typeof htmlContent !== 'string') return;

      let el = null;
      if (key.startsWith('#') || key.startsWith('.') || key.startsWith('[')) {
        el = document.querySelector(key);
      } else {
        el = document.querySelector(`[data-cms-id="${key}"]`) || document.getElementById(key);
      }

      if (el) {
        el.innerHTML = sanitizeHTML(htmlContent);
      }
    });
  }

  /**
   * Renders floating Founder CMS Toolbar
   */
  function renderToolbar() {
    if (document.getElementById('cosy-cms-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cosy-cms-toolbar';
    toolbar.setAttribute('data-cms-ignore', 'true');
    toolbar.setAttribute('data-i18n-skip', 'true');
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #0f172a;
      color: var(--on-primary);
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.85rem;
      border: 1px solid #334155;
    `;

    toolbar.innerHTML = `
      <span style="font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
        👑 CMS
      </span>
      <button id="cosy-cms-btn-edit" style="
        background: #0284c7;
        color: var(--on-primary);
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.15s ease;
      ">✏️ Edit Page Content</button>
      <button id="cosy-cms-btn-save" style="
        background: #059669;
        color: var(--on-primary);
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.15s ease;
      ">💾 Save & Publish Live</button>
      <span id="cosy-cms-status" style="font-size: 0.75rem; color: var(--cosy-color-ink-muted);"></span>
    `;

    document.body.appendChild(toolbar);

    if (!document.getElementById('cosy-cms-styles')) {
      const style = document.createElement('style');
      style.id = 'cosy-cms-styles';
      style.innerHTML = `
        .cosy-cms-editable-active {
          outline: 2px dashed #0284c7 !important;
          outline-offset: 2px !important;
          cursor: text !important;
        }
        .cosy-cms-editable-active:hover {
          background-color: rgba(2, 132, 199, 0.05) !important;
        }
      `;
      document.head.appendChild(style);
    }

    document.getElementById('cosy-cms-btn-edit').addEventListener('click', toggleInlineEditing);
    document.getElementById('cosy-cms-btn-save').addEventListener('click', saveAndPublishLive);
  }

  /**
   * Selects editable elements on the page and toggles contenteditable
   */
  function toggleInlineEditing() {
    isEditing = !isEditing;

    const editBtn = document.getElementById('cosy-cms-btn-edit');
    const statusSpan = document.getElementById('cosy-cms-status');

    if (editBtn) {
      editBtn.style.background = isEditing ? '#e11d48' : '#0284c7';
      editBtn.textContent = isEditing ? '🛑 Stop Editing' : '✏️ Edit Page Content';
    }

    if (statusSpan) {
      statusSpan.textContent = isEditing ? 'Editing Enabled' : '';
    }

    const editableCandidates = getEditableElements();

    editableCandidates.forEach((el, index) => {
      if (!el.hasAttribute('data-cms-id') && !el.id) {
        el.setAttribute('data-cms-id', `cms-el-${index}`);
      }

      if (isEditing) {
        el.setAttribute('contenteditable', 'true');
        el.classList.add('cosy-cms-editable-active');
      } else {
        el.removeAttribute('contenteditable');
        el.classList.remove('cosy-cms-editable-active');
      }
    });
  }

  /**
   * Helper to get editable elements on page
   */
  function getEditableElements() {
    const all = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, li, dt, dd, td, th, [data-cms-editable="true"]'));

    return all.filter(el => {
      if (el.closest('[data-cms-ignore="true"]')) return false;
      if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON'].includes(el.tagName)) return false;
      return true;
    });
  }

  /**
   * Upserts edits to Supabase cms_page_overrides
   */
  async function saveAndPublishLive() {
    const client = getSupabaseClient();
    const statusSpan = document.getElementById('cosy-cms-status');

    if (!client) {
      if (statusSpan) statusSpan.textContent = '❌ Supabase client missing';
      return;
    }

    if (statusSpan) statusSpan.textContent = '⏳ Saving...';

    const editableElements = getEditableElements();
    const overrides = {};

    editableElements.forEach((el, index) => {
      const key = el.getAttribute('data-cms-id') || el.id || `cms-el-${index}`;
      overrides[key] = sanitizeHTML(el.innerHTML);
    });

    const pagePath = getNormalizedPathname();

    try {
      const { error } = await client
        .from('cms_page_overrides')
        .upsert({
          page_path: pagePath,
          overrides: overrides,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[CosyCMS] Error saving overrides:', error);
        if (statusSpan) statusSpan.textContent = '❌ Save failed';
      } else {
        if (statusSpan) statusSpan.textContent = '✅ Saved & Published!';
        if (isEditing) {
          toggleInlineEditing();
        }
        setTimeout(() => {
          if (statusSpan) statusSpan.textContent = '';
        }, 3000);
      }
    } catch (err) {
      console.error('[CosyCMS] Exception saving overrides:', err);
      if (statusSpan) statusSpan.textContent = '❌ Save error';
    }
  }

  /**
   * Init routine
   */
  async function init() {
    await fetchAndApplyOverrides();

    const role = await detectUserRole();
    if (isAuthorisedRole(role)) {
      renderToolbar();
    }
  }

  window.CosyCMS.init = init;
  window.CosyCMS.detectUserRole = detectUserRole;
  window.CosyCMS.isAuthorisedRole = isAuthorisedRole;
  window.CosyCMS.fetchAndApplyOverrides = fetchAndApplyOverrides;
  window.CosyCMS.saveAndPublishLive = saveAndPublishLive;
  window.CosyCMS.toggleInlineEditing = toggleInlineEditing;

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
