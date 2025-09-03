// tests/unit/state.persistence.test.js
import { AdvancedBudgetTracker } from "../../src/js/AdvancedBudgetTracker.js";

describe("State Management and Persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test("saves and loads", () => {
    const t1 = new AdvancedBudgetTracker();
    t1.budget = 1000;
    t1.expenses = [{ id:1, title:"Test", amount:50, category:"food", date:new Date().toISOString() }];
    expect(t1.saveData()).toBe(true);

    const t2 = new AdvancedBudgetTracker();
    t2.loadData();
    expect(t2.budget).toBe(1000);
    expect(t2.expenses).toHaveLength(1);
    expect(t2.nextId).toBe(1); // unchanged by load
  });

  test("sequential ids and deletion", () => {
    const t = new AdvancedBudgetTracker();
    t.addExpense("Item 1", 10, "food");
    t.addExpense("Item 2", 20, "transport");
    t.deleteExpense(1);
    const e = t.addExpense("Item 3", 30, "bills");
    expect(e.id).toBe(3);
  });
});