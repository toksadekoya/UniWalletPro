// tests/integration/flows.test.js
import { AdvancedBudgetTracker } from "../../src/js/AdvancedBudgetTracker.js";

describe("AdvancedBudgetTracker - Comprehensive Tests", () => {
  let tracker;

  beforeEach(() => {
    tracker = new AdvancedBudgetTracker();
  });

  describe("Constructor and Initialization", () => {
    test("initializes with default values", () => {
      expect(tracker.budget).toBe(0);
      expect(tracker.budgetPeriod).toBe("monthly");
      expect(tracker.expenses).toEqual([]);
      expect(tracker.nextId).toBe(1);
      expect(tracker.editingId).toBeNull();
      expect(tracker.persist).toBeDefined();
      expect(tracker.charts).toBeDefined();
    });

    test("accepts custom options", () => {
      const customTracker = new AdvancedBudgetTracker({
        storageKey: "custom_key",
        dom: { test: true }
      });
      expect(customTracker.persist.key).toBe("custom_key");
      expect(customTracker.dom).toEqual({ test: true });
    });

    test("sets DOM to null by default", () => {
      expect(tracker.dom).toBeNull();
    });
  });

  describe("Budget Management", () => {
    test("set valid budget", () => {
      const result = tracker.setBudgetFromValue(1000);
      expect(result.ok).toBe(true);
      expect(tracker.budget).toBe(1000);
    });

    test("reject invalid budget", () => {
      const result = tracker.setBudgetFromValue(0);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(tracker.budget).toBe(0);
    });

    test("reject non-numeric budget", () => {
      const result = tracker.setBudgetFromValue("invalid");
      expect(result.ok).toBe(false);
      expect(tracker.budget).toBe(0);
    });

    test("handle negative budget", () => {
      const result = tracker.setBudgetFromValue(-100);
      expect(result.ok).toBe(false);
      expect(tracker.budget).toBe(0);
    });

    test("handle budget too large", () => {
      const result = tracker.setBudgetFromValue(10000000);
      expect(result.ok).toBe(false);
      expect(tracker.budget).toBe(0);
    });
  });

  describe("Expense Management", () => {
    test("add valid expense", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      expect(expense.id).toBe(1);
      expect(expense.title).toBe("Coffee");
      expect(expense.amount).toBe(5);
      expect(expense.category).toBe("food");
      expect(expense.date).toBeDefined();
      expect(tracker.expenses).toHaveLength(1);
      expect(tracker.nextId).toBe(2);
    });

    test("sanitize expense title", () => {
      const expense = tracker.addExpense("<script>alert('xss')</script>", 5, "food");
      expect(expense.title).toContain("&lt;script&gt;");
      expect(expense.title).not.toContain("<script>");
    });

    test("throw error for invalid title", () => {
      expect(() => tracker.addExpense("", 5, "food")).toThrow("Invalid title");
      expect(() => tracker.addExpense(null, 5, "food")).toThrow("Invalid title");
    });

    test("throw error for invalid amount", () => {
      expect(() => tracker.addExpense("Test", 0, "food")).toThrow("Invalid amount");
      expect(() => tracker.addExpense("Test", -1, "food")).toThrow("Invalid amount");
      expect(() => tracker.addExpense("Test", "invalid", "food")).toThrow("Invalid amount");
    });

    test("throw error for invalid category", () => {
      expect(() => tracker.addExpense("Test", 5, "invalid")).toThrow("Invalid category");
      expect(() => tracker.addExpense("Test", 5, "")).toThrow("Invalid category");
    });

    test("multiple expenses increment nextId", () => {
      tracker.addExpense("Coffee", 5, "food");
      tracker.addExpense("Bus", 3, "transport");
      expect(tracker.nextId).toBe(3);
      expect(tracker.expenses).toHaveLength(2);
    });
  });

  describe("Expense Editing", () => {
    test("set editing id", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      tracker.editExpense(expense.id);
      expect(tracker.editingId).toBe(expense.id);
    });

    test("update valid expense", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      tracker.editExpense(expense.id);
      const result = tracker.updateExpense("Latte", 6, "food");
      
      expect(result).toBe(true);
      expect(tracker.expenses[0].title).toBe("Latte");
      expect(tracker.expenses[0].amount).toBe(6);
      expect(tracker.expenses[0].updatedAt).toBeDefined();
      expect(tracker.editingId).toBeNull();
    });

    test("fail to update with invalid data", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      tracker.editExpense(expense.id);
      
      expect(tracker.updateExpense("", 6, "food")).toBe(false);
      expect(tracker.updateExpense("Latte", 0, "food")).toBe(false);
      expect(tracker.updateExpense("Latte", 6, "invalid")).toBe(false);
    });

    test("fail to update non-existent expense", () => {
      tracker.editingId = 999;
      const result = tracker.updateExpense("Test", 5, "food");
      expect(result).toBe(false);
    });

    test("sanitize updated title", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      tracker.editExpense(expense.id);
      tracker.updateExpense("<script>test</script>", 6, "food");
      
      expect(tracker.expenses[0].title).toContain("&lt;script&gt;");
    });
  });

  describe("Expense Deletion", () => {
    test("delete existing expense", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      const result = tracker.deleteExpense(expense.id);
      
      expect(result).toBe(true);
      expect(tracker.expenses).toHaveLength(0);
    });

    test("fail to delete non-existent expense", () => {
      const result = tracker.deleteExpense(999);
      expect(result).toBe(false);
    });

    test("clear editing state when deleting edited expense", () => {
      const expense = tracker.addExpense("Coffee", 5, "food");
      tracker.editExpense(expense.id);
      const result = tracker.deleteExpense(expense.id);
      
      expect(result).toBe(true);
      expect(tracker.editingId).toBeNull();
    });

    test("keep editing state when deleting different expense", () => {
      const expense1 = tracker.addExpense("Coffee", 5, "food");
      const expense2 = tracker.addExpense("Tea", 3, "food");
      tracker.editExpense(expense1.id);
      const result = tracker.deleteExpense(expense2.id);
      
      expect(result).toBe(true);
      expect(tracker.editingId).toBe(expense1.id);
    });
  });

  describe("Data Persistence", () => {
    test("save data successfully", () => {
      tracker.setBudgetFromValue(1000);
      tracker.addExpense("Coffee", 5, "food");
      const result = tracker.saveData();
      expect(result).toBe(true);
    });

    test("load data successfully", () => {
      // Setup data in persistence layer
      tracker.persist.save({
        budget: 500,
        budgetPeriod: "weekly",
        expenses: [{ id: 1, title: "Test", amount: 10, category: "food", date: new Date().toISOString() }],
        nextId: 2
      });
      
      tracker.loadData();
      
      expect(tracker.budget).toBe(500);
      expect(tracker.budgetPeriod).toBe("weekly");
      expect(tracker.expenses).toHaveLength(1);
      expect(tracker.nextId).toBe(2);
    });

    test("handle missing data gracefully", () => {
      // Clear any existing data
      tracker.persist.clear();
      tracker.loadData();
      expect(tracker.budget).toBe(0);
      expect(tracker.expenses).toEqual([]);
    });

    test("loadData with null data returns early", () => {
      // Test the early return when persist.load() returns null
      const originalLoad = tracker.persist.load;
      tracker.persist.load = () => null;
      
      const originalBudget = tracker.budget;
      tracker.loadData();
      
      // Budget should remain unchanged
      expect(tracker.budget).toBe(originalBudget);
      
      // Restore original method
      tracker.persist.load = originalLoad;
    });

    test("handle invalid data types", () => {
      tracker.persist.save({
        budget: "invalid",
        expenses: "not an array",
        nextId: "not a number"
      });
      
      tracker.loadData();
      
      expect(tracker.budget).toBe(0);
      expect(tracker.expenses).toEqual([]);
      expect(tracker.nextId).toBe(1);
    });
  });

  describe("Filtering", () => {
    beforeEach(() => {
      tracker.addExpense("Coffee", 5, "food");
      tracker.addExpense("Bus", 3, "transport");
      tracker.addExpense("Movie", 15, "entertainment");
    });

    test("get all expenses without filters", () => {
      const filtered = tracker.getFilteredExpenses();
      expect(filtered).toHaveLength(3);
    });

    test("filter by search term", () => {
      const filtered = tracker.getFilteredExpenses({ search: "coffee" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Coffee");
    });

    test("filter by category", () => {
      const filtered = tracker.getFilteredExpenses({ category: "food" });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe("food");
    });

    test("filter by amount range", () => {
      const filtered = tracker.getFilteredExpenses({ amountRange: "0-10" });
      expect(filtered).toHaveLength(2);
    });

    test("combine multiple filters", () => {
      const filtered = tracker.getFilteredExpenses({ 
        category: "food",
        search: "coffee"
      });
      expect(filtered).toHaveLength(1);
    });
  });

  describe("Calculations and Display", () => {
    test("calculate totals with no expenses", () => {
      const totals = tracker.totals();
      expect(totals.totalExpenses).toBe(0);
      expect(totals.balance).toBe(0);
      expect(totals.categoriesUsed).toBe(0);
    });

    test("calculate totals with expenses", () => {
      tracker.setBudgetFromValue(100);
      tracker.addExpense("Coffee", 5, "food");
      tracker.addExpense("Bus", 3, "transport");
      
      const totals = tracker.totals();
      expect(totals.totalExpenses).toBe(8);
      expect(totals.balance).toBe(92);
      expect(totals.categoriesUsed).toBe(2);
    });

    test("updateDisplay returns totals", () => {
      tracker.addExpense("Coffee", 5, "food");
      const result = tracker.updateDisplay();
      
      expect(result.totalExpenses).toBe(5);
      expect(result.balance).toBe(-5);
      expect(result.categoriesUsed).toBe(1);
    });

    test("handle negative balance", () => {
      tracker.setBudgetFromValue(10);
      tracker.addExpense("Expensive", 50, "shopping");
      
      const totals = tracker.totals();
      expect(totals.balance).toBe(-40);
    });

    test("count unique categories correctly", () => {
      tracker.addExpense("Coffee", 5, "food");
      tracker.addExpense("Lunch", 10, "food");
      tracker.addExpense("Bus", 3, "transport");
      
      const totals = tracker.totals();
      expect(totals.categoriesUsed).toBe(2);
    });
  });

  describe("Security and Input Sanitization", () => {
    test("sanitizeInput method", () => {
      const result = tracker.sanitizeInput("<script>alert('xss')</script>");
      expect(result).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    });

    test("sanitizeInput handles null/undefined", () => {
      expect(tracker.sanitizeInput(null)).toBe("");
      expect(tracker.sanitizeInput(undefined)).toBe("");
    });

    test("sanitizeInput handles numbers", () => {
      expect(tracker.sanitizeInput(123)).toBe("123");
    });
  });
});
