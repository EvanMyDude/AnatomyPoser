// Namespaced localStorage wrapper. Never throws: a missing backend (SSR,
// tests) or one that throws (private mode, quota) degrades to the fallback /
// a `false` result.

export const KEYS = {
  poses: "ap.v1.poses",
  measurements: "ap.v1.measurements",
  quiz: "ap.v1.quiz",
  prefs: "ap.v1.prefs",
};

/**
 * Bind load/save/remove to a storage backend. `backend` may be a Storage-like
 * object ({ getItem, setItem, removeItem }) or a function returning one; the
 * function form is resolved at call time so a backend that appears later (or
 * throws on access) is handled.
 */
export function withStorage(backend) {
  const get = typeof backend === "function" ? backend : () => backend;

  const load = (key, fallback) => {
    try {
      const store = get();
      if (!store) return fallback;
      const raw = store.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const save = (key, value) => {
    try {
      const store = get();
      if (!store) return false;
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const remove = (key) => {
    try {
      const store = get();
      if (!store) return false;
      store.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };

  return { load, save, remove };
}

// Default: the browser's localStorage, looked up lazily on every call.
const defaults = withStorage(() => globalThis.localStorage);

export const load = defaults.load;
export const save = defaults.save;
export const remove = defaults.remove;
