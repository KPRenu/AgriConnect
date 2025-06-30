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


// Get Started button click handler
if (ctaButton) {
    ctaButton.addEventListener('click', () => {
        // Redirect to login or a specific page, Supabase auth will handle if already logged in
        window.location.href = 'login.html'; 
    });
}

// Profile dropdown toggle logic (if still needed and not fully covered by home.html inline script)
// Note: The inline script in home.html now handles visibility based on login state.
// This part might be for additional toggle behavior if the dropdown is complex.
const profileTrigger = document.querySelector('.profile-trigger');
const dropdownContent = document.querySelector('.dropdown-content');

if (profileTrigger && dropdownContent) { // Ensure elements exist
    profileTrigger.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click from immediately closing due to document listener
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        // Check if the click is outside the trigger and outside the dropdown content itself
        if (profileTrigger && dropdownContent && !profileTrigger.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });
}

// The main UI updates based on login state are now handled by the inline script in home.html
// using requireAuth() and getUserProfile() from auth.js.
// Old updateHomePageUI and related localStorage logic have been removed.
