/**
 * COSYlanguages Ecosystem Single Sign-On (SSO) Handler
 * Restores sessions from hash tokens and appends session transfer tokens to ecosystem links.
 */

window.CosySSO = window.CosySSO || {};

(function () {
  /**
   * Helper to get or initialize the Supabase client
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
        const client = window.supabase.createClient(url, key);
        if (window.CosyAuth) window.CosyAuth.client = client;
        return client;
      } catch (e) {
        console.error('[CosySSO] Error creating Supabase client:', e);
      }
    }
    return null;
  }

  /**
   * Parses access_token and refresh_token from location hash
   */
  function parseHashTokens(hashStr) {
    if (!hashStr) return null;
    const cleanHash = hashStr.startsWith('#') ? hashStr.substring(1) : hashStr;
    if (!cleanHash.includes('access_token=') || !cleanHash.includes('refresh_token=')) {
      return null;
    }
    const params = new URLSearchParams(cleanHash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
    return null;
  }

  /**
   * Restores user session if tokens are in window.location.hash
   */
  async function restoreSessionFromHash() {
    const tokens = parseHashTokens(window.location.hash);
    if (!tokens) return false;

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });

      if (!error && data && data.session) {
        // Clean URL hash fragment seamlessly after session restore
        const cleanUrl = window.location.pathname + window.location.search;
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, document.title, cleanUrl);
        } else {
          window.location.hash = '';
        }
        return true;
      } else if (error) {
        console.warn('[CosySSO] setSession error:', error.message);
      }
    } catch (err) {
      console.error('[CosySSO] Exception in restoreSessionFromHash:', err);
    }
    return false;
  }

  /**
   * Appends session transfer tokens to ecosystem link URL
   */
  function buildEcosystemUrlWithTokens(targetHref, accessToken, refreshToken) {
    if (!targetHref || !accessToken || !refreshToken) return targetHref;

    try {
      const [baseAndQuery, existingHash] = targetHref.split('#');
      const hashParams = new URLSearchParams(existingHash || '');
      hashParams.set('access_token', accessToken);
      hashParams.set('refresh_token', refreshToken);

      return `${baseAndQuery}#${hashParams.toString()}`;
    } catch (e) {
      return targetHref;
    }
  }

  /**
   * Handles click events on ecosystem links (a[href*="COSY"])
   */
  async function handleEcosystemClick(e) {
    const anchor = e.target ? e.target.closest('a[href*="COSY"], a[href*="cosy"]') : null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token || !session.refresh_token) return;

      const newUrl = buildEcosystemUrlWithTokens(href, session.access_token, session.refresh_token);
      anchor.setAttribute('href', newUrl);
    } catch (err) {
      console.error('[CosySSO] Error appending session transfer tokens:', err);
    }
  }

  /**
   * Export functions on window.CosySSO
   */
  window.CosySSO.parseHashTokens = parseHashTokens;
  window.CosySSO.restoreSessionFromHash = restoreSessionFromHash;
  window.CosySSO.buildEcosystemUrlWithTokens = buildEcosystemUrlWithTokens;

  // Execute restoreSessionFromHash on script load
  if (typeof window !== 'undefined') {
    restoreSessionFromHash();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', handleEcosystemClick, { capture: true });
      });
    } else {
      document.addEventListener('click', handleEcosystemClick, { capture: true });
    }
  }
})();
