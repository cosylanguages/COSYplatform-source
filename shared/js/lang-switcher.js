/**
 * COSYlanguages Language Switcher UI Component
 */
(function () {
  const LANG_NAMES = {
    auto: 'Auto',
    en: 'English',
    fr: 'Français',
    ru: 'Русский',
    it: 'Italiano',
    el: 'Ελληνικά'
  };

  function createLanguageSwitcherSelect() {
    const select = document.createElement('select');
    select.className = 'cosy-lang-switcher-select';
    select.setAttribute('data-i18n-skip', '');
    select.style.padding = '4px 8px';
    select.style.borderRadius = '6px';
    select.style.border = '1px solid var(--cosy-color-border-strong, #cbd5e1)';
    select.style.fontSize = '0.85rem';
    select.style.background = 'var(--cosy-color-surface-subtle, #f8fafc)';
    select.style.color = 'var(--cosy-color-ink, #0f172a)';
    select.style.cursor = 'pointer';

    if (window.CosyI18n && typeof window.CosyI18n.t === 'function') {
      select.setAttribute('aria-label', window.CosyI18n.t('switcher.ariaLabel'));
      select.setAttribute('data-i18n-aria', 'switcher.ariaLabel');
    } else {
      select.setAttribute('aria-label', 'Select language');
    }

    // Determine current pin status
    let currentPinned = null;
    try {
      currentPinned = localStorage.getItem('cosy_ui_lang');
    } catch (e) {}

    // Option 1: Auto
    const autoOption = document.createElement('option');
    autoOption.value = 'auto';
    autoOption.textContent = LANG_NAMES.auto;
    autoOption.setAttribute('data-i18n', 'switcher.auto');
    if (!currentPinned) {
      autoOption.selected = true;
    }
    select.appendChild(autoOption);

    // Options for supported languages
    const supported = (window.CosyI18n && window.CosyI18n.supported) || ['en', 'fr', 'ru', 'it', 'el'];
    supported.forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = LANG_NAMES[code] || code.toUpperCase();
      if (currentPinned && currentPinned.toLowerCase() === code) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (window.CosyI18n && typeof window.CosyI18n.setLang === 'function') {
        window.CosyI18n.setLang(val);
      } else {
        if (val === 'auto') {
          localStorage.removeItem('cosy_ui_lang');
        } else {
          localStorage.setItem('cosy_ui_lang', val);
        }
        window.location.reload();
      }
    });

    return select;
  }

  function mountLanguageSwitcher(targetElementOrSelector) {
    let target = null;
    if (typeof targetElementOrSelector === 'string') {
      target = document.querySelector(targetElementOrSelector);
    } else if (targetElementOrSelector && targetElementOrSelector.nodeType) {
      target = targetElementOrSelector;
    }

    if (!target) return null;

    const switcherSelect = createLanguageSwitcherSelect();
    target.appendChild(switcherSelect);
    return switcherSelect;
  }

  window.CosyLangSwitcher = {
    createSelect: createLanguageSwitcherSelect,
    mount: mountLanguageSwitcher
  };
})();
