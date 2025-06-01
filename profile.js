// DOM Elements
const profileForm = document.getElementById('profile-form');
const photoUpload = document.getElementById('photo-upload');
const profilePhoto = document.getElementById('profile-photo');
const profilePhotoSection = document.querySelector('.profile-photo');
const navProfileImage = document.getElementById('nav-profile-image');
const navProfileName = document.getElementById('nav-profile-name');

// Load user data
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Load existing profile data
    const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
    
    // Set form values
    document.getElementById('fullName').value = currentUser.name || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('gender').value = profileData.gender || '';
    document.getElementById('age').value = profileData.age || '';
    document.getElementById('phone').value = profileData.phone || '';
    document.getElementById('description').value = profileData.description || '';
    document.getElementById('address').value = profileData.address || '';
    document.getElementById('city').value = profileData.city || '';
    document.getElementById('state').value = profileData.state || '';

    // Load profile photo
    if (profileData.photoUrl) {
        profilePhoto.src = profileData.photoUrl;
        navProfileImage.src = profileData.photoUrl;
    }

    // Update navigation profile name
    navProfileName.textContent = currentUser.name;
});

// Handle profile photo upload
profilePhotoSection.addEventListener('click', () => {
    photoUpload.click();
});

photoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoUrl = e.target.result;
            profilePhoto.src = photoUrl;
            navProfileImage.src = photoUrl;
            
            // Save photo URL to profile data
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
            profileData.photoUrl = photoUrl;
            localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(profileData));
        };
        reader.readAsDataURL(file);
    }
});

// Handle form submission
profileForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const formData = {
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        phone: document.getElementById('phone').value,
        description: document.getElementById('description').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        photoUrl: profilePhoto.src !== 'assets/default-avatar.svg' ? profilePhoto.src : null
    };

    // Update user name
    const newName = document.getElementById('fullName').value;
    currentUser.name = newName;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update users array
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex].name = newName;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Save profile data
    localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(formData));

    // Update UI
    navProfileName.textContent = newName;

    // Show success message
    alert('Profile updated successfully!');
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
});

// Profile dropdown toggle
const profileTrigger = document.querySelector('.profile-trigger');
const dropdownContent = document.querySelector('.dropdown-content');

if (profileTrigger) {
    profileTrigger.addEventListener('click', () => {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileTrigger?.contains(e.target)) {
        dropdownContent.style.display = 'none';
    }
}); 