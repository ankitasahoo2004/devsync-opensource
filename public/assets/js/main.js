/*=============== MAIN INITIALIZATION ===============*/
document.addEventListener('DOMContentLoaded', function () {
    initializeNavigation();
    initializeSwipers();
    initializeScrollEffects();
    initializePageTransitions();
    initializeScrollReveal();
});

/*=============== NAVIGATION INITIALIZATION ===============*/
function initializeNavigation() {
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navLinks = document.querySelectorAll('.nav__link');

    // Show menu toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('show-menu');
        });
    }

    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('show-menu')) {
            if (!e.target.closest('.nav__menu') && !e.target.closest('#nav-toggle')) {
                navMenu.classList.remove('show-menu');
            }
        }
    });

    // Close menu when clicking nav links
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('show-menu');
        });
    });

    // Close menu button
    if (navClose && navMenu) {
        navClose.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
        });
    }
}

/*=============== SWIPER INITIALIZATION ===============*/
function initializeSwipers() {
    // Check if Swiper is available
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper is not loaded');
        return;
    }

    // Home Swiper
    const homeSwiper = document.querySelector('.home-swiper');
    if (homeSwiper) {
        new Swiper(".home-swiper", {
            spaceBetween: 30,
            loop: true,
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
        });
    }

    // New Swiper
    const newSwiper = document.querySelector('.new-swiper');
    if (newSwiper) {
        new Swiper(".new-swiper", {
            centeredSlides: true,
            slidesPerView: "auto",
            loop: true,
            spaceBetween: 16,
        });
    }

    // Team Swiper
    const teamSwiper = document.querySelector('.team-swiper');
    if (teamSwiper) {
        new Swiper(".team-swiper", {
            loop: true,
            grabCursor: true,
            spaceBetween: 32,
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
            autoplay: {
                delay: 3500,
                disableOnInteraction: false,
            }
        });
    }
}

/*=============== SCROLL EFFECTS INITIALIZATION ===============*/
function initializeScrollEffects() {
    // Change background header
    function scrollHeader() {
        const nav = document.querySelector('.nav');
        if (nav) {
            if (window.scrollY >= 50) {
                nav.classList.add('scroll-header');
            } else {
                nav.classList.remove('scroll-header');
            }
        }
    }
    window.addEventListener('scroll', scrollHeader);

    // Scroll sections active link
    const sections = document.querySelectorAll('section[id]');
    function scrollActive() {
        if (sections.length === 0) return;

        const scrollY = window.pageYOffset;

        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 58;
            const sectionId = current.getAttribute('id');

            const link = document.querySelector('.nav__menu a[href*=' + sectionId + ']');
            if (link) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    link.classList.add('active-link');
                } else {
                    link.classList.remove('active-link');
                }
            }
        });
    }
    window.addEventListener('scroll', scrollActive);

    // Show scroll up button
    function scrollUp() {
        const scrollUpBtn = document.getElementById('scroll-up');
        if (scrollUpBtn) {
            if (window.scrollY >= 460) {
                scrollUpBtn.classList.add('show-scroll');
            } else {
                scrollUpBtn.classList.remove('show-scroll');
            }
        }
    }
    window.addEventListener('scroll', scrollUp);
}

/*=============== PAGE TRANSITIONS INITIALIZATION ===============*/
function initializePageTransitions() {
    const transition = document.querySelector('.page-transition');
    const content = document.querySelector('.main');
    const navLinks = document.querySelectorAll('.nav__link');

    if (transition && content) {
        transition.classList.add('show');
        content.style.opacity = '0';

        setTimeout(() => {
            transition.classList.remove('show');
            content.style.opacity = '1';
        }, 2000);
    }

    // Handle nav link transitions
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;

            e.preventDefault();
            if (transition && content) {
                transition.classList.add('show');
                content.style.opacity = '0';

                setTimeout(() => {
                    window.location.href = href;
                }, 500);
            }
        });
    });
}

/*=============== SCROLL REVEAL INITIALIZATION ===============*/
function initializeScrollReveal() {
    if (typeof ScrollReveal === 'undefined') {
        console.warn('ScrollReveal is not loaded');
        return;
    }

    const sr = ScrollReveal({
        origin: 'top',
        distance: '60px',
        duration: 2500,
        delay: 400,
    });

    sr.reveal(`.home-swiper, .new-swiper, .newsletter__container`);
}

/*=============== GLOBAL SEARCH HINT ===============*/
// Initialize search hint functionality
function initializeSearchHint() {
    // Check authentication status when page loads
    if (typeof checkAuthStatus === 'function') {
        checkAuthStatus();
    }

    // Show search hint after 3 seconds on first visit
    if (!localStorage.getItem('searchHintShown')) {
        setTimeout(() => {
            showSearchHint();
            localStorage.setItem('searchHintShown', 'true');
        }, 3000);
    }
}

function showSearchHint() {
    const hint = document.createElement('div');
    hint.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9998;
        animation: fadeInSlide 0.5s ease-out;
        cursor: pointer;
    `;
    hint.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="bx bx-search"></i>
            <span>Press <kbd style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">Alt+F</kbd> to search</span>
            <i class="bx bx-x" style="margin-left: 8px; opacity: 0.7;"></i>
        </div>
    `;

    document.body.appendChild(hint);

    hint.addEventListener('click', () => {
        hint.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(hint)) {
            hint.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => hint.remove(), 500);
        }
    }, 5000);
}

