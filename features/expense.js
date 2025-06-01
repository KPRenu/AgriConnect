// DOM Elements
const financeQuote = document.getElementById('finance-quote');
const transactionForm = document.getElementById('transaction-form');
const editForm = document.getElementById('edit-form');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const category = document.getElementById('category');
const date = document.getElementById('date');
const notes = document.getElementById('notes');
const transactionsList = document.getElementById('transactions-list');
const totalBalance = document.getElementById('total-balance');
const totalIncome = document.getElementById('total-income');
const totalExpense = document.getElementById('total-expense');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterDate = document.getElementById('filter-date');
const resetFilter = document.getElementById('reset-filter');
const modal = document.getElementById('edit-modal');
const closeModal = document.querySelector('.close-btn');
const deleteBtn = document.getElementById('delete-transaction');
const financeContainer = document.querySelector('.finance-container');
const loginMessage = document.querySelector('.login-message');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const loginRedirectBtn = document.querySelector('.login-redirect-btn');

// Mobile menu functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Financial Quotes
const financialQuotes = [
    "A farmer is always going to be rich next year. - Philemon",
    "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
    "Farming looks mighty easy when your plow is a pencil and you're a thousand miles from the corn field. - Dwight D. Eisenhower",
    "The discovery of agriculture was the first big step toward a civilized life. - Arthur Keith",
    "Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth, good morals & happiness. - Thomas Jefferson",
    "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings. - Masanobu Fukuoka",
    "Money grows like crops, but you've got to plant the seeds. - Zig Ziglar",
    "Good farmers, who take seriously their duties as stewards of Creation and of their land's inheritors, contribute to the welfare of society in more ways than society usually acknowledges. - Wendell Berry"
];

// Categories
const categories = {
    income: [
        'Crop Sales',
        'Livestock Sales',
        'Government Subsidies',
        'Equipment Rental',
        'Other Income'
    ],
    expense: [
        'Seeds',
        'Fertilizers',
        'Pesticides',
        'Labor',
        'Equipment',
        'Irrigation',
        'Maintenance',
        'Fuel',
        'Transportation',
        'Other Expenses'
    ]
};

// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentEditId = null;

// Check authentication status
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        loginMessage.style.display = 'none';
        financeContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Initialize finance manager
        initializeFinanceManager();
    } else {
        // User is not logged in
        loginMessage.style.display = 'flex';
        financeContainer.style.display = 'none';
    }
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = '../home.html';
});

// Handle login redirect
loginRedirectBtn.addEventListener('click', () => {
    window.location.href = '../login.html';
});

// Initialize finance manager
function initializeFinanceManager() {
    // Your existing initialization code here
    loadTransactions();
    updateBalances();
    initializeCharts();
    setupEventListeners();
    loadFinanceQuote();
}

// Initialize the app
function init() {
    displayRandomQuote();
    setDefaultDate();
    updateCategoryOptions();
    renderTransactions();
    updateCharts();
    updateTotals();
}

// Display random quote
function displayRandomQuote() {
    const randomIndex = Math.floor(Math.random() * financialQuotes.length);
    financeQuote.textContent = financialQuotes[randomIndex];
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    date.value = today;
    filterDate.value = '';
}

// Update category options based on type
function updateCategoryOptions(selectedType = type.value) {
    const options = categories[selectedType];
    category.innerHTML = '<option value="">Select Category</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    
    // Update filter categories
    const allCategories = [...categories.income, ...categories.expense];
    filterCategory.innerHTML = '<option value="all">All Categories</option>' +
        allCategories.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

// Add new transaction
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const transaction = {
        id: Date.now(),
        amount: parseFloat(amount.value),
        type: type.value,
        category: category.value,
        date: date.value,
        notes: notes.value.trim(),
        createdAt: new Date().toISOString()
    };

    transactions.unshift(transaction);
    saveTransactions();
    renderTransactions();
    updateCharts();
    updateTotals();

    transactionForm.reset();
    setDefaultDate();
});

