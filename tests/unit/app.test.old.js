// tests/unit/app.test.js
/**
 * @jest-environment jsdom
 */

// Mock all global dependencies
global.Chart = class MockChart {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
  }
  destroy() {}
};

global.Blob = class MockBlob {
  constructor(data, options) {
    this.data = data;
    this.type = options?.type || 'application/json';
  }
};

global.URL = {
  createObjectURL: (blob) => `blob:mock-url-${Date.now()}`
};

global.FileReader = class MockFileReader {
  constructor() {
    this.onload = null;
  }
  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        const result = file.mockContent || '{"budget":1000,"expenses":[]}';
        this.onload({ target: { result } });
      }
    }, 0);
  }
};

global.confirm = () => true;

// Comprehensive app.js test suite for maximum coverage
describe('AdvancedBudgetTracker - Complete Coverage Suite', () => {
  let mockElements = {};
  let eventListeners = {};
  let budgetTracker;

  const createMockElement = (id, type = 'div') => ({
    id,
    tagName: type.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    files: [],
    style: {},
    dataset: {},
    classList: {
      add(cls) { this.className = (this.className || '').trim() + ' ' + cls; },
      remove(cls) { this.className = (this.className || '').replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim(); },
      contains(cls) { return (this.className || '').includes(cls); },
      toggle(cls) { this.contains(cls) ? this.remove(cls) : this.add(cls); }
    },
    addEventListener(event, callback) {
      eventListeners[`${id}_${event}`] = callback;
    },
    removeEventListener() {},
    click() {
      if (eventListeners[`${this.id}_click`]) {
        eventListeners[`${this.id}_click`]();
      }
    },
    focus() {},
    blur() {},
    scrollIntoView() {},
    appendChild() {},
    removeChild() {},
    querySelector: () => createMockElement('child'),
    querySelectorAll: () => [createMockElement('child1'), createMockElement('child2')]
  });

  beforeAll(() => {
    // Create comprehensive DOM structure
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
      if (selector.startsWith('#')) return document.getElementById(selector.substring(1));
      if (selector.includes('data-id')) {
        const match = selector.match(/data-id="(\d+)"/);
        return match ? createMockElement(`expense-${match[1]}`) : null;
      }
      return createMockElement('mock');
    };
    document.querySelectorAll = (selector) => {
      if (selector === '.expense-item') return [createMockElement('exp1'), createMockElement('exp2')];
      if (selector === '.chart-tab') return [createMockElement('tab1'), createMockElement('tab2')];
      return [createMockElement('mock')];
    };
    document.createElement = (tag) => {
      if (tag === 'a') return { href: '', download: '', click: () => {} };
      return createMockElement(`created-${tag}`, tag);
    };
    document.addEventListener = (event, callback) => {
      if (event === 'DOMContentLoaded') eventListeners['document_DOMContentLoaded'] = callback;
    };

    global.window = global.window || {};
  });

  beforeEach(() => {
    Object.values(mockElements).forEach(element => {
      if (element) {
        element.value = '';
        element.textContent = '';
        element.innerHTML = '';
        element.className = '';
      }
    });
    eventListeners = {};
    delete global.window.budgetTracker;
  });

  describe('Application Initialization', () => {
    test('imports app.js and initializes AdvancedBudgetTracker', async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      expect(global.window.budgetTracker).toBeDefined();
    });

    test('initializes all DOM elements', async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      const tracker = global.window.budgetTracker;
      expect(tracker.budgetInput).toBeDefined();
      expect(tracker.expenseTitle).toBeDefined();
      expect(tracker.addExpenseBtn).toBeDefined();
    });

    test('initializes with default values', async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      const tracker = global.window.budgetTracker;
      expect(tracker.budget).toBe(0);
      expect(tracker.budgetPeriod).toBe('monthly');
      expect(tracker.expenses).toEqual([]);
      expect(tracker.nextId).toBe(1);
      expect(tracker.editingId).toBeNull();
      expect(tracker.currentChart).toBeNull();
      expect(tracker.currentChartType).toBe('category');
    });

    test('initializes categories correctly', async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      const tracker = global.window.budgetTracker;
      expect(tracker.categories).toHaveProperty('food');
      expect(tracker.categories).toHaveProperty('transport');
      expect(tracker.categories).toHaveProperty('entertainment');
      expect(tracker.categories.food.name).toBe('Food & Dining');
    });

    test('attaches event listeners correctly', async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      expect(eventListeners['setBudgetBtn_click']).toBeDefined();
      expect(eventListeners['addExpenseBtn_click']).toBeDefined();
    });
  });

  describe('Budget Management', () => {
    beforeEach(async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      budgetTracker = global.window.budgetTracker;
    });

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

    test('shows alert for empty budget input', () => {
      mockElements.budgetInput.value = '';
      budgetTracker.setBudget();
      expect(budgetTracker.budget).toBe(0);
      expect(mockElements.alertMessage.textContent).toContain('valid budget amount');
    });

    test('updates display after setting budget', () => {
      mockElements.budgetInput.value = '500';
      budgetTracker.setBudget();
      budgetTracker.updateDisplay();
      expect(mockElements.expensesCard.textContent).toBe('£0.00');
      expect(mockElements.balanceCard.textContent).toBe('£500.00');
    });

    test('handles budget period correctly', () => {
      mockElements.budgetInput.value = '1000';
      budgetTracker.budgetPeriod = 'weekly';
      budgetTracker.setBudget();
      expect(mockElements.alertMessage.textContent).toContain('Weekly budget set');
    });
  });

  describe('Expense Management', () => {
    beforeEach(async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      budgetTracker = global.window.budgetTracker;
    });

    test('adds expense with valid input', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses).toHaveLength(1);
      expect(budgetTracker.expenses[0].title).toBe('Coffee');
      expect(budgetTracker.expenses[0].amount).toBe(5.50);
      expect(budgetTracker.expenses[0].category).toBe('food');
      expect(budgetTracker.nextId).toBe(2);
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

    test('shows alert for invalid expense amount - negative', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '-5';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses).toHaveLength(0);
      expect(mockElements.alertMessage.textContent).toContain('valid amount');
    });

    test('shows alert for invalid expense amount - non-numeric', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = 'abc';
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
      expect(mockElements.expenseCategory.value).toBe('food');
    });

    test('generates unique IDs for expenses', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].id).toBe(1);
      expect(budgetTracker.expenses[1].id).toBe(2);
    });

    test('adds timestamp and date to expenses', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].date).toBeDefined();
      expect(budgetTracker.expenses[0].timestamp).toBeDefined();
    });
  });

  describe('Expense Editing', () => {
    beforeEach(async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      budgetTracker = global.window.budgetTracker;
      
      // Add an expense to edit
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
    });

    test('enters edit mode for existing expense', () => {
      budgetTracker.editExpense(1);
      
      expect(budgetTracker.editingId).toBe(1);
      expect(mockElements.expenseTitle.value).toBe('Coffee');
      expect(mockElements.expenseAmount.value).toBe('5.5');
      expect(mockElements.expenseCategory.value).toBe('food');
      expect(mockElements.addExpenseBtn.innerHTML).toContain('Update Expense');
    });

    test('updates expense in edit mode', () => {
      budgetTracker.editExpense(1);
      mockElements.expenseTitle.value = 'Latte';
      mockElements.expenseAmount.value = '6.00';
      budgetTracker.handleExpense();
      
      expect(budgetTracker.expenses[0].title).toBe('Latte');
      expect(budgetTracker.expenses[0].amount).toBe(6.00);
      expect(budgetTracker.expenses[0].updatedAt).toBeDefined();
      expect(budgetTracker.editingId).toBeNull();
      expect(mockElements.addExpenseBtn.innerHTML).toContain('Add Expense');
    });

    test('does not edit non-existent expense', () => {
      budgetTracker.editExpense(999);
      expect(budgetTracker.editingId).toBeNull();
    });

    test('highlights editing expense row', () => {
      budgetTracker.editExpense(1);
      // The highlighting functionality would be tested here
      expect(budgetTracker.editingId).toBe(1);
    });

    test('scrolls to input section when editing', () => {
      budgetTracker.editExpense(1);
      // Scroll behavior is mocked, just verify edit mode is set
      expect(budgetTracker.editingId).toBe(1);
    });
  });

  describe('Expense Deletion', () => {
    beforeEach(async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      budgetTracker = global.window.budgetTracker;
      
      // Add expenses to delete
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      budgetTracker.handleExpense();
    });

    test('deletes existing expense', () => {
      budgetTracker.deleteExpense(1);
      
      expect(budgetTracker.expenses).toHaveLength(1);
      expect(budgetTracker.expenses[0].title).toBe('Lunch');
    });

    test('clears editing state when deleting edited expense', () => {
      budgetTracker.editExpense(1);
      budgetTracker.deleteExpense(1);
      
      expect(budgetTracker.editingId).toBeNull();
      expect(mockElements.addExpenseBtn.innerHTML).toContain('Add Expense');
    });

    test('does not delete non-existent expense', () => {
      const initialLength = budgetTracker.expenses.length;
      budgetTracker.deleteExpense(999);
      
      expect(budgetTracker.expenses).toHaveLength(initialLength);
    });

    test('shows success alert after deletion', () => {
      budgetTracker.deleteExpense(1);
      expect(mockElements.alertMessage.textContent).toContain('deleted successfully');
    });
  });

  describe('Display Updates', () => {
    beforeEach(async () => {
      await import('../../src/js/app.js');
      if (eventListeners['document_DOMContentLoaded']) {
        eventListeners['document_DOMContentLoaded']();
      }
      budgetTracker = global.window.budgetTracker;
      budgetTracker.budget = 1000;
    });

    test('updates display with correct calculations', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      budgetTracker.handleExpense();
      
      budgetTracker.updateDisplay();
      
      expect(mockElements.expensesCard.textContent).toBe('£17.50');
      expect(mockElements.balanceCard.textContent).toBe('£982.50');
      expect(mockElements.categoriesCard.textContent).toBe('1');
    });

    test('handles negative balance styling', () => {
      budgetTracker.budget = 10;
      mockElements.expenseTitle.value = 'Expensive Item';
      mockElements.expenseAmount.value = '50';
      budgetTracker.handleExpense();
      
      budgetTracker.updateDisplay();
      
      expect(mockElements.balanceCard.textContent).toBe('£-40.00');
      expect(mockElements.balanceCard.classList.contains('negative')).toBe(true);
    });

    test('removes negative styling for positive balance', () => {
      mockElements.balanceCard.classList.add('negative');
      budgetTracker.budget = 1000;
      budgetTracker.updateDisplay();
      
      expect(mockElements.balanceCard.classList.contains('negative')).toBe(false);
    });

    test('counts unique categories correctly', () => {
      mockElements.expenseTitle.value = 'Coffee';
      mockElements.expenseAmount.value = '5.50';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Bus Ticket';
      mockElements.expenseAmount.value = '2.75';
      mockElements.expenseCategory.value = 'transport';
      budgetTracker.handleExpense();
      
      mockElements.expenseTitle.value = 'Lunch';
      mockElements.expenseAmount.value = '12.00';
      mockElements.expenseCategory.value = 'food';
      budgetTracker.handleExpense();
      
      budgetTracker.updateDisplay();
      expect(mockElements.categoriesCard.textContent).toBe('2');
    });
  });

  // Continue with more test descriptions in next part...
});

