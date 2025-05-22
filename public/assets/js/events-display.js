document.addEventListener('DOMContentLoaded', () => {
    const eventsContent = document.getElementById('eventsContent');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let allEvents = [];
    let searchTimeout;
    const searchInput = document.getElementById('eventsSearch');

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events');
            const events = await response.json();
            allEvents = events;
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            return [];
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
        'John Doe': 'Google',
        'Sarah Wilson': 'Microsoft',
        'Mike Chen': 'Amazon',
        'Emily Parker': 'Apple',
        'David Kumar': 'Meta',
        'Lisa Zhang': 'Netflix'
    };

    // Get random speaker image based on name
    function getSpeakerImage(name) {
        const isFemale = name.match(/^(sarah|emily|lisa|anna|emma|olivia)/i);
        const images = isFemale ? speakerImages.female : speakerImages.male;
        return images[Math.floor(Math.random() * images.length)];
    }

    const renderSpeakerStack = (speakers) => `
        <div class="speakers__stack">
            ${speakers.map((speaker, index) => {
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
        </div>
    `;

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
                        <i class='bx bx-${event.mode === 'online' ? 'laptop' : event.mode === 'hybrid' ? 'devices' : 'map'}'></i>
                        ${event.mode}
                    </span>
                    ${event.mode !== 'online' ? `
                        <span class="event__slots">
                            <i class='bx bx-user'></i>
                            ${event.filledSlots}/${event.totalSlots} slots
                        </span>
                    ` : ''}
                </div>
                
                ${event.mode !== 'online' ? `
                    <div class="event__location">
                        <i class='bx bx-map-pin'></i>
                        <div>
                            <strong>${event.venue}</strong>
                            <p>${event.address}</p>
                        </div>
                    </div>
                ` : ''}
                
                ${renderSpeakerStack(event.speakers)}
            </div>
            
            <div class="popup-actions">
                <a href="${event.registerLink}" target="_blank" class="button">
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
            const timeUntilVisible = oneDayBefore - now;

            popup.querySelector('.popup-content').insertAdjacentHTML('beforeend', `
                <div class="meeting-link-section">
                    <div class="meeting-link-header">
                        <i class='bx bx-video'></i>
                        <div>
                            <h4>Meeting Link</h4>
                            ${isLinkVisible ?
                    `<div class="countdown-timer active">Link Available Now</div>` :
                    `<div class="countdown-timer">
                                    Available in: <span class="countdown-text"></span>
                                </div>`
                }
                        </div>
                    </div>
                    <div class="meeting-link ${isLinkVisible ? 'visible' : ''}">
                        ${isLinkVisible ?
                    `<span class="link-text">${event.meetingLink}</span>
                             <button class="copy-button" onclick="copyMeetingLink(event)">
                                <i class='bx bx-copy'></i> Copy
                             </button>` :
                    `<i class='bx bx-time-five'></i> 
                             Link will be revealed 24 hours before the event starts`
                }
                    </div>
                </div>
            `);

            if (!isLinkVisible && timeUntilVisible > 0) {
                // Start countdown only if event is in the future
                const countdownElement = popup.querySelector('.countdown-text');
                startCountdown(timeUntilVisible, countdownElement, () => {
                    // Callback when countdown reaches zero
                    const meetingLinkSection = popup.querySelector('.meeting-link-section');
                    updateMeetingLinkSection(meetingLinkSection, event.meetingLink);
                });
            }
        }

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        setTimeout(() => {
            overlay.classList.add('show');
            popup.classList.add('show');
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

    const startCountdown = (timeUntilVisible, element, callback) => {
        const updateCountdown = () => {
            const hours = Math.floor(timeUntilVisible / (1000 * 60 * 60));
            const minutes = Math.floor((timeUntilVisible % (1000 * 60 * 60)) / (1000 * 60));

            if (hours <= 0 && minutes <= 0) {
                callback();
                return;
            }

            element.textContent = `${hours}h ${minutes}m`;
            timeUntilVisible -= 60000; // Subtract one minute
        };

        updateCountdown();
        return setInterval(updateCountdown, 60000); // Update every minute
    };

    const updateMeetingLinkSection = (section, meetingLink) => {
        const header = section.querySelector('.countdown-timer');
        const linkContainer = section.querySelector('.meeting-link');

        header.classList.add('active');
        header.textContent = 'Link Available Now';

        linkContainer.classList.add('visible');
        linkContainer.innerHTML = `
            <span class="link-text">${meetingLink}</span>
            <button class="copy-button" onclick="copyMeetingLink(event)">
                <i class='bx bx-copy'></i> Copy
            </button>
        `;
    };

    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class='bx ${type === 'success' ? 'bx-check-circle' : 'bx-info-circle'}'></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    window.copyMeetingLink = (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const linkText = button.closest('.meeting-link').querySelector('.link-text').textContent;

        navigator.clipboard.writeText(linkText).then(() => {
            button.classList.add('copied');
            button.innerHTML = '<i class="bx bx-check"></i> Copied!';
            showToast('Meeting link copied to clipboard!', 'success');

            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = '<i class="bx bx-copy"></i> Copy';
            }, 2000);
        });
    };

    const filterEvents = (events, searchTerm) => {
        if (!events || !searchTerm) return events;

        searchTerm = searchTerm.toLowerCase();
        return events.filter(event =>
            event.name.toLowerCase().includes(searchTerm) ||
            event.type.toLowerCase().includes(searchTerm) ||
            (event.venue && event.venue.toLowerCase().includes(searchTerm)) ||
            event.mode.toLowerCase().includes(searchTerm)
        );
    };

    const handleSearchAndFilter = () => {
        const searchTerm = searchInput.value.trim();
        if (document.querySelector('.view-btn.active').dataset.view === 'list') {
            const filteredEvents = filterEvents(allEvents, searchTerm);
            renderTimelineView(filteredEvents);
        }
    };

    // Update search handler
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(handleSearchAndFilter, 300);
        });
    }

    document.querySelectorAll('.filter-menu input').forEach(checkbox => {
        checkbox.addEventListener('change', handleSearchAndFilter);
    });

    // Update view switching
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelector('.calendar-actions').style.display =
                view === 'list' ? 'flex' : 'none';
            // ...rest of existing view switching code...
        });
    });

    // Hide search/filter initially if not in list view
    document.querySelector('.calendar-actions').style.display = 'none';

    const displayEvents = async (filter = 'all', searchTerm = '') => {
        showLoading();
        try {
            const events = await fetchEvents();
            const filteredEvents = filterEvents(events, searchTerm, filter);

            eventsContent.innerHTML = '';
            if (filteredEvents.length) {
                const grid = document.createElement('div');
                grid.className = 'events__grid';

                filteredEvents.forEach((event, index) => {
                    setTimeout(() => {
                        grid.appendChild(renderEventCard(event));
                    }, index * 100);
                });

                eventsContent.appendChild(grid);
            } else {
                eventsContent.innerHTML = `
                    <div class="events__empty">
                        <i class='bx bx-calendar-x'></i>
                        <p>No events found${searchTerm ? ' matching your search' : ''}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error displaying events:', error);
            eventsContent.innerHTML = `
                <div class="events__empty">
                    <i class='bx bx-error-circle'></i>
                    <p>Failed to load events</p>
                </div>
            `;
        } finally {
            hideLoading();
        }
    };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
                displayEvents(activeFilter, e.target.value.trim());
            }, 300);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayEvents(btn.dataset.filter, searchInput.value.trim());
        });
    });

    setInterval(() => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        displayEvents(activeFilter, searchInput.value.trim());
    }, 5 * 60 * 1000);

    displayEvents();

    const initializeCalendar = () => {
        const calendarDays = document.getElementById('calendarDays');
        const currentDate = document.getElementById('currentDate');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const todayBtn = document.getElementById('todayBtn');
        const listView = document.getElementById('listView');
        const timelineEvents = document.getElementById('timelineEvents');

        let currentMonth = new Date();

        const renderCalendar = async () => {
            showLoading();
            try {
                const events = await fetchEvents();
                const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                const startingDay = firstDay.getDay();

                currentDate.textContent = firstDay.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                });

                calendarDays.innerHTML = '';

                // Add empty cells for days before the first day of the month
                for (let i = 0; i < startingDay; i++) {
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'calendar-day empty';
                    calendarDays.appendChild(emptyDay);
                }

                // Add days of the month
                for (let day = 1; day <= lastDay.getDate(); day++) {
                    const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dayCell = document.createElement('div');
                    dayCell.className = 'calendar-day';

                    const isToday = new Date().toDateString() === currentDate.toDateString();
                    if (isToday) dayCell.classList.add('today');

                    // Get events for this day
                    const dayEvents = events.filter(event => {
                        const eventDate = new Date(event.date);
                        return eventDate.toDateString() === currentDate.toDateString();
                    });

                    dayCell.innerHTML = `
                        <div class="day-number">${day}</div>
                        <div class="day-events">
                            ${dayEvents.map(event => `
                                <div class="day-event ${event.type.toLowerCase()}" data-event='${JSON.stringify(event)}'>
                                    <span class="event-time">${event.time}</span>
                                    <span class="event-name">${event.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;

                    calendarDays.appendChild(dayCell);
                }

                // Add event listeners for day events
                const dayEventElements = calendarDays.querySelectorAll('.day-event');
                dayEventElements.forEach(eventEl => {
                    eventEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const eventData = JSON.parse(eventEl.dataset.event);
                        showEventPopup(eventData);
                    });
                });

                renderTimelineView(events);
            } catch (error) {
                console.error('Error rendering calendar:', error);
            } finally {
                hideLoading();
            }
        };

        const renderTimelineView = (events) => {
            // Group events by date
            const eventsByDate = events.reduce((acc, event) => {
                const date = new Date(event.date).toDateString();
                if (!acc[date]) acc[date] = [];
                acc[date].push(event);
                return acc;
            }, {});

            // Sort events by time for each date
            Object.values(eventsByDate).forEach(dateEvents => {
                dateEvents.sort((a, b) => {
                    const timeA = new Date(`2000/01/01 ${a.time}`);
                    const timeB = new Date(`2000/01/01 ${b.time}`);
                    return timeA - timeB;
                });
            });

            timelineEvents.innerHTML = Object.entries(eventsByDate)
                .map(([date, dateEvents]) => `
                    <div class="timeline-date">
                        <div class="date-header">
                            <i class='bx bx-calendar'></i>
                            ${new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                })}
                        </div>
                        <div class="timeline-events-list">
                            ${dateEvents.map(event => `
                                <div class="timeline-event ${event.type.toLowerCase()}" data-event='${JSON.stringify(event)}'>
                                    <div class="event-time">
                                        <i class='bx bx-time'></i>
                                        ${event.time}
                                    </div>
                                    <div class="event-content">
                                        <h3 class="event-title">${event.name}</h3>
                                        <div class="event-details">
                                            <span class="event-type">
                                                <i class='bx bx-category'></i>
                                                ${event.type}
                                            </span>
                                            <span class="event-mode">
                                                <i class='bx bx-${event.mode === 'online' ? 'laptop' :
                        event.mode === 'hybrid' ? 'devices' : 'map'}'></i>
                                                ${event.mode}
                                            </span>
                                            ${event.mode !== 'online' ? `
                                                <span class="event-venue">
                                                    <i class='bx bx-map-pin'></i>
                                                    ${event.venue}
                                                </span>
                                            ` : ''}
                                        </div>
                                        ${renderSpeakerStack(event.speakers)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');

            // Add event listeners for timeline events
            const timelineEventElements = timelineEvents.querySelectorAll('.timeline-event');
            timelineEventElements.forEach(eventEl => {
                eventEl.addEventListener('click', () => {
                    const eventData = JSON.parse(eventEl.dataset.event);
                    showEventPopup(eventData);
                });
            });
        };

        prevBtn.onclick = () => {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            renderCalendar();
        };

        nextBtn.onclick = () => {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendar();
        };

        todayBtn.onclick = () => {
            currentMonth = new Date();
            renderCalendar();
        };

        // Initial render
        renderCalendar();
    };

    // Initialize view switching with smooth transitions
    const initializeViewSwitching = () => {
        const viewBtns = document.querySelectorAll('.view-btn');
        const calendarView = document.getElementById('calendarView');
        const listView = document.getElementById('listView');

        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;

                // Update active button state
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Smooth transition between views
                calendarView.style.opacity = '0';
                listView.style.opacity = '0';

                setTimeout(() => {
                    calendarView.style.display = view === 'calendar' ? 'block' : 'none';
                    listView.style.display = view === 'list' ? 'block' : 'none';

                    requestAnimationFrame(() => {
                        if (view === 'calendar') {
                            calendarView.style.opacity = '1';
                        } else {
                            listView.style.opacity = '1';
                        }
                    });
                }, 300);
            });
        });
    };

    // Initialize everything when DOM is loaded
    fetchEvents().then(() => {
        initializeCalendar();
        initializeViewSwitching();
    });
});
