// API Configuration
const API_KEY = 'ed4c7e5994cfa3e1c8d5d5087fc720ad';
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM Elements
const searchInput = document.getElementById('city-search');
const searchBtn = document.getElementById('search-btn');
const recentList = document.getElementById('recent-list');
const loadingSpinner = document.querySelector('.loading-spinner');
const errorMessage = document.getElementById('error-message');
const currentWeather = document.querySelector('.current-weather');
const agriAdvice = document.querySelector('.agri-advice');
const forecastSection = document.querySelector('.forecast-section');
const hourlyForecast = document.querySelector('.hourly-forecast');
const hourlyContainer = document.getElementById('hourly-container');
const scrollLeftBtn = document.querySelector('.scroll-left');
const scrollRightBtn = document.querySelector('.scroll-right');

// Initialize recent searches from localStorage
let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');

// Update recent searches display
function updateRecentSearches() {
    recentList.innerHTML = '';
    recentSearches.slice(0, 5).forEach(city => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.textContent = city;
        item.addEventListener('click', () => fetchWeatherData(city));
        recentList.appendChild(item);
    });
}

// Add city to recent searches
function addToRecentSearches(city) {
    const index = recentSearches.indexOf(city);
    if (index > -1) {
        recentSearches.splice(index, 1);
    }
    recentSearches.unshift(city);
    if (recentSearches.length > 5) {
        recentSearches.pop();
    }
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    updateRecentSearches();
}

// Format date
function formatDate(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    }).format(date);
}

// Format time
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true
    });
}

// Get agricultural advice based on weather conditions
function getAgriculturalAdvice(weather, forecast) {
    const advice = {
        title: '',
        description: '',
        reasons: [],
        icon: ''
    };

    const temp = weather.main.temp - 273.15;
    const humidity = weather.main.humidity;
    const windSpeed = weather.wind.speed;
    const rain = weather.rain ? weather.rain['1h'] : 0;
    const willRainSoon = forecast.some(day => day.pop > 0.5);

    if (rain > 0 || willRainSoon) {
        advice.title = 'Avoid Irrigation';
        advice.description = 'Natural rainfall expected. Save water and avoid irrigation.';
        advice.reasons.push('Current or expected rainfall');
        advice.icon = 'fa-cloud-rain';
    } else if (humidity > 80) {
        advice.title = 'Monitor Crop Health';
        advice.description = 'High humidity conditions. Watch for fungal diseases.';
        advice.reasons.push('High humidity levels');
        advice.icon = 'fa-eye';
    } else if (temp > 30) {
        advice.title = 'Water Management';
        advice.description = 'High temperature conditions. Ensure adequate irrigation.';
        advice.reasons.push('High temperature');
        advice.icon = 'fa-temperature-high';
    } else if (windSpeed > 10) {
        advice.title = 'Protect Crops';
        advice.description = 'Strong winds expected. Consider protective measures.';
        advice.reasons.push('High wind speed');
        advice.icon = 'fa-wind';
    } else {
        advice.title = 'Favorable Conditions';
        advice.description = 'Weather conditions are suitable for general farming activities.';
        advice.reasons.push('Moderate temperature and humidity');
        advice.icon = 'fa-check-circle';
    }

    return advice;
}

// Fetch weather data
async function fetchWeatherData(city) {
    try {
        // Show loading spinner
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
        currentWeather.style.display = 'none';
        hourlyForecast.style.display = 'none';
        agriAdvice.style.display = 'none';
        forecastSection.style.display = 'none';

        // Fetch current weather
        const weatherUrl = `${WEATHER_BASE_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
        console.log('Fetching weather from:', weatherUrl);
        
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherResponse.ok) {
            throw new Error(`Weather API Error: ${weatherData.message || 'City not found'}`);
        }

        // Fetch 5-day forecast
        const forecastUrl = `${FORECAST_BASE_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
        console.log('Fetching forecast from:', forecastUrl);
        
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        if (!forecastResponse.ok) {
            throw new Error(`Forecast API Error: ${forecastData.message || 'Forecast data not available'}`);
        }

        // Process forecast data
        const hourlyData = forecastData.list.slice(0, 8); // Get next 24 hours (3-hour intervals)
        const dailyForecast = processForecastData(forecastData.list);

        // Update displays
        updateWeatherDisplay(weatherData, dailyForecast);
        updateHourlyDisplay(hourlyData);
        addToRecentSearches(city);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        errorMessage.textContent = error.message || 'City not found. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Process forecast data to get daily forecasts
function processForecastData(forecastList) {
    const dailyData = [];
    const dailyMap = new Map();

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        
        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                dt: item.dt,
                temp: {
                    min: item.main.temp,
                    max: item.main.temp
                },
                weather: item.weather,
                pop: item.pop || 0
            });
        } else {
            const existing = dailyMap.get(date);
            existing.temp.min = Math.min(existing.temp.min, item.main.temp);
            existing.temp.max = Math.max(existing.temp.max, item.main.temp);
        }
    });

    dailyMap.forEach(value => dailyData.push(value));
    return dailyData.slice(0, 7);
}

