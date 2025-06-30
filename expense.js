// DOM Elements
const financeContainer = document.getElementById('finance-container');
const loginMessageContainer = document.getElementById('login-message-container');
const financeQuote = document.getElementById('finance-quote');
const transactionForm = document.getElementById('transaction-form');
const editForm = document.getElementById('edit-form');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const notesInput = document.getElementById('notes');
const transactionsList = document.getElementById('transactions-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterDate = document.getElementById('filter-date');
const resetFilterBtn = document.getElementById('reset-filter');
const modal = document.getElementById('edit-modal');
const closeModalBtn = document.querySelector('.close-btn');
const deleteBtn = document.getElementById('delete-transaction');

// Navbar elements
const loginButton = document.getElementById('nav-login-btn');
const profileDropdown = document.getElementById('nav-profile-dropdown');
const profileNameNav = document.getElementById('nav-profile-name');
const profileImageNav = document.getElementById('nav-profile-image');
const logoutButton = document.getElementById('nav-logout-btn');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

// App State
let transactions = [];
let currentEditId = null;
let currentUser = null;
let expenseChart = null;
let incomeChart = null;

const financialQuotes = ["A farmer is always going to be rich next year.", "The best time to plant a tree was 20 years ago. The second best time is now.", "Agriculture is our wisest pursuit.", "Money grows like crops, but you've got to plant the seeds first."];
const categories = {
    income: ['Crop Sales', 'Livestock Sales', 'Subsidies', 'Equipment Rental', 'Other'],
    expense: ['Seeds', 'Fertilizer', 'Pesticides', 'Labor', 'Equipment', 'Fuel', 'Other']
};

// --- AUTHENTICATION & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error);
        showLoggedOutState();
        return;
    }

    if (session && session.user) {
        currentUser = session.user;
        await showLoggedInState(session);
        initializeFinanceManager();
    } else {
        showLoggedOutState();
    }
    setupGlobalEventListeners();
});

function showLoggedOutState() {
    loginMessageContainer.style.display = 'flex';
    financeContainer.style.display = 'none';
    loginButton.style.display = 'flex';
    profileDropdown.style.display = 'none';
}

async function showLoggedInState(session) {
    loginMessageContainer.style.display = 'none';
    financeContainer.style.display = 'block';
    loginButton.style.display = 'none';
    profileDropdown.style.display = 'flex';

    const profile = await getCurrentUserProfile();
    if (profile) {
        profileNameNav.textContent = profile.full_name || session.user.email;
        profileImageNav.src = profile.avatar_url || '../assets/default-avatar.svg';
    } else {
        profileNameNav.textContent = session.user.email;
    }
}

function initializeFinanceManager() {
    loadTransactions();
    displayRandomQuote();
    setDefaultDate();
    updateCategoryOptions();
    renderAll();
    setupFeatureEventListeners();
}

// --- DATA HANDLING ---
function loadTransactions() {
    if (!currentUser) return;
    transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
}

function saveTransactions() {
    if (!currentUser) return;
    localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
}

// --- UI & RENDERING ---
function renderAll() {
    renderTransactions();
    updateTotals();
    updateCharts();
}

function renderTransactions() {
    const filtered = filterTransactions();
    transactionsList.innerHTML = filtered.map(t => `
        <div class="transaction-item" onclick="openEditModal(${t.id})">
            <div class="transaction-icon ${t.type}"><i class="fas fa-${t.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i></div>
            <div class="transaction-details">
                <h4 class="transaction-title">${t.category}</h4>
                <div class="transaction-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(t.date)}</span>
                    ${t.notes ? `<span><i class="fas fa-comment"></i> ${t.notes}</span>` : ''}
                </div>
            </div>
            <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}</div>
        </div>
    `).join('') || '<p style="text-align:center; color:#888;">No transactions found.</p>';
}

function updateTotals() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    totalIncomeEl.textContent = income.toFixed(2);
    totalExpenseEl.textContent = expense.toFixed(2);
    totalBalanceEl.textContent = (income - expense).toFixed(2);
}

