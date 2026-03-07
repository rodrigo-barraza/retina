"use client";

/**
 * StorageService — localStorage wrapper with namespacing,
 * JSON serialization, and fallback for SSR environments.
 */
const NAMESPACE = "retina";

function makeKey(key) {
  return `${NAMESPACE}:${key}`;
}

function isAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const StorageService = {
  /**
   * Get a value from localStorage (returns parsed JSON or the fallback).
   */
  get(key, fallback = null) {
    if (!isAvailable()) return fallback;
    try {
      const raw = localStorage.getItem(makeKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  /**
   * Set a value in localStorage (JSON-serialized).
   */
  set(key, value) {
    if (!isAvailable()) return;
    try {
      localStorage.setItem(makeKey(key), JSON.stringify(value));
    } catch {
      // quota exceeded or other error — silently fail
    }
  },

  /**
   * Remove a key from localStorage.
   */
  remove(key) {
    if (!isAvailable()) return;
    localStorage.removeItem(makeKey(key));
  },

  /**
   * Clear all namespaced keys.
   */
  clear() {
    if (!isAvailable()) return;
    const prefix = `${NAMESPACE}:`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};

export default StorageService;
