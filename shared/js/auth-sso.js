/**
 * COSY Ecosystem Cross-Domain Single Sign-On (SSO) Handler
 *
 * 1. Restores active user session automatically from URL hash tokens (#access_token=...&refresh_token=...).
 * 2. Cleans URL hash fragment seamlessly after session restore.
 * 3. Intercepts clicks on ecosystem links (a[href*="COSY"]) to append session transfer tokens.
 */

(function () {
  'use strict';

  window.CosySSO = window.CosySSO || {};

  /**
   * Helper to get or create the Supabase client
   */
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
      } catch (e) {
        console.error('CosySSO: Failed to create Supabase client:', e);
      }
    }
    return null;
  }

  /**
   * Restores session if hash tokens exist in window.location.hash
   */
  async function restoreSessionFromHash() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) {
      return;
    }

    const hashStr = hash.startsWith('#') ? hash.substring(1) : hash;
    const params = new URLSearchParams(hashStr);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) return;

    const client = getSupabaseClient();
    if (!client) {
      console.warn('CosySSO: Supabase client not available to restore session.');
      return;
    }

    try {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });

      if (!error && data && data.session) {
        // Clean URL hash fragment seamlessly after session restore
        const cleanUrl = window.location.pathname + window.location.search;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, document.title, cleanUrl);
        } else {
          window.location.hash = '';
        }

        window.dispatchEvent(new CustomEvent('cosy-sso-restored', { detail: data }));
      } else if (error) {
        console.error('CosySSO: Error restoring session from hash token:', error.message);
      }
    } catch (err) {
      console.error('CosySSO: Unexpected error during session restore:', err);
    }
  }

  /**
   * Attaches ecosystem click listener to append session tokens on cross-subdomain navigation
   */
  function setupEcosystemLinkInterceptor() {
    document.addEventListener('click', async function (e) {
      const link = e.target ? e.target.closest('a[href*="COSY"], a[href*="cosy"]') : null;
      if (!link) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      if (rawHref.includes('access_token=')) return;

      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.access_token && session.refresh_token) {
          const tokenHash = `#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
          try {
            const url = new URL(rawHref, window.location.href);
            url.hash = tokenHash;
            link.href = url.toString();
          } catch (err) {
            if (!rawHref.includes('#')) {
              link.href = rawHref + tokenHash;
            }
          }
        }
      } catch (err) {
        // Ignore link intercept errors
      }
    }, true);
  }

  // Execute restore check immediately or on DOMReady
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSessionFromHash);
  } else {
    restoreSessionFromHash();
  }

  setupEcosystemLinkInterceptor();
  window.CosySSO.restoreSessionFromHash = restoreSessionFromHash;
})();
