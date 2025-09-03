// tests/system/e2e.test.js
/**
 * @jest-environment jsdom
 */

// Mock dependencies for E2E testing
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

/**
 * End-to-end system tests that simulate complete user workflows
 */
describe('UniWalletPro E2E System Tests', () => {
  let mockElements = {};
  let eventListeners = {};
  
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
    // Setup comprehensive DOM
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
  
  beforeEach(() => {
    Object.values(mockElements).forEach(el => {
      el.value = '';
      el.textContent = '';
      el.innerHTML = '';
      el.className = '';
    });
    eventListeners = {};
    delete global.window.budgetTracker;
  });
  
  test('complete budget management workflow', async () => {
    // Simulate complete user workflow: set budget -> add expenses -> check balance
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Step 1: Set monthly budget
    mockElements.budgetInput.value = '2000';
    tracker.setBudget();
    expect(tracker.budget).toBe(2000);
    expect(mockElements.budgetCard.textContent).toBe('£2000.00');
    
    // Step 2: Add multiple expenses
    const expenses = [
      { title: 'Weekly Groceries', amount: '150', category: 'food' },
      { title: 'Gas Bill', amount: '80', category: 'bills' },
      { title: 'Movie Tickets', amount: '25', category: 'entertainment' },
      { title: 'Bus Pass', amount: '60', category: 'transport' }
    ];
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount;
      mockElements.expenseCategory.value = exp.category;
      tracker.handleExpense();
    });
    
    expect(tracker.expenses).toHaveLength(4);
    
    // Step 3: Verify calculations
    tracker.updateDisplay();
    const totalSpent = 150 + 80 + 25 + 60; // 315
    const remaining = 2000 - 315; // 1685
    
    expect(mockElements.expensesCard.textContent).toBe(`£${totalSpent.toFixed(2)}`);
    expect(mockElements.balanceCard.textContent).toBe(`£${remaining.toFixed(2)}`);
    expect(mockElements.categoriesCard.textContent).toBe('4'); // 4 different categories
    
    // Step 4: Test filtering
    mockElements.categoryFilter.value = 'food';
    const filtered = tracker.getFilteredExpenses();
    expect(filtered.filter(exp => exp.category === 'food')).toHaveLength(1);
  });
  
  test('expense editing and deletion workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Add initial expense
    mockElements.expenseTitle.value = 'Coffee Shop';
    mockElements.expenseAmount.value = '4.50';
    mockElements.expenseCategory.value = 'food';
    tracker.handleExpense();
    
    expect(tracker.expenses).toHaveLength(1);
    const expenseId = tracker.expenses[0].id;
    
    // Edit the expense
    tracker.editExpense(expenseId);
    expect(tracker.editingId).toBe(expenseId);
    expect(mockElements.expenseTitle.value).toBe('Coffee Shop');
    
    // Update the expense
    mockElements.expenseTitle.value = 'Starbucks Coffee';
    mockElements.expenseAmount.value = '5.25';
    tracker.handleExpense();
    
    expect(tracker.expenses[0].title).toBe('Starbucks Coffee');
    expect(tracker.expenses[0].amount).toBe(5.25);
    expect(tracker.editingId).toBeNull();
    
    // Delete the expense
    tracker.deleteExpense(expenseId);
    expect(tracker.expenses).toHaveLength(0);
  });
  
  test('data persistence and recovery workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Create some data
    tracker.budget = 1500;
    mockElements.expenseTitle.value = 'Test Expense';
    mockElements.expenseAmount.value = '100';
    tracker.handleExpense();
    
    // Save data
    expect(tracker.saveData()).toBe(true);
    
    // Clear current state
    tracker.budget = 0;
    tracker.expenses = [];
    
    // Load data back
    tracker.loadData();
    
    expect(tracker.budget).toBe(1500);
    expect(tracker.expenses).toHaveLength(1);
    expect(tracker.expenses[0].title).toBe('Test Expense');
  });
  
  test('insights and analytics workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    tracker.budget = 1000;
    
    // Add expenses to trigger different insight levels
    mockElements.expenseTitle.value = 'High Expense';
    mockElements.expenseAmount.value = '950'; // 95% of budget
    tracker.handleExpense();
    
    tracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Alert');
    
    // Reset and test medium usage
    tracker.expenses = [];
    mockElements.expenseTitle.value = 'Medium Expense';
    mockElements.expenseAmount.value = '800'; // 80% of budget
    tracker.handleExpense();
    
    tracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Warning');
    
    // Reset and test low usage
    tracker.expenses = [];
    mockElements.expenseTitle.value = 'Low Expense';
    mockElements.expenseAmount.value = '100'; // 10% of budget
    tracker.handleExpense();
    
    tracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Status');
  });
  
  test('import/export data workflow', (done) => {
    import('../../src/js/app.js').then(() => {
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      
      const tracker = global.window.budgetTracker;
      
      // Setup test data
      tracker.budget = 2000;
      mockElements.expenseTitle.value = 'Export Test';
      mockElements.expenseAmount.value = '75';
      tracker.handleExpense();
      
      // Test export
      const mockLink = { click: () => {}, href: '', download: '' };
      document.createElement = () => mockLink;
      
      tracker.exportData();
      expect(mockLink.click).toBeDefined();
      expect(mockLink.download).toContain('uniwallet-export-');
      
      // Test import
      const importData = {
        budget: 3000,
        expenses: [
          { id: 1, title: 'Imported Expense', amount: 200, category: 'shopping' }
        ]
      };
      
      const mockEvent = {
        target: {
          files: [{ content: JSON.stringify(importData) }],
          value: ''
        }
      };
      
      tracker.handleImport(mockEvent);
      
      setTimeout(() => {
        expect(tracker.budget).toBe(3000);
        expect(tracker.expenses).toHaveLength(1);
        expect(tracker.expenses[0].title).toBe('Imported Expense');
        done();
      }, 10);
    });
  });
  
  test('filtering and search workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Add diverse test data
    const testData = [
      { title: 'Morning Coffee', amount: '4.50', category: 'food', date: new Date() },
      { title: 'Lunch Special', amount: '12.00', category: 'food', date: new Date() },
      { title: 'Bus Fare', amount: '2.25', category: 'transport', date: new Date(Date.now() - 86400000) },
      { title: 'Movie Night', amount: '15.00', category: 'entertainment', date: new Date(Date.now() - 86400000) }
    ];
    
    testData.forEach(item => {
      mockElements.expenseTitle.value = item.title;
      mockElements.expenseAmount.value = item.amount;
      mockElements.expenseCategory.value = item.category;
      tracker.handleExpense();
    });
    
    // Test search filter
    mockElements.searchFilter.value = 'coffee';
    let filtered = tracker.getFilteredExpenses();
    expect(filtered.filter(exp => exp.title.toLowerCase().includes('coffee'))).toHaveLength(1);
    
    // Test category filter
    mockElements.searchFilter.value = '';
    mockElements.categoryFilter.value = 'food';
    filtered = tracker.getFilteredExpenses();
    expect(filtered.filter(exp => exp.category === 'food')).toHaveLength(2);
    
    // Test amount range filter
    mockElements.categoryFilter.value = '';
    mockElements.amountFilter.value = '0-10';
    filtered = tracker.getFilteredExpenses();
    expect(filtered.filter(exp => exp.amount >= 0 && exp.amount <= 10)).toHaveLength(2);
  });
  
  test('error handling and validation workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Test invalid budget inputs
    mockElements.budgetInput.value = '0';
    tracker.setBudget();
    expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    
    mockElements.budgetInput.value = 'not_a_number';
    tracker.setBudget();
    expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    
    // Test invalid expense inputs
    mockElements.expenseTitle.value = '';
    mockElements.expenseAmount.value = '10';
    tracker.handleExpense();
    expect(mockElements.alertMessage.textContent).toContain('expense description');
    
    mockElements.expenseTitle.value = 'Test';
    mockElements.expenseAmount.value = '0';
    tracker.handleExpense();
    expect(mockElements.alertMessage.textContent).toContain('valid amount');
    
    mockElements.expenseAmount.value = 'invalid';
    tracker.handleExpense();
    expect(mockElements.alertMessage.textContent).toContain('valid amount');
  });
  
  test('chart and visualization workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Add expenses for chart data
    const expenses = [
      { title: 'Food 1', amount: '20', category: 'food' },
      { title: 'Food 2', amount: '30', category: 'food' },
      { title: 'Transport', amount: '15', category: 'transport' }
    ];
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount;
      mockElements.expenseCategory.value = exp.category;
      tracker.handleExpense();
    });
    
    // Test category chart creation
    tracker.currentChartType = 'category';
    tracker.updateChart();
    expect(tracker.currentChart).toBeDefined();
    
    // Test daily chart creation
    tracker.currentChartType = 'daily';
    tracker.updateChart();
    expect(tracker.currentChart).toBeDefined();
  });
  
  test('bulk operations workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Add multiple expenses
    const expenses = Array.from({ length: 10 }, (_, i) => ({
      title: `Expense ${i + 1}`,
      amount: `${(i + 1) * 10}`,
      category: ['food', 'transport', 'entertainment'][i % 3]
    }));
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount;
      mockElements.expenseCategory.value = exp.category;
      tracker.handleExpense();
    });
    
    expect(tracker.expenses).toHaveLength(10);
    
    // Test clear all expenses
    tracker.clearAllExpenses();
    expect(tracker.expenses).toHaveLength(0);
    expect(tracker.nextId).toBe(1);
    expect(tracker.editingId).toBeNull();
  });
  
  test('user interface responsiveness workflow', async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    
    const tracker = global.window.budgetTracker;
    
    // Test UI updates after budget change
    mockElements.budgetInput.value = '1000';
    tracker.setBudget();
    expect(mockElements.budgetCard.textContent).toBe('£1000.00');
    expect(mockElements.alertMessage.textContent).toContain('budget set successfully');
    
    // Test UI updates after expense addition
    mockElements.expenseTitle.value = 'UI Test';
    mockElements.expenseAmount.value = '50';
    tracker.handleExpense();
    
    expect(mockElements.expenseTitle.value).toBe(''); // Cleared after add
    expect(mockElements.expenseAmount.value).toBe(''); // Cleared after add
    expect(mockElements.alertMessage.textContent).toContain('added successfully');
    
    // Test display updates
    tracker.updateDisplay();
    expect(mockElements.expensesCard.textContent).toBe('£50.00');
    expect(mockElements.balanceCard.textContent).toBe('£950.00');
    expect(mockElements.categoriesCard.textContent).toBe('1');
  });
});
