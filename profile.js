document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user and get user object
    const user = await requireAuth(); // From auth.js, redirects if not logged in
    if (!user) return; // Stop script execution if redirection is happening

    // DOM Elements for profile data
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const navProfileName = document.getElementById('nav-profile-name');
    const navProfileImage = document.getElementById('nav-profile-image');
    const profilePhotoDisplay = document.getElementById('profile-photo'); // Main photo on profile page
    const logoutButton = document.getElementById('nav-logout-btn');

    // DOM Elements for photo upload and preview
    const photoUploadInput = document.getElementById('photo-upload');
    const profilePhotoSection = document.querySelector('.profile-photo-section .profile-photo'); // More specific selector

    // DOM Elements for navbar profile dropdown toggle
    const profileTrigger = document.querySelector('.profile-trigger'); // In Navbar
    const profileDropdown = document.getElementById('nav-profile-dropdown'); // In Navbar
    const dropdownContent = document.querySelector('#nav-profile-dropdown .dropdown-content'); // In Navbar

    // Additional DOM elements for the profile form
    const profileForm = document.getElementById('profile-form');
    const genderInput = document.getElementById('gender');
    const ageInput = document.getElementById('age');
    const phoneInput = document.getElementById('phone');
    const descriptionInput = document.getElementById('description');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const countryInput = document.getElementById('country');

    // Function to load and display profile data
    async function loadProfileData() {
        const profile = await getCurrentUserProfile(); // From auth.js

        if (profile) {
            if (fullNameInput) fullNameInput.value = profile.full_name || '';
            if (emailInput) emailInput.value = profile.email || user.email; // Email from profile or auth user
            if (navProfileName) navProfileName.textContent = profile.full_name || user.email.split('@')[0];
            
            const avatarSrc = profile.avatar_url || 'assets/default-avatar.svg';
            if (navProfileImage) navProfileImage.src = avatarSrc;
            if (profilePhotoDisplay) profilePhotoDisplay.src = avatarSrc;

            // Populate other fields
            if (genderInput && profile.gender) genderInput.value = profile.gender;
            if (ageInput && profile.age) ageInput.value = profile.age;
            if (phoneInput && profile.phone) phoneInput.value = profile.phone;
            if (descriptionInput && profile.description) descriptionInput.value = profile.description;
            if (addressInput && profile.address) addressInput.value = profile.address;
            if (cityInput && profile.city) cityInput.value = profile.city;
            if (stateInput && profile.state) stateInput.value = profile.state;
            if (countryInput && profile.country) countryInput.value = profile.country;

        } else {
            // Fallback if profile data is not found but user is authenticated
            if (emailInput) emailInput.value = user.email;
            if (navProfileName) navProfileName.textContent = user.email.split('@')[0];
            if (navProfileImage) navProfileImage.src = 'assets/default-avatar.svg';
            if (profilePhotoDisplay) profilePhotoDisplay.src = 'assets/default-avatar.svg';
            console.warn('User profile data not found in database. Displaying default/auth info.');
        }
        // Ensure profile dropdown is visible as user is logged in
        if(profileDropdown) profileDropdown.style.display = 'flex';
    }

    await loadProfileData();

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // from auth.js
        });
    }

    // Handle profile photo click to open file dialog
    if (profilePhotoSection && photoUploadInput) {
        profilePhotoSection.addEventListener('click', () => {
            photoUploadInput.click();
        });

        // Preview selected image
        photoUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && profilePhotoDisplay) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    profilePhotoDisplay.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Navbar Profile dropdown toggle logic (ensure it's not conflicting with home.js if that's global)
    if (profileTrigger && dropdownContent) {
        profileTrigger.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Close dropdown when clicking outside - specific to this dropdown instance
    window.addEventListener('click', (event) => {
        if (profileDropdown && dropdownContent && !profileDropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Profile form submission logic (profileForm was already declared above)
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Show some loading indicator if you have one

            let avatarUrl = profilePhotoDisplay.src; // Current avatar or default
            const file = photoUploadInput.files[0];

            if (file) {
                // Validate file type and size (optional, add client-side validation if needed)
                const newAvatarUrl = await uploadProfilePhoto(file); // from auth.js
                if (newAvatarUrl) {
                    avatarUrl = newAvatarUrl;
                } else {
                    alert('Error uploading photo. Please try again.');
                    // Hide loading indicator
                    return; // Stop if photo upload failed
                }
            }

            // Determine the final avatar URL for the database
            // If avatarUrl is a blob (preview) or the default placeholder, set to null for DB.
            const finalAvatarUrlForDb = (avatarUrl.startsWith('blob:') || avatarUrl.endsWith('assets/default-avatar.svg')) 
                                      ? null 
                                      : avatarUrl;

            const profileData = {
                full_name: fullNameInput.value,
                avatar_url: finalAvatarUrlForDb,
                gender: genderInput.value,
                age: ageInput.value ? parseInt(ageInput.value) : null,
                phone: phoneInput.value,
                description: descriptionInput.value,
                address: addressInput.value,
                city: cityInput.value,
                state: stateInput.value,
                country: countryInput.value,
                // email is not updated here as it's managed by Supabase auth and is read-only in the form
            };

            // Remove null or undefined properties to avoid overwriting existing data with nulls unless intended
            for (const key in profileData) {
                if (profileData[key] === null || profileData[key] === undefined || profileData[key] === '') {
                    // For text fields, if you want to clear them, send empty string or handle on backend.
                    // For now, let's assume empty string means clear, but null/undefined means no change or set to null.
                    // Supabase client might handle this by not including null fields in the update if not specified.
                    // To be safe, if you want to explicitly set a field to null, ensure it's in the object.
                    // If you want to clear a text field, an empty string is fine.
                }
            }
            
            // If avatarUrl is the default one and it was not changed, don't send it unless it's a new profile
            // This logic can be complex; for now, we send what we have.
            if (avatarUrl === 'assets/default-avatar.svg' && !file) {
                 // If it's still the default and no new file, consider not sending avatar_url
                 // or sending null if you want to clear a previously set one.
                 // For simplicity, we'll send it. If it's the default placeholder, Supabase might ignore it or store it.
            }

            const success = await updateUserProfile(profileData); // from auth.js

            if (success) {
                alert('Profile updated successfully!');
                // Determine what to display based on what was saved (finalAvatarUrlForDb)
                const displayAvatar = finalAvatarUrlForDb || 'assets/default-avatar.svg';
                
                if (navProfileName) navProfileName.textContent = profileData.full_name || user.email.split('@')[0];
                if (navProfileImage) navProfileImage.src = displayAvatar;
                if (profilePhotoDisplay) profilePhotoDisplay.src = displayAvatar;
            } else {
                alert('Error updating profile. Please check the console for details.');
            }
            // Hide loading indicator
        });
    }
});