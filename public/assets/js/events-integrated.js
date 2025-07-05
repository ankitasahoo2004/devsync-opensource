/**
 * Events Integrated System - Combines Admin and Display functionality
 * Modern events management with enhanced user experience and theme integration
 */

document.addEventListener('DOMContentLoaded', () => {
    let allEvents = [];
    let currentUser = null;
    let currentView = 'list';
    let currentDate = new Date();
    let filteredEvents = [];

    // DOM Elements
    const adminToggle = document.getElementById('adminToggle');
    const adminSection = document.getElementById('adminSection');
    const adminWelcome = document.getElementById('adminWelcome');
    const unauthorizedMessage = document.getElementById('unauthorizedMessage');
    const eventsGrid = document.getElementById('eventsGrid');
    const eventsSearch = document.getElementById('eventsSearch');
    const eventTypeFilter = document.getElementById('eventTypeFilter');
    const eventModeFilter = document.getElementById('eventModeFilter');
    const viewButtons = document.querySelectorAll('.view-btn');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    const noEventsMessage = document.getElementById('noEventsMessage');
    const eventsLoading = document.getElementById('eventsLoading');

    // Initialize the events system
    init();

    async function init() {
        showLoading();
        setupThemeDetection();
        await checkAdminStatus();
        await fetchEvents();
        setupEventListeners();
        renderEvents();
        hideLoading();
    }

    // Enhanced theme detection to work with site's global theme system
    function setupThemeDetection() {
        // Detect theme changes and update events container accordingly
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                    updateEventsTheme();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });

        // Also listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateEventsTheme);
        }

        // Initial theme update
        updateEventsTheme();
    }

    function updateEventsTheme() {
        const html = document.documentElement;
        const eventsContainer = document.querySelector('.events-main-container');
        
        if (!eventsContainer) return;

        const isDark = html.classList.contains('dark') ||
            html.getAttribute('data-theme') === 'dark' ||
            eventsContainer.closest('.dark') ||
            eventsContainer.closest('[data-theme="dark"]') ||
            (!html.classList.contains('light') &&
                !html.getAttribute('data-theme') &&
                window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);

        // Apply theme class to events container for proper CSS cascade
        if (isDark) {
            eventsContainer.classList.add('dark-theme');
            eventsContainer.setAttribute('data-theme', 'dark');
        } else {
            eventsContainer.classList.remove('dark-theme');
            eventsContainer.setAttribute('data-theme', 'light');
        }

        // Emit custom event for other components that might need to know
        window.dispatchEvent(new CustomEvent('eventsThemeChange', {
            detail: { isDark }
        }));
    }

    // Admin Status Check
    async function checkAdminStatus() {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.isAuthenticated) {
                currentUser = data.user;

                // Check if user is admin
                const adminIds = ['ankitasahoo2004', 'Sayan-dev731', 'Shubham66020']; // From env
                if (adminIds.includes(data.user.username)) {
                    adminToggle.style.display = 'flex';
                    setupAdminPanel();
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }

    // Fetch Events from API
    async function fetchEvents() {
        try {
            const response = await fetch('/api/events');
            const events = await response.json();

            // Process and sort events
            allEvents = events.map(event => ({
                ...event,
                date: new Date(event.date),
                isPast: new Date(event.date) < new Date(),
                isToday: new Date(event.date).toDateString() === new Date().toDateString(),
                timeUntil: getTimeUntil(new Date(event.date))
            })).sort((a, b) => a.date - b.date);

            filteredEvents = [...allEvents];
        } catch (error) {
            console.error('Error fetching events:', error);
            showError('Failed to load events. Please try again later.');
        }
    }

    // Setup Event Listeners with enhanced mobile support
    function setupEventListeners() {
        // Admin toggle
        if (adminToggle) {
            adminToggle.addEventListener('click', toggleAdminPanel);
            // Enhanced touch support
            adminToggle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                adminToggle.style.transform = 'scale(0.95)';
            });
            adminToggle.addEventListener('touchend', (e) => {
                e.preventDefault();
                adminToggle.style.transform = 'scale(1)';
                toggleAdminPanel();
            });
        }

        // Search functionality with mobile optimization
        if (eventsSearch) {
            eventsSearch.addEventListener('input', debounce(handleSearch, 300));
            
            // Prevent zoom on iOS
            eventsSearch.addEventListener('focus', () => {
                if (isMobile()) {
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
                    }
                }
            });
            
            eventsSearch.addEventListener('blur', () => {
                if (isMobile()) {
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                        viewport.setAttribute('content', 'width=device-width, initial-scale=1');
                    }
                }
            });
        }

        // Filter functionality
        if (eventTypeFilter) {
            eventTypeFilter.addEventListener('change', handleFilter);
        }

        if (eventModeFilter) {
            eventModeFilter.addEventListener('change', handleFilter);
        }

        // View switching with touch feedback
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
            
            // Touch feedback for mobile
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.95)';
            });
            btn.addEventListener('touchend', () => {
                btn.style.transform = 'scale(1)';
            });
        });

        // Calendar navigation
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => navigateCalendar(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateCalendar(1));
        if (todayBtn) todayBtn.addEventListener('click', goToToday);

        // Keyboard navigation support
        document.addEventListener('keydown', handleKeyboardNavigation);

        // Enhanced scroll performance for mobile
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateScrollEffects();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Responsive breakpoint detection
        window.addEventListener('resize', debounce(handleResize, 250));
        handleResize(); // Initial call
    }

    // Mobile detection utility
    function isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Handle responsive behavior
    function handleResize() {
        const isMobileView = isMobile();
        
        // Adjust admin toggle position on very small screens
        if (adminToggle) {
            if (window.innerWidth <= 360) {
                adminToggle.style.bottom = '0.75rem';
                adminToggle.style.right = '0.75rem';
            } else {
                adminToggle.style.bottom = '1.5rem';
                adminToggle.style.right = '1.5rem';
            }
        }

        // Optimize calendar view for mobile
        if (currentView === 'calendar' && isMobileView) {
            const calendarContainer = document.querySelector('.calendar__container');
            if (calendarContainer) {
                calendarContainer.style.fontSize = window.innerWidth <= 360 ? '0.85rem' : '0.9rem';
            }
        }

        // Update grid layout based on screen size
        updateGridLayout();
    }

    function updateGridLayout() {
        const grid = document.getElementById('eventsGrid');
        if (!grid) return;

        const screenWidth = window.innerWidth;
        let columns;

        if (screenWidth >= 1200) {
            columns = Math.min(3, Math.ceil(filteredEvents.length / 2));
        } else if (screenWidth >= 768) {
            columns = Math.min(2, filteredEvents.length);
        } else {
            columns = 1;
        }

        grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }

    function updateScrollEffects() {
        // Add subtle scroll effects for better UX
        const scrollY = window.scrollY;
        const eventsContainer = document.querySelector('.events-main-container');
        
        if (eventsContainer && scrollY > 100) {
            eventsContainer.style.transform = `translateY(${scrollY * -0.02}px)`;
        }
    }

    function handleKeyboardNavigation(e) {
        // Enhanced keyboard navigation
        if (e.key === 'Escape') {
            // Close any open popups
            const popup = document.querySelector('.event-popup');
            if (popup) {
                const closeBtn = popup.querySelector('.popup-close');
                if (closeBtn) closeBtn.click();
            }
        }

        if (e.key === 'Tab') {
            // Ensure proper tab order for accessibility
            ensureTabOrder();
        }
    }

    function ensureTabOrder() {
        // Ensure all interactive elements have proper tab order
        const interactiveElements = document.querySelectorAll(
            '.events-main-container button, .events-main-container input, .events-main-container select, .events-main-container a'
        );
        
        interactiveElements.forEach((el, index) => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', index + 1);
            }
        });
    }
        if (eventModeFilter) {
            eventModeFilter.addEventListener('change', handleFilter);
        }

        // View switching
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                switchView(view);
            });
        });

        // Calendar navigation
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => navigateCalendar(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateCalendar(1));
        if (todayBtn) todayBtn.addEventListener('click', goToToday);
    }

    // Admin Panel Setup
    function setupAdminPanel() {
        adminWelcome.style.display = 'block';

        // Setup admin event listeners
        const createEventBtn = document.getElementById('createEventBtn');
        const manageEventsBtn = document.getElementById('manageEventsBtn');

        if (createEventBtn) {
            createEventBtn.addEventListener('click', showCreateEventForm);
        }

        if (manageEventsBtn) {
            manageEventsBtn.addEventListener('click', showManageEvents);
        }
    }

    // Toggle Admin Panel
    function toggleAdminPanel() {
        const isVisible = adminSection.style.display !== 'none';
        adminSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible && currentUser) {
            // Check if user is actually admin
            const adminIds = ['ankitasahoo2004', 'Sayan-dev731', 'Shubham66020'];
            if (adminIds.includes(currentUser.username)) {
                adminWelcome.style.display = 'block';
                unauthorizedMessage.style.display = 'none';
            } else {
                adminWelcome.style.display = 'none';
                unauthorizedMessage.style.display = 'block';
            }
        }
    }

    // Search and Filter Functions
    function handleSearch() {
        const query = eventsSearch.value.toLowerCase().trim();
        filterEvents();
    }

    function handleFilter() {
        filterEvents();
    }

    function filterEvents() {
        const searchQuery = eventsSearch?.value.toLowerCase().trim() || '';
        const typeFilter = eventTypeFilter?.value || '';
        const modeFilter = eventModeFilter?.value || '';

        filteredEvents = allEvents.filter(event => {
            const matchesSearch = !searchQuery ||
                event.name.toLowerCase().includes(searchQuery) ||
                event.description.toLowerCase().includes(searchQuery) ||
                event.type.toLowerCase().includes(searchQuery);

            const matchesType = !typeFilter || event.type === typeFilter;
            const matchesMode = !modeFilter || event.mode === modeFilter;

            return matchesSearch && matchesType && matchesMode;
        });

        renderEvents();
    }

    // View Switching
    function switchView(view) {
        currentView = view;

        // Update button states
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide views
        if (listView && calendarView) {
            listView.classList.toggle('active', view === 'list');
            calendarView.classList.toggle('active', view === 'calendar');
        }

        if (view === 'calendar') {
            renderCalendar();
        } else {
            renderEventsList();
        }
    }

    // Render Events
    function renderEvents() {
        if (currentView === 'list') {
            renderEventsList();
        } else {
            renderCalendar();
        }
    }

    // Render Events List
    function renderEventsList() {
        if (!eventsGrid) return;

        if (filteredEvents.length === 0) {
            eventsGrid.innerHTML = '';
            if (noEventsMessage) noEventsMessage.style.display = 'block';
            return;
        }

        if (noEventsMessage) noEventsMessage.style.display = 'none';

        eventsGrid.innerHTML = filteredEvents.map(event => createEventCard(event)).join('');

        // Add click listeners to event cards
        eventsGrid.querySelectorAll('.event__card').forEach((card, index) => {
            card.addEventListener('click', () => showEventPopup(filteredEvents[index]));
        });
    }

    // Create Event Card HTML
    function createEventCard(event) {
        const speakersHtml = renderSpeakerStack(event.speakers || []);
        const isUpcoming = event.date > new Date();
        const statusClass = event.isPast ? 'event__card--past' : (event.isToday ? 'event__card--today' : '');

        return `
            <div class="event__card ${statusClass}" data-event-id="${event._id}">
                <div class="event__header">
                    <span class="event__tag">${event.type}</span>
                    <span class="event__mode">
                        <i class='bx bx-${getEventModeIcon(event.mode)}'></i>
                        ${event.mode}
                    </span>
                </div>
                
                <h3 class="event__title">${event.name}</h3>
                
                <div class="event__date">
                    <i class='bx bx-calendar'></i>
                    ${formatEventDate(event.date)} at ${event.time}
                    ${event.isPast ? '<span class="event__status event__status--past">Past</span>' : ''}
                    ${event.isToday ? '<span class="event__status event__status--today">Today</span>' : ''}
                </div>
                
                <p class="event__description">${event.description}</p>
                
                <div class="event__details">
                    ${event.mode !== 'online' ? `
                        <span class="event__detail">
                            <i class='bx bx-user'></i>
                            ${event.filledSlots || 0}/${event.totalSlots} slots
                        </span>
                    ` : ''}
                    ${event.venue ? `
                        <span class="event__detail">
                            <i class='bx bx-map-pin'></i>
                            ${event.venue}
                        </span>
                    ` : ''}
                </div>
                
                ${speakersHtml}
                
                <div class="event__actions">
                    ${isUpcoming ? `
                        <a href="${event.registerLink}" target="_blank" class="event__register">
                            Register Now
                            <i class="bx bx-right-arrow-alt"></i>
                        </a>
                    ` : `
                        <button class="event__register event__register--disabled" disabled>
                            Event Ended
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    // Render Speaker Stack
    function renderSpeakerStack(speakers) {
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

        function getSpeakerImage(name) {
            const isFemale = name.match(/^(sarah|emily|lisa|anna|emma|olivia)/i);
            const images = isFemale ? speakerImages.female : speakerImages.male;
            return images[Math.floor(Math.random() * images.length)];
        }

        return `
            <div class="speakers__stack">
                ${speakers.slice(0, 4).map((speaker, index) => {
            const name = speaker.split('/').pop().replace(/-/g, ' ') || 'Speaker';
            return `
                        <div class="speaker__wrapper" style="z-index: ${20 - index}">
                            <a href="${speaker}" target="_blank" class="speaker__link" title="${name}">
                                <img src="${getSpeakerImage(name)}?w=80&h=80&fit=crop" 
                                     alt="${name}" loading="lazy">
                            </a>
                        </div>
                    `;
        }).join('')}
                ${speakers.length > 4 ? `
                    <div class="speaker__wrapper speaker__more">
                        <div class="speaker__link">
                            <span>+${speakers.length - 4}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Calendar Rendering
    function renderCalendar() {
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            currentDateEl.textContent = currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        }

        renderCalendarDays();
        renderTimelineEvents();
    }

    function renderCalendarDays() {
        const calendarDays = document.getElementById('calendarDays');
        if (!calendarDays) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const currentCalendarDate = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const dayEvents = filteredEvents.filter(event =>
                event.date.toDateString() === currentCalendarDate.toDateString()
            );

            const isToday = currentCalendarDate.toDateString() === today.toDateString();
            const isCurrentMonth = currentCalendarDate.getMonth() === month;
            const hasEvents = dayEvents.length > 0;

            days.push(`
                <div class="calendar__day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${hasEvents ? 'has-event' : ''}"
                     data-date="${currentCalendarDate.toISOString()}">
                    <span class="day-number">${currentCalendarDate.getDate()}</span>
                    ${hasEvents ? `
                        <div class="day-events">
                            ${dayEvents.slice(0, 2).map(event => `
                                <div class="day-event" title="${event.name}">${event.name.substring(0, 12)}...</div>
                            `).join('')}
                            ${dayEvents.length > 2 ? `<div class="day-event">+${dayEvents.length - 2} more</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            `);

            currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
        }

        calendarDays.innerHTML = days.join('');

        // Add click listeners to calendar days
        calendarDays.querySelectorAll('.calendar__day').forEach(day => {
            day.addEventListener('click', () => {
                const date = new Date(day.dataset.date);
                const dayEvents = filteredEvents.filter(event =>
                    event.date.toDateString() === date.toDateString()
                );
                if (dayEvents.length > 0) {
                    showDayEventsPopup(dayEvents, date);
                }
            });
        });
    }

    function renderTimelineEvents() {
        const timelineEvents = document.getElementById('timelineEvents');
        if (!timelineEvents) return;

        const upcomingEvents = filteredEvents
            .filter(event => event.date >= new Date())
            .slice(0, 10);

        if (upcomingEvents.length === 0) {
            timelineEvents.innerHTML = `
                <div class="no-events">
                    <i class='bx bx-calendar-x'></i>
                    <h4>No Upcoming Events</h4>
                    <p>Check back later for new events!</p>
                </div>
            `;
            return;
        }

        timelineEvents.innerHTML = `
            <h3><i class='bx bx-time-five'></i> Upcoming Events Timeline</h3>
            ${upcomingEvents.map(event => `
                <div class="timeline__event" data-event-id="${event._id}">
                    <div class="timeline__date">
                        <div class="timeline__day">${event.date.getDate()}</div>
                        <div class="timeline__month">${event.date.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                    <div class="timeline__content">
                        <h4 class="timeline__title">${event.name}</h4>
                        <div class="timeline__details">
                            <span><i class='bx bx-time'></i> ${event.time}</span>
                            <span><i class='bx bx-${getEventModeIcon(event.mode)}'></i> ${event.mode}</span>
                            <span class="event__tag">${event.type}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;

        // Add click listeners to timeline events
        timelineEvents.querySelectorAll('.timeline__event').forEach((eventEl, index) => {
            eventEl.addEventListener('click', () => showEventPopup(upcomingEvents[index]));
        });
    }

    // Calendar Navigation
    function navigateCalendar(direction) {
        currentDate.setMonth(currentDate.getMonth() + direction);
        renderCalendar();
    }

    function goToToday() {
        currentDate = new Date();
        renderCalendar();
    }

    // Event Popup
    function showEventPopup(event) {
        const popup = document.createElement('div');
        popup.className = 'event-popup';

        const meetingLinkSection = (event.mode === 'online' || event.mode === 'hybrid') && event.meetingLink ? `
            <div class="meeting-link-section">
                <div class="countdown-timer active">Meeting Link Available</div>
                <div class="meeting-link visible">
                    <span class="link-text">${event.meetingLink}</span>
                    <button class="copy-button" onclick="copyMeetingLink(event)">
                        <i class='bx bx-copy'></i> Copy
                    </button>
                </div>
            </div>
        ` : '';

        popup.innerHTML = `
            <div class="popup-header">
                <div>
                    <span class="event__tag">${event.type}</span>
                    <h3 class="event__title">${event.name}</h3>
                </div>
                <button class="popup-close"><i class='bx bx-x'></i></button>
            </div>
            
            <div class="popup-content">
                <div class="event__date">
                    <i class='bx bx-calendar'></i>
                    ${formatEventDate(event.date)} at ${event.time}
                </div>
                
                <p class="event__description">${event.description}</p>
                
                <div class="event__details">
                    <span class="event__mode">
                        <i class='bx bx-${getEventModeIcon(event.mode)}'></i>
                        ${event.mode}
                    </span>
                    ${event.mode !== 'online' && event.totalSlots ? `
                        <span class="event__slots">
                            <i class='bx bx-user'></i>
                            ${event.filledSlots || 0}/${event.totalSlots} slots
                        </span>
                    ` : ''}
                </div>
                
                ${event.venue ? `
                    <div class="event__location">
                        <i class='bx bx-map-pin'></i>
                        <div>
                            <strong>${event.venue}</strong>
                            ${event.address ? `<p>${event.address}</p>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${meetingLinkSection}
                
                ${renderSpeakerStack(event.speakers || [])}
            </div>
            
            <div class="popup-actions">
                ${event.date > new Date() ? `
                    <a href="${event.registerLink}" target="_blank" class="button">
                        Register Now
                        <i class="bx bx-right-arrow-alt"></i>
                    </a>
                ` : `
                    <button class="button button--ghost" disabled>
                        Event Ended
                    </button>
                `}
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        requestAnimationFrame(() => {
            popup.classList.add('show');
            overlay.classList.add('show');
        });

        const closePopup = () => {
            popup.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                document.body.removeChild(popup);
            }, 300);
        };

        popup.querySelector('.popup-close').onclick = closePopup;
        overlay.onclick = closePopup;
    }

    // Admin Functions - Create Event Form
    function showCreateEventForm() {
        const eventManagement = document.getElementById('eventManagement');
        if (!eventManagement) return;

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
                    <button type="button" class="add-speaker" id="addSpeaker">
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

        setupEventForm();
    }

    function setupEventForm() {
        const eventForm = document.getElementById('eventForm');
        const eventMode = document.getElementById('eventMode');
        const locationDetails = document.getElementById('locationDetails');
        const addSpeaker = document.getElementById('addSpeaker');
        const speakersContainer = document.getElementById('speakersContainer');
        const cancelBtn = document.getElementById('cancelEventForm');

        // Handle event mode change
        eventMode.addEventListener('change', () => {
            const mode = eventMode.value;
            updateLocationFields(mode, locationDetails);
        });

        // Handle add/remove speakers
        addSpeaker.addEventListener('click', addSpeakerField);
        speakersContainer.addEventListener('click', handleSpeakerRemoval);

        // Handle form submission
        eventForm.addEventListener('submit', handleEventSubmission);

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            document.getElementById('eventManagement').innerHTML = '';
        });
    }

    function updateLocationFields(mode, container) {
        let html = '';

        if (mode === 'online' || mode === 'hybrid') {
            html += `
                <div class="form-group">
                    <label for="meetingLink">Meeting Link</label>
                    <input type="url" id="meetingLink" placeholder="Enter meeting link">
                </div>
            `;
        }

        if (mode === 'offline' || mode === 'hybrid') {
            html += `
                <div class="form-group">
                    <label for="eventVenue">Venue</label>
                    <input type="text" id="eventVenue" placeholder="Enter venue name">
                </div>
                <div class="form-group">
                    <label for="eventAddress">Address</label>
                    <textarea id="eventAddress" rows="2" placeholder="Enter full address"></textarea>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    function addSpeakerField() {
        const speakersContainer = document.getElementById('speakersContainer');
        const speakerInput = document.createElement('div');
        speakerInput.className = 'speaker-input';
        speakerInput.innerHTML = `
            <input type="url" class="speaker-linkedin" placeholder="LinkedIn Profile URL" required>
            <button type="button" class="remove-speaker" title="Remove speaker"><i class='bx bx-x'></i></button>
        `;
        speakersContainer.appendChild(speakerInput);
    }

    function handleSpeakerRemoval(e) {
        if (e.target.closest('.remove-speaker')) {
            const speakerInput = e.target.closest('.speaker-input');
            const container = document.getElementById('speakersContainer');
            if (container.children.length > 1) {
                speakerInput.remove();
            }
        }
    }

    async function handleEventSubmission(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const speakers = Array.from(document.querySelectorAll('.speaker-linkedin'))
            .map(input => input.value)
            .filter(value => value.trim() !== '');

        const eventData = {
            name: document.getElementById('eventName').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            description: document.getElementById('eventDescription').value,
            type: document.getElementById('eventType').value,
            mode: document.getElementById('eventMode').value,
            totalSlots: parseInt(document.getElementById('eventSlots').value),
            registerLink: document.getElementById('registerLink').value,
            speakers: speakers,
            meetingLink: document.getElementById('meetingLink')?.value || '',
            venue: document.getElementById('eventVenue')?.value || '',
            address: document.getElementById('eventAddress')?.value || '',
            filledSlots: 0
        };

        try {
            showLoading();
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                showToast('Event created successfully!', 'success');
                document.getElementById('eventManagement').innerHTML = '';
                await fetchEvents();
                renderEvents();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to create event', 'error');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            showToast('Failed to create event. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    // Manage Events
    async function showManageEvents() {
        const eventManagement = document.getElementById('eventManagement');
        if (!eventManagement) return;

        try {
            showLoading();

            eventManagement.innerHTML = `
                <div class="manage-events">
                    <h4><i class='bx bx-cog'></i> Manage Events</h4>
                    <div id="adminEventsList" class="admin-events-list">
                        ${allEvents.map(event => `
                            <div class="admin-event-item" data-event-id="${event._id}">
                                <div class="admin-event-info">
                                    <h5>${event.name}</h5>
                                    <p>${formatEventDate(event.date)} • ${event.type} • ${event.mode}</p>
                                    <span class="admin-event-status ${event.isPast ? 'past' : 'upcoming'}">
                                        ${event.isPast ? 'Past' : 'Upcoming'}
                                    </span>
                                </div>
                                <div class="admin-event-actions">
                                    <button class="button button--small edit-event" data-event-id="${event._id}">
                                        <i class='bx bx-edit'></i> Edit
                                    </button>
                                    <button class="button button--small button--ghost delete-event" data-event-id="${event._id}">
                                        <i class='bx bx-trash'></i> Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add event listeners for edit/delete
            eventManagement.querySelectorAll('.edit-event').forEach(btn => {
                btn.addEventListener('click', (e) => editEvent(e.target.dataset.eventId));
            });

            eventManagement.querySelectorAll('.delete-event').forEach(btn => {
                btn.addEventListener('click', (e) => deleteEvent(e.target.dataset.eventId));
            });

        } catch (error) {
            console.error('Error loading manage events:', error);
            showToast('Failed to load events for management', 'error');
        } finally {
            hideLoading();
        }
    }

    async function deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            showLoading();
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                showToast('Event deleted successfully!', 'success');
                await fetchEvents();
                renderEvents();
                showManageEvents(); // Refresh the manage view
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete event', 'error');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            showToast('Failed to delete event. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    // Utility Functions
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function getEventModeIcon(mode) {
        const icons = {
            online: 'laptop',
            offline: 'map-pin',
            hybrid: 'devices'
        };
        return icons[mode] || 'calendar';
    }

    function formatEventDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function getTimeUntil(date) {
        const now = new Date();
        const diff = date - now;

        if (diff < 0) return 'Past event';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
        return 'Starting soon';
    }

    function showLoading() {
        if (eventsLoading) eventsLoading.style.display = 'block';
    }

    function hideLoading() {
        if (eventsLoading) eventsLoading.style.display = 'none';
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class='bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle'}'></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    function showError(message) {
        if (eventsGrid) {
            eventsGrid.innerHTML = `
                <div class="error-message">
                    <i class='bx bx-error-circle'></i>
                    <h3>Oops! Something went wrong</h3>
                    <p>${message}</p>
                    <button class="button" onclick="location.reload()">
                        <i class='bx bx-refresh'></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    // Global functions for inline event handlers
    window.copyMeetingLink = (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const linkText = button.closest('.meeting-link').querySelector('.link-text').textContent;

        navigator.clipboard.writeText(linkText).then(() => {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="bx bx-check"></i> Copied';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
            showToast('Meeting link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    };
});
