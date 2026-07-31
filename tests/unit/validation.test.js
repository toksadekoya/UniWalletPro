import { describe, expect, it } from 'vitest';
import { ValidationService } from '../../src/js/ValidationService.js';

const validPayload = {
  budget: 1_200,
  budgetPeriod: 'monthly',
  expenses: [
    {
      id: 1,
      title: 'Groceries',
      amount: 42.5,
      category: 'food',
      date: '2026-07-31T09:00:00.000Z',
    },
  ],
};

describe('ValidationService', () => {
  it('validates and normalises budgets', () => {
    expect(ValidationService.validateBudget('12.50')).toEqual({ valid: true, value: 12.5 });
    expect(ValidationService.validateBudget('0').valid).toBe(false);
    expect(ValidationService.validateBudget(0, { allowZero: true })).toEqual({ valid: true, value: 0 });
    expect(ValidationService.validateBudget('not-a-number').valid).toBe(false);
    expect(ValidationService.validateBudget(1_000_000).valid).toBe(false);
  });

  it('validates expense fields and budget periods', () => {
    expect(ValidationService.validateExpenseTitle(' Lunch ')).toBe(true);
    expect(ValidationService.validateExpenseTitle('')).toBe(false);
    expect(ValidationService.validateExpenseTitle('x'.repeat(121))).toBe(false);
    expect(ValidationService.validateExpenseAmount('0.01')).toBe(true);
    expect(ValidationService.validateExpenseAmount(-1)).toBe(false);
    expect(ValidationService.validateCategory('food')).toBe(true);
    expect(ValidationService.validateCategory('unknown')).toBe(false);
    expect(ValidationService.validateBudgetPeriod('weekly')).toBe(true);
    expect(ValidationService.validateBudgetPeriod('yearly')).toBe(false);
  });

  it('normalises a valid imported backup', () => {
    const result = ValidationService.validateImport(validPayload);
    expect(result.valid).toBe(true);
    expect(result.value.nextId).toBe(2);
    expect(result.value.expenses[0]).toMatchObject({ title: 'Groceries', amount: 42.5 });
  });

  it('applies safe defaults and preserves only valid update dates', () => {
    const defaults = ValidationService.validateImport({ expenses: [] });
    expect(defaults).toMatchObject({
      valid: true,
      value: { budget: 0, budgetPeriod: 'monthly', expenses: [], nextId: 1 },
    });

    const withUpdate = ValidationService.validateImport({
      ...validPayload,
      expenses: [{ ...validPayload.expenses[0], updatedAt: '2026-07-31T10:00:00Z' }],
    });
    expect(withUpdate.value.expenses[0].updatedAt).toBe('2026-07-31T10:00:00.000Z');
  });

  it.each([
    [null, 'JSON object'],
    [{ ...validPayload, budgetPeriod: 'yearly' }, 'budget period'],
    [{ ...validPayload, expenses: 'nope' }, 'expenses array'],
    [{ ...validPayload, expenses: [{ ...validPayload.expenses[0], id: 0 }] }, 'invalid or duplicate ID'],
    [{ ...validPayload, expenses: [{ ...validPayload.expenses[0], title: '' }] }, 'description'],
    [{ ...validPayload, expenses: [{ ...validPayload.expenses[0], amount: Infinity }] }, 'amount'],
    [{ ...validPayload, expenses: [{ ...validPayload.expenses[0], category: 'fake' }] }, 'category'],
    [{ ...validPayload, expenses: [{ ...validPayload.expenses[0], date: 'not-a-date' }] }, 'date'],
    [{ ...validPayload, budget: -1 }, 'negative'],
    [{ ...validPayload, expenses: [validPayload.expenses[0], validPayload.expenses[0]] }, 'duplicate ID'],
    [{ ...validPayload, expenses: ['not-an-object'] }, 'not a valid object'],
  ])('rejects unsafe or malformed imports', (payload, expectedMessage) => {
    const result = ValidationService.validateImport(payload);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(expectedMessage);
  });

  it('limits the number of imported expenses', () => {
    const result = ValidationService.validateImport({
      ...validPayload,
      expenses: Array.from({ length: 5_001 }, () => validPayload.expenses[0]),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('limited');
  });
});