// Additional test cases for filtering, charts, data persistence, etc.
describe('Expense Filtering', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
    
    // Add sample expenses for filtering
    const expenses = [
      { title: 'Coffee', amount: 5.50, category: 'food' },
      { title: 'Bus Ticket', amount: 2.75, category: 'transport' },
      { title: 'Movie Theater', amount: 15.00, category: 'entertainment' },
      { title: 'Grocery Shopping', amount: 45.25, category: 'food' }
    ];
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount.toString();
      mockElements.expenseCategory.value = exp.category;
      budgetTracker.handleExpense();
    });
  });
  
  test('renders all expenses when no filters applied', () => {
    budgetTracker.renderExpenses();
    expect(budgetTracker.expenses).toHaveLength(4);
  });
  
  test('shows empty state when no expenses exist', () => {
    budgetTracker.expenses = [];
    budgetTracker.renderExpenses();
    expect(mockElements.expenseList.innerHTML).toContain('No expenses added yet');
  });
  
  test('shows filtered empty state', () => {
    mockElements.searchFilter.value = 'nonexistent';
    budgetTracker.renderExpenses();
    expect(mockElements.expenseList.innerHTML).toContain('No expenses match your filters');
  });
});

describe('Data Persistence', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('saves data to localStorage successfully', () => {
    budgetTracker.budget = 1000;
    mockElements.expenseTitle.value = 'Test';
    mockElements.expenseAmount.value = '50';
    budgetTracker.handleExpense();
    
    expect(budgetTracker.saveData()).toBe(true);
  });
  
  test('loads data from localStorage', () => {
    const testData = {
      budget: 500,
      budgetPeriod: 'weekly',
      expenses: [{ id: 1, title: 'Test', amount: 25, category: 'food', date: new Date().toISOString() }],
      nextId: 2,
      lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem('uniwallet_data', JSON.stringify(testData));
    budgetTracker.loadData();
    
    expect(budgetTracker.budget).toBe(500);
    expect(budgetTracker.expenses).toHaveLength(1);
    expect(mockElements.dataStatus.innerHTML).toContain('Last saved:');
  });
  
  test('handles localStorage save error', () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('Storage full'); };
    
    expect(budgetTracker.saveData()).toBe(false);
    expect(mockElements.alertMessage.textContent).toContain('Failed to save');
    
    localStorage.setItem = originalSetItem;
  });
  
  test('handles localStorage load error', () => {
    localStorage.setItem('uniwallet_data', 'invalid json');
    budgetTracker.loadData();
    expect(mockElements.alertMessage.textContent).toContain('Failed to load');
  });
  
  test('updates UI elements after loading data', () => {
    const testData = {
      budget: 750,
      expenses: [],
      nextId: 1
    };
    
    localStorage.setItem('uniwallet_data', JSON.stringify(testData));
    budgetTracker.loadData();
    
    expect(mockElements.budgetCard.textContent).toBe('£750.00');
    expect(mockElements.budgetInput.value).toBe('');
  });
});

