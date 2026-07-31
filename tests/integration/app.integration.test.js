import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UniWalletApp } from '../../src/js/app.js';
import { AdvancedBudgetTracker } from '../../src/js/AdvancedBudgetTracker.js';
import page from '../../index.html?raw';

const body = page.match(/<body>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');

const persistence = () => ({
  save: vi.fn(() => ({ ok: true, storage: 'localStorage' })),
  load: vi.fn(() => ({ ok: true, storage: null, value: null })),
});

const chartService = () => ({
  destroy: vi.fn(),
  renderCategories: vi.fn(),
  renderDaily: vi.fn(),
});

describe('UniWalletApp integration', () => {
  let app;

  beforeEach(() => {
    document.body.innerHTML = body;
    Element.prototype.scrollIntoView = vi.fn();
    app = new UniWalletApp(document, {
      tracker: new AdvancedBudgetTracker({ persistence: persistence(), now: () => new Date('2026-07-31T12:00:00Z') }),
      chartService: chartService(),
      confirmAction: () => true,
    }).init();
  });

  it('completes the budget flow without throwing', () => {
    document.querySelector('#budgetInput').value = '1000';
    document.querySelector('#budgetPeriod').value = 'weekly';
    document.querySelector('#budgetForm').requestSubmit();

    expect(document.querySelector('#budgetCard').textContent).toBe('£1,000.00');
    expect(document.querySelector('#alertMessage').textContent).toBe('Weekly budget saved.');
    expect(app.tracker.budgetPeriod).toBe('weekly');
  });

  it('renders untrusted descriptions as text rather than HTML', () => {
    document.querySelector('#expenseTitle').value = '<img src=x onerror=alert(1)>';
    document.querySelector('#expenseAmount').value = '12.50';
    document.querySelector('#expenseForm').requestSubmit();

    expect(document.querySelector('#expenseList img')).toBeNull();
    expect(document.querySelector('#expenseList').textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('supports editing, filtering and deletion through the UI', () => {
    document.querySelector('#expenseTitle').value = 'Bus pass';
    document.querySelector('#expenseAmount').value = '25';
    document.querySelector('#expenseCategory').value = 'transport';
    document.querySelector('#expenseForm').requestSubmit();

    document.querySelector('[aria-label="Edit Bus pass"]').click();
    document.querySelector('#expenseTitle').value = 'Monthly bus pass';
    document.querySelector('#expenseForm').requestSubmit();
    expect(document.querySelector('#expenseList').textContent).toContain('Monthly bus pass');

    document.querySelector('#searchFilter').value = 'missing';
    document.querySelector('#searchFilter').dispatchEvent(new Event('input'));
    expect(document.querySelector('#expenseList').textContent).toContain('No matching expenses');

    document.querySelector('#searchFilter').value = '';
    document.querySelector('#searchFilter').dispatchEvent(new Event('input'));
    document.querySelector('[aria-label="Delete Monthly bus pass"]').click();
    expect(app.tracker.expenses).toHaveLength(0);
  });

  it('does not replace current data when an import is cancelled', async () => {
    app.tracker.setBudget(250, 'monthly');
    app.confirmAction = () => false;
    const backup = new File([
      JSON.stringify({ budget: 999, budgetPeriod: 'weekly', expenses: [] }),
    ], 'backup.json', { type: 'application/json' });

    await app.importData({ target: { files: [backup], value: 'backup.json' } });

    expect(app.tracker.budget).toBe(250);
    expect(app.tracker.budgetPeriod).toBe('monthly');
  });

  it('does not report a successful save when browser storage fails', () => {
    app.tracker.persistence.save = vi.fn(() => ({ ok: false, error: 'QuotaExceededError' }));
    document.querySelector('#budgetInput').value = '1000';
    document.querySelector('#budgetForm').requestSubmit();

    expect(document.querySelector('#alertMessage').textContent).toContain('could not save');
    expect(document.querySelector('#alertMessage').classList).toContain('alert-error');
    expect(document.querySelector('#dataStatus').textContent).toBe('Changes could not be saved');
  });
});
