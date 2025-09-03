// tests/unit/filter.service.test.js
import { FilterService } from "../../src/js/FilterService.js";

describe("FilterService", () => {
  const mockExpenses = [
    {
      id: 1,
      title: "Coffee Shop",
      amount: 5.50,
      category: "food",
      date: new Date().toISOString()
    },
    {
      id: 2,
      title: "Bus Ticket",
      amount: 2.75,
      category: "transport",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    },
    {
      id: 3,
      title: "Movie Theater",
      amount: 15.00,
      category: "entertainment",
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
    },
    {
      id: 4,
      title: "Grocery Store",
      amount: 45.25,
      category: "food",
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
    },
    {
      id: 5,
      title: "Shopping Mall",
      amount: 125.00,
      category: "shopping",
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days ago
    }
  ];

  test("applies no filters when no options provided", () => {
    const result = FilterService.apply(mockExpenses);
    expect(result).toHaveLength(5);
    // Should be sorted by date descending
    expect(new Date(result[0].date) >= new Date(result[1].date)).toBe(true);
  });

  test("applies no filters with empty filter object", () => {
    const result = FilterService.apply(mockExpenses, {});
    expect(result).toHaveLength(5);
  });

  test("filters by search term (case insensitive)", () => {
    const result = FilterService.apply(mockExpenses, { search: "coffee" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Coffee Shop");
  });

  test("filters by search term with uppercase", () => {
    const result = FilterService.apply(mockExpenses, { search: "MOVIE" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Movie Theater");
  });

  test("filters by category", () => {
    const result = FilterService.apply(mockExpenses, { category: "food" });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.category === "food")).toBe(true);
  });

  test("filters by date range - today", () => {
    const result = FilterService.apply(mockExpenses, { dateRange: "today" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Coffee Shop");
  });

  test("filters by date range - week", () => {
    const result = FilterService.apply(mockExpenses, { dateRange: "week" });
    expect(result).toHaveLength(2);
    expect(result.some(e => e.title === "Coffee Shop")).toBe(true);
    expect(result.some(e => e.title === "Bus Ticket")).toBe(true);
  });

  test("filters by date range - month", () => {
    const result = FilterService.apply(mockExpenses, { dateRange: "month" });
    expect(result).toHaveLength(4);
    // Should not include the 45-day old expense
    expect(result.some(e => e.title === "Shopping Mall")).toBe(false);
  });

  test("filters by date range - invalid range returns all", () => {
    const result = FilterService.apply(mockExpenses, { dateRange: "invalid" });
    expect(result).toHaveLength(5);
  });

  test("filters by amount range - 0-10", () => {
    const result = FilterService.apply(mockExpenses, { amountRange: "0-10" });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.amount >= 0 && e.amount <= 10)).toBe(true);
  });

  test("filters by amount range - 10-50", () => {
    const result = FilterService.apply(mockExpenses, { amountRange: "10-50" });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.amount > 10 && e.amount <= 50)).toBe(true);
  });

  test("filters by amount range - 50-100", () => {
    const result = FilterService.apply(mockExpenses, { amountRange: "50-100" });
    expect(result).toHaveLength(0);
  });

  test("filters by amount range - 100+", () => {
    const result = FilterService.apply(mockExpenses, { amountRange: "100+" });
    expect(result).toHaveLength(1);
    expect(result[0].amount > 100).toBe(true);
  });

  test("filters by amount range - invalid range returns all", () => {
    const result = FilterService.apply(mockExpenses, { amountRange: "invalid" });
    expect(result).toHaveLength(5);
  });

  test("applies multiple filters simultaneously", () => {
    const result = FilterService.apply(mockExpenses, { 
      search: "shop", 
      category: "food",
      dateRange: "month",
      amountRange: "0-10"
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Coffee Shop");
  });

  test("multiple filters with no matches", () => {
    const result = FilterService.apply(mockExpenses, { 
      search: "nonexistent", 
      category: "food"
    });
    expect(result).toHaveLength(0);
  });

  test("sorts results by date descending", () => {
    const result = FilterService.apply(mockExpenses);
    for (let i = 0; i < result.length - 1; i++) {
      const currentDate = new Date(result[i].date);
      const nextDate = new Date(result[i + 1].date);
      expect(currentDate >= nextDate).toBe(true);
    }
  });

  test("handles empty expenses array", () => {
    const result = FilterService.apply([], { search: "test" });
    expect(result).toHaveLength(0);
  });

  test("does not modify original array", () => {
    const originalLength = mockExpenses.length;
    FilterService.apply(mockExpenses, { search: "coffee" });
    expect(mockExpenses).toHaveLength(originalLength);
  });
});
