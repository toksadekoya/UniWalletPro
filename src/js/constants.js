export const STORAGE_KEY = 'uniwalletpro_data';
export const MAX_IMPORT_BYTES = 1_000_000;
export const MAX_EXPENSES = 5_000;

export const CATEGORIES = Object.freeze({
  food: { name: 'Food and dining', colour: '#b91c1c' },
  transport: { name: 'Transport', colour: '#1d4ed8' },
  entertainment: { name: 'Entertainment', colour: '#6d28d9' },
  shopping: { name: 'Shopping', colour: '#92400e' },
  bills: { name: 'Bills and utilities', colour: '#0e7490' },
  healthcare: { name: 'Healthcare', colour: '#047857' },
  other: { name: 'Other', colour: '#374151' },
});

export const BUDGET_PERIODS = Object.freeze(['daily', 'weekly', 'monthly']);