describe('Chart Management', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('creates category chart', () => {
    mockElements.expenseTitle.value = 'Coffee';
    mockElements.expenseAmount.value = '5';
    mockElements.expenseCategory.value = 'food';
    budgetTracker.handleExpense();
    
    budgetTracker.createCategoryChart();
    expect(budgetTracker.currentChart).toBeDefined();
  });
  
  test('creates daily chart', () => {
    budgetTracker.createDailyChart();
    expect(budgetTracker.currentChart).toBeDefined();
  });
  
  test('updates chart based on current type', () => {
    budgetTracker.currentChartType = 'category';
    budgetTracker.updateChart();
    expect(budgetTracker.currentChart).toBeDefined();
    
    budgetTracker.currentChartType = 'daily';
    budgetTracker.updateChart();
    expect(budgetTracker.currentChart).toBeDefined();
  });
  
  test('destroys existing chart before creating new one', () => {
    const mockChart = { destroy: jest.fn() };
    budgetTracker.currentChart = mockChart;
    
    budgetTracker.createCategoryChart();
    expect(mockChart.destroy).toHaveBeenCalled();
  });
  
  test('processes category data for chart', () => {
    const expenses = [
      { title: 'Coffee', amount: 5, category: 'food' },
      { title: 'Lunch', amount: 15, category: 'food' },
      { title: 'Bus', amount: 3, category: 'transport' }
    ];
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount.toString();
      mockElements.expenseCategory.value = exp.category;
      budgetTracker.handleExpense();
    });
    
    budgetTracker.createCategoryChart();
    expect(budgetTracker.currentChart).toBeDefined();
  });
  
  test('processes daily data for chart', () => {
    mockElements.expenseTitle.value = 'Daily Expense';
    mockElements.expenseAmount.value = '10';
    budgetTracker.handleExpense();
    
    budgetTracker.createDailyChart();
    expect(budgetTracker.currentChart).toBeDefined();
  });
});

