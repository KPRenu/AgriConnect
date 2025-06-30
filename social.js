let currentUser = null;

// --- Auth & Profile Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    // Enforce authentication
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;
    await loadSidebarProfile();
    await loadUserStats();
    await loadPosts();
    await loadNotifications();
    setupNavbar();
});

async function loadSidebarProfile() {
    const profile = await getCurrentUserProfile();
    document.getElementById('currentUserName').textContent = profile?.full_name || 'User';
    document.getElementById('currentUserBio').textContent = profile?.description || '';
    document.getElementById('currentUserImg').src = profile?.avatar_url || 'assets/default-avatar.svg';
}

async function getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, description')
        .eq('id', user.id)
        .single();
    return data || null;
}

async function loadUserStats() {
    const userId = currentUser.id;
    // Posts count
    const { count: postsCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    document.getElementById('currentUserPosts').querySelector('.stat-number').textContent = postsCount || 0;
    // Followers count
    const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);
    document.getElementById('currentUserFollowers').querySelector('.stat-number').textContent = followersCount || 0;
    // Following count
    const { count: followingCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId);
    document.getElementById('currentUserFollowing').querySelector('.stat-number').textContent = followingCount || 0;
}

// --- Post CRUD ---
document.getElementById('updatePostBtn').addEventListener('click', createPost);

// Custom Upload Image Button Logic
const postImageInput = document.getElementById('postImage');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imageNameSpan = document.getElementById('imageName');
const imagePreview = document.getElementById('imagePreview');

uploadImageBtn.addEventListener('click', () => {
    postImageInput.click();
});

postImageInput.addEventListener('change', () => {
    const file = postImageInput.files[0];
    if (file) {
        imageNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    } else {
        imageNameSpan.textContent = '';
        imagePreview.src = '';
        imagePreview.style.display = 'none';
    }
});

async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('postImage').files[0];
    if (!content && !imageFile) {
        alert('Please add some content or an image');
        return;
    }
    let imageUrl = null;
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, imageFile);
        if (uploadError) {
            alert('Image upload failed: ' + uploadError.message);
            return;
        }
        const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
    }
    const { error } = await supabase
        .from('posts')
        .insert([{ user_id: currentUser.id, content, image_url: imageUrl }]);
    if (error) {
        alert('Failed to create post: ' + error.message);
        return;
    }
    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    imageNameSpan.textContent = '';
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    await loadUserStats();
    await loadPosts();
}

async function loadPosts() {
    // Load posts with author profile and likes
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`*, profiles: user_id (id, full_name, avatar_url), likes (user_id)`)
        .order('created_at', { ascending: false });

    // If there is an error, LOG IT to the console to see what's wrong.
    if (error) {
        console.error('Error loading posts:', error); // <-- ADD THIS LINE
        document.getElementById('postFeed').innerHTML = '<div class="loading">Failed to load posts. Check the console for details.</div>';
        return;
    }
    
    // For each post, check if current user follows the author (batch follow check)
    if (posts && posts.length && currentUser) {
        const authorIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
        let followsMap = {};
        if (authorIds.length) {
            const { data: followsData } = await supabase
                .from('follows')
                .select('follower_id, following_id')
                .in('follower_id', [currentUser.id])
                .in('following_id', authorIds);
            if (followsData) {
                followsData.forEach(f => {
                    followsMap[f.following_id] = true;
                });
            }
        }
        // Attach follow info to each post
        posts.forEach(post => {
            post.isFollowing = followsMap[post.user_id] || false;
        });
    }
    renderPosts(posts || []);
}

function renderPosts(posts) {
    const postFeed = document.getElementById('postFeed');
    if (!posts.length) {
        postFeed.innerHTML = '<div class="loading">No posts to show</div>';
        return;
    }
    postFeed.innerHTML = posts.map(post => {
        const isOwn = post.user_id === currentUser.id;
        const isLiked = Array.isArray(post.likes) && post.likes.some(like => like.user_id === currentUser.id);
        // Use isFollowing property set in loadPosts
        const isFollowing = !!post.isFollowing;
        return `<div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user-info">
                    <img src="${post.profiles?.avatar_url || 'assets/default-avatar.svg'}" alt="${post.profiles?.full_name || 'User'}" class="post-user-img">
                    <div class="post-user-name">${post.profiles?.full_name || 'User'}</div>
                </div>
                <button class="follow-btn${isFollowing ? ' following' : ''}" onclick="toggleFollow('${post.user_id}')">${isFollowing ? 'Following' : 'Follow'}</button>
            </div>
            <div class="post-content">${post.content || ''}</div>
            ${post.image_url ? `<img src="${post.image_url}" alt="Post image" class="post-image">` : ''}
            <div class="post-actions">
                <button class="action-btn${isLiked ? ' liked' : ''}" onclick="toggleLike('${post.id}')">❤️ ${Array.isArray(post.likes) ? post.likes.length : 0}</button>
                <button class="action-btn" onclick="openPostModal('${post.id}')">💬</button>
                <button class="action-btn" onclick="sharePost('${post.id}')">🔄</button>
                <button class="action-btn" onclick="window.location.href='message.html'">✉️ Message</button>
                ${isOwn ? `<button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

async function toggleLike(postId) {
    // Like/unlike logic
    const { data: like, error } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .single();
    if (like) {
        await supabase.from('likes').delete().eq('id', like.id);
    } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
        await sendNotificationToPostOwner(postId, 'like');
    }
    await loadPosts();
}

async function toggleFollow(userId) {
    if (userId === currentUser.id) return;
    const { data: follow, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single();
    if (follow) {
        await supabase.from('follows').delete().eq('id', follow.id);
    } else {
        await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: userId }]);
        await sendNotification(userId, 'follow', `${currentUser.email} started following you`);
    }
    await loadUserStats();
    await loadPosts();
}

