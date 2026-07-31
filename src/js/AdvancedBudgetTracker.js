import { FilterService } from './FilterService.js';
import { PersistenceManager } from './PersistenceManager.js';
import { ValidationService } from './ValidationService.js';
import { CATEGORIES, STORAGE_KEY } from './constants.js';

export class AdvancedBudgetTracker {
  constructor({ persistence, now = () => new Date() } = {}) {
    this.persistence = persistence ?? new PersistenceManager(STORAGE_KEY);
    this.now = now;
    this.budget = 0;
    this.budgetPeriod = 'monthly';
    this.expenses = [];
    this.nextId = 1;
  }

  snapshot() {
    return {
      version: '3.0',
      budget: this.budget,
      budgetPeriod: this.budgetPeriod,
      expenses: this.expenses.map((expense) => ({ ...expense })),
      nextId: this.nextId,
      lastSaved: this.now().toISOString(),
    };
  }

  saveData() {
    return this.persistence.save(this.snapshot());
  }

  loadData() {
    const stored = this.persistence.load();
    if (!stored.ok || stored.value === null) return stored;

    const validation = ValidationService.validateImport(stored.value);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    this.replaceState(validation.value);
    return { ok: true, storage: stored.storage, value: this.snapshot() };
  }

  replaceState(state) {
    this.budget = state.budget;
    this.budgetPeriod = state.budgetPeriod;
    this.expenses = state.expenses.map((expense) => ({ ...expense }));
    this.nextId = state.nextId;
  }

  setBudget(amount, period) {
    const budget = ValidationService.validateBudget(amount);
    if (!budget.valid) return budget;
    if (!ValidationService.validateBudgetPeriod(period)) {
      return { valid: false, error: 'Choose a supported budget period.' };
    }

    this.budget = budget.value;
    this.budgetPeriod = period;
    return { valid: true, value: this.snapshot(), persistence: this.saveData() };
  }

  addExpense(title, amount, category) {
    const validation = this.validateExpense(title, amount, category);
    if (!validation.valid) return validation;

    const expense = {
      id: this.nextId,
      title: title.trim(),
      amount: Number(amount),
      category,
      date: this.now().toISOString(),
    };

    this.nextId += 1;
    this.expenses.push(expense);
    return { valid: true, value: { ...expense }, persistence: this.saveData() };
  }

  updateExpense(id, title, amount, category) {
    const validation = this.validateExpense(title, amount, category);
    if (!validation.valid) return validation;

    const index = this.expenses.findIndex((expense) => expense.id === id);
    if (index === -1) return { valid: false, error: 'That expense no longer exists.' };

    this.expenses[index] = {
      ...this.expenses[index],
      title: title.trim(),
      amount: Number(amount),
      category,
      updatedAt: this.now().toISOString(),
    };

    return {
      valid: true,
      value: { ...this.expenses[index] },
      persistence: this.saveData(),
    };
  }

  validateExpense(title, amount, category) {
    if (!ValidationService.validateExpenseTitle(title)) {
      return { valid: false, error: 'Enter a description between 1 and 120 characters.' };
    }
    if (!ValidationService.validateExpenseAmount(amount)) {
      return { valid: false, error: 'Enter an amount between £0.01 and £100,000.' };
    }
    if (!ValidationService.validateCategory(category)) {
      return { valid: false, error: 'Choose a supported expense category.' };
    }
    return { valid: true };
  }

  deleteExpense(id) {
    const originalLength = this.expenses.length;
    this.expenses = this.expenses.filter((expense) => expense.id !== id);
    if (this.expenses.length === originalLength) {
      return { deleted: false, persistence: null };
    }
    return { deleted: true, persistence: this.saveData() };
  }

  clearExpenses() {
    this.expenses = [];
    this.nextId = 1;
    return this.saveData();
  }

  getExpense(id) {
    const expense = this.expenses.find((item) => item.id === id);
    return expense ? { ...expense } : null;
  }

  getFilteredExpenses(filters) {
    return FilterService.apply(this.expenses, filters, this.now());
  }

  totals() {
    const totalExpenses = this.expenses.reduce((total, expense) => total + expense.amount, 0);
    return {
      totalExpenses,
      balance: this.budget - totalExpenses,
      categoriesUsed: new Set(this.expenses.map((expense) => expense.category)).size,
    };
  }

  categoryTotals() {
    return this.expenses.reduce((totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    }, {});
  }

  dailyTotals(days = 7) {
    const output = [];
    const current = this.now();

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      date.setDate(date.getDate() - offset);
      const start = date.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const total = this.expenses
        .filter((expense) => {
          const timestamp = new Date(expense.date).getTime();
          return timestamp >= start && timestamp < end;
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

      output.push({ date, total });
    }

    return output;
  }

  insights() {
    if (this.expenses.length === 0) {
      return [{ title: 'Start with one expense', message: 'Add an expense to see useful patterns.' }];
    }

    const { totalExpenses } = this.totals();
    const output = [];

    if (this.budget === 0) {
      output.push({ title: 'Set a budget', message: 'Add a budget to track how much money remains.' });
    } else {
      const usage = (totalExpenses / this.budget) * 100;
      const message = usage > 100
        ? `Spending is ${(usage - 100).toFixed(1)}% over budget.`
        : `${usage.toFixed(1)}% of the budget has been used.`;
      output.push({ title: usage > 90 ? 'Budget alert' : 'Budget status', message });
    }

    const [topCategory, topAmount] = Object.entries(this.categoryTotals())
      .sort((a, b) => b[1] - a[1])[0];
    output.push({
      title: 'Top spending category',
      message: `${CATEGORIES[topCategory].name} accounts for ${((topAmount / totalExpenses) * 100).toFixed(1)}% of spending.`,
    });
    output.push({
      title: 'Average expense',
      message: `The average across ${this.expenses.length} ${this.expenses.length === 1 ? 'expense' : 'expenses'} is £${(totalExpenses / this.expenses.length).toFixed(2)}.`,
    });

    return output;
  }

  exportData() {
    return JSON.stringify(
      {
        ...this.snapshot(),
        exportDate: this.now().toISOString(),
      },
      null,
      2,
    );
  }

  validateImport(input) {
    let payload;
    try {
      payload = typeof input === 'string' ? JSON.parse(input) : input;
    } catch {
      return { valid: false, error: 'The selected file is not valid JSON.' };
    }

    return ValidationService.validateImport(payload);
  }

  importData(input) {
    const validation = this.validateImport(input);
    if (!validation.valid) return validation;

    this.replaceState(validation.value);
    return { valid: true, value: this.snapshot(), persistence: this.saveData() };
  }
}
