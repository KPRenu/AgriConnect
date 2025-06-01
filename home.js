// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links a');
const ctaButton = document.querySelector('.cta-button');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking on a nav link
navLinksItems.forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to nav links on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 60) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Add scroll padding for fixed header
document.documentElement.style.setProperty(
    '--scroll-padding',
    document.querySelector('.navbar').offsetHeight + 'px'
); 


  fetch('navbar.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('navbar-placeholder').innerHTML = data;
    });

// Login button click handler
document.getElementById('nav-login-btn').addEventListener('click', () => {
    window.location.href = 'login.html';
});

// Get Started button click handler
if (ctaButton) {
    ctaButton.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// Logout button click handler
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    updateHomePageUI();
});

// Profile dropdown toggle
const profileTrigger = document.querySelector('.profile-trigger');
const dropdownContent = document.querySelector('.dropdown-content');

if (profileTrigger) {
    profileTrigger.addEventListener('click', () => {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileTrigger?.contains(e.target)) {
        dropdownContent.style.display = 'none';
    }
});

// Initialize UI based on login state
const updateHomePageUI = () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.getElementById('nav-login-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileName = document.querySelector('.profile-name');
    const ctaButton = document.querySelector('.cta-button');

    if (currentUser) {
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        if (ctaButton) {
            ctaButton.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'block';
        profileDropdown.style.display = 'none';
        if (ctaButton) {
            ctaButton.style.display = 'block';
        }
    }
};

// Call updateHomePageUI when the page loads
document.addEventListener('DOMContentLoaded', updateHomePageUI);
