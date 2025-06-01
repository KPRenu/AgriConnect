// DOM Elements
const laborContainer = document.querySelector('.labor-container');
const loginMessage = document.querySelector('.login-message');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const laborGrid = document.getElementById('labor-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const registerLaborBtn = document.getElementById('register-labor-btn');
const viewBookingsBtn = document.getElementById('view-bookings-btn');

// Modals
const registerLaborModal = document.getElementById('register-labor-modal');
const messageModal = document.getElementById('message-modal');
const bookingModal = document.getElementById('booking-modal');
const myBookingsModal = document.getElementById('my-bookings-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// Templates
const laborCardTemplate = document.getElementById('labor-card-template');

// State
let laborers = [];
let currentFilter = 'all';
let searchQuery = '';
let bookings = [];
let messages = {};

// Check authentication status
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        loginMessage.style.display = 'none';
        laborContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Initialize labor connect
        initializeLaborConnect();
    } else {
        // User is not logged in
        loginMessage.style.display = 'flex';
        laborContainer.style.display = 'none';
    }
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = '../home.html';
});

// Handle login redirect
document.querySelector('.login-redirect-btn').addEventListener('click', () => {
    window.location.href = '../login.html';
});

// Initialize labor connect
function initializeLaborConnect() {
    loadUserData();
    loadLaborers();
    setupEventListeners();
}

// Load user data from localStorage
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    bookings = JSON.parse(localStorage.getItem(`bookings_${currentUser.email}`) || '[]');
    messages = JSON.parse(localStorage.getItem(`messages_${currentUser.email}`) || '{}');
}

// Load laborers (mock data for now)
function loadLaborers() {
    // Mock laborers data
    laborers = [
        {
            id: 1,
            name: 'John Doe',
            gender: 'male',
            age: 35,
            location: 'Punjab',
            contact: '+91 9876543210',
            workType: 'plowing',
            experience: 10,
            photo: '../assets/default-avatar.svg',
            rating: 4.5,
            totalJobs: 25,
            available: true
        },
        {
            id: 2,
            name: 'Jane Smith',
            gender: 'female',
            age: 28,
            location: 'Maharashtra',
            contact: '+91 9876543211',
            workType: 'harvesting',
            experience: 5,
            photo: '../assets/default-avatar.svg',
            rating: 4.8,
            totalJobs: 15,
            available: true
        }
        // Add more mock laborers as needed
    ];

    displayLaborers();
}

// Display laborers
function displayLaborers() {
    laborGrid.innerHTML = '';
    
    const filteredLaborers = laborers.filter(laborer => {
        const matchesFilter = currentFilter === 'all' || laborer.workType === currentFilter;
        const matchesSearch = !searchQuery || 
            laborer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            laborer.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            laborer.workType.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    filteredLaborers.forEach(laborer => {
        const clone = laborCardTemplate.content.cloneNode(true);
        
        // Set laborer image
        const img = clone.querySelector('.labor-image img');
        img.src = laborer.photo;
        img.alt = laborer.name;

        // Set availability badge
        const badge = clone.querySelector('.availability-badge');
        if (!laborer.available) {
            badge.classList.add('unavailable');
        }

        // Set laborer content
        clone.querySelector('.labor-name').textContent = laborer.name;
        clone.querySelector('.gender').textContent = laborer.gender;
        clone.querySelector('.age').textContent = `${laborer.age} years`;
        clone.querySelector('.location').textContent = laborer.location;
        clone.querySelector('.work-type').textContent = laborer.workType;
        clone.querySelector('.rating-value').textContent = laborer.rating;
        clone.querySelector('.total-jobs').textContent = `(${laborer.totalJobs} jobs)`;

        // Add event listeners
        const card = clone.querySelector('.labor-card');
        card.dataset.laborerId = laborer.id;

        const messageBtn = clone.querySelector('.message-btn');
        messageBtn.addEventListener('click', () => showMessageModal(laborer));

        const bookBtn = clone.querySelector('.book-btn');
        bookBtn.addEventListener('click', () => showBookingModal(laborer));

        laborGrid.appendChild(clone);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Filter functionality
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            displayLaborers();
        });
    });

    // Modal triggers
    registerLaborBtn.addEventListener('click', () => showModal(registerLaborModal));
    viewBookingsBtn.addEventListener('click', () => {
        showModal(myBookingsModal);
        updateBookingsModal();
    });

    // Close modals
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });

    // Register labor form
    const registerLaborForm = document.getElementById('register-labor-form');
    registerLaborForm.addEventListener('submit', handleRegisterLabor);

    // Booking form
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', handleBooking);

    // Image preview
    const photoInput = document.getElementById('labor-photo');
    photoInput.addEventListener('change', handleImagePreview);

    // Chat input
    const chatInput = document.querySelector('.chat-input input');
    const sendBtn = document.querySelector('.send-btn');
    sendBtn.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            sendMessage(message);
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message) {
                sendMessage(message);
                chatInput.value = '';
            }
        }
    });

    // Booking tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateBookingsModal(btn.dataset.tab);
        });
    });

    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Handle search
function handleSearch() {
    searchQuery = searchInput.value.trim();
    displayLaborers();
}

