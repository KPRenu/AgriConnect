// DOM Elements
const loginMessage = document.querySelector('.login-message');
const socialContainer = document.querySelector('.social-container');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');
const sidebarProfileName = document.getElementById('sidebar-profile-name');
const sidebarProfileImage = document.getElementById('sidebar-profile-image');
const sidebarProfileLocation = document.getElementById('sidebar-profile-location');
const postProfileImage = document.getElementById('post-profile-image');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchSuggestions = document.querySelector('.search-suggestions');
const postsFeed = document.getElementById('posts-feed');
const onlineUsers = document.querySelector('.online-users');
const onlineCount = document.querySelector('.online-count');

// State
let currentUser = null;
let posts = [];
let users = [];
let onlineUsersList = [];
let currentChat = null;

// Templates
const postTemplate = document.getElementById('post-template');
const userCardTemplate = document.getElementById('user-card-template');

// Check authentication status
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (storedUser) {
        // User is logged in
        currentUser = storedUser;
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        loginMessage.style.display = 'none';
        socialContainer.style.display = 'grid';
        
        // Update profile information
        updateProfileInfo();

        // Initialize social network
        initializeSocialNetwork();
    } else {
        // User is not logged in
        loginMessage.style.display = 'flex';
        socialContainer.style.display = 'none';
    }
});

// Update profile information
function updateProfileInfo() {
    const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
    
    // Update navbar profile
    profileName.textContent = currentUser.name;
    if (profileData.photoUrl) {
        profileImage.src = profileData.photoUrl;
    }

    // Update sidebar profile
    sidebarProfileName.textContent = currentUser.name;
    sidebarProfileImage.src = profileData.photoUrl || '../assets/default-avatar.svg';
    sidebarProfileLocation.textContent = profileData.location || 'Location not set';
    postProfileImage.src = profileData.photoUrl || '../assets/default-avatar.svg';

    // Update stats
    document.getElementById('posts-count').textContent = posts.filter(post => post.userId === currentUser.id).length;
    document.getElementById('followers-count').textContent = profileData.followers?.length || 0;
    document.getElementById('following-count').textContent = profileData.following?.length || 0;
}

// Initialize social network
function initializeSocialNetwork() {
    loadMockData();
    loadPostsFromLocalStorage(); // Load saved posts
    setupEventListeners();
    displayPosts();
    updateOnlineUsers();
}

// Load mock data
function loadMockData() {
    // Mock users data
    users = [
        {
            id: 1,
            name: 'John Farmer',
            email: 'john@example.com',
            location: 'Punjab',
            photoUrl: '../assets/default-avatar.svg',
            expertise: 'Organic Farming',
            followers: [],
            following: []
        },
        {
            id: 2,
            name: 'Sarah Expert',
            email: 'sarah@example.com',
            location: 'Maharashtra',
            photoUrl: '../assets/default-avatar.svg',
            expertise: 'Crop Protection',
            followers: [],
            following: []
        }
    ];

    // Mock posts data
    posts = [
        {
            id: 1,
            userId: 1,
            text: 'Just implemented a new organic farming technique! Yields are looking promising. #OrganicFarming #Sustainability',
            image: null,
            timestamp: new Date(Date.now() - 3600000),
            likes: [],
            comments: []
        },
        {
            id: 2,
            userId: 2,
            text: 'New research on pest control methods in sustainable agriculture. Check out these findings! #Research #Agriculture',
            image: null,
            timestamp: new Date(Date.now() - 7200000),
            likes: [],
            comments: []
        }
    ];

    // Mock online users
    onlineUsersList = users.slice(0, 2);
}

// Save posts to localStorage
function savePostsToLocalStorage() {
    localStorage.setItem('posts', JSON.stringify(posts));
}

// Load posts from localStorage
function loadPostsFromLocalStorage() {
    const savedPosts = localStorage.getItem('posts');
    if (savedPosts) {
        posts = JSON.parse(savedPosts);
        // Convert string timestamps back to Date objects
        posts.forEach(post => {
            post.timestamp = new Date(post.timestamp);
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.querySelector('.logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = '../home.html';
    });

    // Login redirect
    document.querySelector('.login-redirect-btn').addEventListener('click', () => {
        window.location.href = '../login.html';
    });

    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    searchBtn.addEventListener('click', handleSearch);

    // Create post
    const postTextarea = document.querySelector('.post-input textarea');
    const postBtn = document.querySelector('.post-btn');
    const imageInput = document.querySelector('.upload-image input');
    const imagePreview = document.querySelector('.image-preview');

    postBtn.addEventListener('click', () => {
        const text = postTextarea.value.trim();
        if (text) {
            const imageUrl = imagePreview.querySelector('img')?.src;
            createPost(text, imageUrl);
            postTextarea.value = '';
            imagePreview.innerHTML = '';
        } else {
            showToast('Please write something to post');
        }
    });

    // Also handle Enter key press (Ctrl/Cmd + Enter to post)
    postTextarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const text = postTextarea.value.trim();
            if (text) {
                const imageUrl = imagePreview.querySelector('img')?.src;
                createPost(text, imageUrl);
                postTextarea.value = '';
                imagePreview.innerHTML = '';
            } else {
                showToast('Please write something to post');
            }
        }
    });

    imageInput.addEventListener('change', handleImageUpload);

    // Profile navigation
    document.querySelector('.view-profile-btn').addEventListener('click', () => {
        showProfileModal(currentUser);
    });

    // Edit profile
    document.querySelector('.edit-profile-btn').addEventListener('click', showEditProfileModal);

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            handleNavigation(item.dataset.view);
        });
    });

    // Chat functionality
    document.querySelector('.back-to-users').addEventListener('click', () => {
        document.querySelector('.chat-container').style.display = 'none';
        document.querySelector('.online-users').style.display = 'block';
    });

    const chatInput = document.querySelector('.chat-input input');
    const sendBtn = document.querySelector('.send-btn');

    sendBtn.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message && currentChat) {
            sendMessage(message);
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message && currentChat) {
                sendMessage(message);
                chatInput.value = '';
            }
        }
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
        });
    });

    // Edit profile form
    document.getElementById('edit-profile-form').addEventListener('submit', handleEditProfile);
}

