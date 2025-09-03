// src/js/PersistenceManager.js
export class PersistenceManager {
  constructor(key = "uniwalletpro_data") {
    this.key = key;
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return { ok: true, storage: "localStorage" };
    } catch (e) {
      try {
        sessionStorage.setItem(this.key, JSON.stringify(data));
        return { ok: true, storage: "sessionStorage" };
      } catch (err) {
        return { ok: false, error: err?.name || "PersistError" };
      }
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key) || sessionStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // tolerate corrupted data
    }
  }

  clear() {
    localStorage.removeItem(this.key);
    sessionStorage.removeItem(this.key);
  }
}