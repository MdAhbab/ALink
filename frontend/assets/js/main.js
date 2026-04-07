// Main.js - Global utility functions and UI logic

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Get current user info from token
function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        return null;
    }
}

// Check if user is alumni
function isAlumni() {
    const user = getCurrentUser();
    return user && user.role === 'alumni';
}

// Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

// Show error message
function showError(message, elementId = null) {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="error-message">${message}</div>`;
        }
    } else {
        alert(message);
    }
}

// Show success message
function showSuccess(message) {
    alert(message);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}

// Initialize page based on user role
function initPage() {
    const user = getCurrentUser();
    if (!user) {
        logout();
        return;
    }

    // Update UI based on role
    const alumniElements = document.querySelectorAll('.alumni-only');
    const adminElements = document.querySelectorAll('.admin-only');
    const studentElements = document.querySelectorAll('.student-only');

    alumniElements.forEach(el => {
        el.style.display = user.role === 'alumni' ? 'block' : 'none';
    });

    adminElements.forEach(el => {
        el.style.display = user.role === 'admin' ? 'block' : 'none';
    });

    studentElements.forEach(el => {
        el.style.display = user.role === 'student' ? 'block' : 'none';
    });
}

// Create navigation bar dynamically
function createNavBar() {
    const user = getCurrentUser();
    if (!user) return '';

    let navLinks = `
        <a href="dashboard.html">Home</a>
        <a href="profile.html">Profile</a>
        <a href="connections.html">Connections</a>
    `;

    if (user.role === 'admin') {
        navLinks += `<a href="admin.html">Admin Panel</a>`;
    }

    return `
        <header class="dashboard-header">
            <h2>ALink</h2>
            <nav>
                ${navLinks}
                <button onclick="logout()">Logout</button>
            </nav>
        </header>
    `;
}
