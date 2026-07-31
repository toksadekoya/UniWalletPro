import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvancedBudgetTracker } from '../../src/js/AdvancedBudgetTracker.js';

const fixedNow = new Date('2026-07-31T12:00:00.000Z');

const createPersistence = (loaded = null) => ({
  save: vi.fn(() => ({ ok: true, storage: 'localStorage' })),
  load: vi.fn(() => ({ ok: true, storage: loaded ? 'localStorage' : null, value: loaded })),
});

describe('AdvancedBudgetTracker', () => {
  let persistence;
  let tracker;

  beforeEach(() => {
    persistence = createPersistence();
    tracker = new AdvancedBudgetTracker({ persistence, now: () => new Date(fixedNow) });
  });

  it('sets and persists a budget period without the original DOM collision', () => {
    expect(tracker.setBudget('1200', 'weekly').valid).toBe(true);
    expect(tracker.budget).toBe(1200);
    expect(tracker.budgetPeriod).toBe('weekly');
    expect(persistence.save).toHaveBeenCalledOnce();
    expect(tracker.setBudget('0', 'monthly').valid).toBe(false);
    expect(tracker.setBudget('100', 'yearly').valid).toBe(false);
  });

  it('creates, updates and deletes validated expenses', () => {
    expect(tracker.addExpense(' Groceries ', '42.50', 'food')).toMatchObject({
      valid: true,
      value: { id: 1, title: 'Groceries', amount: 42.5, category: 'food' },
    });
    expect(tracker.addExpense('', 10, 'food').valid).toBe(false);
    expect(tracker.addExpense('Coffee', 0, 'food').valid).toBe(false);
    expect(tracker.addExpense('Coffee', 2, 'unknown').valid).toBe(false);
    expect(tracker.updateExpense(1, 'Weekly groceries', 50, 'shopping').valid).toBe(true);
    expect(tracker.getExpense(1)).toMatchObject({ title: 'Weekly groceries', amount: 50 });
    expect(tracker.updateExpense(99, 'Missing', 1, 'other').valid).toBe(false);
    expect(tracker.deleteExpense(99).deleted).toBe(false);
    expect(tracker.deleteExpense(1)).toMatchObject({
      deleted: true,
      persistence: { ok: true, storage: 'localStorage' },
    });
    expect(tracker.expenses).toHaveLength(0);
  });

  it('calculates totals, categories, daily data and insights', () => {
    tracker.setBudget(100, 'monthly');
    tracker.addExpense('Lunch', 25, 'food');
    tracker.addExpense('Bus', 10, 'transport');

    expect(tracker.totals()).toEqual({ totalExpenses: 35, balance: 65, categoriesUsed: 2 });
    expect(tracker.categoryTotals()).toEqual({ food: 25, transport: 10 });
    expect(tracker.dailyTotals()).toHaveLength(7);
    expect(tracker.dailyTotals().at(-1).total).toBe(35);
    expect(tracker.insights()).toHaveLength(3);
    expect(tracker.insights()[1].message).toContain('Food and dining');

    tracker.addExpense('Large bill', 100, 'bills');
    expect(tracker.insights()[0]).toMatchObject({ title: 'Budget alert' });
  });

  it('loads a valid backup and rejects corrupted stored state', () => {
    const backup = {
      budget: 500,
      budgetPeriod: 'monthly',
      expenses: [{ id: 4, title: 'Rent', amount: 300, category: 'bills', date: fixedNow.toISOString() }],
    };
    tracker = new AdvancedBudgetTracker({ persistence: createPersistence(backup) });
    expect(tracker.loadData().ok).toBe(true);
    expect(tracker.nextId).toBe(5);

    tracker = new AdvancedBudgetTracker({ persistence: createPersistence({ expenses: 'bad' }) });
    expect(tracker.loadData().ok).toBe(false);

    tracker = new AdvancedBudgetTracker({ persistence: createPersistence() });
    expect(tracker.loadData()).toEqual({ ok: true, storage: null, value: null });

    tracker = new AdvancedBudgetTracker({
      persistence: { load: () => ({ ok: false, error: 'blocked' }), save: vi.fn() },
    });
    expect(tracker.loadData()).toEqual({ ok: false, error: 'blocked' });
  });

  it('round-trips an exported backup and rejects invalid JSON', () => {
    tracker.setBudget(800, 'monthly');
    tracker.addExpense('Books', 40, 'shopping');
    const exported = tracker.exportData();

    const replacement = new AdvancedBudgetTracker({ persistence: createPersistence(), now: () => fixedNow });
    expect(replacement.validateImport(exported).valid).toBe(true);
    expect(replacement.importData(exported).valid).toBe(true);
    expect(replacement.snapshot()).toMatchObject({ budget: 800, expenses: [{ title: 'Books' }] });
    expect(replacement.importData('{broken').valid).toBe(false);
  });

  it('clears all expenses and gives useful empty-state insights', () => {
    expect(tracker.insights()[0].title).toBe('Start with one expense');
    tracker.addExpense('Coffee', 4, 'food');
    expect(tracker.clearExpenses()).toEqual({ ok: true, storage: 'localStorage' });
    expect(tracker.expenses).toEqual([]);
    expect(tracker.nextId).toBe(1);
  });
});