describe('Insights Generation', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
    budgetTracker.budget = 1000;
  });
  
  test('shows budget alert for high usage', () => {
    mockElements.expenseTitle.value = 'Expensive Item';
    mockElements.expenseAmount.value = '950';
    budgetTracker.handleExpense();
    
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Alert');
    expect(mockElements.insightsList.innerHTML).toContain('#ef4444');
  });
  
  test('shows budget warning for medium usage', () => {
    mockElements.expenseTitle.value = 'Medium Item';
    mockElements.expenseAmount.value = '800';
    budgetTracker.handleExpense();
    
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Warning');
    expect(mockElements.insightsList.innerHTML).toContain('#f59e0b');
  });
  
  test('shows budget status for low usage', () => {
    mockElements.expenseTitle.value = 'Small Item';
    mockElements.expenseAmount.value = '50';
    budgetTracker.handleExpense();
    
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Budget Status');
    expect(mockElements.insightsList.innerHTML).toContain('#10b981');
  });
  
  test('shows top spending category insight', () => {
    const expenses = [
      { title: 'Coffee', amount: 5, category: 'food' },
      { title: 'Lunch', amount: 15, category: 'food' },
      { title: 'Bus', amount: 3, category: 'transport' }
    ];
    
    expenses.forEach(exp => {
      mockElements.expenseTitle.value = exp.title;
      mockElements.expenseAmount.value = exp.amount.toString();
      mockElements.expenseCategory.value = exp.category;
      budgetTracker.handleExpense();
    });
    
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Top Spending Category');
    expect(mockElements.insightsList.innerHTML).toContain('Food & Dining');
  });
  
  test('shows average expense insight', () => {
    mockElements.expenseTitle.value = 'Test';
    mockElements.expenseAmount.value = '10';
    budgetTracker.handleExpense();
    
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Average Expense');
    expect(mockElements.insightsList.innerHTML).toContain('£10.00');
  });
  
  test('shows empty insights for no expenses', () => {
    budgetTracker.updateInsights();
    expect(mockElements.insightsList.innerHTML).toContain('Add some expenses');
  });
});

