
/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
    navToggle = document.getElementById('nav-toggle'),
    navClose = document.getElementById('nav-close')

// console.log(navMenu, navToggle, navClose)

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
sr.reveal(`.category__data, .trick__content, .footer__content`, { interval: 100 });
sr.reveal(`.about__data, .discount__img`, { origin: 'left' });
sr.reveal(`.about__img, .discount__data`, { origin: 'right' });

/*=============== UPDATE NAV BASED ON LOGIN ===============*/
function updateNavigation() {
    const nav = document.querySelector('.nav__list');
    fetch('/api/user')
        .then(res => res.json())
        .then(user => {
            const hasLoginButton = nav.querySelector('a[href="/login"]');
            if (user.error || !user.displayName || !user.photos) {
                if (hasLoginButton) return;
                nav.innerHTML += `
                        <li class="nav__item">
                            <a href="/login" class="nav__link">Login</a>
                        </li>`;
            } else {
                const displayName = (user.displayName || 'User').split(' ')[0];
                const profileImg = user.photos[0]?.value || 'assets/img/default-avatar.png';

                if (hasLoginButton) {
                    nav.innerHTML = nav.innerHTML.replace(
                        `<a href="/login" class="nav__link">Login</a>`,
                        `<a href="/profile" class="nav__profile">
                                <img src="${profileImg}" alt="Profile" class="nav__profile-img">
                                <span class="nav__profile-name">${displayName}</span>
                            </a>`
                    );
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
