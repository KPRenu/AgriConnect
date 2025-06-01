// Constants
const API_KEY = 'pub_566dfed814174d649e627e4b781a8b8c';
const BASE_URL = 'https://newsdata.io/api/1/news';
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

// DOM Elements
const newsContainer = document.querySelector('.news-container');
const loginMessage = document.querySelector('.login-message');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const newsGrid = document.getElementById('news-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const marketPrices = document.getElementById('market-prices');
const lastUpdatedTime = document.getElementById('last-updated-time');

// Templates
const newsTemplate = document.getElementById('news-template');
const errorTemplate = document.getElementById('error-template');

// State
let newsArticles = [];
let currentFilter = 'all';
let searchQuery = '';

// Market prices data (fallback)
const marketPricesData = [
    { crop: 'Rice', price: '2000/quintal' },
    { crop: 'Wheat', price: '2200/quintal' },
    { crop: 'Cotton', price: '6500/quintal' },
    { crop: 'Sugarcane', price: '350/quintal' },
    { crop: 'Soybean', price: '4200/quintal' },
    { crop: 'Maize', price: '1800/quintal' }
];

// Check authentication status
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        loginMessage.style.display = 'none';
        newsContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Initialize news manager
        initializeNewsManager();
    } else {
        // User is not logged in
        loginMessage.style.display = 'flex';
        newsContainer.style.display = 'none';
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

// Initialize news manager
function initializeNewsManager() {
    fetchNews();
    displayMarketPrices();
    setupEventListeners();
    startAutoUpdate();
}

// Fetch news from API
async function fetchNews() {
    try {
        showLoading();
        
        // Construct search query
        const keywords = ['agriculture', 'farming', 'crops', 'farmers'];
        if (searchQuery) {
            keywords.push(searchQuery);
        }
        if (currentFilter !== 'all') {
            keywords.push(currentFilter);
        }

        const params = new URLSearchParams({
            apikey: API_KEY,
            country: 'in',
            language: 'en',
            category: 'business,politics',
            q: keywords.join(' OR ')
        });

        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();

        if (data.status === 'success' && data.results?.length > 0) {
            newsArticles = data.results;
            displayNews();
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        showError();
    }
}

// Display news articles
function displayNews() {
    newsGrid.innerHTML = '';
    
    newsArticles.forEach(article => {
        const clone = newsTemplate.content.cloneNode(true);
        
        // Set article image
        const img = clone.querySelector('.news-image img');
        img.src = article.image_url || '../assets/default-news.jpg';
        img.alt = article.title;

        // Set article content
        clone.querySelector('.news-title').textContent = article.title;
        clone.querySelector('.news-source').textContent = article.source_id;
        clone.querySelector('.news-date').textContent = formatDate(article.pubDate);
        clone.querySelector('.news-description').textContent = article.description;
        clone.querySelector('.read-more').href = article.link;

        newsGrid.appendChild(clone);
    });
}

// Display market prices
function displayMarketPrices() {
    marketPrices.innerHTML = marketPricesData.map(item => `
        <div class="market-item">
            <span class="crop-name">${item.crop}</span>
            <span class="crop-price">₹${item.price}</span>
        </div>
    `).join('');

    lastUpdatedTime.textContent = formatDate(new Date());
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
            currentFilter = btn.dataset.category;
            fetchNews();
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
    if (searchQuery) {
        fetchNews();
    }
}

// Show loading state
function showLoading() {
    newsGrid.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading news...</p>
        </div>
    `;
}

// Show error state
function showError() {
    const clone = errorTemplate.content.cloneNode(true);
    newsGrid.innerHTML = '';
    newsGrid.appendChild(clone);

    // Add retry functionality
    const retryBtn = newsGrid.querySelector('.retry-btn');
    retryBtn.addEventListener('click', fetchNews);
}

// Start auto-update
function startAutoUpdate() {
    setInterval(() => {
        fetchNews();
        displayMarketPrices();
    }, UPDATE_INTERVAL);
}

// Format date
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Handle mobile menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
}); 