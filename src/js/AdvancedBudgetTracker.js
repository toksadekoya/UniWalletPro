// src/js/AdvancedBudgetTracker.js
import { ValidationService } from "./ValidationService.js";
import { SecurityService } from "./SecurityService.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { FilterService } from "./FilterService.js";
import { ChartService } from "./ChartService.js";

export class AdvancedBudgetTracker {
  constructor(opts = {}) {
    // state
    this.budget = 0;
    this.budgetPeriod = "monthly";
    this.expenses = [];
    this.nextId = 1;
    this.editingId = null;

    // services
    this.persist = new PersistenceManager(opts.storageKey || "uniwalletpro_data");
    this.charts = new ChartService();

    // DOM hooks are optional in tests
    this.dom = opts.dom || null;
  }

  // ---------- validation & security ----------
  sanitizeInput(s) { return SecurityService.sanitizeInput(s); }

  // ---------- persistence ----------
  saveData() {
    const payload = {
      budget: this.budget,
      budgetPeriod: this.budgetPeriod,
      expenses: this.expenses,
      nextId: this.nextId,
      lastSaved: new Date().toISOString()
    };
    const res = this.persist.save(payload);
    return res.ok;
  }

  loadData() {
    const data = this.persist.load();
    if (!data) return;
    this.budget = Number(data.budget) || 0;
    this.budgetPeriod = data.budgetPeriod || "monthly";
    this.expenses = Array.isArray(data.expenses) ? data.expenses : [];
    this.nextId = Number(data.nextId) || 1;
  }

  // ---------- budget ----------
  setBudgetFromValue(val) {
    const check = ValidationService.validateBudget(val);
    if (!check.valid) return { ok: false, error: check.error };
    this.budget = Number(val);
    this.updateDisplay();
    this.saveData();
    return { ok: true };
  }

  // ---------- expenses ----------
  addExpense(title, amount, category) {
    // validate
    if (!ValidationService.validateExpenseTitle(title)) throw new Error("Invalid title");
    if (!ValidationService.validateExpenseAmount(amount)) throw new Error("Invalid amount");
    if (!ValidationService.validateCategory(category)) throw new Error("Invalid category");

    const expense = {
      id: this.nextId++,
      title: this.sanitizeInput(title),
      amount: Number(amount),
      category,
      date: new Date().toISOString()
    };
    this.expenses.push(expense);
    this.updateDisplay();
    this.saveData();
    return expense;
  }

  editExpense(id) { this.editingId = id; }

  updateExpense(title, amount, category) {
    const idx = this.expenses.findIndex(e => e.id === this.editingId);
    if (idx === -1) return false;
    if (!ValidationService.validateExpenseTitle(title)) return false;
    if (!ValidationService.validateExpenseAmount(amount)) return false;
    if (!ValidationService.validateCategory(category)) return false;

    this.expenses[idx] = {
      ...this.expenses[idx],
      title: this.sanitizeInput(title),
      amount: Number(amount),
      category,
      updatedAt: new Date().toISOString()
    };
    this.editingId = null;
    this.updateDisplay();
    this.saveData();
    return true;
  }

  deleteExpense(id) {
    const before = this.expenses.length;
    this.expenses = this.expenses.filter(e => e.id !== id);
    const changed = this.expenses.length !== before;
    if (changed) {
      if (this.editingId === id) this.editingId = null;
      this.updateDisplay();
      this.saveData();
    }
    return changed;
  }

  // ---------- filtering ----------
  getFilteredExpenses(filters = {}) {
    return FilterService.apply(this.expenses, filters);
  }

  // ---------- display (pure calc for tests) ----------
  totals() {
    const totalExpenses = this.expenses.reduce((s,e) => s + e.amount, 0);
    const balance = this.budget - totalExpenses;
    return { totalExpenses, balance, categoriesUsed: new Set(this.expenses.map(e => e.category)).size };
  }

  updateDisplay() {
    // For tests we only compute; UI wiring can use these values
    return this.totals();
  }
}