// DOM Elements
const marketplaceContainer = document.querySelector('.marketplace-container');
const loginMessage = document.querySelector('.login-message');
const navLoginBtn = document.getElementById('nav-login-btn');
const navProfileDropdown = document.getElementById('nav-profile-dropdown');
const navProfileName = document.getElementById('nav-profile-name');
const navProfileImage = document.getElementById('nav-profile-image');
const navLogoutBtn = document.getElementById('nav-logout-btn');

const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterButtons = document.querySelectorAll('.filter-btn');

const postProductBtn = document.getElementById('post-product-btn');
const viewCartBtn = document.getElementById('view-cart-btn');
const viewFavoritesBtn = document.getElementById('view-favorites-btn');

const cartCountSpan = document.querySelector('.cart-count');
const favoritesCountSpan = document.querySelector('.favorites-count');
const notificationCountSpan = document.querySelector('.notification-count');

// Modals
const postProductModal = document.getElementById('post-product-modal');
const productDetailsModal = document.getElementById('product-details-modal');
const cartModal = document.getElementById('cart-modal');
const favoritesModal = document.getElementById('favorites-modal');
const notificationModal = document.getElementById('notification-modal');
const allModals = document.querySelectorAll('.modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// Templates
const productCardTemplate = document.getElementById('product-card-template');

// Notifications
const notificationTrigger = document.getElementById('notification-trigger');
const notificationList = document.getElementById('notification-list');

// State
let currentUser = null;
let userProfile = null;
let allProducts = [];
let userFavorites = [];
let userCart = [];
let userNotifications = [];
let currentFilter = 'all';
let searchQuery = '';

// --- AUTHENTICATION & INITIALIZATION ---

// Listen for authentication state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        currentUser = session.user;
        handleUserLoggedIn();
    } else if (event === 'SIGNED_OUT') {
        handleUserLoggedOut();
    }
});

async function handleUserLoggedIn() {
    // UI updates for logged-in state
    loginMessage.style.display = 'none';
    marketplaceContainer.style.display = 'block';
    navLoginBtn.style.display = 'none';
    navProfileDropdown.style.display = 'flex';

    // Fetch user profile and then all marketplace data
    userProfile = await getCurrentUserProfile();
    if (userProfile) {
        navProfileName.textContent = userProfile.full_name || 'User';
        navProfileImage.src = userProfile.avatar_url || 'assets/default-avatar.svg';
    }
    
    // Fetch all necessary data from Supabase
    await Promise.all([
        fetchProducts(),
        fetchUserInteractions(),
        fetchNotifications()
    ]);

    // Initial render
    renderProducts();
    updateCounters();
    renderNotifications();
}

function handleUserLoggedOut() {
    currentUser = null;
    userProfile = null;
    loginMessage.style.display = 'flex';
    marketplaceContainer.style.display = 'none';
    navLoginBtn.style.display = 'block';
    navProfileDropdown.style.display = 'none';
}

// --- DATA FETCHING FUNCTIONS ---

async function fetchProducts() {
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        showToast('Could not load products.', 'error');
        return;
    }
    allProducts = data;
}

async function fetchUserInteractions() {
    if (!currentUser) return;
    const [favoritesRes, cartRes] = await Promise.all([
        supabase.from('favorites').select('product_id').eq('user_id', currentUser.id),
        supabase.from('cart_items').select('product_id').eq('user_id', currentUser.id)
    ]);
    
    if (favoritesRes.error) console.error('Error fetching favorites:', favoritesRes.error);
    else userFavorites = favoritesRes.data.map(f => f.product_id);

    if (cartRes.error) console.error('Error fetching cart:', cartRes.error);
    else userCart = cartRes.data.map(c => c.product_id);
}

async function fetchNotifications() {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id) // CHANGED from recipient_id
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return;
    }
    userNotifications = data;
}

// --- RENDERING FUNCTIONS ---

