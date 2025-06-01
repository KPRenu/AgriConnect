// DOM Elements
const loginSection = document.querySelector('.login-section');
const signupSection = document.querySelector('.signup-section');
const forgotSection = document.querySelector('.forgot-section');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');

// Form switching
document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.remove('show');
    signupSection.classList.add('show');
    forgotSection.classList.remove('show');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('show');
    signupSection.classList.remove('show');
    forgotSection.classList.remove('show');
});

document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.remove('show');
    signupSection.classList.remove('show');
    forgotSection.classList.add('show');
});

document.getElementById('backToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('show');
    signupSection.classList.remove('show');
    forgotSection.classList.remove('show');
});

// Form submission handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
        // Here you would typically make an API call to your backend
        // For demo purposes, we'll use localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'home.html';
        } else {
            alert('Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = signupForm.querySelector('input[type="text"]').value;
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = signupForm.querySelectorAll('input[type="password"]')[1].value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        // For demo purposes, using localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            alert('Email already exists');
            return;
        }

        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup');
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotPasswordForm.querySelector('input[type="email"]').value;

    // For demo purposes, just show an alert
    alert('Password reset link has been sent to your email');
    loginSection.classList.add('show');
    forgotSection.classList.remove('show');
});

// Google Sign In (Mock)
document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('Google Sign In functionality would be implemented here');
    });
});

// Update home.js to handle the login state
const updateHomePageUI = () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.getElementById('nav-login-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileName = document.querySelector('.profile-name');

    if (currentUser) {
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
    } else {
        loginBtn.style.display = 'block';
        profileDropdown.style.display = 'none';
    }
}; 