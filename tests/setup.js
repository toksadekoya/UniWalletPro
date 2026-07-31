import { afterEach, vi } from 'vitest';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