function renderProducts() {
    productsGrid.innerHTML = '';
    
    const filteredProducts = allProducts.filter(product => {
        const matchesFilter = currentFilter === 'all' || product.category === currentFilter;
        const lowerCaseQuery = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            product.name.toLowerCase().includes(lowerCaseQuery) ||
            product.description.toLowerCase().includes(lowerCaseQuery) ||
            product.location.toLowerCase().includes(lowerCaseQuery);
        return matchesFilter && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p>No products found. Try adjusting your search or filters.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const cardClone = productCardTemplate.content.cloneNode(true);
        const card = cardClone.querySelector('.product-card');
        const favBtn = cardClone.querySelector('.favorite-btn');
        const favIcon = favBtn.querySelector('i');
        const deleteBtn = cardClone.querySelector('.delete-product-btn');

        card.dataset.productId = product.id;
        cardClone.querySelector('.product-image img').src = product.image_urls?.[0] || 'assets/placeholder.png';
        cardClone.querySelector('.product-title').textContent = product.name;
        cardClone.querySelector('.product-price').textContent = `₹${product.price.toLocaleString()}`;
        cardClone.querySelector('.product-location').textContent = product.location;
        
        // Favorite button state
        if (userFavorites.includes(product.id)) {
            favBtn.classList.add('active');
            favIcon.classList.replace('far', 'fas');
        }

        // Add to cart button listener
        cardClone.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleAddToCart(product.id);
        });

        // Favorite button listener
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(product.id, favBtn);
        });
        
        // View details listener
        cardClone.querySelector('.view-details-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showProductDetails(product.id);
        });

        // Show delete button for product owner
        if (currentUser && product.user_id === currentUser.id) {
            deleteBtn.style.display = 'flex';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteProduct(product.id, product.image_urls);
            });
        }
        
        productsGrid.appendChild(cardClone);
    });
}

