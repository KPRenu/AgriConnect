document.addEventListener('DOMContentLoaded', async () => {
    // --- Navbar Auth & UI Logic --- 
    const user = await requireAuth(); // From auth.js, redirects if not logged in
    if (!user) return; // Stop script if redirection is happening or no user

    const loginButton = document.getElementById('nav-login-btn');
    const profileDropdown = document.getElementById('nav-profile-dropdown');
    const profileTrigger = profileDropdown ? profileDropdown.querySelector('.profile-trigger') : null;
    const dropdownContent = profileDropdown ? profileDropdown.querySelector('.dropdown-content') : null;
    const navProfileImage = document.getElementById('nav-profile-image');
    const navProfileName = document.getElementById('nav-profile-name');
    const logoutButton = document.getElementById('nav-logout-btn');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    async function updateUserNavbar() {
        const profile = await getCurrentUserProfile(); // from auth.js
        if (loginButton) loginButton.style.display = 'none';
        if (profileDropdown) profileDropdown.style.display = 'flex'; 

        if (profile) {
            if (navProfileName) navProfileName.textContent = profile.full_name || user.email.split('@')[0];
            if (navProfileImage) navProfileImage.src = profile.avatar_url || 'assets/default-avatar.svg';
        } else {
            if (navProfileName) navProfileName.textContent = user.email.split('@')[0];
            if (navProfileImage) navProfileImage.src = 'assets/default-avatar.svg';
        }
    }

    if (user) {
        updateUserNavbar();
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // from auth.js
        });
    }

    if (profileTrigger && dropdownContent) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        });
    }

    window.addEventListener('click', (event) => {
        if (dropdownContent && dropdownContent.style.display === 'block') {
            if (!profileDropdown.contains(event.target)) {
                dropdownContent.style.display = 'none';
            }
        }
    });

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // --- Message Page Logic ---
    const userList = document.getElementById('userList');
    const messageArea = document.getElementById('messageArea');
    const messageText = document.getElementById('messageText');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const userSearch = document.getElementById('userSearch');
    const searchButton = document.getElementById('searchButton');
    const chattingWith = document.getElementById('chattingWith');
    const tabButtons = document.querySelectorAll('.tab-button');

    const notificationButton = document.getElementById('notification-button');
    const notificationPanel = document.getElementById('notification-panel');
    const closeNotificationPanel = document.getElementById('close-notification-panel');
    const notificationList = document.getElementById('notification-list');
    const notificationCountBadge = document.querySelector('.notification-count');

    let currentChatUserId = null;
    let currentSection = 'allusers';
    let notifications = [];
    let realtimeChannel = null;

    // --- NEW/UPDATED LOGIC: Replaced renderUserList with this improved version ---
    async function renderUserList(section = 'allusers', searchTerm = '') {
        userList.innerHTML = '<p class="empty-list-message">Loading users...</p>'; 
        let usersToDisplay = [];
        let error = null;

        if (section === 'allusers') {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .neq('id', user.id);
            if (fetchError) error = fetchError;
            usersToDisplay = data || [];

        } else if (section === 'labor') {
            // This is the new logic for the Labor tab
            const { data, error: fetchError } = await supabase
                .from('labors')
                .select(`
                    user_id,
                    profile:profiles (id, full_name, avatar_url)
                `)
                .neq('user_id', user.id); // Don't show yourself in the list
            
            if (fetchError) error = fetchError;
            // The query returns nested data like { ..., profile: { id, full_name, ... } }
            // We need to transform it to match the structure the rest of the app expects.
            if (data) {
                usersToDisplay = data
                    .map(laborer => laborer.profile) // Extract the profile object
                    .filter(Boolean); // Filter out any potential null profiles
            }
        
        } else if (section === 'products') {
            // Placeholder for when you implement the products/vendors section
             userList.innerHTML = '<p class="empty-list-message">Product vendors section coming soon!</p>';
             return;
        }

        if (error) {
            console.error(`Error fetching users for section '${section}':`, error.message);
            userList.innerHTML = '<p class="empty-list-message">Could not load users.</p>';
            return;
        }

        if (searchTerm) {
            usersToDisplay = usersToDisplay.filter(u => 
                u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        userList.innerHTML = ''; // Clear current list
        if (usersToDisplay.length === 0) {
            userList.innerHTML = '<p class="empty-list-message">No users found.</p>';
            return;
        }

        usersToDisplay.forEach(profile => {
            const userElement = document.createElement('div');
            // This class was 'user-item', but your CSS uses '.user-list-item'. Let's unify them.
            userElement.className = 'user-list-item'; 
            userElement.dataset.userId = profile.id;
            userElement.innerHTML = `
                <img src="${profile.avatar_url || 'assets/default-avatar.svg'}" alt="${profile.full_name || 'User'}" class="user-avatar">
                <span class="user-name">${profile.full_name || 'Unnamed User'}</span>
            `;
            userElement.addEventListener('click', () => selectUserToChat(profile)); 
            userList.appendChild(userElement);
        });
    }

    async function selectUserToChat(profile) {
        if (!profile || !profile.id) return;
        if (currentChatUserId === profile.id) return;

        currentChatUserId = profile.id;
        chattingWith.textContent = profile.full_name || 'Unnamed User';
        
        document.querySelectorAll('.user-list-item').forEach(item => item.classList.remove('active-chat'));
        const userElementInList = userList.querySelector(`.user-list-item[data-user-id='${profile.id}']`);
        if (userElementInList) userElementInList.classList.add('active-chat');

        await loadChatHistory(currentChatUserId);
        subscribeToMessages(currentChatUserId);
    }
    
    // --- The rest of your message.js functions (loadChatHistory, sendMessageToSupabase, etc.) remain the same ---
    // (No changes are needed to the functions below this point)

    function formatTimestamp(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function appendMessageToUI(message, isSender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-item');
        messageElement.classList.add(isSender ? 'sent' : 'received');
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = message.content;

        const timestampElement = document.createElement('span');
        timestampElement.classList.add('message-timestamp');
        timestampElement.textContent = formatTimestamp(message.created_at);

        contentElement.appendChild(timestampElement);
        messageElement.appendChild(contentElement);
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    async function loadChatHistory(selectedUserId) {
        if (!supabase || !user || !user.id || !selectedUserId) return;
        messageArea.innerHTML = '<p class="empty-list-message">Loading messages...</p>';
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            messageArea.innerHTML = '';
            if (error) {
                console.error('Error fetching chat history:', error.message);
                messageArea.innerHTML = '<p class="empty-list-message">Could not load messages.</p>';
                return;
            }
            if (data && data.length > 0) {
                data.forEach(msg => {
                    appendMessageToUI(msg, msg.sender_id === user.id);
                });
            } else {
                messageArea.innerHTML = '<p class="empty-list-message">No messages yet. Start the conversation!</p>';
            }
        } catch (err) {
            console.error('Exception fetching chat history:', err);
            messageArea.innerHTML = '<p class="empty-list-message">Error loading messages.</p>';
        }
    }

    async function sendMessageToSupabase(receiverId, content) {
        if (!supabase || !user || !user.id || !receiverId || !content.trim()) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{ sender_id: user.id, receiver_id: receiverId, content: content.trim() }])
                .select(); 

            if (error) {
                console.error('Error sending message:', error.message);
                return null;
            }
            return data ? data[0] : null;
        } catch (err) {
            console.error('Exception sending message:', err);
            return null;
        }
    }

    function subscribeToMessages(selectedUserId) {
        if (!supabase || !user || !user.id || !selectedUserId) return;
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        realtimeChannel = supabase.channel(`messages_from_${selectedUserId}_to_${user.id}`);
        realtimeChannel
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`
                }, 
                (payload) => {
                    const newMessage = payload.new;
                    if (newMessage && newMessage.sender_id === selectedUserId) {
                         appendMessageToUI(newMessage, false);
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to messages with ${selectedUserId}`);
                } else if (err) {
                    console.error(`Subscription error with ${selectedUserId}:`, err);
                }
            });
    }

    async function handleSendMessage() {
        const text = messageText.value.trim();
        if (text && currentChatUserId) {
            const sentMessage = await sendMessageToSupabase(currentChatUserId, text);
            if (sentMessage) {
                appendMessageToUI(sentMessage, true); 
                messageText.value = ''; 
                messageArea.scrollTop = messageArea.scrollHeight;
            } else {
                alert('Message could not be sent. Please try again.');
            }
        }
    }

    if (sendMessageButton) sendMessageButton.addEventListener('click', handleSendMessage);
    if (messageText) messageText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            handleSendMessage();
        }
    });
    if (searchButton) searchButton.addEventListener('click', () => renderUserList(currentSection, userSearch.value.trim()));
    if (userSearch) userSearch.addEventListener('input', () => renderUserList(currentSection, userSearch.value.trim()));

    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentSection = button.dataset.section;
                currentChatUserId = null; 
                if(chattingWith) chattingWith.textContent = 'Select a user to chat';
                if(messageArea) messageArea.innerHTML = '<p class="empty-list-message">Select a user to chat from the list.</p>';
                if (realtimeChannel) {
                    supabase.removeChannel(realtimeChannel);
                    realtimeChannel = null;
                }
                await renderUserList(currentSection, userSearch.value.trim());
            });
        });
    }

    // --- Notification Logic ---
    // (This section is unchanged and can be expanded later)

    // Initial page load
    await renderUserList(currentSection);

});