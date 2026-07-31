export class PersistenceManager {
  constructor(key, storage = globalThis.localStorage, fallbackStorage = globalThis.sessionStorage) {
    this.key = key;
    this.storage = storage;
    this.fallbackStorage = fallbackStorage;
  }

  save(data) {
    const serialised = JSON.stringify(data);

    try {
      this.storage.setItem(this.key, serialised);
      return { ok: true, storage: 'localStorage' };
    } catch (primaryError) {
      try {
        this.fallbackStorage.setItem(this.key, serialised);
        return { ok: true, storage: 'sessionStorage' };
      } catch (fallbackError) {
        return {
          ok: false,
          error: fallbackError?.name || primaryError?.name || 'StorageError',
        };
      }
    }
  }

  load() {
    for (const [name, storage] of [
      ['localStorage', this.storage],
      ['sessionStorage', this.fallbackStorage],
    ]) {
      try {
        const raw = storage.getItem(this.key);
        if (raw) return { ok: true, storage: name, value: JSON.parse(raw) };
      } catch {
        return { ok: false, error: 'Stored data is corrupted.' };
      }
    }

    return { ok: true, storage: null, value: null };
  }

  clear() {
    this.storage.removeItem(this.key);
    this.fallbackStorage.removeItem(this.key);
  }
}
