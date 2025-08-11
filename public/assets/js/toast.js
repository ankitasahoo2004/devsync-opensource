/* ===============================================
   TOAST NOTIFICATION SYSTEM
   =============================================== */

// Toast notification functions
function showSuccessNotification(message) {
    showToast(message, 'success');
}

function showErrorNotification(message) {
    showToast(message, 'error');
}

function showInfoNotification(message) {
    showToast(message, 'info');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast__content">
            <i class="toast__icon fas ${getToastIcon(type)}"></i>
            <span class="toast__message">${message}</span>
        </div>
        <button class="toast__close" onclick="removeToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('toast--show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => removeToast(toast), 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.classList.remove('toast--show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }
}

// Initialize toast system
document.addEventListener('DOMContentLoaded', function () {
    console.log('Toast system loaded');
});
