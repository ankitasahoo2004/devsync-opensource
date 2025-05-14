document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('sponsor-form-modal');
    const sponsorButtons = document.querySelectorAll('a[href="team.html"].button');
    const closeButton = modal.querySelector('.sponsor-form-close');
    const form = document.getElementById('sponsor-form');

    function showToast({ title, message, type = 'success', duration = 5000 }) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success'
            ? '<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>'
            : '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>';

        toast.innerHTML = `
            ${icon}
            <div class="toast-content">
                <h4 class="toast-title">${title}</h4>
                <p class="toast-message">${message}</p>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;

        // Show toast
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    // Open modal when clicking "Become a Sponsor"
    sponsorButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close modal when clicking X button
    closeButton.addEventListener('click', () => {
        closeModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal when pressing ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading toast
        showToast({
            title: 'Sending Application',
            message: 'Please wait while we process your application...',
            type: 'loading',
            duration: 10000
        });

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/sponsorship/inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    organization: data.company,
                    name: data.company,
                    email: data.email,
                    phone: 'N/A',
                    sponsorshipType: data.level,
                    message: data.description
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send application');
            }

            // Show success toast
            showToast({
                title: 'Application Sent!',
                message: 'Thank you for your interest in sponsoring! We will contact you soon.',
                type: 'success'
            });

            // Reset form and close modal
            form.reset();
            closeModal();

        } catch (error) {
            console.error('Error submitting form:', error);
            showToast({
                title: 'Error',
                message: 'Failed to send application. Please try again.',
                type: 'error'
            });
        }
    });

    function closeModal() {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
});
