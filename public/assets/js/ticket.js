document.addEventListener('DOMContentLoaded', () => {
    // Use API_CONFIG if available, otherwise fallback to local serverUrl
    const serverUrl = window.API_CONFIG ? window.API_CONFIG.serverUrl : 'http://localhost:3000';

    // Debug logging
    // console.log('Ticket system initializing with serverUrl:', serverUrl);
    let currentUser = null;
    let isAdmin = false;

    // Initialize the ticket system
    initializeTicketSystem();

    async function initializeTicketSystem() {
        // Check if required elements exist
        const requiredElements = [
            'create-tab',
            'my-tickets-tab',
            'admin-panel-tab'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.warn('Missing ticket system elements:', missingElements);
            // Continue anyway as some elements might be dynamically created
        }

        await checkAuthStatus();
        setupTabNavigation();
        setupEventListeners();

        // Load initial tab content
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            loadTabContent(activeTab.dataset.tab);
        }
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch(`${serverUrl}/api/user`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.isAuthenticated) {
                currentUser = data.user;
                showAuthenticatedContent();

                // Check admin status using the proper admin verification endpoint
                try {
                    const adminResponse = await fetch(`${serverUrl}/api/admin/verify`, {
                        credentials: 'include'
                    });

                    if (adminResponse.ok) {
                        const adminData = await adminResponse.json();
                        if (adminData.isAdmin) {
                            isAdmin = true;
                            showAdminTab();
                            // console.log(`Welcome Admin ${currentUser.username}!`);
                        }
                    }
                } catch (adminError) {
                    // console.log('Not an admin user');
                    isAdmin = false;
                }
            } else {
                showUnauthenticatedContent();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            showUnauthenticatedContent();
        }
    }

    function showAuthenticatedContent() {
        document.getElementById('createAuthMessage').style.display = 'none';
        document.getElementById('createTicketForm').style.display = 'block';
        document.getElementById('ticketsAuthMessage').style.display = 'none';
        document.getElementById('myTicketsContent').style.display = 'block';
    }

    function showUnauthenticatedContent() {
        document.getElementById('createAuthMessage').style.display = 'block';
        document.getElementById('createTicketForm').style.display = 'none';
        document.getElementById('ticketsAuthMessage').style.display = 'block';
        document.getElementById('myTicketsContent').style.display = 'none';
    }

    function showAdminTab() {
        document.querySelector('.tab-btn[data-tab="admin-panel"]').style.display = 'flex';
    }

    function setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update active tab content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');

                // Load tab content
                loadTabContent(tabId);
            });
        });
    }

    function setupEventListeners() {
        // Create ticket form
        document.getElementById('createTicketForm').addEventListener('submit', handleCreateTicket);

        // Filters
        document.getElementById('statusFilter')?.addEventListener('change', loadMyTickets);
        document.getElementById('priorityFilter')?.addEventListener('change', loadMyTickets);
        document.getElementById('adminStatusFilter')?.addEventListener('change', loadAdminTickets);
        document.getElementById('adminPriorityFilter')?.addEventListener('change', loadAdminTickets);
        document.getElementById('adminSearchFilter')?.addEventListener('input', debounce(loadAdminTickets, 300));
    }

    async function loadTabContent(tabId) {
        switch (tabId) {
            case 'create':
                // Content is static, no loading needed
                break;
            case 'my-tickets':
                if (currentUser) {
                    await loadMyTickets();
                }
                break;
            case 'admin-panel':
                if (isAdmin) {
                    await loadAdminTickets();
                    await loadAdminStats();
                }
                break;
        }
    }

    async function handleCreateTicket(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Creating ticket and sending email...';
        submitBtn.disabled = true;

        const formData = {
            title: document.getElementById('ticketTitle').value,
            description: document.getElementById('ticketDescription').value,
            priority: document.getElementById('ticketPriority').value,
            category: document.getElementById('ticketCategory').value,
            contactEmail: document.getElementById('ticketContact').value
        };

        try {
            const response = await fetch(`${serverUrl}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                showToast('success', `Ticket created successfully! ${result.emailSent ? 'Confirmation email sent.' : 'Email notification pending.'}`);
                document.getElementById('createTicketForm').reset();

                // Switch to my tickets tab if we have tickets
                switchToTab('my-tickets');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            showToast('error', error.message);
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async function loadMyTickets() {
        const ticketsList = document.getElementById('myTicketsList');
        const ticketsStats = document.getElementById('ticketsStats');

        if (!currentUser) return;

        ticketsList.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading your tickets...</p></div>';

        try {
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            const priorityFilter = document.getElementById('priorityFilter')?.value || '';

            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.set('status', statusFilter);
            if (priorityFilter) queryParams.set('priority', priorityFilter);

            // console.log('Fetching tickets from:', `${serverUrl}/api/tickets/my?${queryParams}`);

            const response = await fetch(`${serverUrl}/api/tickets/my?${queryParams}`, {
                credentials: 'include'
            });

            // console.log('Response status:', response.status);
            // console.log('Response headers:', response.headers);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Received non-JSON response:', text.substring(0, 200) + '...');
                throw new Error('Server returned HTML instead of JSON. Check server routes.');
            }

            const tickets = await response.json();

            if (tickets.length === 0) {
                ticketsList.innerHTML = `
                    <div class="no-tickets">
                        <i class='bx bx-inbox'></i>
                        <h3>No tickets found</h3>
                        <p>You haven't created any tickets yet.</p>
                    </div>
                `;
            } else {
                ticketsList.innerHTML = tickets.map(ticket => createTicketCard(ticket)).join('');

                // Update stats
                const stats = calculateTicketStats(tickets);
                ticketsStats.innerHTML = Object.entries(stats).map(([key, value]) =>
                    `<span class="stat-badge">${value} ${key}</span>`
                ).join('');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            ticketsList.innerHTML = `<div class="error">Failed to load tickets: ${error.message}</div>`;
        }
    }

    async function loadAdminTickets() {
        const adminTicketsList = document.getElementById('adminTicketsList');

        if (!isAdmin) {
            adminTicketsList.innerHTML = `
                <div class="unauthorized-message">
                    <i class='bx bx-shield-x'></i>
                    <h3>Unauthorized Access</h3>
                    <p>You don't have permission to access this section.</p>
                </div>
            `;
            return;
        }

        adminTicketsList.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading all tickets...</p></div>';

        try {
            const statusFilter = document.getElementById('adminStatusFilter')?.value || '';
            const priorityFilter = document.getElementById('adminPriorityFilter')?.value || '';
            const searchFilter = document.getElementById('adminSearchFilter')?.value || '';

            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.set('status', statusFilter);
            if (priorityFilter) queryParams.set('priority', priorityFilter);
            if (searchFilter) queryParams.set('search', searchFilter);

            // console.log('Fetching admin tickets from:', `${serverUrl}/api/tickets/admin?${queryParams}`);

            const response = await fetch(`${serverUrl}/api/tickets/admin?${queryParams}`, {
                credentials: 'include'
            });

            // console.log('Admin response status:', response.status);

            if (response.status === 403) {
                adminTicketsList.innerHTML = `
                    <div class="unauthorized-message">
                        <i class='bx bx-shield-x'></i>
                        <h3>Unauthorized Access</h3>
                        <p>You don't have permission to access this section.</p>
                    </div>
                `;
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Received non-JSON response:', text.substring(0, 200) + '...');
                throw new Error('Server returned HTML instead of JSON. Check server routes.');
            }

            const tickets = await response.json();

            if (tickets.length === 0) {
                adminTicketsList.innerHTML = `
                    <div class="no-tickets">
                        <i class='bx bx-inbox'></i>
                        <h3>No tickets found</h3>
                        <p>No tickets match your current filters.</p>
                    </div>
                `;
            } else {
                adminTicketsList.innerHTML = tickets.map(ticket => createAdminTicketCard(ticket)).join('');
            }
        } catch (error) {
            console.error('Error loading admin tickets:', error);
            adminTicketsList.innerHTML = '<div class="error">Failed to load tickets. Please try again.</div>';
        }
    }

    async function loadAdminStats() {
        const adminStats = document.getElementById('adminStats');

        if (!isAdmin || !adminStats) {
            // console.log('Admin stats not loaded: isAdmin =', isAdmin, 'adminStats element =', !!adminStats);
            return;
        }

        try {
            // console.log('Fetching admin stats from:', `${serverUrl}/api/tickets/admin/stats`);

            const response = await fetch(`${serverUrl}/api/tickets/admin/stats`, {
                credentials: 'include'
            });

            // console.log('Stats response status:', response.status);

            if (response.status === 403) {
                if (adminStats) {
                    adminStats.innerHTML = '<p>Unauthorized access</p>';
                }
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Received non-JSON response:', text.substring(0, 200) + '...');
                throw new Error('Server returned HTML instead of JSON. Check server routes.');
            }

            const stats = await response.json();

            if (adminStats) {
                adminStats.innerHTML = `
                <div class="admin-stat-card">
                    <span class="admin-stat-number">${stats.total}</span>
                    <span class="admin-stat-label">Total Tickets</span>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-number">${stats.open}</span>
                    <span class="admin-stat-label">Open</span>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-number">${stats.in_progress}</span>
                    <span class="admin-stat-label">In Progress</span>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-number">${stats.closed}</span>
                    <span class="admin-stat-label">Closed</span>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-number">${stats.urgent}</span>
                    <span class="admin-stat-label">Urgent</span>
                </div>                `;
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
            if (adminStats) {
                adminStats.innerHTML = '<p>Failed to load statistics</p>';
            }
        }
    }

    function createTicketCard(ticket) {
        return `
            <div class="ticket-card" onclick="openTicketModal('${ticket._id}')">
                <div class="ticket-header">
                    <h4 class="ticket-title">${ticket.title}</h4>
                    <div class="ticket-badges">
                        <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                        <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                    </div>
                </div>
                
                <div class="ticket-meta">
                    <span><i class='bx bx-category'></i> ${ticket.category}</span>
                    <span><i class='bx bx-calendar'></i> ${new Date(ticket.createdAt).toLocaleDateString()}</span>
                    ${ticket.updatedAt !== ticket.createdAt ? `<span><i class='bx bx-time'></i> Updated ${new Date(ticket.updatedAt).toLocaleDateString()}</span>` : ''}
                </div>
                
                <div class="ticket-description">
                    ${ticket.description}
                </div>
                
                <div class="ticket-footer">
                    <span class="ticket-id">#${ticket._id.slice(-8)}</span>
                    <span class="view-details">View Details <i class='bx bx-chevron-right'></i></span>
                </div>
            </div>
        `;
    }

    function createAdminTicketCard(ticket) {
        const isScheduledForDeletion = ticket.scheduledForDeletion && new Date(ticket.scheduledForDeletion) > new Date();
        const deletionTime = isScheduledForDeletion ? new Date(ticket.scheduledForDeletion).toLocaleString() : null;

        return `
            <div class="admin-ticket-card ${isScheduledForDeletion ? 'scheduled-deletion' : ''}">
                <div class="admin-ticket-header">
                    <div class="ticket-info">
                        <h4 class="ticket-title">${ticket.title}</h4>
                        <div class="ticket-meta">
                            <span><i class='bx bx-user'></i> ${ticket.githubUsername || 'Unknown User'}</span>
                            <span><i class='bx bx-category'></i> ${ticket.category}</span>
                            <span><i class='bx bx-calendar'></i> ${new Date(ticket.createdAt).toLocaleDateString()}</span>
                            ${ticket.resolvedBy ? `<span><i class='bx bx-check-circle'></i> Resolved by ${ticket.resolvedBy}</span>` : ''}
                        </div>
                        ${isScheduledForDeletion ? `
                            <div class="deletion-notice">
                                <i class='bx bx-time-five'></i>
                                <span>Scheduled for deletion: ${deletionTime}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="ticket-badges">
                        <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                        <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                    </div>
                </div>
                
                <div class="ticket-description">
                    ${ticket.description}
                </div>
                
                ${ticket.resolution ? `
                    <div class="ticket-resolution">
                        <h5><i class='bx bx-check-shield'></i> Resolution:</h5>
                        <p>${ticket.resolution}</p>
                    </div>
                ` : ''}
                
                <div class="admin-ticket-actions">
                    <select class="status-select" data-ticket-id="${ticket._id}" ${ticket.status === 'closed' ? 'disabled' : ''}>
                        <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                    <button class="action-btn update" onclick="updateTicketStatus('${ticket._id}')" ${ticket.status === 'closed' ? 'disabled' : ''}>
                        <i class='bx bx-check'></i> Update
                    </button>
                    <button class="action-btn delete" onclick="deleteTicket('${ticket._id}')">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                    <button class="action-btn view" onclick="openTicketModal('${ticket._id}')">
                        <i class='bx bx-show'></i> View
                    </button>
                </div>
            </div>
        `;
    }

    // Global functions for admin actions
    window.updateTicketStatus = async function (ticketId) {
        if (!isAdmin) {
            showToast('error', 'Unauthorized access');
            return;
        }

        const select = document.querySelector(`select[data-ticket-id="${ticketId}"]`);
        const newStatus = select.value;

        // If closing the ticket, show resolution modal
        if (newStatus === 'closed') {
            showResolutionModal(ticketId);
            return;
        }

        // Show loading state
        const updateBtn = document.querySelector(`button[onclick="updateTicketStatus('${ticketId}')"]`);
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Updating...';
        updateBtn.disabled = true;

        // For other status updates, proceed normally
        try {
            const response = await fetch(`${serverUrl}/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.status === 403) {
                showToast('error', 'Unauthorized access');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                showToast('success', `Ticket status updated successfully! ${result.emailSent ? 'User notified via email.' : 'Email notification pending.'}`);
                await loadAdminTickets();
                await loadAdminStats();
            } else {
                throw new Error('Failed to update ticket status');
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            showToast('error', 'Failed to update ticket status');
        } finally {
            // Restore button state
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
        }
    };

    // Add missing global deleteTicket function
    window.deleteTicket = async function (ticketId) {
        if (!isAdmin) {
            showToast('error', 'Unauthorized access');
            return;
        }

        // Show confirmation modal
        const confirmed = await showConfirmModal(
            'Delete Ticket',
            'Are you sure you want to permanently delete this ticket? The user will be notified via email. This action cannot be undone.',
            'danger'
        );

        if (!confirmed) return;

        const deleteBtn = document.querySelector(`button[onclick="deleteTicket('${ticketId}')"]`);
        const originalText = deleteBtn.innerHTML;

        // Show loading state
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Deleting...';
        deleteBtn.disabled = true;

        try {
            const response = await fetch(`${serverUrl}/api/tickets/${ticketId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.status === 403) {
                showToast('error', 'Unauthorized access');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                showToast('success', `Ticket deleted successfully! ${result.emailSent ? 'User notified via email.' : 'Email notification pending.'}`);
                await loadAdminTickets();
                await loadAdminStats();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete ticket');
            }
        } catch (error) {
            console.error('Error deleting ticket:', error);
            showToast('error', error.message || 'Failed to delete ticket');
        } finally {
            // Restore button state
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    };

    // Add confirmation modal function
    function showConfirmModal(title, message, type = 'default') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.innerHTML = `
                <div class="confirm-modal-overlay"></div>
                <div class="confirm-modal-container">
                    <div class="confirm-modal-header ${type}">
                        <h3><i class='bx ${type === 'danger' ? 'bx-error' : 'bx-question-mark'}'></i> ${title}</h3>
                    </div>
                    <div class="confirm-modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="confirm-modal-footer">
                        <button class="confirm-btn cancel" onclick="resolveConfirm(false)">
                            <i class='bx bx-x'></i> Cancel
                        </button>
                        <button class="confirm-btn confirm ${type}" onclick="resolveConfirm(true)">
                            <i class='bx bx-check'></i> Confirm
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Show modal with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);

            // Add global resolve function
            window.resolveConfirm = (result) => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    delete window.resolveConfirm;
                }, 300);
                resolve(result);
            };
        });
    }

    // New function to show resolution modal
    window.showResolutionModal = function (ticketId) {
        const modal = document.createElement('div');
        modal.className = 'resolution-modal';
        modal.innerHTML = `
            <div class="resolution-modal-overlay"></div>
            <div class="resolution-modal-container">
                <div class="resolution-modal-header">
                    <h3><i class='bx bx-check-shield'></i> Close Ticket with Resolution</h3>
                    <button class="close-resolution-modal" onclick="closeResolutionModal()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="resolution-modal-body">
                    <p>Please provide a resolution for this ticket before closing it:</p>
                    <textarea 
                        id="resolutionText" 
                        placeholder="Describe how this ticket was resolved..."
                        rows="6"
                        maxlength="1000"
                        required
                    ></textarea>
                    <div class="character-count">
                        <span id="charCount">0</span>/1000 characters
                    </div>
                    <div class="resolution-notice">
                        <i class='bx bx-info-circle'></i>
                        <p>This ticket will be automatically deleted 24 hours after closing.</p>
                    </div>
                </div>
                <div class="resolution-modal-footer">
                    <button class="resolution-btn cancel" onclick="closeResolutionModal()">
                        <i class='bx bx-x'></i> Cancel
                    </button>
                    <button class="resolution-btn confirm" onclick="submitResolution('${ticketId}')">
                        <i class='bx bx-check'></i> Close Ticket
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Setup character counter
        const textarea = modal.querySelector('#resolutionText');
        const charCount = modal.querySelector('#charCount');

        textarea.addEventListener('input', () => {
            charCount.textContent = textarea.value.length;

            // Enable/disable confirm button based on content
            const confirmBtn = modal.querySelector('.resolution-btn.confirm');
            confirmBtn.disabled = textarea.value.trim().length === 0;
        });

        // Focus on textarea
        textarea.focus();
    };

    // Function to close resolution modal
    window.closeResolutionModal = function () {
        const modal = document.querySelector('.resolution-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    // Function to submit resolution and close ticket
    window.submitResolution = async function (ticketId) {
        const textarea = document.querySelector('#resolutionText');
        const resolution = textarea.value.trim();

        if (!resolution) {
            showToast('error', 'Please provide a resolution before closing the ticket');
            return;
        }

        const submitBtn = document.querySelector('.resolution-btn.confirm');
        const originalText = submitBtn.innerHTML;

        // Show loading state
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Closing & sending email...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${serverUrl}/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'closed',
                    resolution: resolution
                })
            });

            if (response.status === 403) {
                showToast('error', 'Unauthorized access');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                closeResolutionModal();
                showToast('success', `Ticket closed with resolution! ${result.emailSent ? 'User notified via email.' : 'Email notification pending.'} Scheduled for deletion in 24 hours.`);
                await loadAdminTickets();
                await loadAdminStats();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to close ticket');
            }
        } catch (error) {
            console.error('Error closing ticket:', error);
            showToast('error', error.message || 'Failed to close ticket');
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    };

    window.openTicketModal = async function (ticketId) {
        const modal = document.getElementById('ticketModal');
        const modalTitle = document.getElementById('modalTicketTitle');
        const modalBody = document.getElementById('modalTicketBody');

        if (!modal || !modalTitle || !modalBody) {
            console.error('Ticket modal elements not found');
            showToast('error', 'Unable to open ticket modal');
            return;
        }

        modalBody.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading ticket details...</p></div>';
        modal.classList.add('show');

        try {
            const response = await fetch(`${serverUrl}/api/tickets/${ticketId}`, {
                credentials: 'include'
            });

            const ticket = await response.json();

            modalTitle.textContent = ticket.title;
            modalBody.innerHTML = `
                <div class="ticket-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Status:</strong> 
                            <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Priority:</strong> 
                            <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Category:</strong> ${ticket.category}
                        </div>
                        <div class="detail-item">
                            <strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}
                        </div>
                        ${ticket.updatedAt !== ticket.createdAt ? `
                            <div class="detail-item">
                                <strong>Last Updated:</strong> ${new Date(ticket.updatedAt).toLocaleString()}
                            </div>
                        ` : ''}
                        ${ticket.resolvedBy ? `
                            <div class="detail-item">
                                <strong>Resolved By:</strong> ${ticket.resolvedBy}
                            </div>
                        ` : ''}
                        ${ticket.resolvedAt ? `
                            <div class="detail-item">
                                <strong>Resolved At:</strong> ${new Date(ticket.resolvedAt).toLocaleString()}
                            </div>
                        ` : ''}
                        ${ticket.scheduledForDeletion ? `
                            <div class="detail-item">
                                <strong>Scheduled for Deletion:</strong> ${new Date(ticket.scheduledForDeletion).toLocaleString()}
                            </div>
                        ` : ''}
                        ${ticket.contactEmail ? `
                            <div class="detail-item">
                                <strong>Contact Email:</strong> ${ticket.contactEmail}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="ticket-full-description">
                        <h4>Description</h4>
                        <p>${ticket.description.replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    ${ticket.resolution ? `
                        <div class="ticket-resolution-display">
                            <h4><i class='bx bx-check-shield'></i> Resolution</h4>
                            <p>${ticket.resolution.replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    <div class="ticket-id">
                        <small>Ticket ID: ${ticket._id}</small>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading ticket details:', error);
            modalBody.innerHTML = '<div class="error">Failed to load ticket details.</div>';
        }
    };

    // Add missing global functions and variables
    window.currentTicketId = null;

    // Global modal functions
    window.closeTicketModal = function () {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.classList.remove('show');
        }
    };

    // Close modal when clicking overlay
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('ticket-modal-overlay')) {
            closeTicketModal();
        }
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTicketModal();
        }
    });

    // Utility functions
    function calculateTicketStats(tickets) {
        return tickets.reduce((stats, ticket) => {
            stats[ticket.status] = (stats[ticket.status] || 0) + 1;
            return stats;
        }, {});
    }

    function switchToTab(tabId) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // Update active tab button
        tabBtns.forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Update active tab content
        tabContents.forEach(content => content.classList.remove('active'));
        const targetContent = document.getElementById(`${tabId}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Load tab content
        loadTabContent(tabId);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(type, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class='bx ${type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}'></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeTicketModal();
        }
        if (e.target.classList.contains('resolution-modal-overlay')) {
            closeResolutionModal();
        }
        if (e.target.classList.contains('confirm-modal-overlay')) {
            const confirmModal = document.querySelector('.confirm-modal');
            if (confirmModal && typeof window.resolveConfirm === 'function') {
                window.resolveConfirm(false);
            }
        }
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.querySelector('.resolution-modal.show')) {
                closeResolutionModal();
            } else if (document.querySelector('.confirm-modal.show')) {
                if (typeof window.resolveConfirm === 'function') {
                    window.resolveConfirm(false);
                }
            } else if (document.querySelector('.ticket-modal.show')) {
                closeTicketModal();
            }
        }
    });
});
