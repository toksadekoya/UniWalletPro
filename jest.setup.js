// jest.setup.js
import "@testing-library/jest-dom";

// Basic localStorage/sessionStorage mock for tests
class StorageMock {
  constructor() { this.store = new Map(); }
  getItem(k){ return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k,v){ this.store.set(String(k), String(v)); }
  removeItem(k){ this.store.delete(k); }
  clear(){ this.store.clear(); }
}
Object.defineProperty(window, "localStorage", { value: new StorageMock() });
Object.defineProperty(window, "sessionStorage", { value: new StorageMock() });