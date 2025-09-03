class AdvancedBudgetTracker {
    constructor() {
        this.budget = 0;
        this.budgetPeriod = 'monthly';
        this.expenses = [];
        this.nextId = 1;
        this.editingId = null;
        this.currentChart = null;
        this.currentChartType = 'category';
        
        this.categories = {
            food: { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
            transport: { name: 'Transport', icon: '🚗', color: '#3b82f6' },
            entertainment: { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
            shopping: { name: 'Shopping', icon: '🛍️', color: '#f59e0b' },
            bills: { name: 'Bills & Utilities', icon: '💡', color: '#06b6d4' },
            healthcare: { name: 'Healthcare', icon: '🏥', color: '#10b981' },
            other: { name: 'Other', icon: '📦', color: '#6b7280' }
        };
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadData();
        this.updateDisplay();
        this.renderExpenses();
    }

    initializeElements() {
        // Input elements
        this.budgetInput = document.getElementById('budgetInput');
        this.budgetPeriod = document.getElementById('budgetPeriod');
        this.expenseTitle = document.getElementById('expenseTitle');
        this.expenseAmount = document.getElementById('expenseAmount');
        this.expenseCategory = document.getElementById('expenseCategory');
        
        // Filter elements
        this.searchFilter = document.getElementById('searchFilter');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.dateFilter = document.getElementById('dateFilter');
        this.amountFilter = document.getElementById('amountFilter');
        
        // Button elements
        this.setBudgetBtn = document.getElementById('setBudgetBtn');
        this.addExpenseBtn = document.getElementById('addExpenseBtn');
        
        // Display elements
        this.alertMessage = document.getElementById('alertMessage');
        this.budgetCard = document.getElementById('budgetCard');
        this.expensesCard = document.getElementById('expensesCard');
        this.balanceCard = document.getElementById('balanceCard');
        this.categoriesCard = document.getElementById('categoriesCard');
        this.expenseList = document.getElementById('expenseList');
        this.dataStatus = document.getElementById('dataStatus');
        this.insightsList = document.getElementById('insightsList');
    }

    attachEventListeners() {
        this.setBudgetBtn.addEventListener('click', () => this.setBudget());
        this.addExpenseBtn.addEventListener('click', () => this.handleExpense());
        
        // Enter key support
        this.budgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setBudget();
        });
        
        [this.expenseTitle, this.expenseAmount].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleExpense();
            });
        });

        // Filter listeners
        [this.searchFilter, this.categoryFilter, this.dateFilter, this.amountFilter].forEach(filter => {
            filter.addEventListener('input', () => this.renderExpenses());
        });

        // Import file listener
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImport(e));
    }

    saveData() {
        const data = {
            budget: this.budget,
            budgetPeriod: this.budgetPeriod,
            expenses: this.expenses,
            nextId: this.nextId,
            lastSaved: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('uniwallet_data', JSON.stringify(data));
            this.dataStatus.innerHTML = `<i class="bx bx-check"></i> Data saved (${new Date().toLocaleTimeString()})`;
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            this.showAlert('Failed to save data to local storage', 'error');
            return false;
        }
    }

    loadData() {
        try {
            const savedData = localStorage.getItem('uniwallet_data');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.budget = data.budget || 0;
                this.budgetPeriod = data.budgetPeriod || 'monthly';
                this.expenses = data.expenses || [];
                this.nextId = data.nextId || 1;
                
                // Update UI with loaded data
                this.budgetCard.textContent = `£${this.budget.toFixed(2)}`;
                this.budgetInput.value = '';
                
                const lastSaved = data.lastSaved ? new Date(data.lastSaved).toLocaleString() : 'Unknown';
                this.dataStatus.innerHTML = `<i class="bx bx-history"></i> Last saved: ${lastSaved}`;
                
                this.showAlert(`Loaded ${this.expenses.length} expenses from previous session`, 'success');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showAlert('Failed to load previous data', 'error');
        }
    }

    showAlert(message, type = 'error') {
        this.alertMessage.textContent = message;
        this.alertMessage.className = `alert ${type} show`;
        
        setTimeout(() => {
            this.alertMessage.classList.remove('show');
        }, 4000);
    }

    setBudget() {
        const budgetValue = parseFloat(this.budgetInput.value);
        
        if (!budgetValue || budgetValue <= 0) {
            this.showAlert('Please enter a valid budget amount greater than 0', 'error');
            return;
        }

        this.budget = budgetValue;
        this.budgetCard.textContent = `£${budgetValue.toFixed(2)}`;
        this.budgetInput.value = '';
        
        this.updateDisplay();
        this.saveData();
        this.showAlert(`${this.budgetPeriod.charAt(0).toUpperCase() + this.budgetPeriod.slice(1)} budget set successfully!`, 'success');
    }

    handleExpense() {
        const title = this.expenseTitle.value.trim();
        const amount = parseFloat(this.expenseAmount.value);
        const category = this.expenseCategory.value;

        if (!title || !amount || amount <= 0) {
            this.showAlert('Please enter both expense description and a valid amount', 'error');
            return;
        }

        if (this.editingId !== null) {
            this.updateExpense(title, amount, category);
        } else {
            this.addExpense(title, amount, category);
        }
    }

    addExpense(title, amount, category) {
        const expense = {
            id: this.nextId++,
            title,
            amount,
            category,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        this.expenses.push(expense);
        this.clearExpenseInputs();
        this.renderExpenses();
        this.updateDisplay();
        this.updateChart();
        this.updateInsights();
        this.saveData();
        this.showAlert('Expense added successfully!', 'success');
    }

    updateExpense(title, amount, category) {
        const expenseIndex = this.expenses.findIndex(exp => exp.id === this.editingId);
        
        if (expenseIndex !== -1) {
            this.expenses[expenseIndex] = {
                ...this.expenses[expenseIndex],
                title,
                amount,
                category,
                updatedAt: new Date().toISOString()
            };
            
            this.clearExpenseInputs();
            this.renderExpenses();
            this.updateDisplay();
            this.updateChart();
            this.updateInsights();
            this.saveData();
            this.showAlert('Expense updated successfully!', 'success');
            
            this.editingId = null;
            this.addExpenseBtn.innerHTML = '<i class="bx bx-plus"></i> <span>Add Expense</span>';
        }
    }

    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        
        if (expense) {
            this.expenseTitle.value = expense.title;
            this.expenseAmount.value = expense.amount;
            this.expenseCategory.value = expense.category;
            this.editingId = id;
            this.addExpenseBtn.innerHTML = '<i class="bx bx-edit"></i> <span>Update Expense</span>';
            
            // Highlight the editing row
            document.querySelectorAll('.expense-item').forEach(item => {
                item.classList.remove('editing');
            });
            document.querySelector(`[data-id="${id}"]`)?.classList.add('editing');
            
            // Scroll to top
            document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
        }
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses = this.expenses.filter(exp => exp.id !== id);
            
            // If we were editing this expense, clear the editing state
            if (this.editingId === id) {
                this.clearExpenseInputs();
                this.editingId = null;
                this.addExpenseBtn.innerHTML = '<i class="bx bx-plus"></i> <span>Add Expense</span>';
            }
            
            this.renderExpenses();
            this.updateDisplay();
            this.updateChart();
            this.updateInsights();
            this.saveData();
            this.showAlert('Expense deleted successfully!', 'success');
        }
    }

    clearExpenseInputs() {
        this.expenseTitle.value = '';
        this.expenseAmount.value = '';
        this.expenseCategory.value = 'food';
    }

    getFilteredExpenses() {
        let filtered = [...this.expenses];

        // Search filter
        const searchTerm = this.searchFilter.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(expense => 
                expense.title.toLowerCase().includes(searchTerm)
            );
        }

        // Category filter
        const categoryFilter = this.categoryFilter.value;
        if (categoryFilter) {
            filtered = filtered.filter(expense => expense.category === categoryFilter);
        }

        // Date filter
        const dateFilter = this.dateFilter.value;
        if (dateFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filtered = filtered.filter(expense => {
                const expenseDate = new Date(expense.date);
                
                switch (dateFilter) {
                    case 'today':
                        return expenseDate >= today;
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return expenseDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                        return expenseDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        // Amount filter
        const amountFilter = this.amountFilter.value;
        if (amountFilter) {
            filtered = filtered.filter(expense => {
                const amount = expense.amount;
                switch (amountFilter) {
                    case '0-10':
                        return amount >= 0 && amount <= 10;
                    case '10-50':
                        return amount > 10 && amount <= 50;
                    case '50-100':
                        return amount > 50 && amount <= 100;
                    case '100+':
                        return amount > 100;
                    default:
                        return true;
                }
            });
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderExpenses() {
        const filteredExpenses = this.getFilteredExpenses();
        
        if (filteredExpenses.length === 0) {
            this.expenseList.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-search"></i>
                    <p>${this.expenses.length === 0 ? 'No expenses added yet.' : 'No expenses match your filters.'}</p>
                </div>
            `;
            return;
        }

        const expenseHTML = filteredExpenses.map((expense, index) => {
            const category = this.categories[expense.category];
            const date = new Date(expense.date).toLocaleDateString();
            
            return `
                <div class="expense-item" data-id="${expense.id}">
                    <div class="expense-number">${index + 1}</div>
                    <div class="expense-title">
                        <strong>${expense.title}</strong>
                        <br><small style="color: var(--text-secondary);">${date}</small>
                    </div>
                    <div class="category-badge category-${expense.category}">
                        ${category.icon} ${category.name}
                    </div>
                    <div class="expense-amount">£${expense.amount.toFixed(2)}</div>
                    <div class="expense-actions">
                        <button class="btn btn-secondary btn-small" onclick="budgetTracker.editExpense(${expense.id})">
                            <i class="bx bx-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-small" onclick="budgetTracker.deleteExpense(${expense.id})">
                            <i class="bx bx-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.expenseList.innerHTML = expenseHTML;
    }

    updateDisplay() {
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const balance = this.budget - totalExpenses;
        const categoriesUsed = new Set(this.expenses.map(exp => exp.category)).size;

        // Update cards
        this.expensesCard.textContent = `£${totalExpenses.toFixed(2)}`;
        this.balanceCard.textContent = `£${balance.toFixed(2)}`;
        this.categoriesCard.textContent = categoriesUsed.toString();

        // Handle negative balance styling
        if (balance < 0) {
            this.balanceCard.classList.add('negative');
        } else {
            this.balanceCard.classList.remove('negative');
        }
    }

    updateChart() {
        if (this.currentChartType === 'category') {
            this.createCategoryChart();
        } else {
            this.createDailyChart();
        }
    }

    createCategoryChart() {
        const categoryTotals = {};
        
        this.expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const labels = Object.keys(categoryTotals).map(cat => this.categories[cat].name);
        const data = Object.values(categoryTotals);
        const colors = Object.keys(categoryTotals).map(cat => this.categories[cat].color);

        this.renderChart({
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createDailyChart() {
        const dailyTotals = {};
        const last7Days = [];
        
        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr);
            dailyTotals[dateStr] = 0;
        }

        // Aggregate expenses by day
        this.expenses.forEach(expense => {
            const dateStr = expense.date.split('T')[0];
            if (dailyTotals.hasOwnProperty(dateStr)) {
                dailyTotals[dateStr] += expense.amount;
            }
        });

        const labels = last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' }));
        const data = last7Days.map(date => dailyTotals[date]);

        this.renderChart({
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Spending',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '£' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    renderChart(config) {
        const ctx = document.getElementById('expenseChart');
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        this.currentChart = new Chart(ctx, config);
    }

    updateInsights() {
        if (this.expenses.length === 0) {
            this.insightsList.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Add some expenses to see insights!</p>';
            return;
        }

        const insights = this.generateInsights();
        this.insightsList.innerHTML = insights.map(insight => `
            <div style="padding: 0.75rem; background: var(--card-bg); border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid ${insight.color};">
                <strong>${insight.title}</strong>
                <p style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.875rem;">${insight.message}</p>
            </div>
        `).join('');
    }

    generateInsights() {
        const insights = [];
        const totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avgExpense = totalExpenses / this.expenses.length;

        // Budget status insight
        const budgetUsage = (totalExpenses / this.budget) * 100;
        if (budgetUsage > 90) {
            insights.push({
                title: '🚨 Budget Alert',
                message: `You've used ${budgetUsage.toFixed(1)}% of your budget. Consider reducing spending.`,
                color: '#ef4444'
            });
        } else if (budgetUsage > 75) {
            insights.push({
                title: '⚠️ Budget Warning',
                message: `You've used ${budgetUsage.toFixed(1)}% of your budget. Monitor your spending closely.`,
                color: '#f59e0b'
            });
        } else {
            insights.push({
                title: '✅ Budget Status',
                message: `You're doing well! ${budgetUsage.toFixed(1)}% of budget used.`,
                color: '#10b981'
            });
        }

        // Category spending insight
        const categoryTotals = {};
        this.expenses.forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
            const categoryName = this.categories[topCategory[0]].name;
            const percentage = ((topCategory[1] / totalExpenses) * 100).toFixed(1);
            insights.push({
                title: '📊 Top Spending Category',
                message: `${categoryName} accounts for ${percentage}% of your spending (£${topCategory[1].toFixed(2)}).`,
                color: '#3b82f6'
            });
        }

        // Average expense insight
        insights.push({
            title: '💰 Average Expense',
            message: `Your average expense is £${avgExpense.toFixed(2)}. You've made ${this.expenses.length} transactions.`,
            color: '#8b5cf6'
        });

        return insights;
    }

    clearAllExpenses() {
        if (confirm('Are you sure you want to delete ALL expenses? This cannot be undone.')) {
            this.expenses = [];
            this.nextId = 1;
            this.editingId = null;
            this.addExpenseBtn.innerHTML = '<i class="bx bx-plus"></i> <span>Add Expense</span>';
            
            this.renderExpenses();
            this.updateDisplay();
            this.updateChart();
            this.updateInsights();
            this.saveData();
            this.showAlert('All expenses cleared!', 'success');
        }
    }

    exportData() {
        const data = {
            budget: this.budget,
            budgetPeriod: this.budgetPeriod,
            expenses: this.expenses,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `uniwallet-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showAlert('Data exported successfully!', 'success');
    }

    importData() {
        document.getElementById('importFile').click();
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all current data. Are you sure?')) {
                    this.budget = data.budget || 0;
                    this.budgetPeriod = data.budgetPeriod || 'monthly';
                    this.expenses = data.expenses || [];
                    this.nextId = Math.max(...this.expenses.map(exp => exp.id), 0) + 1;
                    
                    this.budgetCard.textContent = `£${this.budget.toFixed(2)}`;
                    this.renderExpenses();
                    this.updateDisplay();
                    this.updateChart();
                    this.updateInsights();
                    this.saveData();
                    
                    this.showAlert(`Imported ${this.expenses.length} expenses successfully!`, 'success');
                }
            } catch (error) {
                this.showAlert('Invalid file format. Please upload a valid JSON file.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

// Chart tab functionality
function showChart(type) {
    budgetTracker.currentChartType = type;
    budgetTracker.updateChart();
    
    document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
}

// Clear all expenses function
function clearAllExpenses() {
    budgetTracker.clearAllExpenses();
}

// Export/Import functions
function exportData() {
    budgetTracker.exportData();
}

function importData() {
    budgetTracker.importData();
}

// Initialize the budget tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.budgetTracker = new AdvancedBudgetTracker();
});// Core budget management system
// Expense CRUD operations
