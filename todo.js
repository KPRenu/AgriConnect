// Global state
let tasks = [];
let currentUser = null;

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

// Farming Quotes
const farmingQuotes = [
    "The farmer has to be an optimist, or he wouldn't still be a farmer. - Will Rogers",
    "Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth, good morals & happiness. - Thomas Jefferson",
    "To be a farmer is to be a student forever, for there is no end to the lessons the land can teach. - Unknown",
    "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings. - Masanobu Fukuoka"
];

// --- SUPABASE CRUD FUNCTIONS ---
async function getTasks() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        tasks = data;
        renderTasks();
        updateProgress();
    } catch (error) {
        console.error("Error fetching tasks:", error);
        tasksList.innerHTML = '<p class="loading-tasks">Could not load tasks.</p>';
    }
}

async function addTask(taskData) {
    try {
        const { data, error } = await supabase
            .from('todos')
            .insert([taskData])
            .select();
        if (error) throw error;
        tasks.unshift(data[0]);
        renderTasks();
        updateProgress();
    } catch (error) {
        console.error("Error adding task:", error);
    }
}

async function toggleTaskStatus(id, completed) {
    try {
        const { error } = await supabase
            .from('todos')
            .update({ completed: completed })
            .eq('id', id);
        if (error) throw error;
        const task = tasks.find(t => t.id === id);
        if(task) task.completed = completed;
        renderTasks();
        updateProgress();
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

async function deleteTask(id) {
    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);
        if (error) throw error;
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        updateProgress();
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// --- UI AND EVENT FUNCTIONS ---
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

    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p class="loading-tasks">No tasks found. Add one above!</p>';
        return;
    }

    tasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-meta">
                    <span class="task-category">${task.category}</span>
                    <span class="task-date">
                        <i class="fas fa-calendar"></i>
                        ${new Date(task.due_date).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% Complete`;
}

// Event Delegation for task actions
tasksList.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    const taskId = parseInt(taskItem.dataset.id, 10);

    if (e.target.closest('.task-checkbox')) {
        const isCompleted = !taskItem.classList.contains('completed');
        toggleTaskStatus(taskId, isCompleted);
    }
    if (e.target.closest('.delete-btn')) {
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId);
        }
    }
});

// Form submission
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskData = {
        user_id: currentUser.id,
        title: taskInput.value.trim(),
        category: taskCategory.value,
        due_date: taskDate.value,
        completed: false
    };
    addTask(taskData);
    taskForm.reset();
    setDefaultDate();
});

// Filter event listeners
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        button.classList.add('active');
        renderTasks();
    });
});
categoryFilter.addEventListener('change', renderTasks);

// Set default date to today for the input
function setDefaultDate() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    taskDate.value = today.toISOString().split('T')[0];
}

// Display random quote
function displayRandomQuote() {
    const randomIndex = Math.floor(Math.random() * farmingQuotes.length);
    dailyQuote.textContent = farmingQuotes[randomIndex];
}

// --- INITIALIZATION ---
async function initializeApp() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        displayRandomQuote();
        setDefaultDate();
        await getTasks(); // Fetch tasks from Supabase
    } else {
        console.error("Initialization failed: User not found.");
        tasksList.innerHTML = '<p class="loading-tasks">Authentication error. Please refresh.</p>';
    }
}

// --- NAVBAR JAVASCRIPT ---
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const profileTrigger = document.querySelector('.profile-trigger');
const dropdownContent = document.querySelector('.dropdown-content');
const logoutBtn = document.getElementById('nav-logout-btn');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));
}

if (profileTrigger && dropdownContent) {
    profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
}

if(logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout(); // From auth.js
    });
}

document.addEventListener('click', (e) => {
    if (profileTrigger && dropdownContent && !profileTrigger.contains(e.target) && !dropdownContent.contains(e.target)) {
        dropdownContent.style.display = 'none';
    }
});