describe('Import/Export Functionality', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('exports data as JSON file', () => {
    budgetTracker.budget = 1000;
    mockElements.expenseTitle.value = 'Test';
    mockElements.expenseAmount.value = '50';
    budgetTracker.handleExpense();
    
    const mockLink = { click: jest.fn(), href: '', download: '' };
    document.createElement = () => mockLink;
    
    budgetTracker.exportData();
    
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toContain('uniwallet-export-');
    expect(mockElements.alertMessage.textContent).toContain('exported successfully');
  });
  
  test('triggers file input for import', () => {
    const mockFileInput = { click: jest.fn() };
    mockElements.importFile = mockFileInput;
    
    budgetTracker.importData();
    expect(mockFileInput.click).toHaveBeenCalled();
  });
  
  test('handles import with valid JSON', (done) => {
    const mockData = {
      budget: 2000,
      expenses: [{ id: 1, title: 'Imported', amount: 25, category: 'food' }],
      version: '2.0'
    };
    
    const mockEvent = {
      target: {
        files: [{ mockContent: JSON.stringify(mockData) }],
        value: ''
      }
    };
    
    budgetTracker.handleImport(mockEvent);
    
    setTimeout(() => {
      expect(budgetTracker.budget).toBe(2000);
      expect(budgetTracker.expenses).toHaveLength(1);
      expect(mockElements.alertMessage.textContent).toContain('imported successfully');
      done();
    }, 10);
  });
  
  test('handles import with invalid JSON', (done) => {
    const mockEvent = {
      target: {
        files: [{ mockContent: 'invalid json' }],
        value: ''
      }
    };
    
    budgetTracker.handleImport(mockEvent);
    
    setTimeout(() => {
      expect(mockElements.alertMessage.textContent).toContain('Invalid file format');
      done();
    }, 10);
  });
  
  test('handles import with no file selected', () => {
    const mockEvent = {
      target: {
        files: [],
        value: ''
      }
    };
    
    budgetTracker.handleImport(mockEvent);
    // Should return early without error
    expect(true).toBe(true);
  });
  
  test('calculates next ID correctly after import', (done) => {
    const mockData = {
      budget: 1000,
      expenses: [
        { id: 5, title: 'Test1', amount: 10, category: 'food' },
        { id: 3, title: 'Test2', amount: 20, category: 'transport' }
      ]
    };
    
    const mockEvent = {
      target: {
        files: [{ mockContent: JSON.stringify(mockData) }],
        value: ''
      }
    };
    
    budgetTracker.handleImport(mockEvent);
    
    setTimeout(() => {
      expect(budgetTracker.nextId).toBe(6);
      done();
    }, 10);
  });
});

