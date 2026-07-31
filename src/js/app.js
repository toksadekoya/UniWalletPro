import { AdvancedBudgetTracker } from './AdvancedBudgetTracker.js';
import { ChartService } from './ChartService.js';
import { CATEGORIES, MAX_IMPORT_BYTES } from './constants.js';

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const requireElement = (root, selector) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
};

const createElement = (tag, { className, text, attributes = {} } = {}) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
};

export class UniWalletApp {
  constructor(root = document, { tracker, chartService, confirmAction = globalThis.confirm } = {}) {
    this.root = root;
    this.tracker = tracker ?? new AdvancedBudgetTracker();
    this.confirmAction = confirmAction;
    this.editingId = null;
    this.chartType = 'category';
    this.alertTimer = null;

    this.elements = {
      alert: requireElement(root, '#alertMessage'),
      dataStatus: requireElement(root, '#dataStatus'),
      budgetForm: requireElement(root, '#budgetForm'),
      budgetInput: requireElement(root, '#budgetInput'),
      budgetPeriod: requireElement(root, '#budgetPeriod'),
      expenseForm: requireElement(root, '#expenseForm'),
      expenseFormTitle: requireElement(root, '#expenseFormTitle'),
      expenseTitle: requireElement(root, '#expenseTitle'),
      expenseAmount: requireElement(root, '#expenseAmount'),
      expenseCategory: requireElement(root, '#expenseCategory'),
      expenseSubmitButton: requireElement(root, '#expenseSubmitButton'),
      cancelEditButton: requireElement(root, '#cancelEditButton'),
      budgetCard: requireElement(root, '#budgetCard'),
      expensesCard: requireElement(root, '#expensesCard'),
      balanceCard: requireElement(root, '#balanceCard'),
      categoriesCard: requireElement(root, '#categoriesCard'),
      searchFilter: requireElement(root, '#searchFilter'),
      categoryFilter: requireElement(root, '#categoryFilter'),
      dateFilter: requireElement(root, '#dateFilter'),
      amountFilter: requireElement(root, '#amountFilter'),
      expenseList: requireElement(root, '#expenseList'),
      expenseCount: requireElement(root, '#expenseCount'),
      clearExpensesButton: requireElement(root, '#clearExpensesButton'),
      categoryTab: requireElement(root, '#categoryTab'),
      dailyTab: requireElement(root, '#dailyTab'),
      chartPanel: requireElement(root, '#chartPanel'),
      canvas: requireElement(root, '#expenseChart'),
      chartSummary: requireElement(root, '#chartSummary'),
      insightsList: requireElement(root, '#insightsList'),
      exportButton: requireElement(root, '#exportButton'),
      importButton: requireElement(root, '#importButton'),
      importFile: requireElement(root, '#importFile'),
    };

    this.chartService = chartService ?? new ChartService(this.elements.canvas);
  }

  init() {
    this.attachEventListeners();
    const loaded = this.tracker.loadData();

    if (!loaded.ok) {
      this.setAlert(`${loaded.error} Start fresh or import a valid backup.`, 'error');
      this.setDataStatus('Stored data could not be loaded');
    } else if (loaded.value) {
      this.setDataStatus(
        loaded.storage === 'sessionStorage'
          ? 'Saved for this browser session'
          : 'Saved locally in this browser',
      );
    }

    this.render();
    return this;
  }

  attachEventListeners() {
    this.elements.budgetForm.addEventListener('submit', (event) => this.handleBudgetSubmit(event));
    this.elements.expenseForm.addEventListener('submit', (event) => this.handleExpenseSubmit(event));
    this.elements.cancelEditButton.addEventListener('click', () => this.cancelEdit());

    for (const element of [
      this.elements.searchFilter,
      this.elements.categoryFilter,
      this.elements.dateFilter,
      this.elements.amountFilter,
    ]) {
      element.addEventListener('input', () => this.renderExpenses());
    }

    this.elements.clearExpensesButton.addEventListener('click', () => this.clearExpenses());
    this.elements.categoryTab.addEventListener('click', () => this.changeChart('category'));
    this.elements.dailyTab.addEventListener('click', () => this.changeChart('daily'));
    this.elements.exportButton.addEventListener('click', () => this.exportData());
    this.elements.importButton.addEventListener('click', () => this.elements.importFile.click());
    this.elements.importFile.addEventListener('change', (event) => this.importData(event));
  }