async function deletePost(postId) {
    await supabase.from('posts').delete().eq('id', postId);
    await loadUserStats();
    await loadPosts();
}

// --- Notifications ---
async function loadNotifications() {
    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    updateNotificationUI(notifications || []);
}

function updateNotificationUI(notifications) {
    const notificationCount = notifications.filter(n => !n.is_read).length;
    const notifCountSpan = document.getElementById('notificationCount');
    notifCountSpan.textContent = notificationCount;
    notifCountSpan.style.display = notificationCount > 0 ? 'inline-block' : 'none';
    document.getElementById('notificationList').innerHTML = notifications.length
        ? notifications.map(n => `<div class="notification-item${n.is_read ? '' : ' unread'}">${n.message}</div>`).join('')
        : '<div class="loading">No notifications</div>';
}

document.getElementById('notificationBtn').addEventListener('click', () => {
    document.getElementById('notificationModal').style.display = 'block';
    markAllNotificationsRead();
});
document.getElementById('closeNotifications').addEventListener('click', () => {
    document.getElementById('notificationModal').style.display = 'none';
});

async function markAllNotificationsRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
    await loadNotifications();
}

async function sendNotificationToPostOwner(postId, type) {
    // Get post owner
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== currentUser.id) {
        await sendNotification(post.user_id, type, `${currentUser.email} liked your post`, postId);
    }
}
async function sendNotification(userId, type, message, postId = null) {
    await supabase.from('notifications').insert([{ user_id: userId, from_user_id: currentUser.id, type, message, post_id: postId }]);
}

// --- Post Modal ---
function openPostModal(postId) {
    loadUserPosts(postId);
    document.getElementById('postModal').style.display = 'block';
}
document.getElementById('closePostModal').addEventListener('click', () => {
    document.getElementById('postModal').style.display = 'none';
});
async function loadUserPosts(postId) {
    const { data: post, error } = await supabase
        .from('posts')
        .select('*, profiles: user_id (full_name, avatar_url)')
        .eq('id', postId)
        .single();
    if (!post) {
        document.getElementById('postModalContent').innerHTML = '<div class="loading">Post not found</div>';
        return;
    }
    document.getElementById('postModalContent').innerHTML = `<div class="post-card">
        <div class="post-header">
            <div class="post-user-info">
                <img src="${post.profiles?.avatar_url || 'assets/default-avatar.svg'}" alt="${post.profiles?.full_name || 'User'}" class="post-user-img">
                <div class="post-user-name">${post.profiles?.full_name || 'User'}</div>
            </div>
        </div>
        <div class="post-content">${post.content || ''}</div>
        ${post.image_url ? `<img src="${post.image_url}" alt="Post image" class="post-image">` : ''}
    </div>`;
}

// --- Navbar/Logout/Profile Dropdown Setup ---
function setupNavbar() {
    const loginButton = document.getElementById('nav-login-btn');
    const profileDropdown = document.getElementById('nav-profile-dropdown');
    const profileNameNav = document.getElementById('nav-profile-name');
    const profileImageNav = document.getElementById('nav-profile-image');
    const logoutButton = document.getElementById('nav-logout-btn');
    if(loginButton) loginButton.style.display = 'none';
    if(profileDropdown) profileDropdown.style.display = 'flex';
    getCurrentUserProfile().then(profile => {
        if (profileNameNav) profileNameNav.textContent = profile?.full_name || currentUser.email;
        if (profileImageNav) profileImageNav.src = profile?.avatar_url || 'assets/default-avatar.svg';
    });
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // from auth.js
        });
    }
    // Profile dropdown toggle
    const profileTrigger = document.querySelector('.profile-trigger');
    if (profileTrigger) {
        profileTrigger.addEventListener('click', (event) => {
            event.stopPropagation();
            const content = profileTrigger.nextElementSibling;
            if (content && content.classList.contains('dropdown-content')) {
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    // Close dropdown if clicked outside
    window.addEventListener('click', function(event) {
        if (profileDropdown && !profileDropdown.contains(event.target)) {
            const content = document.querySelector('.profile-dropdown .dropdown-content');
            if (content) content.style.display = 'none';
        }
    });
}
// --- Search (basic, can be expanded) ---
document.getElementById('searchInput').addEventListener('input', async (e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length < 2) return;
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(5);
    // Show results as a dropdown or log to console
    console.log('Search results:', data);
});