// Render transactions
function renderTransactions() {
    const filteredTransactions = filterTransactions();
    
    transactionsList.innerHTML = filteredTransactions.map(transaction => `
        <div class="transaction-item" onclick="openEditModal(${transaction.id})">
            <div class="transaction-icon ${transaction.type}">
                <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
            </div>
            <div class="transaction-details">
                <h4 class="transaction-title">${transaction.category}</h4>
                <div class="transaction-meta">
                    <span>
                        <i class="fas fa-calendar"></i>
                        ${formatDate(transaction.date)}
                    </span>
                    ${transaction.notes ? `
                        <span>
                            <i class="fas fa-comment"></i>
                            ${transaction.notes}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
            </div>
        </div>
    `).join('');
}

// Filter transactions
function filterTransactions() {
    return transactions.filter(transaction => {
        const typeMatch = filterType.value === 'all' || transaction.type === filterType.value;
        const categoryMatch = filterCategory.value === 'all' || transaction.category === filterCategory.value;
        const dateMatch = !filterDate.value || transaction.date === filterDate.value;
        return typeMatch && categoryMatch && dateMatch;
    });
}

// Update totals
function updateTotals() {
    const totals = transactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
            acc.income += transaction.amount;
        } else {
            acc.expense += transaction.amount;
        }
        return acc;
    }, { income: 0, expense: 0 });

    const balance = totals.income - totals.expense;

    totalIncome.textContent = totals.income.toFixed(2);
    totalExpense.textContent = totals.expense.toFixed(2);
    totalBalance.textContent = balance.toFixed(2);
}

// Update charts
function updateCharts() {
    updateExpenseChart();
    updateIncomeChart();
}

// Update expense chart
function updateExpenseChart() {
    const expenseData = categories.expense.map(cat => ({
        category: cat,
        amount: transactions
            .filter(t => t.type === 'expense' && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0)
    })).filter(d => d.amount > 0);

    const ctx = document.getElementById('expense-chart').getContext('2d');
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }

    window.expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: expenseData.map(d => d.category),
            datasets: [{
                data: expenseData.map(d => d.amount),
                backgroundColor: [
                    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
                    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
                    '#009688', '#4caf50'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update income chart
function updateIncomeChart() {
    const incomeData = categories.income.map(cat => ({
        category: cat,
        amount: transactions
            .filter(t => t.type === 'income' && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0)
    })).filter(d => d.amount > 0);

    const ctx = document.getElementById('income-chart').getContext('2d');
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }

    window.incomeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: incomeData.map(d => d.category),
            datasets: [{
                data: incomeData.map(d => d.amount),
                backgroundColor: [
                    '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Open edit modal
function openEditModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    currentEditId = id;
    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-type').value = transaction.type;
    updateEditCategoryOptions(transaction.type);
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-date').value = transaction.date;
    document.getElementById('edit-notes').value = transaction.notes;

    modal.classList.add('active');
}

// Update edit form category options
function updateEditCategoryOptions(selectedType) {
    const editCategory = document.getElementById('edit-category');
    const options = categories[selectedType];
    editCategory.innerHTML = '<option value="">Select Category</option>' +
        options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

// Close modal
closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    currentEditId = null;
});

// Save edited transaction
editForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const index = transactions.findIndex(t => t.id === currentEditId);
    if (index === -1) return;

    transactions[index] = {
        ...transactions[index],
        amount: parseFloat(document.getElementById('edit-amount').value),
        type: document.getElementById('edit-type').value,
        category: document.getElementById('edit-category').value,
        date: document.getElementById('edit-date').value,
        notes: document.getElementById('edit-notes').value.trim()
    };

    saveTransactions();
    renderTransactions();
    updateCharts();
    updateTotals();
    modal.classList.remove('active');
});

// Delete transaction
deleteBtn.addEventListener('click', () => {
    if (!currentEditId) return;
    
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== currentEditId);
        saveTransactions();
        renderTransactions();
        updateCharts();
        updateTotals();
        modal.classList.remove('active');
    }
});

// Filter event listeners
filterType.addEventListener('change', renderTransactions);
filterCategory.addEventListener('change', renderTransactions);
filterDate.addEventListener('change', renderTransactions);
resetFilter.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
        // Clear all transactions
        transactions = [];
        saveTransactions();
        
        // Reset filters
        filterType.value = 'all';
        filterCategory.value = 'all';
        filterDate.value = '';
        
        // Update UI
        renderTransactions();
        updateCharts();
        updateTotals();
        
        // Show success message
        alert('All transactions have been deleted successfully.');
    }
});

// Type change handlers
type.addEventListener('change', () => updateCategoryOptions(type.value));
document.getElementById('edit-type').addEventListener('change', (e) => {
    updateEditCategoryOptions(e.target.value);
});

// Save transactions to localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Initialize the app
init(); 