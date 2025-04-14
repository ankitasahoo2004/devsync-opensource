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
        eventManagement.innerHTML = `
            <form id="eventForm" class="event-form">
                <h4><i class='bx bx-calendar-plus'></i> Create New Event</h4>
                
                <div class="form-group">
                    <label for="eventName">Event Name</label>
                    <input type="text" id="eventName" required placeholder="Enter event name">
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label for="eventDate">Date</label>
                        <input type="date" id="eventDate" required>
                    </div>
                    <div class="form-group">
                        <label for="eventTime">Time</label>
                        <input type="time" id="eventTime" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="eventDescription">Description</label>
                    <textarea id="eventDescription" rows="4" required placeholder="Enter event description"></textarea>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label for="eventType">Event Type</label>
                        <select id="eventType" required>
                            <option value="">Select type</option>
                            <option value="workshop">Workshop</option>
                            <option value="webinar">Webinar</option>
                            <option value="hackathon">Hackathon</option>
                            <option value="meetup">Meetup</option>
                            <option value="conference">Conference</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="eventMode">Event Mode</label>
                        <select id="eventMode" required>
                            <option value="">Select mode</option>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="eventSlots">Available Slots</label>
                    <input type="number" id="eventSlots" min="1" required placeholder="Enter number of slots">
                </div>

                <div class="form-group">
                    <label for="registerLink">Registration Link</label>
                    <input type="url" id="registerLink" required placeholder="Enter registration link">
                </div>

                <div id="locationDetails"></div>

                <div class="form-group">
                    <label>Speakers/Mentors</label>
                    <div id="speakersContainer">
                        <div class="speaker-input">
                            <input type="url" class="speaker-linkedin" placeholder="LinkedIn Profile URL" required>
                            <button type="button" class="remove-speaker" title="Remove speaker"><i class='bx bx-x'></i></button>
                        </div>
                    </div>
                    <button type="button" class="button button--small add-speaker" id="addSpeaker">
                        <i class='bx bx-user-plus'></i> Add Speaker
                    </button>
                </div>

                <div class="form-actions">
                    <button type="submit" class="button">
                        <i class='bx bx-save'></i> Create Event
                    </button>
                    <button type="button" class="button button--ghost" id="cancelEventForm">
                        <i class='bx bx-x'></i> Cancel
                    </button>
                </div>
            </form>
        `;

        // Handle event mode change
        const eventMode = document.getElementById('eventMode');
        const locationDetails = document.getElementById('locationDetails');

        eventMode.addEventListener('change', () => {
            const mode = eventMode.value;
            if (mode === 'online' || mode === 'hybrid') {
                locationDetails.innerHTML = `
                    <div class="form-group">
                        <label for="meetingLink">Meeting Link <span class="form-hint">(Will be hidden until 24h before event)</span></label>
                        <input type="url" id="meetingLink" required placeholder="Enter meeting link">
                        <small class="form-hint">This link will only be visible to attendees 24 hours before the event</small>
                    </div>
                `;
            }
            if (mode === 'offline' || mode === 'hybrid') {
                locationDetails.innerHTML += `
                    <div class="form-group">
                        <label for="venue">Venue</label>
                        <input type="text" id="venue" required placeholder="Enter venue name">
                    </div>
                    <div class="form-group">
                        <label for="address">Address</label>
                        <textarea id="address" rows="2" required placeholder="Enter full address"></textarea>
                    </div>
                `;
            }
        });

        // Handle add/remove speakers
        const addSpeaker = document.getElementById('addSpeaker');
        const speakersContainer = document.getElementById('speakersContainer');

        addSpeaker.addEventListener('click', () => {
            const speakerInput = document.createElement('div');
            speakerInput.className = 'speaker-input';
            speakerInput.innerHTML = `
                <input type="url" class="speaker-linkedin" placeholder="LinkedIn Profile URL" required>
                <button type="button" class="remove-speaker" title="Remove speaker"><i class='bx bx-x'></i></button>
            `;
            speakersContainer.appendChild(speakerInput);
        });

        speakersContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-speaker')) {
                const speakerInput = e.target.closest('.speaker-input');
                if (speakersContainer.children.length > 1) {
                    speakerInput.remove();
                }
            }
        });

        // Handle form submission
        const eventForm = document.getElementById('eventForm');
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const mode = document.getElementById('eventMode').value;
            const formData = {
                name: document.getElementById('eventName').value,
                date: document.getElementById('eventDate').value,
                time: document.getElementById('eventTime').value,
                description: document.getElementById('eventDescription').value,
                type: document.getElementById('eventType').value,
                mode: mode,
                registerLink: document.getElementById('registerLink').value,
                speakers: Array.from(document.querySelectorAll('.speaker-linkedin')).map(input => input.value),
            };

            // Add offline/hybrid specific fields
            if (mode === 'offline' || mode === 'hybrid') {
                formData.venue = document.getElementById('venue').value;
                formData.address = document.getElementById('address').value;
                formData.totalSlots = parseInt(document.getElementById('eventSlots').value);
                formData.filledSlots = 0; // Initialize filled slots to 0
            }

            // Add online/hybrid specific fields
            if (mode === 'online' || mode === 'hybrid') {
                formData.meetingLink = document.getElementById('meetingLink')?.value || '';
            }

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create event');
                }

                showModal('success', 'Success', 'Event created successfully!');
                eventForm.reset();
                document.getElementById('locationDetails').innerHTML = ''; // Clear location details
            } catch (error) {
                console.error('Error creating event:', error);
                showModal('error', 'Error', error.message || 'Failed to create event. Please try again.');
            }
        });

        // Handle cancel button
        document.getElementById('cancelEventForm').addEventListener('click', () => {
            eventManagement.innerHTML = '';
        });
    });

    document.getElementById('manageEventsBtn')?.addEventListener('click', async () => {
        const eventManagement = document.getElementById('eventManagement');
        try {
            const response = await fetch('/api/events', {
                credentials: 'include'
            });
            const events = await response.json();

            eventManagement.innerHTML = `
                <h4><i class='bx bx-calendar-edit'></i> Manage Events</h4>
                <div id="eventsList">
                    ${events.map(event => `
                        <div class="admin-event-card" data-id="${event._id}">
                            <div class="admin-event-header">
                                <h3>${event.name}</h3>
                                <button class="delete-event" data-id="${event._id}">
                                    <i class='bx bx-trash'></i>
                                </button>
                            </div>
                            <div class="admin-event-details">
                                <span class="event-type">${event.type}</span>
                                <span>${new Date(event.date).toLocaleDateString()}</span>
                                <span>${event.mode}</span>
                                ${event.mode !== 'online' ? `
                                    <div class="slots-management">
                                        <label>Slots:</label>
                                        <input type="number" 
                                               class="slots-input" 
                                               value="${event.filledSlots || 0}"
                                               min="0" 
                                               max="${event.totalSlots}">
                                        <span>/ ${event.totalSlots} slots</span>
                                        <button class="update-slots button--small" data-id="${event._id}">
                                            Update
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Add event listeners for slots management
            const eventsList = document.getElementById('eventsList');
            eventsList.addEventListener('click', async (e) => {
                const updateBtn = e.target.closest('.update-slots');
                const deleteBtn = e.target.closest('.delete-event');

                if (updateBtn) {
                    const eventId = updateBtn.dataset.id;
                    const slotsInput = updateBtn.closest('.slots-management').querySelector('.slots-input');
                    const filledSlots = parseInt(slotsInput.value);

                    try {
                        const response = await fetch(`/api/events/${eventId}/slots`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ filledSlots })
                        });

                        if (!response.ok) throw new Error('Failed to update slots');

                        showModal('success', 'Success', 'Slots updated successfully!');
                    } catch (error) {
                        showModal('error', 'Error', 'Failed to update slots');
                    }
                }

                if (deleteBtn) {
                    const eventId = deleteBtn.dataset.id;
                    if (await showModal('confirm', 'Delete Event', 'Are you sure you want to delete this event?')) {
                        try {
                            const response = await fetch(`/api/events/${eventId}`, {
                                method: 'DELETE',
                                credentials: 'include'
                            });

                            if (!response.ok) throw new Error('Failed to delete event');

                            deleteBtn.closest('.admin-event-card').remove();
                            showModal('success', 'Success', 'Event deleted successfully!');
                        } catch (error) {
                            showModal('error', 'Error', 'Failed to delete event');
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading events:', error);
            showModal('error', 'Error', 'Failed to load events');
        }
    });
});
