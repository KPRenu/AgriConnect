// --- GLOBAL CONFIG & STATE ---
// **** IMPORTANT: REPLACE 'YOUR_GEMINI_API_KEY' WITH YOUR ACTUAL KEY ****
const GEMINI_API_KEY = 'AIzaSyConAV73s-2I62GgcGVmHHg8Y7Ky0pMtxU'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const md = window.markdownit({ breaks: true, linkify: true });

let currentUser = null;
let chatHistory = [];

// --- DOM ELEMENTS ---
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-message');
const voiceButton = document.getElementById('voice-input');
const clearButton = document.getElementById('clear-chat');
const loadingIndicator = document.querySelector('.loading-indicator');

// --- SUPABASE CRUD FUNCTIONS ---
async function getChatHistory() {
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });
        if (error) throw error;
        chatHistory = data;
        renderChatHistory();
    } catch (error) {
        console.error("Error fetching chat history:", error);
    }
}

async function saveMessage(role, content) {
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .insert([{ user_id: currentUser.id, role, content }])
            .select();
        if (error) throw error;
        chatHistory.push(data[0]);
    } catch (error) {
        console.error("Error saving message:", error);
    }
}

async function deleteChatHistory() {
    try {
        const { error } = await supabase
            .from('chat_history')
            .delete()
            .eq('user_id', currentUser.id);
        if (error) throw error;
        chatHistory = [];
        renderChatHistory(); // Re-render to show empty state + welcome
    } catch (error) {
        console.error("Error deleting chat history:", error);
    }
}

// --- UI RENDERING ---
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    const iconClass = role === 'user' ? 'fa-user' : 'fa-robot';
    const renderedContent = md.render(content);

    messageDiv.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <div class="message-content">${renderedContent}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatHistory() {
    chatMessages.innerHTML = '';
    if (chatHistory.length === 0) {
        appendMessage('ai', "Hello! I'm your AgriConnect AI assistant. How can I help you with farming today?");
    } else {
        chatHistory.forEach(msg => appendMessage(msg.role, msg.content));
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- CORE CHAT LOGIC ---
async function handleSendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    appendMessage('user', messageText);
    await saveMessage('user', messageText);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    loadingIndicator.style.display = 'flex';

    try {
        const aiResponse = await sendToAI(messageText);
        appendMessage('ai', aiResponse);
        await saveMessage('ai', aiResponse);
    } catch (error) {
        appendMessage('ai', "Sorry, I'm having trouble connecting. Please try again later.");
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

async function sendToAI(message) {
    const historyPayload = chatHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user', // Gemini uses 'model' for AI role
        parts: [{ text: msg.content }]
    }));

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: historyPayload })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error('API Error Body:', errorBody);
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        return 'I apologize, but I encountered an error. Please try again.';
    }
}


// --- EVENT LISTENERS & INITIALIZATION ---
sendButton.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

clearButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear this entire chat history? This cannot be undone.')) {
        deleteChatHistory();
    }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
        chatInput.value = event.results[0][0].transcript;
        handleSendMessage();
    };
    recognition.onend = () => voiceButton.classList.remove('recording');
    voiceButton.addEventListener('click', () => {
        recognition.start();
        voiceButton.classList.add('recording');
    });
} else {
    voiceButton.style.display = 'none';
}

// --- INITIALIZATION ---
async function initializeApp() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        await getChatHistory();
    } else {
        console.error("Initialization failed: User not found.");
        chatMessages.innerHTML = "<p>Please login to use the chat.</p>";
    }
}

// --- NAVBAR JAVASCRIPT ---
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const profileTrigger = document.querySelector('.profile-trigger');
const dropdownContent = document.querySelector('.dropdown-content');
const logoutBtn = document.getElementById('nav-logout-btn');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));
}
if (profileTrigger && dropdownContent) {
    profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
}
if(logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}
document.addEventListener('click', (e) => {
    if (profileTrigger && dropdownContent && !profileTrigger.contains(e.target) && !dropdownContent.contains(e.target)) {
        dropdownContent.style.display = 'none';
    }
});