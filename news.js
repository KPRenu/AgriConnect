// Constants
const API_KEY = 'b4292dbe385a7a138f3714d2611b2dbb'; // Replace with your GNews API key
const BASE_URL = 'https://gnews.io/api/v4/search';
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

// DOM Elements
const newsContainer = document.getElementById('news-container');
const loginMessageContainer = document.getElementById('login-message-container');
const newsGrid = document.getElementById('news-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const marketPricesEl = document.getElementById('market-prices');
const lastUpdatedTimeEl = document.getElementById('last-updated-time');
const newsTemplate = document.getElementById('news-template');
const errorTemplate = document.getElementById('error-template');

// Navbar elements
const loginButton = document.getElementById('nav-login-btn');
const profileDropdown = document.getElementById('nav-profile-dropdown');
const profileNameNav = document.getElementById('nav-profile-name');
const profileImageNav = document.getElementById('nav-profile-image');
const logoutButton = document.getElementById('nav-logout-btn');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

// State
let newsArticles = [];
let currentFilter = 'all';
let searchQuery = '';

// --- INITIALIZATION & AUTHENTICATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
        await setupAuthenticatedView(session);
        initializeNewsManager();
    } else {
        setupGuestView();
    }
    setupGlobalEventListeners();
});

function setupGuestView() {
    newsContainer.style.display = 'none';
    loginMessageContainer.style.display = 'flex';
    loginButton.style.display = 'flex';
    profileDropdown.style.display = 'none';
}

async function setupAuthenticatedView(session) {
    newsContainer.style.display = 'block';
    loginMessageContainer.style.display = 'none';
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

function initializeNewsManager() {
    fetchNews();
    displayStaticData();
    setupFeatureEventListeners();
    setInterval(fetchNews, UPDATE_INTERVAL);
}


// --- NEWS FETCHING & DISPLAY ---
async function fetchNews() {
    showLoading();
    const query = searchQuery || { all: 'agriculture', schemes: 'agriculture government schemes', market: 'agricultural market prices', climate: 'agriculture climate weather' }[currentFilter];
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&lang=en&country=in&max=10&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        newsArticles = data.articles;
        displayNews();
    } catch (error) {
        console.error('Error fetching news:', error);
        showError('Could not fetch news. Please check your connection or try again later.');
    }
}

function displayNews() {
    newsGrid.innerHTML = '';
    if (!newsArticles || newsArticles.length === 0) {
        newsGrid.innerHTML = '<p>No articles found for this topic.</p>';
        return;
    }

    newsArticles.forEach(article => {
        const card = newsTemplate.content.cloneNode(true);
        const img = card.querySelector('.news-image img');
        img.src = article.image || '../assets/default-news.jpg'; // Fallback image
        img.alt = article.title;
        img.onerror = () => { img.src = '../assets/default-news.jpg'; };

        card.querySelector('.news-title').textContent = article.title;
        card.querySelector('.news-source').textContent = article.source.name;
        card.querySelector('.news-date').textContent = formatDate(article.publishedAt);
        card.querySelector('.news-description').textContent = article.description;
        card.querySelector('.read-more').href = article.url;
        newsGrid.appendChild(card);
    });
}

// --- STATIC & SIDEBAR DATA ---
function displayStaticData() {
    // Mock data for schemes and market prices
    const schemes = [
        { title: 'PM-KISAN', desc: 'Direct income support of ₹6,000/year.' },
        { title: 'PM Fasal Bima Yojana', desc: 'Crop insurance scheme.' },
        { title: 'Kisan Credit Card', desc: 'Easy credit access.' },
    ];
    const market = [
        { crop: 'Wheat', price: '₹2200/q', change: '+1.8%', dir: 'positive' },
        { crop: 'Cotton', price: '₹6500/q', change: '-0.5%', dir: 'negative' },
        { crop: 'Soybean', price: '₹4200/q', change: '+1.2%', dir: 'positive' },
    ];

    document.getElementById('schemes-container').innerHTML = schemes.map(s => `
        <div class="scheme-card"><h4>${s.title}</h4><p>${s.desc}</p></div>
    `).join('');

    marketPricesEl.innerHTML = market.map(m => `
        <div class="market-item">
            <span class="crop-name">${m.crop}</span>
            <span class="crop-change ${m.dir}">${m.change}</span>
            <span class="crop-price">${m.price}</span>
        </div>
    `).join('');
    lastUpdatedTimeEl.textContent = new Date().toLocaleTimeString();
}

// --- EVENT LISTENERS ---
function setupGlobalEventListeners() {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        document.querySelector('.auth-buttons').classList.toggle('active');
    });
    if (logoutButton) {
        logoutButton.addEventListener('click', e => { e.preventDefault(); logout(); });
    }
}

function setupFeatureEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
    searchInput.addEventListener('input', () => { clearSearchBtn.style.display = searchInput.value ? 'block' : 'none'; });
    clearSearchBtn.addEventListener('click', clearSearch);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.category;
            searchQuery = ''; // Clear search when a filter is clicked
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            fetchNews();
        });
    });
}

// --- HANDLERS & HELPERS ---
function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
        searchQuery = query;
        currentFilter = 'all'; // Reset filter when searching
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.category === 'all'));
        fetchNews();
    }
}

function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    currentFilter = 'all'; // Reset to default filter
    filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.category === 'all'));
    fetchNews();
}

function showLoading() {
    newsGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading news...</p></div>`;
}

function showError(message) {
    const errorEl = errorTemplate.content.cloneNode(true);
    errorEl.querySelector('p').textContent = message;
    errorEl.querySelector('.retry-btn').addEventListener('click', fetchNews);
    newsGrid.innerHTML = '';
    newsGrid.appendChild(errorEl);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}