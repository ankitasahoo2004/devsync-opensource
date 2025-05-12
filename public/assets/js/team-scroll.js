document.addEventListener('DOMContentLoaded', function () {
    const teamCards = document.querySelectorAll('[data-member]');
    const teamList = document.querySelector('.col-span-4 .sticky');
    const gridContainer = document.querySelector('.col-span-6');

    // Prevent text selection during scroll
    teamList.addEventListener('selectstart', (e) => e.preventDefault());

    const options = {
        root: gridContainer,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
    };

    let currentActive = null;
    let scrollTimeout;
    let isScrolling = false;

    function updateActiveState(entry) {
        const id = entry.target.id;
        const nameElement = document.querySelector(`[data-controls="${id}"]`);
        const card = entry.target;

        if (!nameElement) return;

        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            if (currentActive && currentActive !== nameElement) {
                currentActive.classList.remove('active-member');
                currentActive.style.transform = '';
            }
            nameElement.classList.add('active-member');
            nameElement.style.transform = 'translateX(8px)';
            currentActive = nameElement;

            // Smooth scroll the name into view
            const listRect = teamList.getBoundingClientRect();
            const nameRect = nameElement.getBoundingClientRect();

            if (nameRect.top < listRect.top || nameRect.bottom > listRect.bottom) {
                const scrollTop = nameElement.offsetTop - listRect.height / 2 + nameRect.height / 2;
                teamList.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
        } else if (!entry.isIntersecting && currentActive === nameElement) {
            nameElement.classList.remove('active-member');
            currentActive = null;
        }
    }

    const observer = new IntersectionObserver((entries) => {
        if (isScrolling) return;
        entries.forEach(updateActiveState);
    }, options);

    teamCards.forEach(card => observer.observe(card));

    // Update click handler for smoother scrolling
    document.querySelectorAll('.team_member').forEach(name => {
        name.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-controls');
            const targetCard = document.getElementById(targetId);

            if (targetCard) {
                const offset = targetCard.offsetTop - gridContainer.offsetTop - 100;
                const duration = 1000; // 1 second animation
                const start = gridContainer.scrollTop;
                const diff = offset - start;

                const easeInOutCubic = t => t < 0.5
                    ? 4 * t * t * t
                    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

                let startTime;
                function animation(currentTime) {
                    if (!startTime) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const progress = Math.min(timeElapsed / duration, 1);

                    gridContainer.scrollTop = start + (diff * easeInOutCubic(progress));

                    if (progress < 1) {
                        requestAnimationFrame(animation);
                    }
                }

                requestAnimationFrame(animation);
            }
        });
    });

    // Debounce scroll handling
    gridContainer.addEventListener('scroll', () => {
        isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);
    });
});
