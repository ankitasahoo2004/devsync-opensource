document.addEventListener('DOMContentLoaded', () => {
    const adminSection = document.getElementById('adminSection');
    const adminWelcome = document.getElementById('adminWelcome');
    const unauthorizedMessage = document.getElementById('unauthorizedMessage');
    let currentUser = null;

    const showModal = (type, title, message, callback) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        const overlay = document.createElement('div');
        overlay.className = 'modal__overlay';

        modal.innerHTML = `
            <div class="modal__content">
                <h3 class="modal__title">${title}</h3>
                <p class="modal__message">${message}</p>
                ${type === 'confirm' ? `
                    <div class="modal__actions">
                        <button class="modal__button modal__button--confirm">Confirm</button>
                        <button class="modal__button modal__button--cancel">Cancel</button>
                    </div>
                ` : `
                    <button class="modal__button modal__button--ok">OK</button>
                `}
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
            overlay.classList.add('show');
        }, 10);

        const closeModal = () => {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                overlay.remove();
            }, 300);
        };

        if (type === 'confirm') {
            return new Promise((resolve) => {
                modal.querySelector('.modal__button--confirm').onclick = () => {
                    closeModal();
                    resolve(true);
                };
                modal.querySelector('.modal__button--cancel').onclick = () => {
                    closeModal();
                    resolve(false);
                };
            });
        } else {
            modal.querySelector('.modal__button--ok').onclick = () => {
                closeModal();
                if (callback) callback();
            };
        }
    };

    const checkAdminStatus = async () => {
        try {
            const response = await fetch(`/api/user`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.isAuthenticated) {
                currentUser = data.user;

                const adminResponse = await fetch(`/api/admin/verify`, {
                    credentials: 'include'
                });
                const adminData = await adminResponse.json();

                if (adminResponse.ok && adminData.isAdmin) {
                    adminWelcome.style.display = 'block';
                    unauthorizedMessage.style.display = 'none';
                    document.getElementById('adminName').textContent = `Welcome, ${currentUser.username}`;
                    // Update admin avatar from user data
                    document.getElementById('adminAvatar').src = currentUser.photos?.[0]?.value || 'assets/img/admin-avatar.png';
                    showModal('success', 'Welcome Admin', `Welcome ${currentUser.username}!`);
                } else {
                    adminWelcome.style.display = 'none';
                    unauthorizedMessage.style.display = 'flex';
                }
            } else {
                adminWelcome.style.display = 'none';
                unauthorizedMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            showModal('error', 'Error', 'Failed to verify admin status. Please try again.');
            adminWelcome.style.display = 'none';
            unauthorizedMessage.style.display = 'flex';
        }
    };

    checkAdminStatus();

    document.getElementById('createEventBtn')?.addEventListener('click', () => {
        const eventManagement = document.getElementById('eventManagement');
        // Add your event creation form logic here
    });

    document.getElementById('manageEventsBtn')?.addEventListener('click', () => {
        const eventManagement = document.getElementById('eventManagement');
        // Add your event management logic here
    });
});
