// tests/unit/budget.validation.test.js
import { ValidationService } from "../../src/js/ValidationService.js";

describe("Budget Validation - Partition Testing", () => {
  test.each([
    [0.01, true],
    [1, true],
    [999999, true],
    [0, false],
    [-0.01, false],
    [1_000_000, false],
    [NaN, false],
    [Infinity, false]
  ])("input %p -> valid %p", (input, expected) => {
    const res = ValidationService.validateBudget(input);
    expect(res.valid).toBe(expected);
  });

  test("floating point boundaries", () => {
    expect(ValidationService.validateBudget(0.00999999).valid).toBe(false);
    expect(ValidationService.validateBudget(0.01000001).valid).toBe(true);
  });
});