// Handle search
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (query) {
        const results = users.filter(user => 
            user.name.toLowerCase().includes(query) ||
            user.location.toLowerCase().includes(query) ||
            user.expertise?.toLowerCase().includes(query)
        );

        displaySearchResults(results);
        searchSuggestions.style.display = 'block';
    } else {
        searchSuggestions.style.display = 'none';
    }
}

// Display search results
function displaySearchResults(results) {
    searchSuggestions.innerHTML = '';
    
    results.forEach(user => {
        const clone = userCardTemplate.content.cloneNode(true);
        
        const avatar = clone.querySelector('.user-avatar');
        avatar.src = user.photoUrl || '../assets/default-avatar.svg';
        
        clone.querySelector('.user-name').textContent = user.name;
        clone.querySelector('.user-location').textContent = user.location;
        
        const followBtn = clone.querySelector('.follow-btn');
        const isFollowing = user.followers.includes(currentUser.id);
        if (isFollowing) {
            followBtn.textContent = 'Following';
            followBtn.classList.add('following');
        }
        
        followBtn.addEventListener('click', () => toggleFollow(user.id));
        
        searchSuggestions.appendChild(clone);
    });
}

// Create post
function createPost(text, imageUrl = null) {
    const post = {
        id: Date.now(), // Use timestamp as unique ID
        userId: currentUser.id,
        text,
        image: imageUrl,
        timestamp: new Date(),
        likes: [],
        comments: []
    };

    // Add post to the beginning of the array
    posts.unshift(post);

    // Save posts to localStorage
    savePostsToLocalStorage();
    
    // Update display
    displayPosts();
    updateProfileInfo();
    showToast('Post created successfully');
}

// Display posts
function displayPosts() {
    postsFeed.innerHTML = '';
    
    if (posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-seedling"></i>
                <h3>No Posts Yet</h3>
                <p>Be the first to share your agricultural updates!</p>
            </div>
        `;
        return;
    }
    
    posts.forEach(post => {
        const user = users.find(u => u.id === post.userId) || currentUser;
        const clone = postTemplate.content.cloneNode(true);
        
        const avatar = clone.querySelector('.post-avatar');
        avatar.src = user.photoUrl || '../assets/default-avatar.svg';
        
        clone.querySelector('.post-author').textContent = user.name;
        clone.querySelector('.post-time').textContent = formatTime(post.timestamp);
        clone.querySelector('.post-text').textContent = post.text;
        
        const postImage = clone.querySelector('.post-image');
        if (post.image) {
            postImage.src = post.image;
            postImage.style.display = 'block';
        }
        
        const likeBtn = clone.querySelector('.like-btn');
        const likesCount = clone.querySelector('.likes-count');
        likesCount.textContent = post.likes.length;
        
        if (post.likes.includes(currentUser.id)) {
            likeBtn.querySelector('i').classList.remove('far');
            likeBtn.querySelector('i').classList.add('fas');
            likeBtn.classList.add('active');
        }
        
        likeBtn.addEventListener('click', () => toggleLike(post.id));
        
        clone.querySelector('.comments-count').textContent = post.comments.length;
        
        const commentsSection = clone.querySelector('.post-comments');
        post.comments.forEach(comment => {
            const commentUser = users.find(u => u.id === comment.userId) || currentUser;
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
                <img src="${commentUser.photoUrl || '../assets/default-avatar.svg'}" alt="Profile" class="comment-avatar">
                <div class="comment-content">
                    <h4>${commentUser.name}</h4>
                    <p>${comment.text}</p>
                </div>
            `;
            commentsSection.appendChild(commentElement);
        });
        
        const commentInput = clone.querySelector('.add-comment input');
        const sendComment = clone.querySelector('.send-comment');
        
        sendComment.addEventListener('click', () => {
            const text = commentInput.value.trim();
            if (text) {
                addComment(post.id, text);
                commentInput.value = '';
            }
        });

        // Add delete button for user's own posts
        if (post.userId === currentUser.id) {
            const menuBtn = clone.querySelector('.post-menu-btn');
            menuBtn.style.display = 'block';
            menuBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this post?')) {
                    deletePost(post.id);
                }
            });
        } else {
            clone.querySelector('.post-menu-btn').style.display = 'none';
        }
        
        postsFeed.appendChild(clone);
    });
}

