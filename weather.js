// --- API Configuration ---
// IMPORTANT: Replace the placeholder with your actual API key from WeatherAPI.com
const API_KEY = '3465d634a77f4a77b11174052253006'; 
const FORECAST_BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

// --- DOM Elements ---
const loginMessageContainer = document.getElementById('login-message-container');
const mainContentContainer = document.getElementById('main-content-container');
const searchInput = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');
const recentList = document.getElementById('recent-list');
const loadingSpinner = document.querySelector('.loading-spinner');
const errorMessage = document.getElementById('error-message');
const weatherDetailsWrapper = document.getElementById('weather-details-wrapper');
const refreshSuggestionsBtn = document.getElementById('refresh-suggestions-btn');
const hourlyContainer = document.getElementById('hourly-container');
const scrollLeftBtn = document.querySelector('.scroll-left');
const scrollRightBtn = document.querySelector('.scroll-right');

// --- State ---
let recentSearches = JSON.parse(localStorage.getItem('weatherRecentSearches') || '[]');
let currentWeatherData = null;

// --- CROP SUGGESTION DATA ---
const cropSuggestions = {
    Tropical: {
        Clear: {
            hot: [{ name: 'Cassava', icon: '🥔', description: 'Drought-resistant', season: 'Year-round' }, { name: 'Sugarcane', icon: '🎋', description: 'Loves sun', season: 'Year-round' }, { name: 'Mango', icon: '🥭', description: 'Popular tropical fruit', season: 'Spring-Summer' }],
            warm: [{ name: 'Maize', icon: '🌽', description: 'Staple grain', season: 'Spring-Summer' }, { name: 'Pineapple', icon: '🍍', description: 'Tropical fruit', season: 'Year-round' }, { name: 'Soybean', icon: '🫘', description: 'High-protein legume', season: 'Spring-Summer' }]
        },
        Clouds: {
            hot: [{ name: 'Rice', icon: '🍚', description: 'Needs humidity', season: 'Year-round' }, { name: 'Banana', icon: '🍌', description: 'Loves moisture', season: 'Year-round' }],
            warm: [{ name: 'Taro', icon: '🍃', description: 'Prefers moist soil', season: 'Year-round' }, { name: 'Ginger', icon: '🫚', description: 'Shade-tolerant', season: 'Year-round' }]
        },
        Rain: {
            hot: [{ name: 'Rice', icon: '🍚', description: 'Loves water', season: 'Year-round' }, { name: 'Jute', icon: '🌿', description: 'Thrives in wet conditions', season: 'Monsoon' }],
            warm: [{ name: 'Turmeric', icon: '🫚', description: 'Prefers rainy season', season: 'Monsoon' }, { name: 'Sweet Potato', icon: '🍠', description: 'Hardy tuber', season: 'Year-round' }]
        }
    },
    Temperate: {
        Clear: {
            warm: [{ name: 'Tomato', icon: '🍅', description: 'Needs sunlight', season: 'Spring-Summer' }, { name: 'Sunflower', icon: '🌻', description: 'Sun-loving crop', season: 'Summer' }],
            cool: [{ name: 'Wheat', icon: '🌾', description: 'Cool-season grain', season: 'Fall-Spring' }, { name: 'Apple', icon: '🍎', description: 'Needs chill hours', season: 'Fall' }]
        },
        Clouds: {
            warm: [{ name: 'Broccoli', icon: '🥦', description: 'Prefers mild weather', season: 'Spring-Fall' }, { name: 'Spinach', icon: '🥬', description: 'Cool-season green', season: 'Spring-Fall' }],
            cool: [{ name: 'Cabbage', icon: '🥬', description: 'Hardy vegetable', season: 'Spring-Fall' }, { name: 'Potato', icon: '🥔', description: 'Versatile tuber', season: 'Spring-Fall' }]
        },
        Rain: {
            warm: [{ name: 'Peas', icon: '🫛', description: 'Cool and moist', season: 'Spring-Fall' }, { name: 'Mushrooms', icon: '🍄', description: 'Loves dampness', season: 'Year-round' }],
            cool: [{ name: 'Kale', icon: '🥬', description: 'Hardy leafy green', season: 'Fall-Winter' }, { name: 'Carrot', icon: '🥕', description: 'Root vegetable', season: 'Spring-Fall' }]
        }
    },
    Arid: {
        Clear: {
            hot: [{ name: 'Sorghum', icon: '🌾', description: 'Drought-resistant', season: 'Summer' }, { name: 'Millet', icon: '🌾', description: 'Hardy grain', season: 'Summer' }],
            warm: [{ name: 'Dates', icon: '🌴', description: 'Desert fruit', season: 'Year-round' }, { name: 'Chickpea', icon: '🫘', description: 'Drought-tolerant', season: 'Winter' }]
        },
        Clouds: {
            hot: [{ name: 'Pomegranate', icon: '🍇', description: 'Hardy fruit tree', season: 'Fall' }],
            warm: [{ name: 'Lentil', icon: '🫘', description: 'Low water needs', season: 'Winter' }]
        }
    },
    default: [{ name: 'Quinoa', icon: '🌾', description: 'Adaptable grain', season: 'Varies' }, { name: 'Amaranth', icon: '🌿', description: 'Hardy pseudocereal', season: 'Summer' }]
};

