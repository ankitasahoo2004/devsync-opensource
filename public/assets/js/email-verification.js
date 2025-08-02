// Email Verification UI Components
class EmailVerificationUI {
    static showVerificationRequired(userEmail, verificationEmailSent = false) {
        // Remove any existing popup
        this.hidePopup();

        const popup = document.createElement('div');
        popup.className = 'email-verification-popup warning';
        popup.id = 'emailVerificationPopup';
        popup.innerHTML = `
            <button class="close-popup" onclick="EmailVerificationUI.hidePopup()">
                <i class='bx bx-x'></i>
            </button>
            <div class="popup-header">
                <i class='bx bx-envelope popup-icon'></i>
                <h4 class="popup-title">Email Verification Required</h4>
            </div>
            <p class="popup-message">
                Please verify your email address (${userEmail}) to access this feature. 
                ${verificationEmailSent ? 'Check your inbox for the verification email.' : 'Click below to send a verification email.'}
            </p>
            <div class="popup-actions">
                ${!verificationEmailSent ? `
                    <button class="popup-btn primary" onclick="EmailVerificationUI.resendVerification()">
                        <i class='bx bx-send'></i>
                        Send Verification Email
                    </button>
                ` : `
                    <button class="popup-btn primary" onclick="EmailVerificationUI.resendVerification()">
                        <i class='bx bx-refresh'></i>
                        Resend Email
                    </button>
                `}
                <button class="popup-btn secondary" onclick="EmailVerificationUI.hidePopup()">
                    <i class='bx bx-x'></i>
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Auto-hide after 10 seconds unless user interacts
        setTimeout(() => {
            if (document.getElementById('emailVerificationPopup')) {
                this.hidePopup();
            }
        }, 10000);
    }

    static showVerificationSuccess() {
        this.hidePopup();

        const popup = document.createElement('div');
        popup.className = 'email-verification-popup success';
        popup.id = 'emailVerificationPopup';
        popup.innerHTML = `
            <button class="close-popup" onclick="EmailVerificationUI.hidePopup()">
                <i class='bx bx-x'></i>
            </button>
            <div class="popup-header">
                <i class='bx bx-check-circle popup-icon'></i>
                <h4 class="popup-title">Email Verified Successfully!</h4>
            </div>
            <p class="popup-message">
                Your email has been verified. You can now access all features of DevSync OpenSource.
            </p>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="window.location.reload()">
                    <i class='bx bx-refresh'></i>
                    Refresh Page
                </button>
                <button class="popup-btn secondary" onclick="EmailVerificationUI.hidePopup()">
                    <i class='bx bx-check'></i>
                    Continue
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hidePopup();
        }, 5000);
    }

    static showVerificationEmailSent(email) {
        this.hidePopup();

        const popup = document.createElement('div');
        popup.className = 'email-verification-popup success';
        popup.id = 'emailVerificationPopup';
        popup.innerHTML = `
            <button class="close-popup" onclick="EmailVerificationUI.hidePopup()">
                <i class='bx bx-x'></i>
            </button>
            <div class="popup-header">
                <i class='bx bx-envelope-check popup-icon'></i>
                <h4 class="popup-title">Verification Email Sent</h4>
            </div>
            <p class="popup-message">
                A verification email has been sent to ${email}. Please check your inbox and click the verification link.
            </p>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="EmailVerificationUI.hidePopup()">
                    <i class='bx bx-check'></i>
                    Got it
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Auto-hide after 7 seconds
        setTimeout(() => {
            this.hidePopup();
        }, 7000);
    }

    static showError(message) {
        this.hidePopup();

        const popup = document.createElement('div');
        popup.className = 'email-verification-popup error';
        popup.id = 'emailVerificationPopup';
        popup.innerHTML = `
            <button class="close-popup" onclick="EmailVerificationUI.hidePopup()">
                <i class='bx bx-x'></i>
            </button>
            <div class="popup-header">
                <i class='bx bx-error popup-icon'></i>
                <h4 class="popup-title">Error</h4>
            </div>
            <p class="popup-message">${message}</p>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="EmailVerificationUI.hidePopup()">
                    <i class='bx bx-x'></i>
                    Close
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hidePopup();
        }, 5000);
    }

    static hidePopup() {
        const popup = document.getElementById('emailVerificationPopup');
        if (popup) {
            popup.remove();
        }
    }

    static async resendVerification() {
        try {
            this.showLoading('Sending verification email...');

            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                credentials: 'include'
            });

            this.hideLoading();

            if (response.ok) {
                const result = await response.json();
                this.showVerificationEmailSent(result.email);
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to send verification email');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            this.hideLoading();
            this.showError('Failed to send verification email. Please try again.');
        }
    }

    static showLoading(message = 'Processing...') {
        this.hideLoading();

        const overlay = document.createElement('div');
        overlay.className = 'verification-loading';
        overlay.id = 'verificationLoading';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <i class='bx bx-loader-alt'></i>
                </div>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    static hideLoading() {
        const loading = document.getElementById('verificationLoading');
        if (loading) {
            loading.remove();
        }
    }

    // Check if user needs email verification and show popup accordingly
    static async checkVerificationStatus() {
        try {
            const response = await fetch('/api/auth/verification-status', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.emailVerificationStatus) {
                    const status = data.emailVerificationStatus;
                    if (!status.verified) {
                        // Only show popup on pages where verification is required
                        const restrictedPages = ['/profile', '/projects', '/admin'];
                        const currentPath = window.location.pathname;

                        if (restrictedPages.some(page => currentPath.includes(page))) {
                            this.showVerificationRequired(
                                status.email,
                                status.verificationEmailSent
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking verification status:', error);
        }
    }

    // Initialize verification status check on page load
    static init() {
        // Check if user is on a page that might require verification
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.checkVerificationStatus();
            });
        } else {
            this.checkVerificationStatus();
        }

        // Listen for verification-related API responses
        this.interceptVerificationResponses();
    }

    // Intercept fetch requests to handle verification errors
    static interceptVerificationResponses() {
        const originalFetch = window.fetch;

        window.fetch = function (...args) {
            return originalFetch.apply(this, args)
                .then(response => {
                    // Check if response indicates email verification required
                    if (response.status === 403) {
                        response.clone().json().then(data => {
                            if (data.emailVerificationRequired) {
                                EmailVerificationUI.showVerificationRequired(
                                    data.userEmail,
                                    data.verificationEmailSent
                                );
                            }
                        }).catch(() => {
                            // Ignore parsing errors
                        });
                    }
                    return response;
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    throw error;
                });
        };
    }
}

// Auto-initialize when script loads
EmailVerificationUI.init();

// Check URL parameters for verification success
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verification') === 'success') {
        EmailVerificationUI.showVerificationSuccess();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