// Initialize search hint when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSearchHint);

// Add CSS for hint animations
const hintStyle = document.createElement('style');
hintStyle.textContent = `
    @keyframes fadeInSlide {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(hintStyle);

/*=============== UPDATE NAV BASED ON LOGIN ===============*/
function updateNavigation() {
    const nav = document.querySelector('.nav__list');
    const navButtons = document.querySelector('.nav__buttons');

    if (!nav || !navButtons) {
        console.warn('Navigation elements not found');
        return;
    }

    fetch('/api/user')
        .then(res => res.json())
        .then(user => {
            if (user.error || !user.displayName || !user.photos) {
                // User is not logged in, ensure only one login button exists
                const hasNavListLogin = nav.querySelector('a[href="/login"]');
                if (hasNavListLogin) {
                    hasNavListLogin.parentElement.remove();
                }
            } else {
                // User is logged in, replace login button with profile
                const fullDisplayName = user.displayName || user.username || 'User';
                // Use full name with CSS ellipsis handling
                const profileImg = user.photos[0]?.value || 'assets/img/default-avatar.png';
                const hasNavListLogin = nav.querySelector('a[href="/login"]');

                if (hasNavListLogin) {
                    hasNavListLogin.parentElement.remove();
                }

                // Replace the login button in nav__buttons with profile link
                const loginButton = navButtons.querySelector('a[href="/login"]');
                if (loginButton) {
                    loginButton.href = "/profile";
                    loginButton.className = "nav__profile";
                    loginButton.innerHTML = `
                        <span class="nav__profile-name" title="${fullDisplayName}">${fullDisplayName}</span>
                        <img src="${profileImg}" alt="Profile" class="nav__profile-img">
                    `;
                }
            }
        }).catch(err => console.error('Error fetching user data:', err));
}

// Initialize navigation update when DOM is ready
document.addEventListener('DOMContentLoaded', updateNavigation);

/*=============== PROFILE PAGE LOADER ===============*/
function initializeProfilePage() {
    if (window.location.pathname !== '/profile') return;

    const profileImg = document.getElementById('profile-img');
    const profileName = document.getElementById('profile-name');
    const profileBio = document.getElementById('profile-bio');
    const leaderboardList = document.getElementById('leaderboard-list');

    // Load user profile data
    fetch('/api/user')
        .then(res => res.json())
        .then(user => {
            if (user.error) {
                console.error('User not authenticated');
                return;
            }

            if (profileImg && user.photos && user.photos[0]) {
                profileImg.src = user.photos[0].value;
            }
            if (profileName && user.displayName) {
                profileName.textContent = user.displayName;
            }
            if (profileBio && user._json && user._json.bio) {
                profileBio.textContent = user._json.bio;
            }
        })
        .catch(err => console.error('Error loading profile:', err));

    // Load leaderboard data
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => {
            if (leaderboardList && Array.isArray(data)) {
                leaderboardList.innerHTML = data.map(user => `
                    <div class="leaderboard__item">
                        <span class="leaderboard__rank">#${user.rank || 'N/A'}</span>
                        <img src="${user.avatar || 'assets/img/default-avatar.png'}" alt="${user.username || 'Unknown'}" class="leaderboard__img">
                        <div class="leaderboard__info">
                            <h3>${user.username || 'Unknown User'}</h3>
                            <p>${user.contributions || 0} contributions</p>
                        </div>
                    </div>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading leaderboard:', err));
}

// Initialize profile page when DOM is ready
document.addEventListener('DOMContentLoaded', initializeProfilePage);

/*=============== REDIRECT POPUP ===============*/
function initializeRedirectPopup() {
    if (window.location.hostname !== 'devsync-opensource.tech') return;

    const createRedirectPopup = () => {
        const popup = document.createElement('div');
        popup.className = 'redirect-popup';
        popup.innerHTML = `
            <div class="redirect-content">
                <div class="redirect-header">
                    <i class='bx bx-navigation'></i>
                    <h3>Redirecting to our new domain</h3>
                </div>
                <p>We've moved to a new home! You'll be redirected to:</p>
                <div class="new-domain">
                    <i class='bx bx-globe'></i>
                    <span>www.devsync.club</span>
                </div>
                <div class="redirect-progress">
                    <div class="progress-bar"></div>
                </div>
                <p class="redirect-message">Redirecting in <span class="countdown">3</span> seconds...</p>
                <button class="redirect-now">Go now</button>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(popup);
        } else {
            console.error('Document body not available');
            return;
        }

        // Start countdown
        let count = 3;
        const countdownElement = popup.querySelector('.countdown');
        const progressBar = popup.querySelector('.progress-bar');

        if (!countdownElement || !progressBar) {
            console.error('Popup elements not found');
            return;
        }

        const countdown = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            progressBar.style.width = `${((3 - count) / 3) * 100}%`;

            if (count === 0) {
                clearInterval(countdown);
                window.location.href = 'https://www.devsync.club';
            }
        }, 1000);

        // Immediate redirect button
        const redirectBtn = popup.querySelector('.redirect-now');
        if (redirectBtn) {
            redirectBtn.onclick = () => {
                clearInterval(countdown);
                window.location.href = 'https://www.devsync.club';
            };
        }

        setTimeout(() => popup.classList.add('show'), 100);
    };

    createRedirectPopup();
}

// Initialize redirect popup when DOM is ready
document.addEventListener('DOMContentLoaded', initializeRedirectPopup);