// --- INITIALIZATION & AUTH ---
document.addEventListener('DOMContentLoaded', async () => {
    // Setup logout button listener
    const logoutButton = document.getElementById('nav-logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error during logout:', error.message);
                alert('Error logging out. Please try again.');
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // Check user session and protect the page
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error('Error getting session:', sessionError.message);
        // Redirect to login even if there's an error getting the session
        window.location.href = 'login.html';
        return;
    }

    if (session?.user) {
        // User is logged in, proceed to set up the page
        await setupAuthenticatedView(session);
        initializeWeatherApp();
    } else {
        // User is not logged in, redirect to login page
        window.location.href = 'login.html';
    }
});

async function setupAuthenticatedView(session) {
    mainContentContainer.style.display = 'block';
    loginMessageContainer.style.display = 'none';
    document.getElementById('nav-login-btn').style.display = 'none';
    const profileDropdown = document.getElementById('nav-profile-dropdown');
    profileDropdown.style.display = 'flex';
    
    const profile = await getCurrentUserProfile();
    if (profile) {
        document.getElementById('nav-profile-name').textContent = profile.full_name || session.user.email.split('@')[0];
        document.getElementById('nav-profile-image').src = profile.avatar_url || 'assets/default-avatar.svg';
    } else {
        document.getElementById('nav-profile-name').textContent = session.user.email.split('@')[0];
        }
}

function setupGuestView() {
    mainContentContainer.style.display = 'none';
    loginMessageContainer.style.display = 'block';
    document.getElementById('nav-login-btn').style.display = 'flex';
    document.getElementById('nav-profile-dropdown').style.display = 'none';
    document.getElementById('login-redirect-btn').onclick = () => window.location.href = 'login.html';
}

function initializeWeatherApp() {
    updateRecentSearches();
    if (recentSearches.length > 0) {
        fetchWeatherData(recentSearches[0]);
    }
    setupWeatherEventListeners();
}

// --- API & DATA HANDLING ---
async function fetchWeatherData(city) {
    showLoadingState();
    const url = `${FORECAST_BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&aqi=no&alerts=no`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `City not found or API error.`);
        }
        
        currentWeatherData = await response.json();
        updateUI();
        addToRecentSearches(currentWeatherData.location.name);
    } catch (error) {
        showErrorState(error.message);
    } finally {
        hideLoadingState();
    }
}

// --- UI UPDATE FUNCTIONS ---
function updateUI() {
    if (!currentWeatherData) return;
    updateCurrentWeatherDisplay();
    updateHourlyDisplay();
    updateDailyForecastDisplay();
    updateCropSuggestions();
    showWeatherSections();
}

function updateCurrentWeatherDisplay() {
    const { current, location } = currentWeatherData;
    const todayAstro = currentWeatherData.forecast.forecastday[0].astro;

    document.getElementById('city-name').textContent = location.name;
    document.getElementById('current-date').textContent = formatDate(location.localtime_epoch);
    document.getElementById('temperature').textContent = `${Math.round(current.temp_c)}°C`;
    document.getElementById('weather-condition').textContent = current.condition.text;
    document.getElementById('weather-icon').src = `https:${current.condition.icon}`;
    document.getElementById('humidity').textContent = `${current.humidity}%`;
    document.getElementById('wind-speed').textContent = `${current.wind_kph} km/h`;
    document.getElementById('rainfall').textContent = `${current.precip_mm} mm`;
    document.getElementById('sunrise').textContent = todayAstro.sunrise;
    document.getElementById('sunset').textContent = todayAstro.sunset;
}

function updateHourlyDisplay() {
    const todayForecast = currentWeatherData.forecast.forecastday[0];
    hourlyContainer.innerHTML = todayForecast.hour.map(hour => `
        <div class="hourly-card">
            <div class="time">${formatTime(hour.time_epoch)}</div>
            <img src="https:${hour.condition.icon}" alt="${hour.condition.text}">
            <div class="temp">${Math.round(hour.temp_c)}°C</div>
        </div>
    `).join('');
}

