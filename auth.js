// Supabase initialization
const SUPABASE_URL = 'https://okfimwkadvpsuxtmddxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmltd2thZHZwc3V4dG1kZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjIzOTksImV4cCI6MjA2NTAzODM5OX0.CA1aBCuesKxcoePUOA6P_yd1QWkQH-3CAA2JD_buQnY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Checks if a user is currently logged in.
 * If not, redirects to login.html.
 * @returns {Promise<User|null>} The Supabase user object if logged in, otherwise null after redirect.
 */
async function requireAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        window.location.href = 'login.html';
        return null;
    }
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session.user;
}

// FILE: auth.js

/**
 * Fetches the public profile of the current user.
 * @returns {Promise<object|null>} The user's profile data or null if not found/error.
 */
async function getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('No user logged in to fetch profile.');
        return null;
    }

    try {
        const { data, error, status } = await supabase
            .from('profiles')
            // CORRECTED LINE: Added 'id' to the select list
            .select('id, full_name, email, avatar_url, gender, age, phone, description, address, city, state, country')
            .eq('id', user.id)
            .single();

        if (error && status !== 406) { 
            console.error('Error fetching profile:', error.message);
            return null;
        }
        return data;
    } catch (catchError) {
        console.error('Exception fetching profile:', catchError.message);
        return null;
    }
}

/**
 * Updates the public profile of the current user.
 * @param {object} profileData - An object containing the profile fields to update.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function updateUserProfile(profileData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated to update profile.');
        return false;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update(profileData) // updated_at is handled by DB trigger
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error.message);
            return false;
        }
        return true;
    } catch (catchError) {
        console.error('Exception updating profile:', catchError.message);
        return false;
    }
}

/**
 * Uploads a profile photo to Supabase Storage.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string|null>} The public URL of the uploaded image or null if error.
 */
async function uploadProfilePhoto(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated to upload photo.');
        return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Path: user_id/timestamp.ext

    try {
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true }); // upsert true to overwrite if same path (e.g. user_id/avatar.png)

        if (uploadError) {
            console.error('Error uploading photo:', uploadError.message);
            return null;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (catchError) {
        console.error('Exception uploading photo:', catchError.message);
        return null;
    }
}

/**
 * Logs out the current user and redirects to login.html.
 */
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
    } else {
        // Clear any local user state if necessary
        window.location.href = 'login.html';
    }
}

// Expose functions to global scope if needed, or use as ES modules if your setup supports it.
// For simple script includes, they are already global.