// Handle register labor
function handleRegisterLabor(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('labor-name').value,
        gender: document.getElementById('labor-gender').value,
        age: parseInt(document.getElementById('labor-age').value),
        location: document.getElementById('labor-location').value,
        contact: document.getElementById('labor-contact').value,
        workType: document.getElementById('labor-work-type').value,
        experience: parseInt(document.getElementById('labor-experience').value),
        photo: '../assets/default-avatar.svg', // Would be handled by file upload in a real implementation
        rating: 0,
        totalJobs: 0,
        available: true
    };

    // Add to laborers (in a real app, this would be an API call)
    formData.id = laborers.length + 1;
    laborers.unshift(formData);

    // Reset form and close modal
    e.target.reset();
    hideModal(registerLaborModal);
    displayLaborers();
    showToast('Registration successful');
}

// Handle booking
function handleBooking(e) {
    e.preventDefault();

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const laborerId = parseInt(bookingModal.dataset.laborerId);
    const laborer = laborers.find(l => l.id === laborerId);

    const booking = {
        id: Date.now(),
        laborerId,
        laborerName: laborer.name,
        laborerPhoto: laborer.photo,
        date: document.getElementById('booking-date').value,
        duration: parseInt(document.getElementById('booking-duration').value),
        details: document.getElementById('booking-details').value,
        location: document.getElementById('booking-location').value,
        status: 'upcoming'
    };

    // Add to bookings
    bookings.unshift(booking);
    saveUserData();

    // Update laborer availability
    laborer.available = false;

    // Reset form and close modal
    e.target.reset();
    hideModal(bookingModal);
    displayLaborers();
    showToast('Booking confirmed');
}

// Show message modal
function showMessageModal(laborer) {
    const modal = messageModal;
    const avatar = modal.querySelector('.chat-avatar');
    const name = modal.querySelector('.chat-name');
    const location = modal.querySelector('.chat-location');
    const messagesContainer = modal.querySelector('.chat-messages');

    avatar.src = laborer.photo;
    name.textContent = laborer.name;
    location.textContent = laborer.location;

    // Load chat history
    const chatHistory = messages[laborer.id] || [];
    messagesContainer.innerHTML = chatHistory.map(msg => `
        <div class="message ${msg.sent ? 'sent' : 'received'}">
            <p>${msg.text}</p>
            <span class="time">${formatTime(msg.time)}</span>
        </div>
    `).join('');

    modal.dataset.laborerId = laborer.id;
    showModal(modal);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show booking modal
function showBookingModal(laborer) {
    const modal = bookingModal;
    modal.dataset.laborerId = laborer.id;
    
    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    showModal(modal);
}

// Update bookings modal
function updateBookingsModal(tab = 'upcoming') {
    const bookingsList = document.querySelector('.bookings-list');
    const filteredBookings = bookings.filter(booking => {
        if (tab === 'upcoming') {
            return booking.status === 'upcoming';
        } else {
            return booking.status === 'completed';
        }
    });

    bookingsList.innerHTML = filteredBookings.map(booking => `
        <div class="booking-item">
            <img src="${booking.laborerPhoto}" alt="${booking.laborerName}">
            <div class="booking-details">
                <h3>${booking.laborerName}</h3>
                <p>Date: ${formatDate(booking.date)}</p>
                <p>Duration: ${booking.duration} days</p>
                <p>Location: ${booking.location}</p>
                <p class="booking-status ${booking.status}">${booking.status}</p>
            </div>
            ${tab === 'upcoming' ? `
                <button class="complete-btn" onclick="completeBooking(${booking.id})">
                    Mark Complete
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Complete booking
function completeBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.status = 'completed';
        
        // Update laborer availability
        const laborer = laborers.find(l => l.id === booking.laborerId);
        if (laborer) {
            laborer.available = true;
            laborer.totalJobs++;
        }

        saveUserData();
        updateBookingsModal();
        displayLaborers();
        showToast('Booking marked as complete');
    }
}

// Send message
function sendMessage(text) {
    const laborerId = parseInt(messageModal.dataset.laborerId);
    if (!messages[laborerId]) {
        messages[laborerId] = [];
    }

    const message = {
        text,
        sent: true,
        time: new Date()
    };

    messages[laborerId].push(message);
    saveUserData();

    // Update chat display
    const messagesContainer = messageModal.querySelector('.chat-messages');
    messagesContainer.innerHTML += `
        <div class="message sent">
            <p>${text}</p>
            <span class="time">${formatTime(message.time)}</span>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulate response (in a real app, this would be handled by the server)
    setTimeout(() => {
        const response = {
            text: 'Thank you for your message. I will get back to you soon.',
            sent: false,
            time: new Date()
        };

        messages[laborerId].push(response);
        saveUserData();

        messagesContainer.innerHTML += `
            <div class="message received">
                <p>${response.text}</p>
                <span class="time">${formatTime(response.time)}</span>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

// Save user data to localStorage
function saveUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    localStorage.setItem(`bookings_${currentUser.email}`, JSON.stringify(bookings));
    localStorage.setItem(`messages_${currentUser.email}`, JSON.stringify(messages));
}

// Handle image preview
function handleImagePreview(e) {
    const preview = document.querySelector('.image-preview');
    preview.innerHTML = '';
    
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
}

// Utility functions
function showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatTime(date) {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleTimeString(undefined, options);
}

// Handle mobile menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
}); 