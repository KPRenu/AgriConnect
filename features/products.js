// DOM Elements
const marketplaceContainer = document.querySelector('.marketplace-container');
const loginMessage = document.querySelector('.login-message');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const postProductBtn = document.getElementById('post-product-btn');
const viewCartBtn = document.getElementById('view-cart-btn');
const viewFavoritesBtn = document.getElementById('view-favorites-btn');
const cartCount = document.querySelector('.cart-count');
const favoritesCount = document.querySelector('.favorites-count');

// Modals
const postProductModal = document.getElementById('post-product-modal');
const productDetailsModal = document.getElementById('product-details-modal');
const cartModal = document.getElementById('cart-modal');
const favoritesModal = document.getElementById('favorites-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// Templates
const productCardTemplate = document.getElementById('product-card-template');

// State
let products = [];
let currentFilter = 'all';
let searchQuery = '';
let cart = [];
let favorites = [];

// Check authentication status
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        loginMessage.style.display = 'none';
        marketplaceContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Initialize marketplace
        initializeMarketplace();
    } else {
        // User is not logged in
        loginMessage.style.display = 'flex';
        marketplaceContainer.style.display = 'none';
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

// Initialize marketplace
function initializeMarketplace() {
    loadUserData();
    loadProducts();
    setupEventListeners();
}

// Load user data from localStorage
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    cart = JSON.parse(localStorage.getItem(`cart_${currentUser.email}`) || '[]');
    favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.email}`) || '[]');
    updateCounters();
}

// Load products (mock data for now)
function loadProducts() {
    // Mock products data
    products = [
        {
            id: 1,
            name: 'Tractor',
            category: 'equipment',
            price: 500000,
            description: 'Brand new tractor with advanced features',
            images: ['../assets/tractor.jpg'],
            location: 'Punjab',
            seller: {
                name: 'John Doe',
                contact: '+91 9876543210'
            }
        },
        {
            id: 2,
            name: 'Organic Seeds Pack',
            category: 'seeds',
            price: 1500,
            description: 'High-quality organic seeds for various crops',
            images: ['../assets/seeds.jpg'],
            location: 'Maharashtra',
            seller: {
                name: 'Jane Smith',
                contact: '+91 9876543211'
            }
        }
        // Add more mock products as needed
    ];

    displayProducts();
}

// Display products
function displayProducts() {
    productsGrid.innerHTML = '';
    
    const filteredProducts = products.filter(product => {
        const matchesFilter = currentFilter === 'all' || product.category === currentFilter;
        const matchesSearch = !searchQuery || 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    filteredProducts.forEach(product => {
        const clone = productCardTemplate.content.cloneNode(true);
        
        // Set product image
        const img = clone.querySelector('.product-image img');
        img.src = product.images[0];
        img.alt = product.name;

        // Set favorite button state
        const favoriteBtn = clone.querySelector('.favorite-btn');
        if (favorites.includes(product.id)) {
            favoriteBtn.classList.add('active');
        }

        // Set product content
        clone.querySelector('.product-title').textContent = product.name;
        clone.querySelector('.product-price').textContent = `₹${product.price.toLocaleString()}`;
        clone.querySelector('.product-location').textContent = product.location;

        // Add event listeners
        const card = clone.querySelector('.product-card');
        card.dataset.productId = product.id;

        const viewDetailsBtn = clone.querySelector('.view-details-btn');
        viewDetailsBtn.addEventListener('click', () => showProductDetails(product));

        const addToCartBtn = clone.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product);
        });

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(product);
        });

        productsGrid.appendChild(clone);
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
            currentFilter = btn.dataset.category;
            displayProducts();
        });
    });

    // Modal triggers
    postProductBtn.addEventListener('click', () => showModal(postProductModal));
    viewCartBtn.addEventListener('click', () => showModal(cartModal));
    viewFavoritesBtn.addEventListener('click', () => showModal(favoritesModal));

    // Close modals
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });

    // Post product form
    const postProductForm = document.getElementById('post-product-form');
    postProductForm.addEventListener('submit', handlePostProduct);

    // Image preview
    const imageInput = document.getElementById('product-images');
    imageInput.addEventListener('change', handleImagePreview);

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
    displayProducts();
}

// Show product details
function showProductDetails(product) {
    const modal = productDetailsModal;
    const imageSlider = modal.querySelector('.product-images-slider');
    const title = modal.querySelector('.product-title');
    const price = modal.querySelector('.product-price');
    const description = modal.querySelector('.product-description');
    const sellerName = modal.querySelector('.seller-name');
    const sellerLocation = modal.querySelector('.seller-location');

    // Set product details
    imageSlider.innerHTML = product.images.map(src => `
        <img src="${src}" alt="${product.name}">
    `).join('');

    title.textContent = product.name;
    price.textContent = `₹${product.price.toLocaleString()}`;
    description.textContent = product.description;
    sellerName.textContent = `Seller: ${product.seller.name}`;
    sellerLocation.textContent = `Location: ${product.location}`;

    // Setup action buttons
    const addToCartBtn = modal.querySelector('.add-to-cart-btn');
    const addToFavoritesBtn = modal.querySelector('.add-to-favorites-btn');
    const contactSellerBtn = modal.querySelector('.contact-seller-btn');
    const reportListingBtn = modal.querySelector('.report-listing-btn');

    addToCartBtn.onclick = () => addToCart(product);
    addToFavoritesBtn.onclick = () => toggleFavorite(product);
    contactSellerBtn.onclick = () => contactSeller(product.seller);
    reportListingBtn.onclick = () => reportListing(product);

    showModal(modal);
}

// Handle post product
function handlePostProduct(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        description: document.getElementById('product-description').value,
        location: document.getElementById('seller-location').value,
        images: [], // Would be handled by file upload in a real implementation
        seller: {
            name: JSON.parse(localStorage.getItem('currentUser')).name,
            contact: 'Contact info would be fetched from user profile'
        }
    };

    // Add to products (in a real app, this would be an API call)
    formData.id = products.length + 1;
    products.unshift(formData);

    // Reset form and close modal
    e.target.reset();
    hideModal(postProductModal);
    displayProducts();
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

// Cart functions
function addToCart(product) {
    if (!cart.includes(product.id)) {
        cart.push(product.id);
        saveUserData();
        updateCounters();
        showToast('Product added to cart');
    }
}

function removeFromCart(productId) {
    cart = cart.filter(id => id !== productId);
    saveUserData();
    updateCounters();
    updateCartModal();
    showToast('Product removed from cart');
}

// Favorite functions
function toggleFavorite(product) {
    const index = favorites.indexOf(product.id);
    if (index === -1) {
        favorites.push(product.id);
        showToast('Added to favorites');
    } else {
        favorites.splice(index, 1);
        showToast('Removed from favorites');
    }
    saveUserData();
    updateCounters();
    displayProducts(); // Update favorite buttons
}

// Save user data to localStorage
function saveUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    localStorage.setItem(`cart_${currentUser.email}`, JSON.stringify(cart));
    localStorage.setItem(`favorites_${currentUser.email}`, JSON.stringify(favorites));
}

// Update counters
function updateCounters() {
    cartCount.textContent = cart.length;
    favoritesCount.textContent = favorites.length;
}

// Modal functions
function showModal(modal) {
    if (modal === cartModal) {
        updateCartModal();
    } else if (modal === favoritesModal) {
        updateFavoritesModal();
    }
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
}

// Update modal contents
function updateCartModal() {
    const cartItems = document.querySelector('.cart-items');
    const cartTotal = document.querySelector('.cart-total');
    let total = 0;

    cartItems.innerHTML = cart.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return '';
        total += product.price;
        return `
            <div class="cart-item">
                <img src="${product.images[0]}" alt="${product.name}">
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p>₹${product.price.toLocaleString()}</p>
                </div>
                <button onclick="removeFromCart(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    cartTotal.textContent = total.toLocaleString();
}

function updateFavoritesModal() {
    const favoritesItems = document.querySelector('.favorites-items');
    
    favoritesItems.innerHTML = favorites.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return '';
        return `
            <div class="favorite-item">
                <img src="${product.images[0]}" alt="${product.name}">
                <div class="item-details">
                    <h3>${product.name}</h3>
                    <p>₹${product.price.toLocaleString()}</p>
                </div>
                <button onclick="toggleFavorite(${product.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        `;
    }).join('');
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

function contactSeller(seller) {
    // In a real app, this would open a chat or messaging interface
    alert(`Contact seller at: ${seller.contact}`);
}

function reportListing(product) {
    // In a real app, this would open a report form
    alert('Thank you for reporting this listing. We will review it shortly.');
}

// Handle mobile menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
}); 