function updateCharts() {
    // Expense Chart
    const expenseCtx = document.getElementById('expense-chart').getContext('2d');
    const expenseData = groupDataByCategory(transactions, 'expense');
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(expenseCtx, createChartConfig('pie', expenseData, 'Expense Distribution'));

    // Income Chart
    const incomeCtx = document.getElementById('income-chart').getContext('2d');
    const incomeData = groupDataByCategory(transactions, 'income');
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(incomeCtx, createChartConfig('pie', incomeData, 'Income Sources'));
}

// --- EVENT LISTENERS ---
function setupGlobalEventListeners() {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        document.querySelector('.auth-buttons').classList.toggle('active');
    });

    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        logout(); // From auth.js
    });
}

function setupFeatureEventListeners() {
    transactionForm.addEventListener('submit', addTransaction);
    editForm.addEventListener('submit', saveEditedTransaction);
    deleteBtn.addEventListener('click', deleteTransaction);
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    typeSelect.addEventListener('change', () => updateCategoryOptions());
    document.getElementById('edit-type').addEventListener('change', (e) => updateCategoryOptions(e.target.value, document.getElementById('edit-category')));
    [filterType, filterCategory, filterDate].forEach(el => el.addEventListener('change', renderTransactions));
    resetFilterBtn.addEventListener('click', resetAllTransactions);
}

// --- CORE FUNCTIONALITY ---
function addTransaction(e) {
    e.preventDefault();
    if (!amountInput.value || !categorySelect.value) {
        alert('Please fill in amount and category.');
        return;
    }
    const newTransaction = {
        id: Date.now(),
        amount: parseFloat(amountInput.value),
        type: typeSelect.value,
        category: categorySelect.value,
        date: dateInput.value,
        notes: notesInput.value.trim()
    };
    transactions.unshift(newTransaction);
    saveAndRender();
    transactionForm.reset();
    setDefaultDate();
}

function openEditModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    currentEditId = id;

    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-type').value = transaction.type;
    updateCategoryOptions(transaction.type, document.getElementById('edit-category'));
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-date').value = transaction.date;
    document.getElementById('edit-notes').value = transaction.notes;

    modal.classList.add('active');
}

function saveEditedTransaction(e) {
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
    saveAndRender();
    modal.classList.remove('active');
}

function deleteTransaction() {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    transactions = transactions.filter(t => t.id !== currentEditId);
    saveAndRender();
    modal.classList.remove('active');
}

function resetAllTransactions() {
    if (!confirm('DANGER! This will delete ALL transactions for your account. Are you absolutely sure?')) return;
    transactions = [];
    saveAndRender();
}

// --- HELPERS ---
function saveAndRender() {
    saveTransactions();
    renderAll();
}

function filterTransactions() {
    return transactions.filter(t =>
        (filterType.value === 'all' || t.type === filterType.value) &&
        (filterCategory.value === 'all' || t.category === filterCategory.value) &&
        (!filterDate.value || t.date === filterDate.value)
    );
}

function groupDataByCategory(data, type) {
    const filtered = data.filter(t => t.type === type);
    const grouped = filtered.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
    return {
        labels: Object.keys(grouped),
        data: Object.values(grouped)
    };
}

function createChartConfig(type, data, title) {
    return {
        type: type,
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: ['#4CAF50', '#f44336', '#2196F3', '#ff9800', '#9c27b0', '#cddc39', '#00bcd4']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' }, title: { display: true, text: title } }
        }
    };
}

function updateCategoryOptions(type = typeSelect.value, element = categorySelect) {
    const options = categories[type] || [];
    element.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    updateFilterCategoryOptions();
}

function updateFilterCategoryOptions() {
    const allCats = [...new Set([...categories.income, ...categories.expense])];
    filterCategory.innerHTML = '<option value="all">All Categories</option>' +
        allCats.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

function displayRandomQuote() {
    financeQuote.textContent = financialQuotes[Math.floor(Math.random() * financialQuotes.length)];
}

function setDefaultDate() {
    dateInput.value = new Date().toISOString().split('T')[0];
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-IN', options);
}