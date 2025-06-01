// API Configuration
const API_KEY = 'AIzaSyConAV73s-2I62GgcGVmHHg8Y7Ky0pMtxU';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Initialize markdown-it
const md = window.markdownit({
    breaks: true,
    linkify: true
});

// DOM Elements
const chatContainer = document.querySelector('.chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-message');
const voiceButton = document.getElementById('voice-input');
const clearButton = document.getElementById('clear-chat');
const loadingIndicator = document.querySelector('.loading-indicator');
const loginBtn = document.getElementById('nav-login-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const profileName = document.getElementById('nav-profile-name');
const profileImage = document.getElementById('nav-profile-image');

// Check login status and initialize
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        // User is logged in
        loginBtn.style.display = 'none';
        profileDropdown.style.display = 'block';
        profileName.textContent = currentUser.name;
        chatContainer.style.display = 'block';
        
        // Load profile photo if exists
        const profileData = JSON.parse(localStorage.getItem(`profile_${currentUser.email}`) || '{}');
        if (profileData.photoUrl) {
            profileImage.src = profileData.photoUrl;
        }

        // Load chat history
        loadChatHistory();
    } else {
        // User is not logged in
        window.location.href = '../login.html';
    }
});

// Handle logout
document.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser');
    window.location.href = '../home.html';
});

// Load chat history
function loadChatHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const chatHistory = JSON.parse(localStorage.getItem(`chat_history_${currentUser.email}`)) || [];
    
    chatHistory.forEach(message => {
        appendMessage(message.type, message.content);
    });
}

// Save chat history
function saveChatHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const messages = Array.from(chatMessages.children).map(msg => ({
        type: msg.classList.contains('user-message') ? 'user' : 'ai',
        content: msg.querySelector('.message-content p').innerHTML
    }));
    
    localStorage.setItem(`chat_history_${currentUser.email}`, JSON.stringify(messages));
}

// Format timestamp
function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}

// Format message content
function formatMessage(content) {
    // Convert markdown to HTML
    let formattedContent = md.render(content);
    
    // Replace ** with proper styling
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return formattedContent;
}

// Append message to chat
function appendMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const icon = type === 'user' ? 'fa-user' : 'fa-robot';
    
    messageDiv.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="message-content">
            <p>${formatMessage(content)}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    saveChatHistory();
}

// Send message to AI
async function sendToAI(message) {
    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an AI farming assistant. The user asks: ${message}\nProvide helpful advice about farming, agriculture, or related topics. Format your response using markdown with proper headings, bullet points, and emphasis where appropriate.`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error:', error);
        return 'I apologize, but I encountered an error. Please try again later.';
    }
}

// Handle send message
async function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Clear input
    chatInput.value = '';

    // Add user message
    appendMessage('user', message);

    // Show loading
    loadingIndicator.style.display = 'flex';

    // Get AI response
    const response = await sendToAI(message);

    // Hide loading
    loadingIndicator.style.display = 'none';

    // Add AI response
    appendMessage('ai', response);
}

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// Voice input
let isRecording = false;
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
    };

    voiceButton.addEventListener('click', () => {
        if (!isRecording) {
            recognition.start();
            voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            recognition.stop();
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        isRecording = !isRecording;
    });
}

// Clear chat
clearButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
        chatMessages.innerHTML = '';
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        localStorage.removeItem(`chat_history_${currentUser.email}`);
        
        // Add welcome message back
        appendMessage('ai', 'Hello! I\'m your AgriConnect AI assistant. How can I help you with farming today?');
    }
}); 