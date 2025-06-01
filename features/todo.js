// DOM Elements
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const taskDate = document.getElementById('task-date');
const tasksList = document.getElementById('tasks-list');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const filterButtons = document.querySelectorAll('.filter-btn');
const categoryFilter = document.getElementById('category-filter');
const dailyQuote = document.getElementById('daily-quote');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const todoContainer = document.querySelector('.todo-container');

// Check login status and initialize
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        todoContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Initialize todo functionality
        init();
    } else {
        // User is not logged in
        window.location.href = '../login.html';
    }
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = '../home.html';
});

// Mobile menu functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Farming Quotes
const farmingQuotes = [
    "The farmer has to be an optimist, or he wouldn't still be a farmer. - Will Rogers",
    "Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth, good morals & happiness. - Thomas Jefferson",
    "The discovery of agriculture was the first big step toward a civilized life. - Arthur Keith",
    "Agriculture is the most healthful, most useful, and most noble employment of man. - George Washington",
    "Farming looks mighty easy when your plow is a pencil and you're a thousand miles from the corn field. - Dwight D. Eisenhower",
    "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings. - Masanobu Fukuoka",
    "A good farmer is nothing more nor less than a handy man with a sense of humus. - E.B. White",
    "The soil is the great connector of lives, the source and destination of all. - Wendell Berry"
];

// Get tasks from localStorage for current user
function getTasks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    return JSON.parse(localStorage.getItem(`tasks_${currentUser.email}`)) || [];
}

// Save tasks to localStorage for current user
function saveTasks(tasks) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    localStorage.setItem(`tasks_${currentUser.email}`, JSON.stringify(tasks));
}

// Initialize the app
function init() {
    displayRandomQuote();
    tasks = getTasks();
    renderTasks();
    setDefaultDate();
    updateProgress();
}

// Display random quote
function displayRandomQuote() {
    const randomIndex = Math.floor(Math.random() * farmingQuotes.length);
    dailyQuote.textContent = farmingQuotes[randomIndex];
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    taskDate.value = today;
}

// Add new task
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = taskInput.value.trim();
    const category = taskCategory.value;
    const date = taskDate.value;

    if (!title || !category) {
        alert('Please fill in all required fields');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        category,
        date,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks = getTasks();
    tasks.unshift(task);
    saveTasks(tasks);
    renderTasks();
    updateProgress();

    taskForm.reset();
    setDefaultDate();
});

// Render tasks
function renderTasks() {
    const currentFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const currentCategory = categoryFilter.value;

    const filteredTasks = tasks.filter(task => {
        const matchesFilter = currentFilter === 'all' || 
            (currentFilter === 'completed' && task.completed) ||
            (currentFilter === 'pending' && !task.completed);
        
        const matchesCategory = currentCategory === 'all' || task.category === currentCategory;

        return matchesFilter && matchesCategory;
    });

    tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-meta">
                    <span class="task-category">${task.category}</span>
                    <span class="task-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(task.date)}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Toggle task completion
function toggleTask(id) {
    tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks(tasks);
        renderTasks();
        updateProgress();
    }
}

// Delete task
function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = getTasks();
        tasks = tasks.filter(task => task.id !== id);
        saveTasks(tasks);
        renderTasks();
        updateProgress();
    }
}

// Update progress bar
function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% Complete`;
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Filter event listeners
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        button.classList.add('active');
        renderTasks();
    });
});

categoryFilter.addEventListener('change', renderTasks);

// Initialize the app
init(); 