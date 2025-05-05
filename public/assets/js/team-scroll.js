document.addEventListener('DOMContentLoaded', function () {
    const teamCards = document.querySelectorAll('[data-member]');
    const teamList = document.querySelector('.col-span-4 .sticky');

    // Prevent text selection during scroll
    teamList.addEventListener('selectstart', (e) => e.preventDefault());

    const options = {
        rootMargin: '-15% 0px -15% 0px',
        threshold: [0.2, 0.5, 0.8]
    };

    let currentActive = null;
    let scrollTimeout;
    let isScrolling = false;

    const observer = new IntersectionObserver((entries) => {
        if (isScrolling) return;

        entries.forEach(entry => {
            const id = entry.target.id;
            const nameElement = document.querySelector(`[data-controls="${id}"]`);
            const card = entry.target.querySelector('.relative');

            if (entry.isIntersecting) {
                if (currentActive && currentActive !== nameElement) {
                    currentActive.classList.remove('active-member');
                }

                if (nameElement) {
                    requestAnimationFrame(() => {
                        nameElement.classList.add('active-member');
                        currentActive = nameElement;

                        if (window.innerWidth >= 1280) {
                            clearTimeout(scrollTimeout);
                            scrollTimeout = setTimeout(() => {
                                const topOffset = nameElement.offsetTop - teamList.offsetHeight / 3;
                                teamList.scrollTo({
                                    top: topOffset,
                                    behavior: 'smooth'
                                });
                            }, 150);
                        }
                    });
                }

                card.style.transform = `translateY(${-5 * entry.intersectionRatio}px) scale(${1 + (entry.intersectionRatio * 0.02)})`;
                card.classList.add('active-card');
            } else {
                if (nameElement === currentActive) {
                    const stillActive = Array.from(entries)
                        .some(e => e.isIntersecting && e.target.id !== id);

                    if (!stillActive) {
                        nameElement.classList.remove('active-member');
                        currentActive = null;
                    }
                }

                card.style.transform = '';
                card.classList.remove('active-card');
            }
        });
    }, options);

    teamCards.forEach(card => observer.observe(card));

    // Debounce scroll events
    teamList.addEventListener('scroll', () => {
        isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 100);
    });

    // Handle click events
    document.querySelectorAll('.team_member').forEach(name => {
        name.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-controls');
            const targetCard = document.getElementById(targetId);

            if (targetCard) {
                targetCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    });
});