// Handle image upload
function handleImageUpload(e) {
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

// Toggle like
function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    const index = post.likes.indexOf(currentUser.id);
    
    if (index === -1) {
        post.likes.push(currentUser.id);
    } else {
        post.likes.splice(index, 1);
    }
    
    displayPosts();
}

// Add comment
function addComment(postId, text) {
    const post = posts.find(p => p.id === postId);
    post.comments.push({
        userId: currentUser.id,
        text,
        timestamp: new Date()
    });
    
    displayPosts();
}

// Toggle follow
function toggleFollow(userId) {
    const user = users.find(u => u.id === userId);
    const index = user.followers.indexOf(currentUser.id);
    
    if (index === -1) {
        user.followers.push(currentUser.id);
        currentUser.following.push(userId);
    } else {
        user.followers.splice(index, 1);
        currentUser.following.splice(currentUser.following.indexOf(userId), 1);
    }
    
    updateProfileInfo();
    displaySearchResults(users);
    showToast(index === -1 ? 'Started following user' : 'Unfollowed user');
}

// Update online users
function updateOnlineUsers() {
    onlineUsers.innerHTML = '';
    onlineCount.textContent = `${onlineUsersList.length} Online`;
    
    onlineUsersList.forEach(user => {
        const clone = userCardTemplate.content.cloneNode(true);
        
        const avatar = clone.querySelector('.user-avatar');
        avatar.src = user.photoUrl || '../assets/default-avatar.svg';
        
        clone.querySelector('.user-name').textContent = user.name;
        clone.querySelector('.user-location').textContent = user.location;
        
        const card = clone.querySelector('.user-card');
        card.addEventListener('click', () => startChat(user));
        
        onlineUsers.appendChild(clone);
    });
}

// Start chat
function startChat(user) {
    currentChat = user;
    document.querySelector('.online-users').style.display = 'none';
    
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.style.display = 'flex';
    
    const avatar = chatContainer.querySelector('.chat-avatar');
    avatar.src = user.photoUrl || '../assets/default-avatar.svg';
    
    chatContainer.querySelector('.chat-user-name').textContent = user.name;
    
    const messages = document.querySelector('.chat-messages');
    messages.innerHTML = `
        <div class="message-info">
            Start chatting with ${user.name}
        </div>
    `;
}

// Send message
function sendMessage(text) {
    const messages = document.querySelector('.chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message sent';
    messageElement.innerHTML = `
        <p>${text}</p>
        <span class="time">${formatTime(new Date())}</span>
    `;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;

    // Simulate response
    setTimeout(() => {
        const responseElement = document.createElement('div');
        responseElement.className = 'message received';
        responseElement.innerHTML = `
            <p>Thanks for your message! I'll get back to you soon.</p>
            <span class="time">${formatTime(new Date())}</span>
        `;
        messages.appendChild(responseElement);
        messages.scrollTop = messages.scrollHeight;
    }, 1000);
}

// Show profile modal
function showProfileModal(user) {
    const modal = document.getElementById('profile-modal');
    const avatar = modal.querySelector('.large-avatar');
    const name = modal.querySelector('.profile-name');
    const bio = modal.querySelector('.profile-bio');
    
    avatar.src = user.photoUrl || '../assets/default-avatar.svg';
    name.textContent = user.name;
    bio.textContent = user.bio || 'No bio available';
    
    showModal(modal);
}

// Show edit profile modal
function showEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
    
    form.elements['edit-name'].value = currentUser.name;
    form.elements['edit-location'].value = profileData.location || '';
    form.elements['edit-bio'].value = profileData.bio || '';
    form.elements['edit-expertise'].value = profileData.expertise || '';
    
    showModal(modal);
}

// Handle edit profile
function handleEditProfile(e) {
    e.preventDefault();
    
    const form = e.target;
    const profileData = {
        name: form.elements['edit-name'].value,
        location: form.elements['edit-location'].value,
        bio: form.elements['edit-bio'].value,
        expertise: form.elements['edit-expertise'].value
    };
    
    // Update current user
    currentUser.name = profileData.name;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update profile data
    localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(profileData));
    
    updateProfileInfo();
    hideModal(document.getElementById('edit-profile-modal'));
    showToast('Profile updated successfully');
}

// Handle navigation
function handleNavigation(view) {
    switch (view) {
        case 'feed':
            displayPosts();
            break;
        case 'profile':
            showProfileModal(currentUser);
            break;
        case 'messages':
            // Handle messages view
            break;
    }
}

// Utility functions
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Handle mobile menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Delete post
function deletePost(postId) {
    const index = posts.findIndex(p => p.id === postId);
    if (index !== -1) {
        posts.splice(index, 1);
        savePostsToLocalStorage();
        displayPosts();
        updateProfileInfo();
        showToast('Post deleted successfully');
    }
} 