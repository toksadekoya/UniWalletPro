// src/js/FilterService.js
export const FilterService = {
  apply(expenses, { search = "", category = "", dateRange = "", amountRange = "" } = {}) {
    let filtered = [...expenses];

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(s));
    }
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    if (dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(e => {
        const d = new Date(e.date);
        if (dateRange === "today") return d >= today;
        if (dateRange === "week") return d >= new Date(today.getTime() - 7*24*60*60*1000);
        if (dateRange === "month") return d >= new Date(today.getFullYear(), today.getMonth()-1, today.getDate());
        return true;
      });
    }
    if (amountRange) {
      filtered = filtered.filter(e => {
        const a = e.amount;
        if (amountRange === "0-10") return a >= 0 && a <= 10;
        if (amountRange === "10-50") return a > 10 && a <= 50;
        if (amountRange === "50-100") return a > 50 && a <= 100;
        if (amountRange === "100+") return a > 100;
        return true;
      });
    }

    return filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  }
};