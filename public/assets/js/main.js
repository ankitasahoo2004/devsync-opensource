/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
    navToggle = document.getElementById('nav-toggle'),
    navClose = document.getElementById('nav-close')

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
const navLinks = document.querySelectorAll('.nav__link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('show-menu');
    });
});

if (navClose && navMenu) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
}

/*=============== HOME SWIPER ===============*/
new Swiper(".home-swiper", {
    spaceBetween: 30,
    loop: true,
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
});

/*=============== CHANGE BACKGROUND HEADER ===============*/
function scrollHeader() {
    const nav = document.querySelector('.nav');
    if (window.scrollY >= 50) {
        nav.classList.add('scroll-header');
    } else {
        nav.classList.remove('scroll-header');
    }
}
window.addEventListener('scroll', scrollHeader);

/*=============== NEW SWIPER ===============*/
new Swiper(".new-swiper", {
    centeredSlides: true,
    slidesPerView: "auto",
    loop: true,
    spaceBetween: 16,
});

/*=============== TEAM SWIPER ===============*/
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

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]');
function scrollActive() {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
        const sectionHeight = current.offsetHeight,
            sectionTop = current.offsetTop - 58,
            sectionId = current.getAttribute('id');

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

/*=============== SHOW SCROLL UP ===============*/
function scrollUp() {
    const scrollUp = document.getElementById('scroll-up');
    if (scrollUp) {
        if (window.scrollY >= 460) scrollUp.classList.add('show-scroll');
        else scrollUp.classList.remove('show-scroll');
    }
}
window.addEventListener('scroll', scrollUp);

/*=============== PAGE TRANSITIONS ===============*/
const transition = document.querySelector('.page-transition');
const content = document.querySelector('.main');
if (transition && content) {
    transition.classList.add('show');
    content.style.opacity = '0';

    setTimeout(() => {
        transition.classList.remove('show');
        content.style.opacity = '1';
    }, 2000);
}

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

/*=============== SCROLL REVEAL ANIMATION ===============*/
const sr = ScrollReveal({
    origin: 'top',
    distance: '60px',
    duration: 2500,
    delay: 400,
});

sr.reveal(`.home-swiper, .new-swiper, .newsletter__container`);

/*=============== GLOBAL SEARCH HINT ===============*/
// Show search hint to users
document.addEventListener('DOMContentLoaded', () => {
    // Show search hint after 3 seconds on first visit
    if (!localStorage.getItem('searchHintShown')) {
        setTimeout(() => {
            showSearchHint();
            localStorage.setItem('searchHintShown', 'true');
        }, 3000);
    }
});

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

// Add CSS for hint animations
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);

/*=============== UPDATE NAV BASED ON LOGIN ===============*/
function updateNavigation() {
    const nav = document.querySelector('.nav__list');
    const navButtons = document.querySelector('.nav__buttons');

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
                const displayName = (user.displayName || 'User').split(' ')[0];
                const profileImg = user.photos[0]?.value || 'assets/img/default-avatar.png';
                const hasNavListLogin = nav.querySelector('a[href="/login"]');

                if (hasNavListLogin) {
                    hasNavListLogin.parentElement.remove();
                }

                // Replace the login button in nav__buttons with profile link
                const loginButton = navButtons.querySelector('a[href="login.html"]');
                if (loginButton) {
                    loginButton.href = "profile.html";
                    loginButton.className = "nav__profile";
                    loginButton.innerHTML = `
                        <img src="${profileImg}" alt="Profile" class="nav__profile-img">
                    `;
                }
            }
        }).catch(err => console.error('Error fetching user data:', err));
}
updateNavigation();

/*=============== PROFILE PAGE LOADER ===============*/
if (window.location.pathname === '/profile') {
    fetch('/api/user')
        .then(res => res.json())
        .then(user => {
            document.getElementById('profile-img').src = user.photos[0].value;
            document.getElementById('profile-name').textContent = user.displayName;
            document.getElementById('profile-bio').textContent = user._json.bio || '';
        });

    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => {
            const leaderboardList = document.getElementById('leaderboard-list');
            leaderboardList.innerHTML = data.map(user => `
                    <div class="leaderboard__item">
                        <span class="leaderboard__rank">#${user.rank}</span>
                        <img src="${user.avatar}" alt="${user.username}" class="leaderboard__img">
                        <div class="leaderboard__info">
                            <h3>${user.username}</h3>
                            <p>${user.contributions} contributions</p>
                        </div>
                    </div>
                `).join('');
        });
}

/*=============== REDIRECT POPUP ===============*/
if (window.location.hostname === 'devsync-opensource.tech') {
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
        document.body.appendChild(popup);

        // Start countdown
        let count = 3;
        const countdownElement = popup.querySelector('.countdown');
        const progressBar = popup.querySelector('.progress-bar');

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
        popup.querySelector('.redirect-now').onclick = () => {
            clearInterval(countdown);
            window.location.href = 'https://www.devsync.club';
        };

        setTimeout(() => popup.classList.add('show'), 100);
    };

    createRedirectPopup();
}
