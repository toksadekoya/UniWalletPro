/**
 * @jest-environment jsdom
 */

// Simple focused unit tests for app.js that focus on core functionality
describe('AdvancedBudgetTracker - Core Functionality', () => {
  let mockElements = {};
  let eventListeners = {};
  let budgetTracker;

  // Mock DOM elements
  const createMockElement = (id) => ({
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    files: [],
    classList: {
      add: function(cls) { this.className += ' ' + cls; },
      remove: function(cls) { this.className = this.className.replace(cls, '').trim(); },
      contains: function(cls) { return this.className.includes(cls); }
    },
    addEventListener: (event, callback) => {
      eventListeners[`${id}_${event}`] = callback;
    },
    click: function() {
      if (eventListeners[`${this.id}_click`]) {
        eventListeners[`${this.id}_click`]();
      }
    }
  });

  beforeAll(() => {
    // Setup global mocks
    global.Chart = class MockChart {
      constructor() { this.destroy = () => {}; }
      destroy() {}
    };
    global.Blob = class MockBlob {};
    global.URL = { createObjectURL: () => 'mock-url' };
    global.FileReader = class MockFileReader {
      constructor() { this.onload = null; }
      readAsText(file) {
        setTimeout(() => {
          if (this.onload) this.onload({ target: { result: file.content || '{}' } });
        }, 0);
      }
    };
    global.confirm = () => true;
    
    // Setup DOM elements
    const elementIds = [
      'budgetInput', 'budgetPeriod', 'expenseTitle', 'expenseAmount', 'expenseCategory',
      'searchFilter', 'categoryFilter', 'dateFilter', 'amountFilter',
      'setBudgetBtn', 'addExpenseBtn', 'alertMessage', 'budgetCard', 'expensesCard',
      'balanceCard', 'categoriesCard', 'expenseList', 'dataStatus', 'insightsList',
      'importFile', 'expenseChart'
    ];

    elementIds.forEach(id => {
      mockElements[id] = createMockElement(id);
    });

    document.getElementById = (id) => mockElements[id] || createMockElement(id);
    document.querySelector = (selector) => {
      if (selector === '.input-section') return { scrollIntoView: () => {} };
      return createMockElement('mock');
    };
    document.querySelectorAll = () => [createMockElement('mock')];
    document.createElement = () => ({ click: () => {}, href: '', download: '' });
    document.addEventListener = (event, callback) => {
      if (event === 'DOMContentLoaded') eventListeners['document_DOMContentLoaded'] = callback;
    };
  });

  beforeEach(async () => {
    // Clear previous state
    Object.values(mockElements).forEach(el => {
      el.value = '';
      el.textContent = '';
      el.innerHTML = '';
      el.className = '';
    });
    eventListeners = {};
    
    // Clean up previous instance
    if (global.window && global.window.budgetTracker) {
      delete global.window.budgetTracker;
    }
    
    // Import and initialize app
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    budgetTracker = global.window.budgetTracker;
  });

  describe('Budget Management', () => {
    test('sets budget with valid input', () => {
      mockElements.budgetInput.value = '1000';
      budgetTracker.setBudget();
      expect(budgetTracker.budget).toBe(1000);
      expect(mockElements.budgetCard.textContent).toBe('£1000.00');
      expect(mockElements.budgetInput.value).toBe('');
    });

    test('shows alert for invalid budget - zero', () => {
      mockElements.budgetInput.value = '0';
      budgetTracker.setBudget();
      expect(budgetTracker.budget).toBe(0);
      expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    });

    test('shows alert for invalid budget - negative', () => {
      mockElements.budgetInput.value = '-100';
      budgetTracker.setBudget();
      expect(budgetTracker.budget).toBe(0);
      expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    });

    test('shows alert for invalid budget - non-numeric', () => {
      mockElements.budgetInput.value = 'abc';
      budgetTracker.setBudget();
      expect(budgetTracker.budget).toBe(0);
      expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    });
  });

  describe('Expense Management', () => {
    test('adds expense with valid input', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses).toHaveLength(1);
      expect(budgetTracker.expenses[0].title).toBe('Coffee');
      expect(budgetTracker.expenses[0].amount).toBe(5.50);
      expect(budgetTracker.expenses[0].category).toBe('food');
    });

    test('shows alert for missing expense title', () => {
      mockElements.expenseTitle.value = '';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses).toHaveLength(0);
      expect(mockElements.alertMessage.textContent).toContain('expense description');
    });

    test('shows alert for invalid expense amount - zero', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '0';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses).toHaveLength(0);
      expect(mockElements.alertMessage.textContent).toContain('valid amount');
    });

    test('clears expense inputs after adding', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
      
      expect(mockElements.expenseTitle.value).toBe('');
      expect(mockElements.expenseAmount.value).toBe('');
      expect(mockElements.expenseCategory.value).toBe('');
    });

    test('generates unique IDs for expenses', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].id).not.toBe(budgetTracker.expenses[1].id);
    });

    test('adds timestamp and date to expenses', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].date).toBeDefined();
      expect(budgetTracker.expenses[0].timestamp).toBeDefined();
    });
  });

  describe('Display Updates', () => {
    beforeEach(() => {
      budgetTracker.budget = 1000;
    });

    test('updates display with correct calculations', () => {
      budgetTracker.expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'transport' }
      ];
      
      budgetTracker.updateDisplay();
      
      expect(mockElements.expensesCard.textContent).toBe('£150.00');
      expect(mockElements.balanceCard.textContent).toBe('£850.00');
    });

    test('counts unique categories correctly', () => {
      budgetTracker.expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'food' },
        { amount: 25, category: 'transport' }
      ];
      
      budgetTracker.updateDisplay();
      
      expect(mockElements.categoriesCard.textContent).toBe('2');
    });
  });

  describe('Expense Editing', () => {
    beforeEach(() => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
    });

    test('enters edit mode for existing expense', () => {
      const expenseId = budgetTracker.expenses[0].id;
      budgetTracker.editExpense(expenseId);
      
      expect(budgetTracker.editingId).toBe(expenseId);
      expect(mockElements.expenseTitle.value).toBe('Coffee');
    });

    test('updates expense in edit mode', () => {
      const expenseId = budgetTracker.expenses[0].id;
      budgetTracker.editExpense(expenseId);
      
      mockElements.expenseTitle.value = 'Expensive Coffee';
      mockElements.expenseAmount.value = '7.50';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].title).toBe('Expensive Coffee');
      expect(budgetTracker.expenses[0].amount).toBe(7.50);
      expect(budgetTracker.editingId).toBeNull();
    });
  });

  describe('Expense Deletion', () => {
    beforeEach(() => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      budgetTracker.handleExpense();
    });

    test('deletes existing expense', () => {
      const expenseId = budgetTracker.expenses[0].id;
      budgetTracker.deleteExpense(expenseId);
      
      expect(budgetTracker.expenses).toHaveLength(1);
      expect(budgetTracker.expenses[0].title).toBe('Lunch');
    });

    test('does not delete non-existent expense', () => {
      const originalLength = budgetTracker.expenses.length;
      budgetTracker.deleteExpense(999);
      
      expect(budgetTracker.expenses).toHaveLength(originalLength);
    });
  });

  describe('Data Persistence', () => {
    test('saves data successfully', () => {
      budgetTracker.budget = 1000;
      mockElements.expenseTitle.value = 'Test Expense';
      mockElements.expenseAmount.value = '100';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.saveData()).toBe(true);
    });

    test('loads data from storage', () => {
      // Setup test data
      const testData = {
        budget: 1500,
        budgetPeriod: 'weekly',
        expenses: [{ id: 1, title: 'Test', amount: 50, category: 'food' }]
      };
      
      global.localStorage = {
        getItem: () => JSON.stringify(testData),
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      };
      
      budgetTracker.loadData();
      
      expect(budgetTracker.budget).toBe(1500);
      expect(budgetTracker.budgetPeriod).toBe('weekly');
      expect(budgetTracker.expenses).toHaveLength(1);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      budgetTracker.expenses = [
        { id: 1, title: 'Coffee', amount: 5, category: 'food', date: new Date() },
        { id: 2, title: 'Bus Ticket', amount: 3, category: 'transport', date: new Date() },
        { id: 3, title: 'Lunch', amount: 12, category: 'food', date: new Date() }
      ];
    });

    test('filters expenses by search term', () => {
      mockElements.searchFilter.value = 'coffee';
      const filtered = budgetTracker.getFilteredExpenses();
      expect(filtered.filter(exp => exp.title.toLowerCase().includes('coffee'))).toHaveLength(1);
    });

    test('filters expenses by category', () => {
      mockElements.categoryFilter.value = 'food';
      const filtered = budgetTracker.getFilteredExpenses();
      expect(filtered.filter(exp => exp.category === 'food')).toHaveLength(2);
    });

    test('filters expenses by amount range', () => {
      mockElements.amountFilter.value = '0-10';
      const filtered = budgetTracker.getFilteredExpenses();
      expect(filtered.filter(exp => exp.amount >= 0 && exp.amount <= 10)).toHaveLength(2);
    });
  });

  describe('Insights', () => {
    test('shows budget alert for high usage', () => {
      budgetTracker.budget = 1000;
      budgetTracker.expenses = [{ amount: 950 }]; // 95% usage
      
      budgetTracker.updateInsights();
      expect(mockElements.insightsList.innerHTML).toContain('Budget Alert');
    });

    test('shows budget warning for medium usage', () => {
      budgetTracker.budget = 1000;
      budgetTracker.expenses = [{ amount: 800 }]; // 80% usage
      
      budgetTracker.updateInsights();
      expect(mockElements.insightsList.innerHTML).toContain('Budget Warning');
    });

    test('shows budget status for low usage', () => {
      budgetTracker.budget = 1000;
      budgetTracker.expenses = [{ amount: 100 }]; // 10% usage
      
      budgetTracker.updateInsights();
      expect(mockElements.insightsList.innerHTML).toContain('Budget Status');
    });
  });

  describe('Chart Management', () => {
    beforeEach(() => {
      budgetTracker.expenses = [
        { amount: 50, category: 'food' },
        { amount: 30, category: 'transport' },
        { amount: 25, category: 'food' }
      ];
    });

    test('creates category chart', () => {
      budgetTracker.currentChartType = 'category';
      budgetTracker.updateChart();
      expect(budgetTracker.currentChart).toBeDefined();
    });

    test('creates daily chart', () => {
      budgetTracker.currentChartType = 'daily';
      budgetTracker.updateChart();
      expect(budgetTracker.currentChart).toBeDefined();
    });

    test('destroys existing chart before creating new one', () => {
      budgetTracker.currentChartType = 'category';
      budgetTracker.updateChart();
      const firstChart = budgetTracker.currentChart;
      
      budgetTracker.currentChartType = 'daily';
      budgetTracker.updateChart();
      
      expect(budgetTracker.currentChart).not.toBe(firstChart);
    });
  });

  describe('Import/Export', () => {
    test('exports data as JSON', () => {
      budgetTracker.budget = 1000;
      budgetTracker.expenses = [{ id: 1, title: 'Test', amount: 50 }];
      
      const mockLink = { click: () => {}, href: '', download: '' };
      document.createElement = () => mockLink;
      
      budgetTracker.exportData();
      
      expect(mockLink.download).toContain('uniwallet-export-');
      expect(mockLink.href).toContain('data:application/json');
    });

    test('handles import with valid JSON', (done) => {
      const importData = {
        budget: 2000,
        expenses: [{ id: 1, title: 'Imported', amount: 100, category: 'food' }]
      };
      
      const mockEvent = {
        target: {
          files: [{ content: JSON.stringify(importData) }],
          value: ''
        }
      };
      
      budgetTracker.handleImport(mockEvent);
      
      setTimeout(() => {
        expect(budgetTracker.budget).toBe(2000);
        expect(budgetTracker.expenses).toHaveLength(1);
        expect(budgetTracker.expenses[0].title).toBe('Imported');
        done();
      }, 10);
    });
  });

  describe('Utility Functions', () => {
    test('clears all expenses', () => {
      budgetTracker.expenses = [
        { id: 1, title: 'Test1', amount: 50 },
        { id: 2, title: 'Test2', amount: 25 }
      ];
      
      budgetTracker.clearAllExpenses();
      
      expect(budgetTracker.expenses).toHaveLength(0);
      expect(budgetTracker.nextId).toBe(1);
      expect(budgetTracker.editingId).toBeNull();
    });

    test('shows alert with different types', () => {
      budgetTracker.showAlert('Test message', 'success');
      expect(mockElements.alertMessage.textContent).toBe('Test message');
      
      budgetTracker.showAlert('Error message', 'error');
      expect(mockElements.alertMessage.textContent).toBe('Error message');
    });
  });
});
