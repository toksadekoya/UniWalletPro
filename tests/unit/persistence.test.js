import { describe, expect, it } from 'vitest';
import { PersistenceManager } from '../../src/js/PersistenceManager.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

describe('PersistenceManager', () => {
  it('saves, loads and clears local data', () => {
    const primary = memoryStorage();
    const fallback = memoryStorage();
    const persistence = new PersistenceManager('budget', primary, fallback);

    expect(persistence.save({ budget: 100 })).toEqual({ ok: true, storage: 'localStorage' });
    expect(persistence.load()).toMatchObject({ ok: true, storage: 'localStorage', value: { budget: 100 } });
    persistence.clear();
    expect(persistence.load()).toEqual({ ok: true, storage: null, value: null });
  });

  it('uses session storage when local storage is unavailable', () => {
    const primary = { ...memoryStorage(), setItem: () => { throw new Error('blocked'); } };
    const fallback = memoryStorage();
    const persistence = new PersistenceManager('budget', primary, fallback);

    expect(persistence.save({ budget: 100 })).toEqual({ ok: true, storage: 'sessionStorage' });
    expect(persistence.load().value).toEqual({ budget: 100 });
  });

  it('loads an existing session fallback when local storage is empty', () => {
    const primary = memoryStorage();
    const fallback = memoryStorage();
    fallback.setItem('budget', JSON.stringify({ budget: 75 }));
    const persistence = new PersistenceManager('budget', primary, fallback);

    expect(persistence.load()).toEqual({
      ok: true,
      storage: 'sessionStorage',
      value: { budget: 75 },
    });
  });

  it('reports corrupted and unavailable storage', () => {
    const corrupted = { ...memoryStorage(), getItem: () => '{not json' };
    expect(new PersistenceManager('budget', corrupted, memoryStorage()).load()).toEqual({
      ok: false,
      error: 'Stored data is corrupted.',
    });

    const blocked = { ...memoryStorage(), setItem: () => { throw new Error('blocked'); } };
    expect(new PersistenceManager('budget', blocked, blocked).save({ budget: 1 }).ok).toBe(false);
  });
});
