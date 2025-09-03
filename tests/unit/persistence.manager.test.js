// tests/unit/persistence.manager.test.js
import { PersistenceManager } from "../../src/js/PersistenceManager.js";

describe("PersistenceManager", () => {
  let persistenceManager;

  beforeEach(() => {
    persistenceManager = new PersistenceManager();
    localStorage.clear();
    sessionStorage.clear();
  });

  test("constructor with default key", () => {
    const pm = new PersistenceManager();
    expect(pm.key).toBe("uniwalletpro_data");
  });

  test("constructor with custom key", () => {
    const pm = new PersistenceManager("custom_key");
    expect(pm.key).toBe("custom_key");
  });

  test("save to localStorage successfully", () => {
    const data = { budget: 1000, expenses: [] };
    const result = persistenceManager.save(data);
    
    expect(result.ok).toBe(true);
    expect(result.storage).toBe("localStorage");
  });

  test("load from localStorage successfully", () => {
    const data = { budget: 1000, expenses: [] };
    persistenceManager.save(data);
    
    const loaded = persistenceManager.load();
    expect(loaded).toEqual(data);
  });

  test("load returns null when no data exists", () => {
    const loaded = persistenceManager.load();
    expect(loaded).toBeNull();
  });

  test("clear removes data from both storages", () => {
    const data = { budget: 1000 };
    persistenceManager.save(data);
    
    persistenceManager.clear();
    
    expect(localStorage.getItem(persistenceManager.key)).toBeNull();
    expect(sessionStorage.getItem(persistenceManager.key)).toBeNull();
  });

  test("falls back to sessionStorage when localStorage fails", () => {
    const data = { budget: 1000, expenses: [] };
    
    // Mock localStorage to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("localStorage quota exceeded");
    };
    
    const result = persistenceManager.save(data);
    
    expect(result.ok).toBe(true);
    expect(result.storage).toBe("sessionStorage");
    
    // Restore original method
    localStorage.setItem = originalSetItem;
  });

  test("returns error when both localStorage and sessionStorage fail", () => {
    const data = { budget: 1000, expenses: [] };
    
    // Mock both storage methods to throw errors
    const originalLocalSetItem = localStorage.setItem;
    const originalSessionSetItem = sessionStorage.setItem;
    
    localStorage.setItem = () => {
      throw new Error("localStorage quota exceeded");
    };
    sessionStorage.setItem = () => {
      throw new Error("sessionStorage quota exceeded");
    };
    
    const result = persistenceManager.save(data);
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Error");
    
    // Restore original methods
    localStorage.setItem = originalLocalSetItem;
    sessionStorage.setItem = originalSessionSetItem;
  });

  test("handles error with custom name in save fallback", () => {
    const data = { budget: 1000, expenses: [] };
    
    // Mock both storage methods to throw errors with custom names
    const originalLocalSetItem = localStorage.setItem;
    const originalSessionSetItem = sessionStorage.setItem;
    
    localStorage.setItem = () => {
      throw new Error("localStorage quota exceeded");
    };
    sessionStorage.setItem = () => {
      const customError = new Error("sessionStorage quota exceeded");
      customError.name = "QuotaExceededError";
      throw customError;
    };
    
    const result = persistenceManager.save(data);
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe("QuotaExceededError");
    
    // Restore original methods
    localStorage.setItem = originalLocalSetItem;
    sessionStorage.setItem = originalSessionSetItem;
  });

  test("load from sessionStorage when localStorage is empty", () => {
    const data = { budget: 500 };
    sessionStorage.setItem(persistenceManager.key, JSON.stringify(data));
    
    const loaded = persistenceManager.load();
    expect(loaded).toEqual(data);
  });

  test("load returns null when JSON.parse fails", () => {
    // Set invalid JSON in localStorage
    localStorage.setItem(persistenceManager.key, "invalid json");
    
    const loaded = persistenceManager.load();
    expect(loaded).toBeNull();
  });

  test("load returns null when JSON.parse fails on sessionStorage", () => {
    // Set invalid JSON in sessionStorage
    sessionStorage.setItem(persistenceManager.key, "invalid json");
    
    const loaded = persistenceManager.load();
    expect(loaded).toBeNull();
  });

  test("handles undefined/null error object in save", () => {
    const data = { budget: 1000, expenses: [] };
    
    // Mock both storage methods to throw errors
    const originalLocalSetItem = localStorage.setItem;
    const originalSessionSetItem = sessionStorage.setItem;
    
    localStorage.setItem = () => {
      throw new Error("localStorage quota exceeded");
    };
    sessionStorage.setItem = () => {
      const errorObj = new Error("sessionStorage quota exceeded");
      errorObj.name = undefined;
      throw errorObj;
    };
    
    const result = persistenceManager.save(data);
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe("PersistError");
    
    // Restore original methods
    localStorage.setItem = originalLocalSetItem;
    sessionStorage.setItem = originalSessionSetItem;
  });
});
