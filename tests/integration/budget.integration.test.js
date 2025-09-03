// tests/integration/budget.integration.test.js
import { AdvancedBudgetTracker } from "../../src/js/AdvancedBudgetTracker.js";
import { ValidationService } from "../../src/js/ValidationService.js";
import { FilterService } from "../../src/js/FilterService.js";
import { PersistenceManager } from "../../src/js/PersistenceManager.js";

/**
 * Integration tests for budget features that test multiple components working together
 */
describe("Budget Integration Tests", () => {
  let tracker;
  let mockStorage;
  
  beforeEach(() => {
    // Setup mock storage for tests
    mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    global.sessionStorage = { ...global.localStorage };
    
    // Create fresh tracker for each test
    tracker = new AdvancedBudgetTracker();
  });
  
  test("budget validation and tracker integration", () => {
    // Test ValidationService and AdvancedBudgetTracker integration
    const validResult = tracker.setBudgetFromValue(1000);
    expect(validResult.ok).toBe(true);
    expect(tracker.budget).toBe(1000);
    
    const invalidResult = tracker.setBudgetFromValue(0);
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.error).toBeTruthy();
    expect(tracker.budget).toBe(1000); // Unchanged
  });
  
  test("expense validation and tracker integration", () => {
    // Test ValidationService integration with expense management
    expect(() => tracker.addExpense("Coffee", 5, "food")).not.toThrow();
    expect(() => tracker.addExpense("", 5, "food")).toThrow("Invalid title");
    expect(() => tracker.addExpense("Coffee", 0, "food")).toThrow("Invalid amount");
    expect(() => tracker.addExpense("Coffee", 5, "invalid")).toThrow("Invalid category");
  });
  
  test("persistence integration with tracker state", () => {
    // Test PersistenceManager integration with state management
    tracker.setBudgetFromValue(1000);
    tracker.addExpense("Coffee", 5, "food");
    
    // Save data
    expect(tracker.saveData()).toBe(true);
    
    // Create new instance and load data
    const newTracker = new AdvancedBudgetTracker();
    newTracker.loadData();
    
    // Verify state was persisted and restored
    expect(newTracker.budget).toBe(1000);
    expect(newTracker.expenses).toHaveLength(1);
    expect(newTracker.expenses[0].title).toBe("Coffee");
  });
  
  test("filtering integration with tracker", () => {
    // Test FilterService integration with expense filtering
    tracker.addExpense("Coffee", 5, "food");
    tracker.addExpense("Bus Ticket", 3, "transport");
    
    const filtered = tracker.getFilteredExpenses({ category: "food" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Coffee");
  });
  
  test("security sanitization integration", () => {
    // Test SecurityService integration with expense input
    const expense = tracker.addExpense("<script>alert('xss')</script>", 5, "food");
    expect(expense.title).not.toContain("<script>");
    expect(expense.title).toContain("&lt;script&gt;");
  });
});
