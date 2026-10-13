/**
 * COSYplatform Student Progress Module
 * Manages saving and loading lesson answers with Supabase sync and offline LocalStorage fallback.
 */

window.CosyProgress = window.CosyProgress || {};

(function() {
  const DEBOUNCE_MS = 800;
  let debounceTimer = null;
  const pendingQueue = new Map();

  function getSupabaseClient() {
    if (window.CosyAuth && window.CosyAuth.client) {
      return window.CosyAuth.client;
    }
    return null;
  }

  async function getCurrentUserId() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        return session.user.id;
      }
    } catch (e) {}
    return null;
  }

  function getPendingFromStorage() {
    try {
      const stored = localStorage.getItem('cosy_pending_answers');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  function savePendingToStorage(obj) {
    try {
      if (!obj || Object.keys(obj).length === 0) {
        localStorage.removeItem('cosy_pending_answers');
      } else {
        localStorage.setItem('cosy_pending_answers', JSON.stringify(obj));
      }
    } catch (e) {}
  }

  function updateLocalStorageCache(lessonId, fieldKey, val) {
    if (!lessonId || !fieldKey) return;
    try {
      const storeKey = `cosy_ans_${lessonId}`;
      const existing = JSON.parse(localStorage.getItem(storeKey) || '{}');
      existing[fieldKey] = val;
      localStorage.setItem(storeKey, JSON.stringify(existing));
    } catch (e) {}
  }

  function saveAnswer(lessonId, fieldKey, value, isCorrect) {
    if (!lessonId || !fieldKey) return;

    // Update local storage cache immediately
    updateLocalStorageCache(lessonId, fieldKey, value);

    const queueKey = `${lessonId}::${fieldKey}`;
    const item = {
      lessonId,
      fieldKey,
      value: value !== undefined && value !== null ? String(value) : '',
      isCorrect: typeof isCorrect === 'boolean' ? isCorrect : null,
      updatedAt: new Date().toISOString()
    };

    // Buffer in memory pending queue
    pendingQueue.set(queueKey, item);

    // Persist to localStorage retry buffer
    const pendingObj = getPendingFromStorage();
    pendingObj[queueKey] = item;
    savePendingToStorage(pendingObj);

    // Reset debounce timer (~800 ms)
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      flush();
    }, DEBOUNCE_MS);
  }

  async function flush() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Combine memory pendingQueue and localStorage retry buffer
    const pendingObj = getPendingFromStorage();
    pendingQueue.forEach((val, key) => {
      pendingObj[key] = val;
    });

    const keys = Object.keys(pendingObj);
    if (keys.length === 0) {
      return { success: true, count: 0 };
    }

    // If offline, fall back silently
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, unauthenticated: true };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, unauthenticated: true };
    }

    const records = keys.map(k => {
      const item = pendingObj[k];
      return {
        student_id: userId,
        lesson_id: item.lessonId,
        field_key: item.fieldKey,
        value: item.value,
        is_correct: item.isCorrect,
        updated_at: item.updatedAt || new Date().toISOString()
      };
    });

    try {
      const { error } = await client
        .from('lesson_answers')
        .upsert(records, { onConflict: 'student_id,lesson_id,field_key' });

      if (error) {
        console.warn('[CosyProgress] Error upserting lesson_answers:', error.message);
        return { success: false, error };
      }

      // Clear synced items from memory and localStorage retry buffer
      pendingQueue.clear();
      savePendingToStorage({});
      return { success: true, count: records.length };
    } catch (err) {
      console.warn('[CosyProgress] Exception during flush:', err);
      return { success: false, error: err };
    }
  }

  async function loadAnswers(lessonId) {
    if (!lessonId) return {};

    const client = getSupabaseClient();
    const userId = await getCurrentUserId();

    if (client && userId && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      try {
        const { data, error } = await client
          .from('lesson_answers')
          .select('field_key, value, is_correct, updated_at')
          .eq('student_id', userId)
          .eq('lesson_id', lessonId);

        if (!error && Array.isArray(data)) {
          const serverAnswers = {};
          data.forEach(row => {
            if (row.field_key) {
              serverAnswers[row.field_key] = row.value;
            }
          });

          // Merge server answers over local storage cache
          const storeKey = `cosy_ans_${lessonId}`;
          let localAnswers = {};
          try {
            localAnswers = JSON.parse(localStorage.getItem(storeKey) || '{}');
          } catch (e) {}

          const merged = Object.assign({}, localAnswers, serverAnswers);
          try {
            localStorage.setItem(storeKey, JSON.stringify(merged));
          } catch (e) {}

          return merged;
        }
      } catch (err) {
        console.warn('[CosyProgress] Failed to load server answers:', err);
      }
    }

    // Fallback to localStorage cache
    try {
      const storeKey = `cosy_ans_${lessonId}`;
      return JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch (e) {
      return {};
    }
  }

  // Auto-flush on page unload / online transition
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => flush());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', () => flush());
  }

  window.CosyProgress = {
    saveAnswer,
    loadAnswers,
    flush
  };
})();
