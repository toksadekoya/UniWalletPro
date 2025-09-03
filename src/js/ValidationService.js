// src/js/ValidationService.js
export const ValidationService = {
  validateBudget(input) {
    const n = Number(input);
    if (!Number.isFinite(n)) return { valid: false, error: "Budget must be a number" };
    if (n < 0.01) return { valid: false, error: "Budget must be at least 0.01" };
    if (n > 999999) return { valid: false, error: "Budget exceeds maximum" };
    return { valid: true };
  },

  validateExpenseTitle(title) {
    if (typeof title !== "string") return false;
    const t = title.trim();
    if (t.length === 0) return false;
    if (t.length > 255) return false;
    return true;
  },

  validateExpenseAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return false;
    if (n < 0.01) return false;
    if (n > 100000) return false;
    return true;
  },

  validateCategory(category) {
    const allowed = ["food","transport","entertainment","shopping","bills","healthcare","other"];
    return allowed.includes(category);
  }
};