import { describe, expect, it } from 'vitest';
import { FilterService } from '../../src/js/FilterService.js';

const now = new Date('2026-07-31T12:00:00');
const expenses = [
  { id: 1, title: 'Morning coffee', amount: 4.5, category: 'food', date: '2026-07-31T08:00:00' },
  { id: 2, title: 'Bus pass', amount: 25, category: 'transport', date: '2026-07-26T08:00:00' },
  { id: 3, title: 'Headphones', amount: 120, category: 'shopping', date: '2026-06-10T08:00:00' },
];

describe('FilterService', () => {
  it('combines search, category, date and amount filters', () => {
    expect(FilterService.apply(expenses, { search: 'COFFEE' }, now).map(({ id }) => id)).toEqual([1]);
    expect(FilterService.apply(expenses, { category: 'transport' }, now).map(({ id }) => id)).toEqual([2]);
    expect(FilterService.apply(expenses, { dateRange: 'today' }, now).map(({ id }) => id)).toEqual([1]);
    expect(FilterService.apply(expenses, { dateRange: 'week' }, now).map(({ id }) => id)).toEqual([1, 2]);
    expect(FilterService.apply(expenses, { dateRange: 'month' }, now).map(({ id }) => id)).toEqual([1, 2]);
    expect(FilterService.apply(expenses, { amountRange: '100+' }, now).map(({ id }) => id)).toEqual([3]);
    expect(FilterService.apply(expenses, { amountRange: '0-10' }, now).map(({ id }) => id)).toEqual([1]);
    expect(FilterService.apply(expenses, { amountRange: '10-50' }, now).map(({ id }) => id)).toEqual([2]);
    expect(FilterService.apply(expenses, { amountRange: '50-100' }, now)).toEqual([]);
    expect(FilterService.apply(expenses, { amountRange: 'unsupported' }, now)).toHaveLength(3);
    expect(FilterService.apply(expenses, { dateRange: 'unsupported' }, now)).toHaveLength(3);
  });

  it('sorts newest expenses first without mutating the source', () => {
    const original = [...expenses];
    expect(FilterService.apply(expenses, {}, now).map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(expenses).toEqual(original);
  });
});
