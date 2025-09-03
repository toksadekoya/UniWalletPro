// tests/unit/expense.validation.test.js
import { ValidationService } from "../../src/js/ValidationService.js";
import { SecurityService } from "../../src/js/SecurityService.js";

describe("Expense Validation", () => {
  test.each([
    ["", false],
    [" ", false],
    ["a", true],
    ["Coffee at Starbucks", true],
    [Array(256).fill("a").join(""), false],
    [null, false],
    [123, false],
    [undefined, false]
  ])("title '%s' -> %p", (title, expected) => {
    expect(ValidationService.validateExpenseTitle(title)).toBe(expected);
  });

  test.each([
    [0, false],
    [0.001, false],
    [0.01, true],
    [99999.99, true],
    [100000.01, false],
    [-10, false],
    ["abc", false]
  ])("amount %p -> %p", (amount, expected) => {
    expect(ValidationService.validateExpenseAmount(amount)).toBe(expected);
  });

  test("category", () => {
    expect(ValidationService.validateCategory("food")).toBe(true);
    expect(ValidationService.validateCategory("invalid")).toBe(false);
  });

  test("sanitize XSS", () => {
    const s = SecurityService.sanitizeInput('<script>alert("x")</script>');
    expect(s).not.toContain("<script>");
    expect(s).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  test("strip javascript: and handlers", () => {
    const s = SecurityService.sanitizeInput('<img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a>');
    expect(s).not.toContain("onerror");
    expect(s).not.toContain("javascript:");
  });

  test("handle null/undefined input in sanitizeInput", () => {
    expect(SecurityService.sanitizeInput(null)).toBe("");
    expect(SecurityService.sanitizeInput(undefined)).toBe("");
    expect(SecurityService.sanitizeInput("")).toBe("");
  });
});