/**
 * COSY Platform Founder Visual On-Page CMS Editor
 *
 * 1. Detects if user role is admin, founder, or owner via COSY_USER or Supabase profile.
 * 2. Fetches live page content overrides from Supabase cms_page_overrides (keyed by window.location.pathname) on load.
 * 3. Renders a floating Founder CMS toolbar with '✏️ Edit Page Content' and '💾 Save & Publish Live'.
 * 4. Enables inline visual editing (contenteditable="true") and upserts edits to Supabase cms_page_overrides.
 */

(function () {
  'use strict';

  window.CosyCMS = window.CosySSO || window.CosyCMS || {};

  let isEditingMode = false;
  let activeProfile = null;

  function getSupabaseClient() {
    if (window.CosyAuth && window.CosyAuth.client) {
      return window.CosyAuth.client;
    }
    const config = window.COSY_CONFIG || {};
    const url = config.SUPABASE_URL || '';
    const key = config.SUPABASE_ANON_KEY || '';
    if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        return window.supabase.createClient(url, key);
      } catch (e) {}
    }
    return null;
  }

  function isAuthorizedRole(roleStr) {
    if (!roleStr || typeof roleStr !== 'string') return false;
    const lower = roleStr.toLowerCase().trim();
    return ['admin', 'founder', 'owner'].includes(lower);
  }

  function checkUserAuthorization() {
    if (window.COSY_USER && isAuthorizedRole(window.COSY_USER.role)) {
      return true;
    }
    if (activeProfile && isAuthorizedRole(activeProfile.role)) {
      return true;
    }
    return false;
  }

  async function loadPageOverrides() {
    const client = getSupabaseClient();
    if (!client) return;

    const pagePath = window.location.pathname;

    try {
      const { data, error } = await client
        .from('cms_page_overrides')
        .select('*')
        .eq('page_path', pagePath)
        .maybeSingle();

      if (!error && data) {
        if (data.overrides && typeof data.overrides === 'object') {
          for (const [selector, html] of Object.entries(data.overrides)) {
            const el = document.querySelector(selector);
            if (el && typeof html === 'string') {
              el.innerHTML = html;
            }
          }
        } else if (data.content_html && typeof data.content_html === 'string') {
          const mainTarget = document.getElementById('app-root') || document.querySelector('main') || document.body;
          if (mainTarget) {
            mainTarget.innerHTML = data.content_html;
          }
        }
      }
    } catch (err) {
      console.warn('CosyCMS: Could not load cms_page_overrides:', err);
    }
  }

  function getEditableElements() {
    const mainTarget = document.getElementById('app-root') || document.querySelector('main') || document.body;
    const elements = mainTarget.querySelectorAll('h1, h2, h3, h4, p, span, [data-cms-editable]');
    return Array.from(elements);
  }

  function toggleEditMode() {
    isEditingMode = !isEditingMode;
    const editBtn = document.getElementById('cms-edit-btn');
    const editableElements = getEditableElements();

    editableElements.forEach(el => {
      // Exclude toolbar itself and non-editable control components
      if (el.closest('#cms-toolbar') || el.closest('script') || el.closest('style') || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        return;
      }
      if (isEditingMode) {
        el.setAttribute('contenteditable', 'true');
        el.style.outline = '2px dashed #0284c7';
        el.style.outlineOffset = '2px';
      } else {
        el.removeAttribute('contenteditable');
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });

    if (editBtn) {
      if (isEditingMode) {
        editBtn.style.backgroundColor = '#b45309';
        editBtn.textContent = '⏸️ Stop Editing';
      } else {
        editBtn.style.backgroundColor = '#0369a1';
        editBtn.textContent = '✏️ Edit Page Content';
      }
    }
  }

  async function saveAndPublishLive() {
    const client = getSupabaseClient();
    if (!client) {
      alert('Supabase client not configured.');
      return;
    }

    if (isEditingMode) {
      toggleEditMode();
    }

    const saveBtn = document.getElementById('cms-save-btn');
    const statusMsg = document.getElementById('cms-status-msg');

    if (saveBtn) saveBtn.disabled = true;
    if (statusMsg) statusMsg.textContent = 'Saving...';

    const pagePath = window.location.pathname;
    const mainTarget = document.getElementById('app-root') || document.querySelector('main') || document.body;
    const contentHtml = mainTarget ? mainTarget.innerHTML : document.body.innerHTML;

    // Collect element-level overrides map
    const overridesMap = {};
    document.querySelectorAll('[data-cms-id]').forEach(el => {
      const cmsId = el.getAttribute('data-cms-id');
      if (cmsId) {
        overridesMap[`[data-cms-id="${cmsId}"]`] = el.innerHTML;
      }
    });

    try {
      const { error } = await client
        .from('cms_page_overrides')
        .upsert({
          page_path: pagePath,
          content_html: contentHtml,
          overrides: overridesMap,
          updated_at: new Date().toISOString()
        }, { onConflict: 'page_path' });

      if (error) {
        if (statusMsg) {
          statusMsg.style.color = '#ef4444';
          statusMsg.textContent = 'Error saving!';
        }
        console.error('CosyCMS: Save error:', error);
      } else {
        if (statusMsg) {
          statusMsg.style.color = '#10b981';
          statusMsg.textContent = 'Published Live ✔️';
          setTimeout(() => { statusMsg.textContent = 'Founder CMS'; statusMsg.style.color = '#e0f2fe'; }, 3000);
        }
        if (window.CosyUI && typeof window.CosyUI.toast === 'function') {
          window.CosyUI.toast('Page edits saved and published live!', 'success');
        }
      }
    } catch (err) {
      console.error('CosyCMS: Save exception:', err);
      if (statusMsg) {
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = 'Error saving!';
      }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function renderFloatingToolbar() {
    if (document.getElementById('cms-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cms-toolbar';
    toolbar.setAttribute('data-i18n-skip', '');
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.85rem;
    `;

    toolbar.innerHTML = `
      <span id="cms-status-msg" style="font-weight: 700; color: #e0f2fe; font-size: 0.8rem;">Founder CMS</span>
      <button id="cms-edit-btn" style="background: #0369a1; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; transition: background 0.15s;">✏️ Edit Page Content</button>
      <button id="cms-save-btn" style="background: #047857; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; transition: background 0.15s;">💾 Save &amp; Publish Live</button>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('cms-edit-btn').addEventListener('click', function(e) {
      e.preventDefault();
      toggleEditMode();
    });
    document.getElementById('cms-save-btn').addEventListener('click', function(e) {
      e.preventDefault();
      saveAndPublishLive();
    });
  }

  async function initCMS() {
    await loadPageOverrides();

    const client = getSupabaseClient();
    if (client && client.auth) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
          const { data: profile } = await client
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile) {
            activeProfile = profile;
          }
        }
      } catch (err) {}
    }

    if (checkUserAuthorization()) {
      renderFloatingToolbar();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCMS);
  } else {
    initCMS();
  }

  window.CosyCMS.initCMS = initCMS;
  window.CosyCMS.renderFloatingToolbar = renderFloatingToolbar;
  window.CosyCMS.toggleEditMode = toggleEditMode;
  window.CosyCMS.saveAndPublishLive = saveAndPublishLive;
})();