// Update weather display
function updateWeatherDisplay(weather, forecast) {
    // Update current weather
    document.getElementById('city-name').textContent = weather.name;
    document.getElementById('current-date').textContent = formatDate(weather.dt, weather.timezone);
    document.getElementById('temperature').textContent = `${Math.round(weather.main.temp)}°C`;
    document.getElementById('weather-condition').textContent = weather.weather[0].description;
    document.getElementById('humidity').textContent = `${weather.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${weather.wind.speed} m/s`;
    document.getElementById('rainfall').textContent = weather.rain ? `${weather.rain['1h']} mm` : '0 mm';
    document.getElementById('sunrise').textContent = formatDate(weather.sys.sunrise, weather.timezone).split(', ')[1];
    document.getElementById('sunset').textContent = formatDate(weather.sys.sunset, weather.timezone).split(', ')[1];
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;

    // Update agricultural advice
    const advice = getAgriculturalAdvice(weather, forecast);
    document.getElementById('advice-icon').className = `fas ${advice.icon}`;
    document.getElementById('advice-title').textContent = advice.title;
    document.getElementById('advice-description').textContent = advice.description;
    const reasonsList = document.getElementById('advice-reasons');
    reasonsList.innerHTML = advice.reasons.map(reason => `<li>${reason}</li>`).join('');

    // Update forecast
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = forecast.map(day => `
        <div class="forecast-card">
            <h3>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</h3>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}">
            <div class="forecast-temp">
                <span class="max-temp">${Math.round(day.temp.max)}°C</span>
                <span class="min-temp">${Math.round(day.temp.min)}°C</span>
            </div>
            <p>${day.weather[0].description}</p>
            <p>Rain: ${Math.round(day.pop * 100)}%</p>
        </div>
    `).join('');

    // Show weather sections
    currentWeather.style.display = 'block';
    agriAdvice.style.display = 'block';
    forecastSection.style.display = 'block';
}

// Update hourly display
function updateHourlyDisplay(hourlyData) {
    hourlyContainer.innerHTML = hourlyData.map(hour => `
        <div class="hourly-card">
            <div class="time">${formatTime(hour.dt)}</div>
            <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png" 
                 alt="${hour.weather[0].description}">
            <div class="temp">${Math.round(hour.main.temp)}°C</div>
            <div class="details">
                <div>${hour.weather[0].description}</div>
                <div>${hour.main.humidity}% humidity</div>
            </div>
        </div>
    `).join('');

    hourlyForecast.style.display = 'block';
}

// Scroll functionality
scrollLeftBtn.addEventListener('click', () => {
    hourlyContainer.scrollBy({
        left: -200,
        behavior: 'smooth'
    });
});

scrollRightBtn.addEventListener('click', () => {
    hourlyContainer.scrollBy({
        left: 200,
        behavior: 'smooth'
    });
});

// Event listeners
searchBtn.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        fetchWeatherData(city);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            fetchWeatherData(city);
        }
    }
});

// Initialize recent searches display
updateRecentSearches();

// Handle navbar profile
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const loginBtn = document.getElementById('nav-login-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileName = document.getElementById('nav-profile-name');
    const profileImage = document.getElementById('nav-profile-image');

    if (currentUser) {
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }
    } else {
        window.location.href = '../login.html';
    }
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = '../home.html';
}); 