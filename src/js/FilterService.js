export const FilterService = {
  apply(expenses, filters = {}, now = new Date()) {
    const {
      search = '',
      category = '',
      dateRange = '',
      amountRange = '',
    } = filters;

    let filtered = [...expenses];
    const query = search.trim().toLocaleLowerCase('en-GB');

    if (query) {
      filtered = filtered.filter((expense) =>
        expense.title.toLocaleLowerCase('en-GB').includes(query),
      );
    }

    if (category) {
      filtered = filtered.filter((expense) => expense.category === category);
    }

    if (dateRange) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      filtered = filtered.filter((expense) => {
        const date = new Date(expense.date);
        if (dateRange === 'today') return date >= today;
        if (dateRange === 'week') return date >= weekStart;
        if (dateRange === 'month') return date >= monthStart;
        return true;
      });
    }

    if (amountRange) {
      filtered = filtered.filter((expense) => {
        if (amountRange === '0-10') return expense.amount <= 10;
        if (amountRange === '10-50') return expense.amount > 10 && expense.amount <= 50;
        if (amountRange === '50-100') return expense.amount > 50 && expense.amount <= 100;
        if (amountRange === '100+') return expense.amount > 100;
        return true;
      });
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
};