  handleBudgetSubmit(event) {
    event.preventDefault();
    const result = this.tracker.setBudget(
      this.elements.budgetInput.value,
      this.elements.budgetPeriod.value,
    );

    if (!result.valid) {
      this.setAlert(result.error, 'error');
      this.elements.budgetInput.focus();
      return;
    }

    this.elements.budgetInput.value = '';
    const saved = this.reportPersistence(result.persistence);
    this.setAlert(
      saved
        ? `${this.labelForPeriod(this.tracker.budgetPeriod)} budget saved.`
        : 'Budget updated for now, but this browser could not save it.',
      saved ? 'success' : 'error',
    );
    this.render();
  }

  handleExpenseSubmit(event) {
    event.preventDefault();
    const values = [
      this.elements.expenseTitle.value,
      this.elements.expenseAmount.value,
      this.elements.expenseCategory.value,
    ];
    const result = this.editingId === null
      ? this.tracker.addExpense(...values)
      : this.tracker.updateExpense(this.editingId, ...values);

    if (!result.valid) {
      this.setAlert(result.error, 'error');
      this.elements.expenseTitle.focus();
      return;
    }

    const message = this.editingId === null ? 'Expense added.' : 'Expense updated.';
    this.cancelEdit({ focus: false });
    const saved = this.reportPersistence(result.persistence);
    this.setAlert(
      saved ? message : 'Expense updated for now, but this browser could not save it.',
      saved ? 'success' : 'error',
    );
    this.render();
  }