function renderNotifications() {
    notificationList.innerHTML = '';
    const unreadCount = userNotifications.filter(n => !n.is_read).length;

    if (unreadCount > 0) {
        notificationCountSpan.textContent = unreadCount;
        notificationCountSpan.style.display = 'inline-block';
    } else {
        notificationCountSpan.style.display = 'none';
    }

    if (userNotifications.length === 0) {
        notificationList.innerHTML = '<p style="padding: 1rem; text-align: center;">No notifications yet.</p>';
        return;
    }

    userNotifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notification-item ${notif.is_read ? 'is-read' : ''}`;
        item.dataset.id = notif.id;
        item.innerHTML = `<i class="fas fa-shopping-cart"></i> <div>${notif.message}</div>`;
        
        item.addEventListener('click', () => handleMarkNotificationRead(notif.id));
        notificationList.appendChild(item);
    });
}

// --- EVENT HANDLERS & ACTIONS ---

// Post a new product
async function handlePostProductSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const name = document.getElementById('product-name').value;
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-description').value;
    const location = document.getElementById('seller-location').value;
    const imageFiles = document.getElementById('product-images').files;

    if (imageFiles.length === 0 || imageFiles.length > 5) {
        showToast('Please select 1 to 5 images.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Product';
        return;
    }

    try {
        // 1. Upload images to Supabase Storage
        const uploadPromises = Array.from(imageFiles).map(file => {
            const filePath = `${currentUser.id}/${Date.now()}-${file.name}`;
            return supabase.storage.from('products').upload(filePath, file);
        });
        const uploadResults = await Promise.all(uploadPromises);
        
        const imageUrls = [];
        for (const result of uploadResults) {
            if (result.error) throw result.error;
            const { data } = supabase.storage.from('products').getPublicUrl(result.data.path);
            imageUrls.push(data.publicUrl);
        }

        // 2. Insert product data into the database
        const { error: insertError } = await supabase.from('products').insert({
            user_id: currentUser.id,
            name, category, price, description, location,
            image_urls: imageUrls
        });

        if (insertError) throw insertError;
        
        showToast('Product posted successfully!', 'success');
        e.target.reset();
        document.getElementById('post-image-preview').innerHTML = '';
        hideModal(postProductModal);
        
        await fetchProducts(); // Refresh products list
        renderProducts();

    } catch (error) {
        console.error('Error posting product:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Product';
    }
}

// Delete a product
async function handleDeleteProduct(productId, imageUrls) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }

    try {
        // Delete from DB first
        const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
        if (deleteError) throw deleteError;

        // Then delete images from storage
        if (imageUrls && imageUrls.length > 0) {
            const imagePaths = imageUrls.map(url => {
                const parts = new URL(url).pathname.split('/products/');
                return parts[1];
            });
            const { error: storageError } = await supabase.storage.from('products').remove(imagePaths);
            if (storageError) console.error('Could not delete some images:', storageError);
        }

        showToast('Product deleted successfully.', 'success');
        
        // Remove from local state and re-render
        allProducts = allProducts.filter(p => p.id !== productId);
        renderProducts();

    } catch (error) {
        console.error('Error deleting product:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Add/Remove from Favorites
async function toggleFavorite(productId, buttonElement) {
    const isFavorited = userFavorites.includes(productId);
    const favIcon = buttonElement.querySelector('i');
    
    try {
        if (isFavorited) {
            // Remove from favorites
            const { error } = await supabase.from('favorites').delete()
                .match({ user_id: currentUser.id, product_id: productId });
            if (error) throw error;
            
            userFavorites = userFavorites.filter(id => id !== productId);
            buttonElement.classList.remove('active');
            favIcon.classList.replace('fas', 'far');
            showToast('Removed from favorites', 'info');
        } else {
            // Add to favorites
            const { error } = await supabase.from('favorites').insert({
                user_id: currentUser.id,
                product_id: productId
            });
            if (error) throw error;
            
            userFavorites.push(productId);
            buttonElement.classList.add('active');
            favIcon.classList.replace('far', 'fas');
            showToast('Added to favorites!', 'success');
        }
        updateCounters();
    } catch (error) {
        console.error('Error updating favorites:', error);
        showToast('Could not update favorites.', 'error');
    }
}

// Add to Cart
async function handleAddToCart(productId) {
    if (userCart.includes(productId)) {
        showToast('Product is already in your cart.', 'info');
        return;
    }
    try {
        const { error } = await supabase.from('cart_items').insert({
            user_id: currentUser.id,
            product_id: productId
        });
        if (error) throw error;
        
        userCart.push(productId);
        updateCounters();
        showToast('Added to cart!', 'success');
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Could not add to cart.', 'error');
    }
}

// Remove from Cart (from Cart Modal)
async function handleRemoveFromCart(productId) {
     try {
        const { error } = await supabase.from('cart_items').delete()
            .match({ user_id: currentUser.id, product_id: productId });
        if (error) throw error;

        userCart = userCart.filter(id => id !== productId);
        updateCounters();
        await renderCartModal(); // Re-render cart modal content
        showToast('Product removed from cart.', 'info');
    } catch (error) {
        console.error('Error removing from cart:', error);
        showToast('Could not remove from cart.', 'error');
    }
}

// Checkout
// Replace the existing handleCheckout function in products.js with this one.

async function handleCheckout() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';

    try {
        const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select('*, products(*)')
            .eq('user_id', currentUser.id);

        if (error) throw error;
        if (cartItems.length === 0) {
            showToast('Your cart is empty.', 'info');
            return;
        }
        
        // Create notification payloads with the 'type' field
     // Inside the handleCheckout function...
const notifications = cartItems.map(item => ({
    user_id: item.products.user_id,         // CHANGED from recipient_id
    from_user_id: currentUser.id,           // CHANGED from sender_id
    product_id: item.product_id,
    message: `${userProfile.full_name || 'A user'} wants to buy your product: "${item.products.name}".`,
    type: 'checkout_request'
}));

        // Insert all notifications
        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) throw notifError;
        
        // Clear user's cart
        const { error: clearCartError } = await supabase.from('cart_items').delete().eq('user_id', currentUser.id);
        if (clearCartError) throw clearCartError;
        
        // Update local state and UI
        userCart = [];
        updateCounters();
        hideModal(cartModal);
        showToast('Checkout successful! Sellers have been notified.', 'success');

    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Checkout failed. Please try again.', 'error');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
    }
}

// Mark notification as read
async function handleMarkNotificationRead(notificationId) {
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification.is_read) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
    } else {
        notification.is_read = true;
        renderNotifications();
    }
}

// --- MODAL & UI FUNCTIONS ---

function updateCounters() {
    cartCountSpan.textContent = userCart.length;
    favoritesCountSpan.textContent = userFavorites.length;
    const unreadCount = userNotifications.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
        notificationCountSpan.textContent = unreadCount;
        notificationCountSpan.style.display = 'inline-block';
    } else {
        notificationCountSpan.style.display = 'none';
    }
}

async function openNotificationModal() {
    showModal(notificationModal);

    // We can re-fetch to ensure data is up-to-date
    await fetchNotifications();
    renderNotifications();

    // Mark all currently unread notifications as read
    const unreadIds = userNotifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);

        if (error) {
            console.error('Error marking notifications as read:', error);
        } else {
            // To provide immediate visual feedback, we can update the local state
            // and re-render. The next full fetch will get the source of truth anyway.
            userNotifications.forEach(n => {
                if (unreadIds.includes(n.id)) {
                    n.is_read = true;
                }
            });
            renderNotifications();
        }
    }
}

function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = productDetailsModal;
    modal.querySelector('.product-title').textContent = product.name;
    modal.querySelector('.product-price').textContent = `₹${product.price.toLocaleString()}`;
    modal.querySelector('.product-description').innerHTML = `<p>${product.description.replace(/\n/g, '<br>')}</p>`;
    modal.querySelector('.seller-name').textContent = `Seller: ${product.profiles.full_name}`;
    modal.querySelector('.seller-location').textContent = `Location: ${product.location}`;
    
    const imageSlider = modal.querySelector('.product-images-slider');
    imageSlider.innerHTML = product.image_urls.map(url => `<img src="${url}" alt="${product.name}">`).join('');
    
    // Setup action buttons
    const favBtn = modal.querySelector('.add-to-favorites-btn');
    const favIcon = favBtn.querySelector('i');
    if (userFavorites.includes(product.id)) {
        favBtn.classList.add('active');
        favIcon.classList.replace('far', 'fas');
    } else {
        favBtn.classList.remove('active');
        favIcon.classList.replace('fas', 'far');
    }
    favBtn.onclick = () => toggleFavorite(product.id, favBtn);

    modal.querySelector('.add-to-cart-btn').onclick = () => handleAddToCart(product.id);

    const deleteBtn = modal.querySelector('.delete-listing-btn');
    if (currentUser && product.user_id === currentUser.id) {
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => {
            hideModal(productDetailsModal);
            handleDeleteProduct(product.id, product.image_urls);
        };
    } else {
        deleteBtn.style.display = 'none';
    }

    showModal(modal);
}

async function renderCartModal() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.querySelector('.cart-total');
    cartItemsContainer.innerHTML = '<p>Loading cart...</p>';

    if (userCart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        cartTotalSpan.textContent = '0';
        return;
    }

    const { data: cartDetails, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('user_id', currentUser.id);

    if (error) {
        cartItemsContainer.innerHTML = '<p>Could not load cart items.</p>';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = '';
    cartDetails.forEach(item => {
        const product = item.products;
        total += product.price;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${product.image_urls[0] || 'assets/placeholder.png'}" alt="${product.name}">
            <div class="item-details">
                <h3>${product.name}</h3>
                <p>₹${product.price.toLocaleString()}</p>
            </div>
            <button class="remove-from-cart-btn" data-product-id="${product.id}"><i class="fas fa-trash"></i></button>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartTotalSpan.textContent = total.toLocaleString();

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => handleRemoveFromCart(parseInt(btn.dataset.productId)));
    });
}

async function renderFavoritesModal() {
    const favItemsContainer = document.getElementById('favorites-items');
    favItemsContainer.innerHTML = '<p>Loading favorites...</p>';
    
    if (userFavorites.length === 0) {
        favItemsContainer.innerHTML = '<p>You have no favorite items.</p>';
        return;
    }

    const { data: favDetails, error } = await supabase
        .from('products')
        .select('*')
        .in('id', userFavorites);

    if (error) {
        favItemsContainer.innerHTML = '<p>Could not load favorite items.</p>';
        return;
    }

    favItemsContainer.innerHTML = '';
    favDetails.forEach(product => {
        const itemEl = document.createElement('div');
        itemEl.className = 'favorite-item';
        itemEl.innerHTML = `
            <img src="${product.image_urls[0] || 'assets/placeholder.png'}" alt="${product.name}">
            <div class="item-details">
                <h3>${product.name}</h3>
                <p>₹${product.price.toLocaleString()}</p>
            </div>
            <button class="remove-from-fav-btn" data-product-id="${product.id}"><i class="fas fa-heart-crack"></i></button>
        `;
        favItemsContainer.appendChild(itemEl);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-from-fav-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = parseInt(btn.dataset.productId);
            await toggleFavorite(productId, btn); // The button element is a placeholder here
            await renderFavoritesModal(); // Re-render favorites modal
            renderProducts(); // Re-render product grid to update favorite icons
        });
    });
}

function showModal(modal) {
    modal.style.display = 'block';
}
function hideModal(modal) {
    modal.style.display = 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// --- SETUP EVENT LISTENERS ---
function initializeEventListeners() {
    // Logout
    navLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Search and Filter
    searchBtn.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        renderProducts();
    });
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            renderProducts();
        }
    });
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.category;
            renderProducts();
        });
    });

    // Modal Triggers
    postProductBtn.addEventListener('click', () => showModal(postProductModal));
    viewCartBtn.addEventListener('click', async () => {
        await renderCartModal();
        showModal(cartModal);
    });
    viewFavoritesBtn.addEventListener('click', async () => {
        await renderFavoritesModal();
        showModal(favoritesModal);
    });

    // Close modals
    closeModalButtons.forEach(btn => btn.addEventListener('click', () => hideModal(btn.closest('.modal'))));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });

    // Post Product Form
    document.getElementById('post-product-form').addEventListener('submit', handlePostProductSubmit);

    // Image preview for post form
    document.getElementById('product-images').addEventListener('change', (e) => {
        const previewContainer = document.getElementById('post-image-preview');
        previewContainer.innerHTML = '';
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // Checkout button
    document.querySelector('.checkout-btn').addEventListener('click', handleCheckout);
    
    // Notification modal trigger
    notificationTrigger.addEventListener('click', openNotificationModal);

    // Hamburger menu for mobile
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));
}

// Initialize all event listeners on page load
initializeEventListeners();