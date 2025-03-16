import fetch from 'node-fetch';
/*=============== SHOW MENU ===============*/
const navMenu = document.querySelector('.nav__menu'),
    navToggle = document.getElementById('nav-toggle'),
    navClose = document.getElementById('nav-close'); // ✅ Defined navClose

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('show-menu');
        navToggle.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav__menu') && !e.target.closest('#nav-toggle')) {
            navMenu.classList.remove('show-menu');
            navToggle.classList.remove('active');
        }
    });

    // Smooth transition when menu items are clicked
    const navLinks = document.querySelectorAll('.nav__link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
            navToggle.classList.remove('active');
        });
    });
}

// ✅ Hide menu when clicking close button
if (navClose) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
}

/*=============== HOME SWIPER ===============*/
let homeSwiper = new Swiper(".home-swiper", {
    spaceBetween: 30,
    loop: true, // ✅ Fixed 'true' to true (Boolean)
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
});

/*=============== CHANGE BACKGROUND HEADER ===============*/
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

/*=============== NEW SWIPER ===============*/
let newSwiper = new Swiper(".new-swiper", {
    centeredSlides: true,
    slidesPerView: "auto",
    loop: true, // ✅ Fixed 'true' to true
    spaceBetween: 16,
});

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]');

function scrollActive() {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
        const sectionHeight = current.offsetHeight,
            sectionTop = current.offsetTop - 58,
            sectionId = current.getAttribute('id'),
            link = document.querySelector(`.nav__menu a[href*="${sectionId}"]`);

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
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav__link');
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

            // ✅ Fixed: href.startsWith('') is always true; replaced with internal link check
            if (!href.startsWith('/') && !href.startsWith('http')) return;

            e.preventDefault();
            transition.classList.add('show');
            content.style.opacity = '0';

            setTimeout(() => {
                window.location.href = href;
            }, 500);
        });
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
sr.reveal(`.category__data, .trick__content, .footer__content`, { interval: 100 });
sr.reveal(`.about__data, .discount__img`, { origin: 'left' });
sr.reveal(`.about__img, .discount__data`, { origin: 'right' });

/*=============== LOGIN STATUS & NAVIGATION UPDATE ===============*/
function updateNavigation() {
    const nav = document.querySelector('.nav__list');
    if (!nav) return;

    fetch('https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net/api/user') // ✅ Fixed API URL
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(user => {
            if (user.error) {
                nav.innerHTML += `
                    <li class="nav__item">
                        <a href="/login" class="nav__link">Login</a>
                    </li>`;
            } else {
                const displayName = user.displayName.split(' ')[0];
                nav.innerHTML = nav.innerHTML.replace(
                    `<a href="/login" class="nav__link">Login</a>`,
                    `<a href="/profile" class="nav__profile">
                        <img src="${user.photos[0].value}" alt="Profile" class="nav__profile-img">
                        <span class="nav__profile-name">${displayName}</span>
                    </a>`
                );
            }
        })
        .catch(error => console.error('Error fetching user:', error)); // ✅ Added error handling
}

/*=============== PROFILE PAGE DATA ===============*/
if (window.location.pathname === '/profile') {
    fetch('https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net/api/user')
        .then(res => res.json())
        .then(user => {
            document.getElementById('profile-img').src = user.photos[0].value;
            document.getElementById('profile-name').textContent = user.displayName;
            document.getElementById('profile-bio').textContent = user._json.bio || '';
        });

    // Load leaderboard
    fetch('https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net/api/leaderboard')
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

// Initialize navigation state
document.addEventListener('DOMContentLoaded', updateNavigation);