  beginEdit(id) {
    const expense = this.tracker.getExpense(id);
    if (!expense) {
      this.setAlert('That expense no longer exists.', 'error');
      return;
    }

    this.editingId = id;
    this.elements.expenseTitle.value = expense.title;
    this.elements.expenseAmount.value = expense.amount.toFixed(2);
    this.elements.expenseCategory.value = expense.category;
    this.setIconLabel(this.elements.expenseFormTitle, 'bx-edit', 'Edit Expense');
    this.setIconLabel(this.elements.expenseSubmitButton, 'bx-save', 'Save Changes');
    this.elements.cancelEditButton.classList.remove('hidden');
    this.elements.expenseTitle.focus();
    this.elements.expenseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelEdit({ focus = true } = {}) {
    const wasEditing = this.editingId !== null;
    this.editingId = null;
    this.elements.expenseForm.reset();
    this.elements.expenseCategory.value = 'food';
    this.setIconLabel(this.elements.expenseFormTitle, 'bx-receipt', 'Add Expense');
    this.setIconLabel(this.elements.expenseSubmitButton, 'bx-plus', 'Add Expense');
    this.elements.cancelEditButton.classList.add('hidden');
    if (focus && wasEditing) this.elements.expenseTitle.focus();
  }

  deleteExpense(id) {
    const expense = this.tracker.getExpense(id);
    if (!expense) return;
    if (!this.confirmAction(`Delete “${expense.title}”?`)) return;

    const result = this.tracker.deleteExpense(id);
    if (this.editingId === id) this.cancelEdit({ focus: false });
    const saved = this.reportPersistence(result.persistence);
    this.setAlert(
      saved ? 'Expense deleted.' : 'Expense deleted for now, but this browser could not save it.',
      saved ? 'success' : 'error',
    );
    this.render();
  }

  clearExpenses() {
    if (this.tracker.expenses.length === 0) return;
    if (!this.confirmAction('Delete all expenses? This cannot be undone.')) return;

    const persistence = this.tracker.clearExpenses();
    this.cancelEdit({ focus: false });
    const saved = this.reportPersistence(persistence);
    this.setAlert(
      saved ? 'All expenses deleted.' : 'Expenses cleared for now, but this browser could not save it.',
      saved ? 'success' : 'error',
    );
    this.render();
  }

  filters() {
    return {
      search: this.elements.searchFilter.value,
      category: this.elements.categoryFilter.value,
      dateRange: this.elements.dateFilter.value,
      amountRange: this.elements.amountFilter.value,
    };
  }

  render() {
    this.elements.budgetPeriod.value = this.tracker.budgetPeriod;
    const totals = this.tracker.totals();
    this.elements.budgetCard.textContent = currency.format(this.tracker.budget);
    this.elements.expensesCard.textContent = currency.format(totals.totalExpenses);
    this.elements.balanceCard.textContent = currency.format(totals.balance);
    this.elements.balanceCard.classList.toggle('negative', totals.balance < 0);
    this.elements.categoriesCard.textContent = String(totals.categoriesUsed);
    this.elements.clearExpensesButton.disabled = this.tracker.expenses.length === 0;

    this.renderExpenses();
    this.renderChart();
    this.renderInsights();
  }

  renderExpenses() {
    const expenses = this.tracker.getFilteredExpenses(this.filters());
    this.elements.expenseList.replaceChildren();
    this.elements.expenseCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`;

    if (expenses.length === 0) {
      const item = createElement('li', { className: 'empty-state' });
      const heading = createElement('strong', {
        text: this.tracker.expenses.length === 0 ? 'No expenses yet' : 'No matching expenses',
      });
      const message = createElement('span', {
        text: this.tracker.expenses.length === 0
          ? 'Add your first expense using the form above.'
          : 'Try adjusting or clearing the filters.',
      });
      item.append(heading, message);
      this.elements.expenseList.append(item);
      return;
    }

    for (const expense of expenses) {
      const item = createElement('li', { className: 'expense-item' });
      const details = createElement('div', { className: 'expense-details' });
      const title = createElement('strong', { text: expense.title });
      const date = createElement('span', { text: dateFormatter.format(new Date(expense.date)) });
      details.append(title, date);

      const category = createElement('span', {
        className: `category-badge category-${expense.category}`,
        text: CATEGORIES[expense.category].name,
      });
      const amount = createElement('strong', {
        className: 'expense-amount',
        text: currency.format(expense.amount),
      });

      const actions = createElement('div', { className: 'expense-actions' });
      const editButton = createElement('button', {
        className: 'button button-quiet button-small',
        text: 'Edit',
        attributes: { type: 'button', 'aria-label': `Edit ${expense.title}` },
      });
      editButton.addEventListener('click', () => this.beginEdit(expense.id));
      const deleteButton = createElement('button', {
        className: 'button button-danger button-small',
        text: 'Delete',
        attributes: { type: 'button', 'aria-label': `Delete ${expense.title}` },
      });
      deleteButton.addEventListener('click', () => this.deleteExpense(expense.id));
      actions.append(editButton, deleteButton);

      item.append(details, category, amount, actions);
      this.elements.expenseList.append(item);
    }
  }

  changeChart(type) {
    this.chartType = type;
    const isCategory = type === 'category';
    this.elements.categoryTab.classList.toggle('active', isCategory);
    this.elements.categoryTab.setAttribute('aria-selected', String(isCategory));
    this.elements.dailyTab.classList.toggle('active', !isCategory);
    this.elements.dailyTab.setAttribute('aria-selected', String(!isCategory));
    this.elements.chartPanel.setAttribute('aria-labelledby', isCategory ? 'categoryTab' : 'dailyTab');
    this.renderChart();
  }

  renderChart() {
    if (this.tracker.expenses.length === 0) {
      this.chartService.destroy();
      this.updateChartSummary('No spending data available yet.');
      return;
    }

    if (this.chartType === 'category') {
      const totals = this.tracker.categoryTotals();
      const keys = Object.keys(totals);
      const labels = keys.map((key) => CATEGORIES[key].name);
      const values = keys.map((key) => totals[key]);
      this.chartService.renderCategories(labels, values, keys.map((key) => CATEGORIES[key].colour));
      this.updateChartSummary(
        labels.map((label, index) => `${label}: ${currency.format(values[index])}`).join('. '),
      );
      return;
    }

    const daily = this.tracker.dailyTotals();
    const labels = daily.map(({ date }) => date.toLocaleDateString('en-GB', { weekday: 'short' }));
    const values = daily.map(({ total }) => total);
    this.chartService.renderDaily(labels, values);
    this.updateChartSummary(
      daily.map(({ date, total }) => `${dateFormatter.format(date)}: ${currency.format(total)}`).join('. '),
    );
  }

  updateChartSummary(summary) {
    this.elements.chartSummary.textContent = summary;
    this.elements.canvas.setAttribute('aria-label', summary);
  }

  renderInsights() {
    this.elements.insightsList.replaceChildren();
    if (this.tracker.expenses.length === 0) {
      this.elements.insightsList.append(
        createElement('li', {
          className: 'insight-empty',
          text: 'Add some expenses to see insights!',
        }),
      );
      return;
    }

    for (const insight of this.tracker.insights()) {
      const item = createElement('li');
      item.append(
        createElement('strong', { text: insight.title }),
        createElement('span', { text: insight.message }),
      );
      this.elements.insightsList.append(item);
    }
  }

  exportData() {
    const blob = new Blob([this.tracker.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = createElement('a', {
      attributes: {
        href: url,
        download: `uniwallet-backup-${new Date().toISOString().slice(0, 10)}.json`,
      },
    });
    link.click();
    URL.revokeObjectURL(url);
    this.setAlert('Backup exported.', 'success');
  }

  async importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      this.setAlert('The selected file is larger than the 1 MB import limit.', 'error');
      return;
    }

    const contents = await file.text();
    const validation = this.tracker.validateImport(contents);
    if (!validation.valid) {
      this.setAlert(validation.error, 'error');
      return;
    }
    if (!this.confirmAction('Replace the current budget and expenses with this backup?')) return;

    const result = this.tracker.importData(validation.value);
    const saved = this.reportPersistence(result.persistence);
    this.cancelEdit({ focus: false });
    this.setAlert(
      saved
        ? `Imported ${this.tracker.expenses.length} expenses.`
        : 'Backup imported for now, but this browser could not save it.',
      saved ? 'success' : 'error',
    );
    this.render();
  }

  reportPersistence(result) {
    if (!result?.ok) {
      this.setDataStatus('Changes could not be saved');
      return false;
    }
    this.setDataStatus(
      result.storage === 'sessionStorage'
        ? 'Saved for this browser session'
        : 'Saved locally in this browser',
    );
    return true;
  }

  setDataStatus(message) {
    this.setIconLabel(this.elements.dataStatus, 'bx-data', message);
  }

  setIconLabel(element, iconName, text) {
    const icon = createElement('i', {
      className: `bx ${iconName}`,
      attributes: { 'aria-hidden': 'true' },
    });
    element.replaceChildren(icon, document.createTextNode(text));
  }

  setAlert(message, type) {
    globalThis.clearTimeout(this.alertTimer);
    this.elements.alert.textContent = message;
    this.elements.alert.className = `alert alert-${type} visible`;
    this.elements.alert.setAttribute('role', type === 'error' ? 'alert' : 'status');
    this.alertTimer = globalThis.setTimeout(() => {
      this.elements.alert.classList.remove('visible');
    }, 5_000);
  }

  labelForPeriod(period) {
    return `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
  }
}

export const createApp = (root = document, dependencies) =>
  new UniWalletApp(root, dependencies).init();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => createApp());
}