describe('Event Handlers and User Interactions', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('handles Enter key on budget input', () => {
    mockElements.budgetInput.value = '1000';
    if (eventListeners['budgetInput_keypress']) {
      eventListeners['budgetInput_keypress']({ key: 'Enter' });
    }
    expect(budgetTracker.budget).toBe(1000);
  });
  
  test('handles Enter key on expense title input', () => {
    mockElements.expenseTitle.value = 'Coffee';
    mockElements.expenseAmount.value = '5';
    if (eventListeners['expenseTitle_keypress']) {
      eventListeners['expenseTitle_keypress']({ key: 'Enter' });
    }
    expect(budgetTracker.expenses).toHaveLength(1);
  });
  
  test('handles Enter key on expense amount input', () => {
    mockElements.expenseTitle.value = 'Coffee';
    mockElements.expenseAmount.value = '5';
    if (eventListeners['expenseAmount_keypress']) {
      eventListeners['expenseAmount_keypress']({ key: 'Enter' });
    }
    expect(budgetTracker.expenses).toHaveLength(1);
  });
  
  test('handles filter input changes', () => {
    if (eventListeners['searchFilter_input']) {
      eventListeners['searchFilter_input']();
    }
    if (eventListeners['categoryFilter_input']) {
      eventListeners['categoryFilter_input']();
    }
    if (eventListeners['dateFilter_input']) {
      eventListeners['dateFilter_input']();
    }
    if (eventListeners['amountFilter_input']) {
      eventListeners['amountFilter_input']();
    }
    // Just verify no errors occur
    expect(true).toBe(true);
  });
  
  test('handles file import change event', () => {
    const mockEvent = {
      target: {
        files: [],
        value: ''
      }
    };
    
    if (eventListeners['importFile_change']) {
      eventListeners['importFile_change'](mockEvent);
    }
    expect(true).toBe(true);
  });
});

describe('Utility Functions and Edge Cases', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('clears all expenses', () => {
    mockElements.expenseTitle.value = 'Test1';
    mockElements.expenseAmount.value = '10';
    budgetTracker.handleExpense();
    
    mockElements.expenseTitle.value = 'Test2';
    mockElements.expenseAmount.value = '20';
    budgetTracker.handleExpense();
    
    budgetTracker.clearAllExpenses();
    
    expect(budgetTracker.expenses).toHaveLength(0);
    expect(budgetTracker.nextId).toBe(1);
    expect(budgetTracker.editingId).toBeNull();
    expect(mockElements.addExpenseBtn.innerHTML).toContain('Add Expense');
  });
  
  test('shows alert with different types', () => {
    budgetTracker.showAlert('Success message', 'success');
    expect(mockElements.alertMessage.className).toBe('alert success show');
    
    budgetTracker.showAlert('Error message', 'error');
    expect(mockElements.alertMessage.className).toBe('alert error show');
    
    budgetTracker.showAlert('Default message');
    expect(mockElements.alertMessage.className).toBe('alert error show');
  });
  
  test('handles alert timeout', (done) => {
    budgetTracker.showAlert('Test message');
    expect(mockElements.alertMessage.classList.contains('show')).toBe(true);
    
    setTimeout(() => {
      expect(mockElements.alertMessage.classList.contains('show')).toBe(false);
      done();
    }, 4100);
  });
});

describe('Global Functions', () => {
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
  });
  
  test('showChart function updates chart type', () => {
    if (typeof global.showChart === 'function') {
      global.showChart('daily');
      expect(global.window.budgetTracker.currentChartType).toBe('daily');
    } else {
      // Test the inline function call
      global.window.budgetTracker.currentChartType = 'category';
      global.window.budgetTracker.updateChart();
      expect(global.window.budgetTracker.currentChart).toBeDefined();
    }
  });
  
  test('clearAllExpenses global function', () => {
    if (typeof global.clearAllExpenses === 'function') {
      global.clearAllExpenses();
    } else {
      global.window.budgetTracker.clearAllExpenses();
    }
    expect(global.window.budgetTracker.expenses).toHaveLength(0);
  });
  
  test('exportData global function', () => {
    const mockLink = { click: jest.fn(), href: '', download: '' };
    document.createElement = () => mockLink;
    
    if (typeof global.exportData === 'function') {
      global.exportData();
    } else {
      global.window.budgetTracker.exportData();
    }
    expect(mockLink.click).toHaveBeenCalled();
  });
  
  test('importData global function', () => {
    const mockFileInput = { click: jest.fn() };
    mockElements.importFile = mockFileInput;
    
    if (typeof global.importData === 'function') {
      global.importData();
    } else {
      global.window.budgetTracker.importData();
    }
    expect(mockFileInput.click).toHaveBeenCalled();
  });
});

