import { describe, it, expect, afterEach } from "vitest";
import { KEYS, withStorage, load, save, remove } from "../storage.js";

const memoryBackend = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
};

const throwingBackend = () => ({
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
  removeItem: () => { throw new Error("SecurityError"); },
});

describe("KEYS", () => {
  it("are namespaced under ap.v1", () => {
    expect(KEYS).toEqual({
      poses: "ap.v1.poses",
      measurements: "ap.v1.measurements",
      quiz: "ap.v1.quiz",
      prefs: "ap.v1.prefs",
    });
  });
});

describe("withStorage (in-memory backend)", () => {
  it("saves and loads JSON values", () => {
    const b = memoryBackend();
    const s = withStorage(b);
    expect(s.save(KEYS.prefs, { plane: "sagittal", n: [1, 2] })).toBe(true);
    expect(b._map.get(KEYS.prefs)).toBe('{"plane":"sagittal","n":[1,2]}');
    expect(s.load(KEYS.prefs, null)).toEqual({ plane: "sagittal", n: [1, 2] });
  });

  it("returns the fallback for a missing key", () => {
    const s = withStorage(memoryBackend());
    expect(s.load(KEYS.poses, [])).toEqual([]);
    expect(s.load(KEYS.poses)).toBeUndefined();
  });

  it("returns the fallback on corrupt JSON", () => {
    const b = memoryBackend();
    b.setItem(KEYS.quiz, "{not json");
    const s = withStorage(b);
    expect(s.load(KEYS.quiz, { boxes: {} })).toEqual({ boxes: {} });
  });

  it("removes keys", () => {
    const b = memoryBackend();
    const s = withStorage(b);
    s.save(KEYS.measurements, [1]);
    expect(s.remove(KEYS.measurements)).toBe(true);
    expect(b._map.has(KEYS.measurements)).toBe(false);
    expect(s.load(KEYS.measurements, "gone")).toBe("gone");
  });

  it("accepts a backend getter resolved at call time", () => {
    let current = null;
    const s = withStorage(() => current);
    expect(s.save("k", 1)).toBe(false);
    expect(s.load("k", "fb")).toBe("fb");
    current = memoryBackend();
    expect(s.save("k", 1)).toBe(true);
    expect(s.load("k", "fb")).toBe(1);
  });
});

describe("withStorage (hostile backends)", () => {
  it("does not throw when the backend throws", () => {
    const s = withStorage(throwingBackend());
    expect(() => s.save("k", 1)).not.toThrow();
    expect(s.save("k", 1)).toBe(false);
    expect(s.load("k", "fb")).toBe("fb");
    expect(s.remove("k")).toBe(false);
  });

  it("does not throw when the backend is undefined or the getter throws", () => {
    const s = withStorage(undefined);
    expect(s.save("k", 1)).toBe(false);
    expect(s.load("k", "fb")).toBe("fb");
    expect(s.remove("k")).toBe(false);
    const t = withStorage(() => { throw new Error("no access"); });
    expect(t.save("k", 1)).toBe(false);
    expect(t.load("k", "fb")).toBe("fb");
    expect(t.remove("k")).toBe(false);
  });

  it("does not throw on unserialisable values", () => {
    const s = withStorage(memoryBackend());
    const cyc = {}; cyc.self = cyc;
    expect(s.save("k", cyc)).toBe(false);
  });
});

describe("default exports use globalThis.localStorage lazily", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  it("degrades gracefully when localStorage is missing (node)", () => {
    delete globalThis.localStorage;
    expect(load(KEYS.prefs, "fb")).toBe("fb");
    expect(save(KEYS.prefs, 1)).toBe(false);
    expect(remove(KEYS.prefs)).toBe(false);
  });

  it("picks up a localStorage that appears after import", () => {
    const b = memoryBackend();
    Object.defineProperty(globalThis, "localStorage", { value: b, configurable: true, writable: true });
    expect(save(KEYS.prefs, { a: 1 })).toBe(true);
    expect(load(KEYS.prefs, null)).toEqual({ a: 1 });
    expect(remove(KEYS.prefs)).toBe(true);
    expect(load(KEYS.prefs, "fb")).toBe("fb");
  });

  it("degrades gracefully when accessing localStorage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("SecurityError"); },
    });
    expect(load(KEYS.prefs, "fb")).toBe("fb");
    expect(save(KEYS.prefs, 1)).toBe(false);
    expect(remove(KEYS.prefs)).toBe(false);
  });
});
