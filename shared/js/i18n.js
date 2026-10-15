/**
 * COSYlanguages i18n Translation Engine
 */
(function () {
  const SUPPORTED_LANGS = ['en', 'fr', 'ru', 'it', 'el'];
  const STORAGE_PIN_KEY = 'cosy_ui_lang';
  const STORAGE_LAST_KEY = 'cosy_ui_lang_last';

  let currentLang = 'en';
  let dictionaries = {
    en: null
  };
  let isReadyResolve;
  const readyPromise = new Promise((resolve) => {
    isReadyResolve = resolve;
  });

  function getBasePath() {
    if (window.COSY_BASE_PATH) return window.COSY_BASE_PATH;
    if (document.currentScript && document.currentScript.src) {
      const src = document.currentScript.src;
      const idx = src.indexOf('shared/js/');
      if (idx !== -1) return src.substring(0, idx);
    }
    return '';
  }

  function getUrlParam(param) {
    try {
      const search = window.location.search;
      if (!search) return null;
      const params = new URLSearchParams(search);
      return params.get(param);
    } catch (e) {
      return null;
    }
  }

  function getCourseLangFromManifest(courseId) {
    if (!courseId) return null;
    const manifest = (window.CosyAuth && window.CosyAuth.FULL_MANIFEST) || [];
    const course = manifest.find((c) => c.id === courseId);
    if (course && course.lang) {
      return course.lang.toLowerCase();
    }
    // Fallback: extract language subtag from course ID like general-fr-a1 -> fr
    const parts = courseId.split('-');
    if (parts.length >= 2) {
      const langCandidate = parts[1].toLowerCase();
      if (SUPPORTED_LANGS.includes(langCandidate)) {
        return langCandidate;
      }
    }
    return null;
  }

  function resolveLanguage(profile) {
    // A language-specific learning context must override a general UI preference.
    // Otherwise a learner entering a French course could see English or Russian chrome.
    // Step 1: Context language: ?lang=<code>, or ?course= (from manifest)
    const langParam = getUrlParam('lang');
    if (langParam && SUPPORTED_LANGS.includes(langParam.toLowerCase())) {
      return langParam.toLowerCase();
    }
    const courseParam = getUrlParam('course');
    if (courseParam) {
      const courseLang = getCourseLangFromManifest(courseParam);
      if (courseLang && SUPPORTED_LANGS.includes(courseLang)) {
        return courseLang;
      }
    }

    // Step 3: Pinned choice in localStorage "cosy_ui_lang" (only outside course context)
    try {
      const pinned = localStorage.getItem(STORAGE_PIN_KEY);
      if (pinned && SUPPORTED_LANGS.includes(pinned.toLowerCase())) {
        return pinned.toLowerCase();
      }
    } catch (e) {}

    // Step 4: URL ?ui=<code> (supported code or "pseudo"), only outside course context
    const uiParam = getUrlParam('ui');
    if (uiParam) {
      const uiLower = uiParam.toLowerCase();
      if (uiLower === 'pseudo' || SUPPORTED_LANGS.includes(uiLower)) {
        return uiLower;
      }
    }

    // Step 5: Profile default: first supported code in profile.language_access
    if (profile && Array.isArray(profile.language_access)) {
      for (const langCode of profile.language_access) {
        if (!langCode || langCode === '*') continue;
        const normalized = String(langCode).toLowerCase();
        if (SUPPORTED_LANGS.includes(normalized)) {
          return normalized;
        }
      }
    }

    // Step 4b (Pre-profile first paint): Cached last resolved language
    if (!profile) {
      try {
        const last = localStorage.getItem(STORAGE_LAST_KEY);
        if (last && SUPPORTED_LANGS.includes(last.toLowerCase())) {
          return last.toLowerCase();
        }
      } catch (e) {}
    }

    // Step 5: Browser language (navigator.languages, primary subtag)
    try {
      const navLangs = navigator.languages || [navigator.language || navigator.userLanguage];
      for (const bLang of navLangs) {
        if (!bLang) continue;
        const primary = bLang.split('-')[0].toLowerCase();
        if (SUPPORTED_LANGS.includes(primary)) {
          return primary;
        }
      }
    } catch (e) {}

    // Step 6: "en"
    return 'en';
  }

  async function loadDictionary(langCode) {
    if (langCode === 'pseudo') return {};
    if (dictionaries[langCode]) return dictionaries[langCode];

    const basePath = getBasePath();
    const jsonUrl = `${basePath}shared/i18n/${langCode}.json`;

    try {
      const fetchFn = (typeof window !== 'undefined' && window.fetch) ? window.fetch : globalThis.fetch;
      if (typeof fetchFn === 'function') {
        const res = await fetchFn(jsonUrl);
        if (res && res.ok) {
          const data = await res.json();
          dictionaries[langCode] = data;
          return data;
        }
      }
    } catch (e) {
      console.warn(`[i18n] Failed to load dictionary for ${langCode}:`, e);
    }
    dictionaries[langCode] = {};
    return {};
  }

  async function ensureDictionaries(targetLang) {
    // English is always loaded as fallback
    await loadDictionary('en');
    if (targetLang !== 'en' && targetLang !== 'pseudo') {
      await loadDictionary(targetLang);
    }
  }

  function saveLastResolvedLang(resolvedLang) {
    if (resolvedLang && resolvedLang !== 'pseudo') {
      try {
        localStorage.setItem(STORAGE_LAST_KEY, resolvedLang);
      } catch (e) {}
    }
  }

  function interpolate(str, params) {
    if (typeof str !== 'string') return str;
    if (!params) return str;
    return str.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined && params[key] !== null) {
        return params[key];
      }
      return match;
    });
  }

  function t(key, params) {
    if (currentLang === 'pseudo') {
      return `⟦${key}⟧`;
    }

    const dict = dictionaries[currentLang] || {};
    const enDict = dictionaries['en'] || {};

    let value = dict[key];
    if (value === undefined && currentLang !== 'en') {
      value = enDict[key];
    }
    if (value === undefined) {
      value = key;
    }

    return interpolate(value, params);
  }

  function tp(key, count, params = {}) {
    if (currentLang === 'pseudo') {
      return `⟦${key}⟧`;
    }

    const mergedParams = Object.assign({ count }, params);
    const num = Number(count) || 0;

    let category = 'other';
    try {
      const locale = currentLang === 'pseudo' ? 'en' : currentLang;
      const pr = new Intl.PluralRules(locale);
      category = pr.select(num);
    } catch (e) {
      category = num === 1 ? 'one' : 'other';
    }

    const specificKey = `${key}.${category}`;
    const fallbackKey = `${key}.other`;

    const dict = dictionaries[currentLang] || {};
    const enDict = dictionaries['en'] || {};

    let value = dict[specificKey];
    if (value === undefined) value = dict[fallbackKey];
    if (value === undefined && currentLang !== 'en') {
      value = enDict[specificKey];
      if (value === undefined) value = enDict[fallbackKey];
    }
    if (value === undefined) {
      value = key;
    }

    return interpolate(value, mergedParams);
  }

  function formatDate(d, options) {
    const locale = currentLang === 'pseudo' ? 'en' : currentLang;
    const dateObj = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  }

  function formatNumber(n, options) {
    const locale = currentLang === 'pseudo' ? 'en' : currentLang;
    return new Intl.NumberFormat(locale, options).format(n);
  }

  function applyDom(container = document) {
    const doc = container.ownerDocument || container;
    if (doc && doc.documentElement) {
      doc.documentElement.lang = currentLang === 'pseudo' ? 'en' : currentLang;
    }

    // Elements with data-i18n
    const i18nElements = container.querySelectorAll('[data-i18n]');
    i18nElements.forEach((el) => {
      if (el.hasAttribute('data-i18n-skip')) return;
      const key = el.getAttribute('data-i18n');
      if (!key) return;

      const countAttr = el.getAttribute('data-i18n-count');
      let text = '';
      if (countAttr !== null && countAttr !== undefined) {
        text = tp(key, Number(countAttr));
      } else {
        text = t(key);
      }

      if (el.tagName && el.tagName.toLowerCase() === 'title') {
        doc.title = `${text} · COSYlanguages`;
      } else {
        el.textContent = text;
      }
    });

    // Placeholders
    const placeholderEls = container.querySelectorAll('[data-i18n-placeholder]');
    placeholderEls.forEach((el) => {
      if (el.hasAttribute('data-i18n-skip')) return;
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });

    // Titles
    const titleEls = container.querySelectorAll('[data-i18n-title]');
    titleEls.forEach((el) => {
      if (el.hasAttribute('data-i18n-skip')) return;
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });

    // Aria Labels
    const ariaEls = container.querySelectorAll('[data-i18n-aria]');
    ariaEls.forEach((el) => {
      if (el.hasAttribute('data-i18n-skip')) return;
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
  }

  function setLang(codeOrAuto) {
    if (!codeOrAuto || codeOrAuto === 'auto') {
      try {
        localStorage.removeItem(STORAGE_PIN_KEY);
      } catch (e) {}
    } else {
      const code = String(codeOrAuto).toLowerCase();
      if (SUPPORTED_LANGS.includes(code) || code === 'pseudo') {
        try {
          localStorage.setItem(STORAGE_PIN_KEY, code);
        } catch (e) {}
      }
    }
    if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  }

  async function recompute(profile) {
    const newLang = resolveLanguage(profile);
    saveLastResolvedLang(newLang);
    if (newLang !== currentLang) {
      currentLang = newLang;
      window.CosyI18n.lang = currentLang;
      await ensureDictionaries(currentLang);
      applyDom();
    }
  }

  async function init() {
    currentLang = resolveLanguage(null);
    window.CosyI18n.lang = currentLang;
    saveLastResolvedLang(currentLang);
    await ensureDictionaries(currentLang);
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
      applyDom();
    } else if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => applyDom());
    }
    isReadyResolve();
  }

  window.CosyI18n = {
    ready: readyPromise,
    get lang() {
      return currentLang;
    },
    set lang(val) {
      currentLang = val;
    },
    supported: SUPPORTED_LANGS,
    t,
    tp,
    setLang,
    recompute,
    applyDom,
    formatDate,
    formatNumber,
    _resolveLanguage: resolveLanguage,
    _saveLastResolvedLang: saveLastResolvedLang
  };

  // Kick off initialisation
  init();
})();