function updateDailyForecastDisplay() {
    const { forecastday } = currentWeatherData.forecast;
    document.getElementById('forecast-container').innerHTML = forecastday.map(day => `
        <div class="forecast-card">
            <h3>${new Date(day.date_epoch * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</h3>
            <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}">
            <div class="forecast-temp">
                <span class="max-temp">${Math.round(day.day.maxtemp_c)}°</span> / <span class="min-temp">${Math.round(day.day.mintemp_c)}°</span>
            </div>
            <p>Rain: ${day.day.daily_chance_of_rain}%</p>
        </div>
    `).join('');
}

function simplifyWeatherCondition(conditionText) {
    const text = conditionText.toLowerCase();
    if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) return 'Rain';
    if (text.includes('cloudy') || text.includes('overcast')) return 'Clouds';
    if (text.includes('clear') || text.includes('sunny')) return 'Clear';
    // Default fallback
    return 'Clear';
}

function updateCropSuggestions() {
    if (!currentWeatherData) return;
    const { current, location } = currentWeatherData;
    const { temp_c: temp } = current;
    const conditionText = current.condition.text;
    const lat = location.lat;
    
    const condition = simplifyWeatherCondition(conditionText);
    const climateZone = getClimateZone(lat);
    const tempCategory = temp > 27 ? 'hot' : (temp >= 15 ? 'warm' : 'cool');

    let suggestions = cropSuggestions[climateZone]?.[condition]?.[tempCategory] || cropSuggestions.default;
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    document.getElementById('advice-title').textContent = `${climateZone} Climate Suggestions`;
    document.getElementById('advice-description').textContent = `For current ${conditionText.toLowerCase()} at ${Math.round(temp)}°C, these crops are suitable:`;
    document.getElementById('advice-reasons').innerHTML = selected.map((crop, i) => `
        <li class='crop-animate' style="animation-delay: ${i * 0.1}s">
            <span class="crop-icon">${crop.icon}</span>
            <div class="crop-info">
                <span class="crop-name">${crop.name}</span>
                <span class="crop-description">${crop.description}</span>
                <span class="crop-season">🌱 ${crop.season}</span>
            </div>
        </li>
    `).join('');
}

function getClimateZone(lat) {
    const absLat = Math.abs(lat);
    if (absLat <= 23.5) return 'Tropical';
    if (absLat > 23.5 && absLat <= 40) return 'Temperate';
    if (absLat > 40 && absLat <= 66.5) return 'Temperate';
    return 'Arid'; // Defaulting to Arid for other zones for this example
}

// --- UI STATE & HELPERS ---
function showLoadingState() { loadingSpinner.style.display = 'block'; errorMessage.style.display = 'none'; weatherDetailsWrapper.style.display = 'none'; }
function hideLoadingState() { loadingSpinner.style.display = 'none'; }
function showErrorState(message) { errorMessage.textContent = message; errorMessage.style.display = 'block'; }
function showWeatherSections() { weatherDetailsWrapper.style.display = 'block'; }
function formatDate(epoch) { return new Date(epoch * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
function formatTime(epoch) { return new Date(epoch * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }

// --- RECENT SEARCHES ---
function updateRecentSearches() {
    recentList.innerHTML = recentSearches.map(city => `<div class="recent-item">${city}</div>`).join('');
    document.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => fetchWeatherData(item.textContent));
    });
}

function addToRecentSearches(city) {
    const normalizedCity = city.split(',')[0];
    const index = recentSearches.indexOf(normalizedCity);
    if (index > -1) recentSearches.splice(index, 1);
    recentSearches.unshift(normalizedCity);
    if (recentSearches.length > 5) recentSearches.pop();
    localStorage.setItem('weatherRecentSearches', JSON.stringify(recentSearches));
    updateRecentSearches();
}

// --- EVENT LISTENERS ---
function setupWeatherEventListeners() {
    searchBtn.addEventListener('click', () => { if (searchInput.value.trim()) fetchWeatherData(searchInput.value.trim()); });
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter' && searchInput.value.trim()) fetchWeatherData(searchInput.value.trim()); });
    refreshSuggestionsBtn.addEventListener('click', updateCropSuggestions);
    scrollLeftBtn.addEventListener('click', () => hourlyContainer.scrollBy({ left: -300, behavior: 'smooth' }));
    scrollRightBtn.addEventListener('click', () => hourlyContainer.scrollBy({ left: 300, behavior: 'smooth' }));
}

function setupNavbarEventListeners() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const profileTrigger = document.querySelector('.profile-trigger');
    const logoutBtn = document.getElementById('nav-logout-btn');

    hamburger?.addEventListener('click', () => navLinks?.classList.toggle('active'));
    profileTrigger?.addEventListener('click', e => {
        e.stopPropagation();
        const content = profileTrigger.nextElementSibling;
        if(content) content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
    logoutBtn?.addEventListener('click', e => { e.preventDefault(); logout(); });
    document.addEventListener('click', e => {
        const dropdownContent = document.querySelector('.dropdown-content');
        if (profileTrigger && dropdownContent && !profileTrigger.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });
}