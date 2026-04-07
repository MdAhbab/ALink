document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;

            try {
                const res = await api.request('/auth/login', 'POST', { email, password });
                if (res.access_token) {
                    localStorage.setItem('token', res.access_token);
                    window.location.href = 'pages/dashboard.html';
                } else if (res.detail) {
                    showError(res.detail);
                }
            } catch (err) {
                showError("Login failed. Please check your credentials.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect all form data
            const formData = {
                email: document.getElementById('signup-email').value,
                password: document.getElementById('signup-password').value,
                profile: {
                    name: document.getElementById('signup-name').value || null,
                    roll_id: document.getElementById('signup-roll')?.value || null,
                    university_1: document.getElementById('signup-uni1').value,
                    university_2: document.getElementById('signup-uni2')?.value || null,
                    high_school_1: document.getElementById('signup-hs1').value,
                    high_school_2: document.getElementById('signup-hs2')?.value || null,
                    major: document.getElementById('signup-major')?.value || null,
                    grad_year: document.getElementById('signup-gradyear')?.value ?
                              parseInt(document.getElementById('signup-gradyear').value) : null,
                    industry: document.getElementById('signup-industry')?.value || null,
                    company: document.getElementById('signup-company')?.value || null,
                    bio: null
                }
            };

            // Validation
            if (formData.password.length < 6) {
                showError("Password must be at least 6 characters long.");
                return;
            }

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            try {
                const res = await api.request('/auth/register', 'POST', formData);
                if (res.id) {
                    showSuccess("Account created successfully! Please login.");
                    showLogin();
                    // Clear form
                    signupForm.reset();
                    document.querySelectorAll('select').forEach(s => s.classList.remove('has-value'));
                } else if (res.detail) {
                    showError(res.detail);
                }
            } catch (err) {
                showError("Signup failed. Please try again.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

function showLogin() {
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('signup-form').style.display = 'none';
    const tabs = document.querySelectorAll('.tabs button');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'flex';
    const tabs = document.querySelectorAll('.tabs button');
    tabs[1].classList.add('active');
    tabs[0].classList.remove('active');
}

function showError(message) {
    // Create or update error notification
    let errorDiv = document.getElementById('auth-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'auth-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 4000);
}

function showSuccess(message) {
    let successDiv = document.getElementById('auth-success');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'auth-success';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00aa55;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(successDiv);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';

    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 4000);
}

// Add animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
