const API_BASE_URL = 'http://localhost:8000';

const api = {
    async request(endpoint, method = 'GET', data = null, needsAuth = false) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (needsAuth) {
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers
        };

        if (data) config.body = JSON.stringify(data);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
};
