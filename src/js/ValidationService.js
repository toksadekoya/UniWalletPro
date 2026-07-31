import { BUDGET_PERIODS, CATEGORIES, MAX_EXPENSES } from './constants.js';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));

export const ValidationService = {
  validateBudget(input, { allowZero = false } = {}) {
    const amount = Number(input);
    const minimum = allowZero ? 0 : 0.01;

    if (!Number.isFinite(amount)) {
      return { valid: false, error: 'Budget must be a valid number.' };
    }
    if (amount < minimum) {
      return {
        valid: false,
        error: allowZero ? 'Budget cannot be negative.' : 'Budget must be at least £0.01.',
      };
    }
    if (amount > 999_999) {
      return { valid: false, error: 'Budget cannot exceed £999,999.' };
    }

    return { valid: true, value: amount };
  },

  validateBudgetPeriod(period) {
    return BUDGET_PERIODS.includes(period);
  },

  validateExpenseTitle(title) {
    if (typeof title !== 'string') return false;
    const trimmed = title.trim();
    return trimmed.length >= 1 && trimmed.length <= 120;
  },

  validateExpenseAmount(input) {
    const amount = Number(input);
    return Number.isFinite(amount) && amount >= 0.01 && amount <= 100_000;
  },

  validateCategory(category) {
    return Object.hasOwn(CATEGORIES, category);
  },

  validateImport(payload) {
    if (!isPlainObject(payload)) {
      return { valid: false, error: 'The imported file must contain a JSON object.' };
    }

    const budgetCheck = this.validateBudget(payload.budget ?? 0, { allowZero: true });
    if (!budgetCheck.valid) return budgetCheck;

    const budgetPeriod = payload.budgetPeriod ?? 'monthly';
    if (!this.validateBudgetPeriod(budgetPeriod)) {
      return { valid: false, error: 'The imported budget period is not supported.' };
    }

    if (!Array.isArray(payload.expenses)) {
      return { valid: false, error: 'The imported file must contain an expenses array.' };
    }
    if (payload.expenses.length > MAX_EXPENSES) {
      return { valid: false, error: `Imports are limited to ${MAX_EXPENSES} expenses.` };
    }

    const ids = new Set();
    const expenses = [];

    for (const [index, expense] of payload.expenses.entries()) {
      if (!isPlainObject(expense)) {
        return { valid: false, error: `Expense ${index + 1} is not a valid object.` };
      }

      const id = Number(expense.id);
      if (!Number.isSafeInteger(id) || id < 1 || ids.has(id)) {
        return { valid: false, error: `Expense ${index + 1} has an invalid or duplicate ID.` };
      }
      if (!this.validateExpenseTitle(expense.title)) {
        return { valid: false, error: `Expense ${index + 1} has an invalid description.` };
      }
      if (!this.validateExpenseAmount(expense.amount)) {
        return { valid: false, error: `Expense ${index + 1} has an invalid amount.` };
      }
      if (!this.validateCategory(expense.category)) {
        return { valid: false, error: `Expense ${index + 1} has an invalid category.` };
      }
      if (!validDate(expense.date)) {
        return { valid: false, error: `Expense ${index + 1} has an invalid date.` };
      }

      ids.add(id);
      expenses.push({
        id,
        title: expense.title.trim(),
        amount: Number(expense.amount),
        category: expense.category,
        date: new Date(expense.date).toISOString(),
        ...(validDate(expense.updatedAt)
          ? { updatedAt: new Date(expense.updatedAt).toISOString() }
          : {}),
      });
    }

    return {
      valid: true,
      value: {
        budget: budgetCheck.value,
        budgetPeriod,
        expenses,
        nextId: expenses.reduce((highest, expense) => Math.max(highest, expense.id), 0) + 1,
      },
    };
  },
};
