document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const laborContainer = document.querySelector('.labor-container');
    const loginMessage = document.querySelector('.login-message');
    const laborGrid = document.getElementById('labor-grid');

    // Buttons
    const registerLaborBtn = document.getElementById('register-labor-btn');
    const viewBookingsBtn = document.getElementById('view-bookings-btn');
    const notificationBtn = document.getElementById('notification-btn');
    const searchBtn = document.getElementById('search-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Inputs
    const searchInput = document.getElementById('search-input');
    
    // Modals & Forms
    const registerLaborModal = document.getElementById('register-labor-modal');
    const bookingModal = document.getElementById('booking-modal');
    const myBookingsModal = document.getElementById('my-bookings-modal');
    const notificationModal = document.getElementById('notification-modal');
    const registerLaborForm = document.getElementById('register-labor-form');
    const bookingForm = document.getElementById('booking-form');
    
    // --- NEW/UPDATED SECTION: State Management for Search & Filter ---
    let currentUser = null;
    let userProfile = null;
    let currentFilter = 'all';
    let searchQuery = '';

    // --- 1. AUTHENTICATION & INITIALIZATION ---
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        loginMessage.style.display = 'none';
        laborContainer.style.display = 'block';
        await initializePage();
    } else {
        loginMessage.style.display = 'flex';
        laborContainer.style.display = 'none';
    }
    
    async function initializePage() {
        userProfile = await getCurrentUserProfile();
        setupEventListeners();
        fetchAndRenderLaborers(); // Initial data load
        fetchNotifications();
        
        const profileDropdown = document.getElementById('nav-profile-dropdown');
        const loginNavBtn = document.getElementById('nav-login-btn');
        if (profileDropdown && loginNavBtn) {
            profileDropdown.style.display = 'flex';
            loginNavBtn.style.display = 'none';
            document.getElementById('nav-profile-name').textContent = userProfile.full_name || currentUser.email;
            document.getElementById('nav-profile-image').src = userProfile.avatar_url || 'assets/default-avatar.svg';
            document.getElementById('nav-logout-btn').addEventListener('click', () => logout());
        }
    }
    
    // --- 2. DATA FETCHING (Now combined for search and filter) ---
    // --- NEW/UPDATED SECTION: Combined Fetching Logic ---
    async function fetchAndRenderLaborers() {
        laborGrid.innerHTML = '<p>Loading laborers...</p>';

        let query = supabase
            .from('labors')
            .select(`
                *,
                profile:profiles(full_name, city, state, phone)
            `);

        // 1. Apply the work_type filter if it's not 'all'
        if (currentFilter !== 'all') {
            query = query.eq('work_type', currentFilter);
        }

        // 2. Apply the search query if it exists
        if (searchQuery) {
            // This searches for the query text in the laborer's full name from the related 'profiles' table.
            // The 'ilike' makes it case-insensitive.
            query = query.ilike('profiles.full_name', `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching laborers:', error);
            laborGrid.innerHTML = '<p>Could not load laborers at this time.</p>';
            return;
        }
        renderLaborers(data);
    }
    
    async function fetchNotifications() {
        // ... (this function is unchanged)
        const { data, error, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (error) return;

        const countSpan = document.getElementById('notification-count');
        if (count > 0) {
            countSpan.textContent = count;
            countSpan.style.display = 'flex';
        } else {
            countSpan.style.display = 'none';
        }
    }

    // --- 3. RENDERING ---
    function renderLaborers(laborers) {
        // ... (this function is unchanged)
        laborGrid.innerHTML = '';
        if (laborers.length === 0) {
            laborGrid.innerHTML = '<p>No laborers found matching your criteria.</p>';
            return;
        }

        const template = document.getElementById('labor-card-template');
        laborers.forEach(laborer => {
            const card = template.content.cloneNode(true);
            card.querySelector('.labor-name').textContent = laborer.profile.full_name;
            card.querySelector('.location').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${laborer.profile.city || 'N/A'}`;
            card.querySelector('.experience').innerHTML = `<i class="fas fa-briefcase"></i> ${laborer.experience} years exp.`;
            card.querySelector('.work-type').textContent = laborer.work_type;
            card.querySelector('.labor-description').textContent = laborer.description;
            card.querySelector('.labor-image img').src = laborer.photo_url || 'assets/default-avatar.svg';
            
            const availabilityBadge = card.querySelector('.availability-badge');
            availabilityBadge.textContent = laborer.is_available ? 'Available' : 'Unavailable';
            availabilityBadge.style.background = laborer.is_available ? 'var(--success)' : 'var(--danger)';

            const bookBtn = card.querySelector('.book-btn');
            const deleteBtn = card.querySelector('.delete-btn');

            if (laborer.user_id === currentUser.id) {
                bookBtn.style.display = 'none';
                deleteBtn.style.display = 'block';
                deleteBtn.onclick = () => handleDeleteLaborer(laborer.id);
            } else {
                bookBtn.onclick = () => openBookingModal(laborer);
            }

            laborGrid.appendChild(card);
        });
    }
    
    // --- 4. EVENT LISTENERS & HANDLERS ---
    function setupEventListeners() {
        // --- NEW/UPDATED SECTION: Event listeners for search and filter ---

        // Modal handling (unchanged)
        document.querySelectorAll('.modal .close-modal').forEach(btn => {
            btn.onclick = () => btn.closest('.modal').style.display = 'none';
        });
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };
        
        // Modal Triggers (unchanged)
        registerLaborBtn.onclick = openRegisterModal;
        viewBookingsBtn.onclick = openMyBookingsModal;
        notificationBtn.onclick = openNotificationModal;
        
        // Form Submissions (unchanged)
        registerLaborForm.onsubmit = handleRegisterLabor;
        bookingForm.onsubmit = handleCreateBooking;

        // Search button
        searchBtn.addEventListener('click', () => {
            searchQuery = searchInput.value.trim();
            fetchAndRenderLaborers();
        });

        // Search on Enter key press
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchQuery = searchInput.value.trim();
                fetchAndRenderLaborers();
            }
        });

        // Filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active button style
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update state and re-fetch data
                currentFilter = button.dataset.type;
                fetchAndRenderLaborers();
            });
        });
    }

    // --- The rest of the handler functions (handleRegisterLabor, handleCreateBooking, handleDeleteLaborer) are unchanged. ---

    async function handleRegisterLabor(e) {
        e.preventDefault();
        const form = e.target;
        let photoUrl = null;
        
        const photoFile = form.querySelector('#labor-photo').files[0];
        if (photoFile) {
            const fileName = `${currentUser.id}/${Date.now()}_${photoFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('labor')
                .upload(fileName, photoFile);
            if (uploadError) return alert('Error uploading photo: ' + uploadError.message);
            
            const { data: urlData } = supabase.storage.from('labor').getPublicUrl(uploadData.path);
            photoUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('labors').insert({
            id: currentUser.id,
            user_id: currentUser.id,
            work_type: form.querySelector('#labor-work-type').value,
            experience: form.querySelector('#labor-experience').value,
            description: form.querySelector('#labor-description').value,
            photo_url: photoUrl
        });

        if (error) {
            console.error('Error during registration:', error);
            return alert('Error registering: ' + error.message);
        }
        
        alert('Successfully registered as a laborer!');
        registerLaborModal.style.display = 'none';
        fetchAndRenderLaborers();
    }
    
    async function handleCreateBooking(e) {
        e.preventDefault();
        const form = e.target;
        const laborId = form.querySelector('#booking-labor-id').value;

        const { error } = await supabase.from('bookings').insert({
            labor_id: laborId,
            client_id: currentUser.id,
            work_date: form.querySelector('#booking-date').value,
            duration: form.querySelector('#booking-duration').value,
            work_details: form.querySelector('#booking-details').value,
            work_location: form.querySelector('#booking-location').value,
        });
        
        if (error) return alert('Error creating booking: ' + error.message);
        
        await supabase.from('notifications').insert({
            user_id: laborId,
            from_user_id: currentUser.id,
            type: 'booking_request',
            message: `${userProfile.full_name || 'A user'} has requested to book you.`
        });

        alert('Booking request sent successfully!');
        bookingModal.style.display = 'none';
    }

    async function handleDeleteLaborer(laborerId) {
        if (!confirm('Are you sure you want to delete your labor profile? This action cannot be undone.')) return;

        const { error } = await supabase.from('labors').delete().eq('id', laborerId);
        if (error) return alert('Error deleting profile: ' + error.message);
        
        alert('Your labor profile has been deleted.');
        fetchAndRenderLaborers();
    }

    // --- 5. MODAL LOGIC ---
    // --- All modal functions are unchanged ---
    function openRegisterModal() {
        document.getElementById('labor-name').value = userProfile.full_name || '';
        document.getElementById('labor-contact').value = userProfile.phone || '';
        registerLaborModal.style.display = 'block';
    }

    function openBookingModal(laborer) {
        document.getElementById('booking-labor-id').value = laborer.id;
        document.getElementById('booking-laborer-name').textContent = laborer.profile.full_name;
        bookingModal.style.display = 'block';
    }
    
    async function openMyBookingsModal() {
        myBookingsModal.style.display = 'block';
        const list = document.getElementById('bookings-list');
        list.innerHTML = '<p>Loading...</p>';
        
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                client:profiles!client_id(full_name, avatar_url),
                laborer:labors!labor_id(profile:profiles(full_name, avatar_url))
            `)
            .or(`client_id.eq.${currentUser.id},labor_id.eq.${currentUser.id}`);

        if(error) return list.innerHTML = `<p>Error fetching bookings: ${error.message}</p>`;
        
        if(data.length === 0) return list.innerHTML = '<p>You have no bookings.</p>';
        
        list.innerHTML = data.map(booking => `
            <div class="booking-item">
                <img src="${booking.client.avatar_url || 'assets/default-avatar.svg'}" alt="User">
                <div class="booking-details">
                    <h4>Booking from ${booking.client.full_name} for ${booking.laborer.profile.full_name}</h4>
                    <p>Date: ${booking.work_date} | Location: ${booking.work_location}</p>
                    <p class="booking-status">${booking.status}</p>
                </div>
            </div>
        `).join('');
    }

    async function openNotificationModal() {
        notificationModal.style.display = 'block';
        const list = document.getElementById('notification-list');
        list.innerHTML = '<p>Loading notifications...</p>';

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) return list.innerHTML = `<p>Error: ${error.message}</p>`;
        if (data.length === 0) return list.innerHTML = '<p>No notifications.</p>';

        list.innerHTML = data.map(n => `
            <div class="notification-item ${n.is_read ? 'is-read' : ''}">
                <p>${n.message}</p>
                <small>${new Date(n.created_at).toLocaleString()}</small>
            </div>
        `).join('');
        
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        
        fetchNotifications();
    }
});