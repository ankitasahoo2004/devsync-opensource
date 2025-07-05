document.addEventListener('DOMContentLoaded', () => {
    let allEvents = [];
    let currentUser = null;
    let isAdmin = false;

    // Initialize the events section
    const initializeEventsSection = () => {
        checkAuthStatus();
        fetchEvents();
        setupEventListeners();
    };

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/user', { credentials: 'include' });
            const data = await response.json();

            if (data.isAuthenticated) {
                currentUser = data.user;

                // Check admin status
                const adminResponse = await fetch('/api/admin/verify', { credentials: 'include' });
                const adminData = await adminResponse.json();

                if (adminResponse.ok && adminData.isAdmin) {
                    isAdmin = true;
                    showAdminToggle();
                }
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    };

    const showAdminToggle = () => {
        const adminToggle = document.querySelector('.admin-toggle');
        if (adminToggle) {
            adminToggle.style.display = 'block';
        }
    };

    const fetchEvents = async () => {
        try {
            showLoading();
            const response = await fetch('/api/events');
            const events = await response.json();
            allEvents = events;

            if (events.length === 0) {
                showEmptyState();
            } else {
                renderEvents(events);
                renderCalendarView(events);
                renderTimelineView(events);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            showErrorState();
        } finally {
            hideLoading();
        }
    };

    const renderEvents = (events) => {
        const eventsGrid = document.getElementById('eventsGrid');
        if (!eventsGrid) return;

        eventsGrid.innerHTML = events.map(event => createEventCard(event)).join('');

        // Add event listeners to cards
        eventsGrid.querySelectorAll('.event__card').forEach(card => {
            card.addEventListener('click', () => {
                const eventData = JSON.parse(card.dataset.event);
                showEventPopup(eventData);
            });
        });
    };

    const createEventCard = (event) => {
        const eventDate = new Date(event.date);
        const now = new Date();
        const isPast = eventDate < now;
        const slotsInfo = event.mode !== 'online' ?
            `<div class="event__slots">
                <i class='bx bx-user'></i>
                ${event.filledSlots || 0}/${event.totalSlots} slots
            </div>` : '';

        return `
            <div class="event__card fade-up" data-event='${JSON.stringify(event)}'>
                <div class="event__header">
                    <span class="event__tag">${event.type}</span>
                    <div class="event__date">
                        <i class='bx bx-calendar'></i>
                        ${eventDate.toLocaleDateString()}
                    </div>
                </div>
                
                <h3 class="event__title">${event.name}</h3>
                <p class="event__description">${event.description}</p>
                
                <div class="event__details">
                    <div class="event__mode">
                        <i class='bx bx-${getEventModeIcon(event.mode)}'></i>
                        ${event.mode}
                    </div>
                    ${slotsInfo}
                </div>
                
                ${event.mode !== 'online' && event.venue ? `
                    <div class="event__location">
                        <i class='bx bx-map-pin'></i>
                        <div>
                            <strong>${event.venue}</strong>
                            <p>${event.address}</p>
                        </div>
                    </div>
                ` : ''}
                
                ${event.speakers && event.speakers.length > 0 ? renderSpeakerStack(event.speakers) : ''}
                
                <a href="${event.registerLink}" target="_blank" 
                   class="event__button ${isPast ? 'disabled' : ''}" 
                   ${isPast ? 'onclick="return false;"' : ''}>
                    ${isPast ? 'Event Ended' : 'Register Now'}
                    <i class='bx bx-right-arrow-alt'></i>
                </a>
            </div>
        `;
    };

    const getEventModeIcon = (mode) => {
        switch (mode) {
            case 'online': return 'laptop';
            case 'offline': return 'map';
            case 'hybrid': return 'devices';
            default: return 'calendar';
        }
    };

    const renderSpeakerStack = (speakers) => {
        if (!speakers || speakers.length === 0) return '';

        const speakerImages = {
            male: [
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/c7b13693570193.5e681edc38ea0.png',
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/6862f993570193.5e681edc2ef35.png',
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/ae7bf893570193.5e681edc350fc.png'
            ],
            female: [
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/c4df3d93570193.5e681edc39b15.png',
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/ec80dd93570193.5e681edc2d7d4.png',
                'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/d55dcc93570193.5e681edc2e6b6.png'
            ]
        };

        const speakerCompanies = {
            'John Doe': 'Google', 'Sarah Wilson': 'Microsoft', 'Mike Chen': 'Amazon',
            'Emily Parker': 'Apple', 'David Kumar': 'Meta', 'Lisa Zhang': 'Netflix'
        };

        const getSpeakerImage = (name) => {
            const isFemale = name.match(/^(sarah|emily|lisa|anna|emma|olivia)/i);
            const images = isFemale ? speakerImages.female : speakerImages.male;
            return images[Math.floor(Math.random() * images.length)];
        };

        return `
            <div class="speakers__stack">
                ${speakers.slice(0, 4).map((speaker, index) => {
            const name = speaker.split('/').pop().replace(/-/g, ' ');
            const company = speakerCompanies[name] || 'Tech Company';
            return `
                        <div class="speaker__wrapper" style="z-index: ${20 - index}">
                            <a href="${speaker}" target="_blank" 
                               class="speaker__link"
                               data-name="${name}"
                               data-company="${company}">
                                <img src="${getSpeakerImage(name)}?w=100&h=100&fit=crop" 
                                     alt="${name}"
                                     loading="lazy">
                                <div class="speaker__info">
                                    <span class="speaker__name">${name}</span>
                                    <span class="speaker__company">${company}</span>
                                </div>
                            </a>
                        </div>
                    `;
        }).join('')}
                ${speakers.length > 4 ? `<div class="speaker__more">+${speakers.length - 4}</div>` : ''}
            </div>
        `;
    };

    const renderCalendarView = (events) => {
        const calendarContainer = document.getElementById('calendarView');
        if (!calendarContainer) return;

        const currentDate = new Date();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startingDay = firstDay.getDay();

        document.getElementById('currentMonth').textContent =
            firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentCalendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';

            const isToday = new Date().toDateString() === currentCalendarDate.toDateString();
            if (isToday) dayCell.classList.add('today');

            // Get events for this day
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.toDateString() === currentCalendarDate.toDateString();
            });

            dayCell.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-events">
                    ${dayEvents.slice(0, 3).map(event => `
                        <div class="day-event ${event.type.toLowerCase()}" 
                             data-event='${JSON.stringify(event)}'
                             title="${event.name}">
                            <span class="event-time">${event.time}</span>
                            <span class="event-name">${event.name.substring(0, 15)}${event.name.length > 15 ? '...' : ''}</span>
                        </div>
                    `).join('')}
                    ${dayEvents.length > 3 ? `<div class="day-event-more">+${dayEvents.length - 3} more</div>` : ''}
                </div>
            `;

            calendarGrid.appendChild(dayCell);

            // Add event listeners for day events
            dayCell.querySelectorAll('.day-event').forEach(eventEl => {
                if (eventEl.dataset.event) {
                    eventEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const eventData = JSON.parse(eventEl.dataset.event);
                        showEventPopup(eventData);
                    });
                }
            });
        }
    };

    const renderTimelineView = (events) => {
        const timelineContainer = document.getElementById('timelineEvents');
        if (!timelineContainer) return;

        // Group events by date
        const eventsByDate = events.reduce((acc, event) => {
            const date = new Date(event.date).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(event);
            return acc;
        }, {});

        // Sort events by time for each date
        Object.values(eventsByDate).forEach(dateEvents => {
            dateEvents.sort((a, b) => a.time.localeCompare(b.time));
        });

        timelineContainer.innerHTML = Object.entries(eventsByDate)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, events]) => `
                <div class="timeline-date">
                    <div class="date-header">
                        <i class='bx bx-calendar'></i>
                        ${date}
                    </div>
                    <div class="timeline-events-list">
                        ${events.map(event => `
                            <div class="timeline-event" data-event='${JSON.stringify(event)}'>
                                <div class="event-time">
                                    <i class='bx bx-time-five'></i>
                                    ${event.time}
                                </div>
                                <div class="event-content">
                                    <h3 class="event-title">${event.name}</h3>
                                    <div class="event-details">
                                        <span class="event-type">${event.type}</span>
                                        <span class="event-mode">${event.mode}</span>
                                        ${event.mode !== 'online' ? `<span>${event.filledSlots || 0}/${event.totalSlots} slots</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

        // Add event listeners to timeline events
        timelineContainer.querySelectorAll('.timeline-event').forEach(eventEl => {
            eventEl.addEventListener('click', () => {
                const eventData = JSON.parse(eventEl.dataset.event);
                showEventPopup(eventData);
            });
        });
    };

    const showEventPopup = (event) => {
        const popup = document.createElement('div');
        popup.className = 'event-popup';

        popup.innerHTML = `
            <div class="popup-header">
                <div>
                    <span class="event__tag">${event.type}</span>
                    <h3 class="event__title">${event.name}</h3>
                </div>
                <button class="popup-close"><i class='bx bx-x'></i></button>
            </div>
            
            <div class="popup-content">
                <div class="event__date" style="margin-bottom: 1rem">
                    <i class='bx bx-calendar'></i>
                    ${new Date(event.date).toLocaleDateString()} at ${event.time}
                </div>
                
                <p class="event__description">${event.description}</p>
                
                <div class="event__details" style="margin: 1.5rem 0">
                    <span class="event__mode">
                        <i class='bx bx-${getEventModeIcon(event.mode)}'></i>
                        ${event.mode}
                    </span>
                    ${event.mode !== 'online' ? `
                        <span class="event__slots">
                            <i class='bx bx-user'></i>
                            ${event.filledSlots || 0}/${event.totalSlots} slots
                        </span>
                    ` : ''}
                </div>
                
                ${event.mode !== 'online' && event.venue ? `
                    <div class="event__location">
                        <i class='bx bx-map-pin'></i>
                        <div>
                            <strong>${event.venue}</strong>
                            <p>${event.address}</p>
                        </div>
                    </div>
                ` : ''}
                
                ${event.speakers && event.speakers.length > 0 ? renderSpeakerStack(event.speakers) : ''}
            </div>
            
            <div class="popup-actions">
                <a href="${event.registerLink}" target="_blank" class="event__button">
                    Register Now
                    <i class="bx bx-right-arrow-alt"></i>
                </a>
            </div>
        `;

        // Add meeting link section for online/hybrid events
        if ((event.mode === 'online' || event.mode === 'hybrid') && event.meetingLink) {
            const eventDate = new Date(event.date);
            const oneDayBefore = new Date(eventDate.getTime() - (24 * 60 * 60 * 1000));
            const now = new Date();
            const isLinkVisible = now >= oneDayBefore;

            popup.querySelector('.popup-content').insertAdjacentHTML('beforeend', `
                <div class="meeting-link-section">
                    <div class="meeting-link-header">
                        <i class='bx bx-video'></i>
                        <div>
                            <h4>Meeting Link</h4>
                            ${isLinkVisible ?
                    `<div class="countdown-timer active">Link Available Now</div>` :
                    `<div class="countdown-timer">Available 24 hours before event</div>`
                }
                        </div>
                    </div>
                    <div class="meeting-link ${isLinkVisible ? 'visible' : ''}">
                        ${isLinkVisible ?
                    `<span class="link-text">
                                <a href="${event.meetingLink}" target="_blank" 
                                   style="color: #e51837; font-weight: bold; text-decoration: none;">
                                   ${event.meetingLink}
                                </a>
                            </span>
                            <button class="copy-button" onclick="copyMeetingLink(event)">
                                <i class='bx bx-copy'></i> Copy
                            </button>` :
                    `<i class='bx bx-time-five'></i> 
                             Link will be revealed 24 hours before the event starts`
                }
                    </div>
                </div>
            `);
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.classList.add('show');
            overlay.classList.add('show');
        }, 10);

        const closePopup = () => {
            popup.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                popup.remove();
                overlay.remove();
            }, 300);
        };

        popup.querySelector('.popup-close').onclick = closePopup;
        overlay.onclick = closePopup;
    };

    const setupEventListeners = () => {
        // Search functionality
        const searchInput = document.getElementById('eventsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                filterEvents(searchTerm, 'all');
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterType = btn.dataset.filter;
                const searchTerm = document.getElementById('eventsSearch')?.value.toLowerCase() || '';
                filterEvents(searchTerm, filterType);
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const viewType = btn.dataset.view;
                toggleView(viewType);
            });
        });

        // Admin toggle
        const adminToggle = document.querySelector('.admin-toggle');
        if (adminToggle) {
            adminToggle.addEventListener('click', toggleAdminPanel);
        }

        // Calendar navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
        document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));
        document.getElementById('todayBtn')?.addEventListener('click', () => {
            currentMonth = new Date();
            renderCalendarView(allEvents);
        });
    };

    const filterEvents = (searchTerm, filterType) => {
        const filteredEvents = allEvents.filter(event => {
            const matchesSearch = searchTerm === '' ||
                event.name.toLowerCase().includes(searchTerm) ||
                event.type.toLowerCase().includes(searchTerm) ||
                event.mode.toLowerCase().includes(searchTerm) ||
                (event.venue && event.venue.toLowerCase().includes(searchTerm)) ||
                event.description.toLowerCase().includes(searchTerm);

            const matchesFilter = filterType === 'all' || event.type.toLowerCase() === filterType;

            return matchesSearch && matchesFilter;
        });

        renderEvents(filteredEvents);
        renderTimelineView(filteredEvents);
    };

    const toggleView = (viewType) => {
        const listView = document.getElementById('listView');
        const calendarView = document.getElementById('calendarView');

        if (viewType === 'calendar') {
            listView.style.display = 'none';
            calendarView.style.display = 'block';
        } else {
            listView.style.display = 'block';
            calendarView.style.display = 'none';
        }
    };

    const toggleAdminPanel = () => {
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            adminSection.classList.toggle('hidden');
        }
    };

    const showLoading = () => {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loading);
        setTimeout(() => loading.classList.add('show'), 10);
    };

    const hideLoading = () => {
        const loading = document.querySelector('.loading-overlay');
        if (loading) {
            loading.classList.remove('show');
            setTimeout(() => loading.remove(), 300);
        }
    };

    const showEmptyState = () => {
        const eventsGrid = document.getElementById('eventsGrid');
        if (eventsGrid) {
            eventsGrid.innerHTML = `
                <div class="events__empty">
                    <i class='bx bx-calendar-x'></i>
                    <h3>No Events Found</h3>
                    <p>There are no upcoming events at the moment. Check back soon!</p>
                </div>
            `;
        }
    };

    const showErrorState = () => {
        const eventsGrid = document.getElementById('eventsGrid');
        if (eventsGrid) {
            eventsGrid.innerHTML = `
                <div class="events__empty">
                    <i class='bx bx-error'></i>
                    <h3>Error Loading Events</h3>
                    <p>There was an error loading events. Please try again later.</p>
                </div>
            `;
        }
    };

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class='bx bx-${type === 'success' ? 'check' : type === 'error' ? 'x' : 'info'}'></i>
            ${message}
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Global function for copying meeting link
    window.copyMeetingLink = (e) => {
        e.preventDefault();
        const button = e.target.closest('.copy-button');
        const linkText = button.previousElementSibling.querySelector('a').href;

        navigator.clipboard.writeText(linkText).then(() => {
            button.innerHTML = '<i class="bx bx-check"></i> Copied';
            button.classList.add('copied');

            setTimeout(() => {
                button.innerHTML = '<i class="bx bx-copy"></i> Copy';
                button.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    };

    // Initialize everything
    initializeEventsSection();
});
