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
            const jsonData = await response.json();

            console.log(`API Response: ${endpoint}`, { status: response.status, data: jsonData });

            // If response is not ok, throw error with response data
            if (!response.ok) {
                let errorMsg = "An error occurred";

                // Handle FastAPI validation errors (422)
                if (jsonData.detail) {
                    if (Array.isArray(jsonData.detail)) {
                        // Extract first error message from validation array
                        const firstError = jsonData.detail[0];
                        if (typeof firstError === 'object' && firstError.msg) {
                            errorMsg = `${firstError.loc?.[firstError.loc.length - 1]}: ${firstError.msg}`;
                        } else if (typeof firstError === 'string') {
                            errorMsg = firstError;
                        }
                    } else if (typeof jsonData.detail === 'string') {
                        errorMsg = jsonData.detail;
                    }
                }

                console.error(`API Error (${response.status}):`, errorMsg, jsonData);
                const error = new Error(errorMsg);
                error.status = response.status;
                error.data = jsonData;
                throw error;
            }

            return jsonData;
        } catch (error) {
            console.error("API Request Failed:", error);
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error("Network error. Please check if backend is running at " + API_BASE_URL);
            }
        }
    }
};
