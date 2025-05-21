document.addEventListener('DOMContentLoaded', () => {
    let currentDate = new Date();
    let events = [];

    const updateCalendar = () => {
        const calendarDates = document.getElementById('calendarDates');
        const currentMonth = document.getElementById('currentMonth');

        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        currentMonth.textContent = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - firstDay.getDay());

        calendarDates.innerHTML = '';

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dateDiv = document.createElement('div');
            dateDiv.className = 'calendar-date';
            dateDiv.textContent = date.getDate();

            if (date.getMonth() !== currentDate.getMonth()) {
                dateDiv.classList.add('different-month');
            }

            const hasEvents = events.some(event => {
                const eventDate = new Date(event.date);
                return eventDate.toDateString() === date.toDateString();
            });

            if (hasEvents) {
                dateDiv.classList.add('has-event');
                dateDiv.addEventListener('click', () => showDateEvents(date));
            }

            calendarDates.appendChild(dateDiv);
        }
    };

    const updateTimeline = (selectedDate = null) => {
        const timeline = document.getElementById('eventTimeline');
        const timeScale = document.getElementById('timeScale');

        // Create time markers
        timeScale.innerHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.textContent = `${hour.toString().padStart(2, '0')}:00`;
            timeScale.appendChild(marker);
        }

        // Filter and display events
        timeline.innerHTML = '';
        const filteredEvents = selectedDate
            ? events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.toDateString() === selectedDate.toDateString();
            })
            : events;

        filteredEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const [hours, minutes] = event.time.split(':');
            const position = (parseInt(hours) + parseInt(minutes) / 60) * (500 / 24);

            const eventDiv = document.createElement('div');
            eventDiv.className = 'timeline-event';
            eventDiv.style.top = `${position}px`;
            eventDiv.innerHTML = `
                <div class="timeline-event__time">${event.time}</div>
                <div class="timeline-event__title">${event.name}</div>
                <div class="timeline-event__type">${event.type}</div>
            `;

            eventDiv.addEventListener('click', () => showEventPopup(event));
            timeline.appendChild(eventDiv);
        });
    };

    const showDateEvents = (date) => {
        document.querySelectorAll('.calendar-date').forEach(el => {
            el.classList.remove('active');
            if (el.textContent === date.getDate().toString() &&
                !el.classList.contains('different-month')) {
                el.classList.add('active');
            }
        });
        updateTimeline(date);
    };

    // Event listeners for calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Fetch and initialize events
    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events');
            events = await response.json();
            updateCalendar();
            updateTimeline();
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    fetchEvents();

    // Update every minute to keep timeline current
    setInterval(updateTimeline, 60000);
});
