const API_BASE = 'https://medivault-backend-fmcd.onrender.com/api';

function getToken() {
    return localStorage.getItem('mediVaultToken');
}

function setToken(token) {
    localStorage.setItem('mediVaultToken', token);
}

function clearToken() {
    localStorage.removeItem('mediVaultToken');
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = 'index.html';
    }
}

function redirectIfAuth() {
    if (getToken()) {
        window.location.href = 'dashboard.html';
    }
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers
    };
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 && !endpoint.includes('/auth/')) {
                clearToken();
                window.location.href = 'index.html';
            }
            throw new Error(data.message || data.error || 'API Error');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function logout() {
    clearToken();
    window.location.href = 'index.html';
}
