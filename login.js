// Supabase initialization
const SUPABASE_URL = 'https://okfimwkadvpsuxtmddxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmltd2thZHZwc3V4dG1kZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjIzOTksImV4cCI6MjA2NTAzODM5OX0.CA1aBCuesKxcoePUOA6P_yd1QWkQH-3CAA2JD_buQnY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginSection = document.querySelector('.login-section');
const signupSection = document.querySelector('.signup-section');
const forgotSection = document.querySelector('.forgot-section');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const authMessage = document.getElementById('authMessage');

// Input fields
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const signupFullNameInput = document.getElementById('signupFullName');
const signupEmailInput = document.getElementById('signupEmail');
const signupPasswordInput = document.getElementById('signupPassword');
const signupConfirmPasswordInput = document.getElementById('signupConfirmPassword');
const forgotEmailInput = document.getElementById('forgotEmail');

// Helper to display messages
const showMessage = (message, isSuccess = false) => {
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = 'auth-message'; // Reset class
        if (isSuccess) {
            authMessage.classList.add('success');
        } else {
            authMessage.classList.remove('success'); // Ensure it's red for errors
        }
    }
};

// Form switching
document.getElementById('showSignup').addEventListener('click', (e) => {
    console.log('showSignup link clicked');
    e.preventDefault();
    loginSection.classList.remove('show');
    signupSection.classList.add('show');
    forgotSection.classList.remove('show');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    console.log('showLogin link clicked');
    e.preventDefault();
    loginSection.classList.add('show');
    signupSection.classList.remove('show');
    forgotSection.classList.remove('show');
});

document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    console.log('forgotPasswordLink clicked');
    e.preventDefault();
    loginSection.classList.remove('show');
    signupSection.classList.remove('show');
    forgotSection.classList.add('show');
});

document.getElementById('backToLogin').addEventListener('click', (e) => {
    console.log('backToLogin link clicked');
    e.preventDefault();
    loginSection.classList.add('show');
    signupSection.classList.remove('show');
    forgotSection.classList.remove('show');
});

// Session Check on Load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // If user is already logged in and on login page, redirect to home
        if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('login')) {
             window.location.href = 'home.html';
        }
    }
});

// Form submission handling
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage(''); // Clear previous messages
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage(`Login error: ${error.message}`);
        console.error('Login error:', error);
    } else if (data.user && data.session) {
        // Login successful
        window.location.href = 'home.html';
    } else {
        showMessage('An unexpected error occurred during login.');
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage(''); // Clear previous messages
    const fullName = signupFullNameInput.value;
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    const confirmPassword = signupConfirmPasswordInput.value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName // This will be used by the trigger to populate profiles table
            }
        }
    });

    if (error) {
        showMessage(`Signup error: ${error.message}`);
        console.error('Signup error:', error);
    } else if (data.user && !data.session) {
        // User signed up, email confirmation required
        showMessage('Signup successful! Please check your email to verify your account.', true);
    } else if (data.user && data.session) {
        // User signed up and logged in (e.g. if email confirmation is disabled by default or auto confirmed)
        showMessage('Signup successful! Redirecting...', true);
        // The trigger handle_new_user should have created a profile.
        // Redirect to home or a welcome page
        window.location.href = 'home.html';
    } else {
        // Fallback, this case might indicate an issue or a specific flow like email confirmation pending
        showMessage('Signup process initiated. Please check your email for next steps.', true);
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage(''); // Clear previous messages
    const email = forgotEmailInput.value;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
        showMessage(`Password reset error: ${error.message}`);
        console.error('Password reset error:', error);
    } else {
        showMessage('If an account exists for this email, a password reset link has been sent.', true);
        // Optionally switch back to login form
        // loginSection.classList.add('show');
        // signupSection.classList.remove('show');
        // forgotSection.classList.remove('show');
    }
});

// Google Sign In (Placeholder - requires further Supabase provider setup)
document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showMessage('Google Sign In is not yet implemented with Supabase.');
        // To implement Google Sign In with Supabase:
        // 1. Enable Google Auth Provider in your Supabase project settings.
        // 2. Add the necessary client ID and secret.
        // 3. Use supabase.auth.signInWithOAuth({ provider: 'google' });
    });
});

// Update home.js to handle the login state
const updateHomePageUI = () => {
    const { data: { session } } = supabase.auth.getSession();
    const loginBtn = document.getElementById('nav-login-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileName = document.querySelector('.profile-name');

    if (session) {
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = session.user.user_metadata.full_name;
    } else {
        loginBtn.style.display = 'block';
        profileDropdown.style.display = 'none';
    }
};