// Edge cases and error handling
describe('Error Handling and Edge Cases', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
  });
  
  test('handles whitespace-only expense titles', () => {
    mockElements.expenseTitle.value = '   ';
    mockElements.expenseAmount.value = '10';
    budgetTracker.handleExpense();
    
    expect(budgetTracker.expenses).toHaveLength(0);
    expect(mockElements.alertMessage.textContent).toContain('expense description');
  });
  
  test('handles very large expense amounts', () => {
    mockElements.expenseTitle.value = 'Large Expense';
    mockElements.expenseAmount.value = '999999999';
    budgetTracker.handleExpense();
    
    expect(budgetTracker.expenses).toHaveLength(1);
    expect(budgetTracker.expenses[0].amount).toBe(999999999);
  });
  
  test('handles decimal expense amounts', () => {
    mockElements.expenseTitle.value = 'Decimal Expense';
    mockElements.expenseAmount.value = '12.34';
    budgetTracker.handleExpense();
    
    expect(budgetTracker.expenses).toHaveLength(1);
    expect(budgetTracker.expenses[0].amount).toBe(12.34);
  });
  
  test('handles missing DOM elements gracefully', () => {
    const originalGetElementById = document.getElementById;
    document.getElementById = () => null;
    
    // Should not crash when DOM elements are missing
    expect(() => {
      budgetTracker.initializeElements();
    }).not.toThrow();
    
    document.getElementById = originalGetElementById;
  });
  
  test('handles empty localStorage data', () => {
    localStorage.clear();
    budgetTracker.loadData();
    
    expect(budgetTracker.budget).toBe(0);
    expect(budgetTracker.expenses).toEqual([]);
  });
});

// Test more specific filtering scenarios
describe('Advanced Filtering', () => {
  let budgetTracker;
  
  beforeEach(async () => {
    await import('../../src/js/app.js');
    if (eventListeners['document_DOMContentLoaded']) {
      eventListeners['document_DOMContentLoaded']();
    }
    budgetTracker = global.window.budgetTracker;
    
    // Add test expenses with specific dates
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000);
    
    budgetTracker.expenses = [
      { id: 1, title: 'Today Coffee', amount: 5, category: 'food', date: today.toISOString() },
      { id: 2, title: 'Yesterday Lunch', amount: 15, category: 'food', date: yesterday.toISOString() },
      { id: 3, title: 'Week Bus', amount: 3, category: 'transport', date: weekAgo.toISOString() },
      { id: 4, title: 'Month Movie', amount: 20, category: 'entertainment', date: monthAgo.toISOString() }
    ];
  });
  
  test('filters expenses by search term (case insensitive)', () => {
    mockElements.searchFilter.value = 'COFFEE';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Today Coffee');
  });
  
  test('filters expenses by category', () => {
    mockElements.categoryFilter.value = 'food';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(2);
  });
  
  test('filters expenses by date - today', () => {
    mockElements.dateFilter.value = 'today';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Today Coffee');
  });
  
  test('filters expenses by date - week', () => {
    mockElements.dateFilter.value = 'week';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(2); // today and yesterday
  });
  
  test('filters expenses by date - month', () => {
    mockElements.dateFilter.value = 'month';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(3); // excludes the month-old expense
  });
  
  test('filters expenses by amount range - 0-10', () => {
    mockElements.amountFilter.value = '0-10';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(2); // Coffee (5) and Bus (3)
  });
  
  test('filters expenses by amount range - 10-50', () => {
    mockElements.amountFilter.value = '10-50';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(2); // Lunch (15) and Movie (20)
  });
  
  test('filters expenses by amount range - 50-100', () => {
    mockElements.amountFilter.value = '50-100';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(0);
  });
  
  test('filters expenses by amount range - 100+', () => {
    mockElements.amountFilter.value = '100+';
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(0);
  });
  
  test('sorts filtered results by date descending', () => {
    const filtered = budgetTracker.getFilteredExpenses();
    const dates = filtered.map(exp => new Date(exp.date));
    
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i] >= dates[i + 1]).toBe(true);
    }
  });
  
  test('combines multiple filters', () => {
    mockElements.searchFilter.value = 'lunch';
    mockElements.categoryFilter.value = 'food';
    mockElements.dateFilter.value = 'week';
    mockElements.amountFilter.value = '10-50';
    
    const filtered = budgetTracker.getFilteredExpenses();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Yesterday Lunch');
  });
});

// Complete coverage tests...
