document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');

    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();

        // Use the animated logout function from auth.js if available
        if (typeof triggerLogoutWithAnimation === 'function') {
            triggerLogoutWithAnimation();
        } else {
            // Fallback to direct logout if auth.js is not loaded
            const fallbackServerUrl = window.serverUrl || 'http://localhost:3000';
            window.location.href = `${fallbackServerUrl}/api/auth/logout`;
        }
    });
});

async function loadProfile() {
    try {
        const response = await fetch(`${serverUrl}/api/user`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        // Fetch both profile and stats data
        const [profileResponse, statsResponse] = await Promise.all([
            fetch(`${serverUrl}/api/user/profile/${data.user.username}`, {
                credentials: 'include'
            }),
            fetch(`${serverUrl}/api/user/stats`, {
                credentials: 'include'
            })
        ]);

        const profileData = await profileResponse.json();
        const statsData = await statsResponse.json();

        // Combine the data
        const combinedData = {
            ...profileData,
            points: statsData.points,
            badges: statsData.badges,
            mergedPRs: statsData.mergedPRs || [],
            referralCode: statsData.referralCode,
            referredBy: statsData.referredBy
        };

        // Store globally for referral code validation
        window.currentUserData = combinedData;

        // Update profile information with combined data
        updateProfileInfo(combinedData);
        updateProfileStats(combinedData);
        displayPullRequests(combinedData.pullRequests || []);

        // Initialize referral section
        initializeReferralSection(combinedData);

        // Initialize ambassador code section if user is an ambassador
        initializeAmbassadorCodeSection(combinedData);

        // Display activities if available (fallback to pull requests)
        const activities = {
            pushEvents: [], // This would come from a different endpoint
            pullRequests: combinedData.pullRequests || []
        };
        displayActivities(activities);

    } catch (error) {
        console.error('Failed to load profile:', error);
        // Show error message to user
        document.getElementById('profile-name').textContent = 'Error loading profile';
        document.getElementById('profile-bio').textContent = 'Please try refreshing the page';
        throw error; // Re-throw for error handling in calling function
    }
}

async function fetchUserProfile() {
    return loadProfile();
}

function updateProfileInfo(data) {
    document.getElementById('profile-img').src = data.avatar_url;
    const profileNameElement = document.getElementById('profile-name');
    const fullName = data.name || data.login;
    profileNameElement.textContent = fullName;
    profileNameElement.title = fullName; // Add title for full name on hover
    document.getElementById('profile-bio').textContent = data.bio || '';

    // Add banner customization with dynamic update handling
    const bannerElement = document.querySelector('.profile__cover-wrapper');
    const coverImage = document.getElementById('profile-cover');

    const updateBanner = (bannerId) => {
        const newImage = new Image();
        newImage.onload = () => {
            coverImage.style.opacity = '0';
            setTimeout(() => {
                coverImage.src = newImage.src;
                requestAnimationFrame(() => {
                    coverImage.style.opacity = '1';
                });
            }, 300);
        };
        newImage.src = `https://cdn.devsync.club/devsync-assets/Banners/${bannerId}`;
    };

    // Initialize banner
    const currentBanner = localStorage.getItem('profileBanner');
    if (currentBanner) {
        updateBanner(currentBanner);
    } else {
        const defaultBanner = 'banner1.png';
        updateBanner(defaultBanner);
    }

    // Add click handler for banner customization
    bannerElement.addEventListener('click', openBannerSidebar);
    document.getElementById('profile-location').textContent = data.location || 'Not specified';
    document.getElementById('profile-company').textContent = data.company || 'Not specified';
    document.getElementById('profile-blog').href = data.blog || '#';
    document.getElementById('profile-blog').textContent = data.blog || 'Not specified';
    document.getElementById('profile-twitter').textContent = data.twitter_username || 'Not specified';

    // Check if points display already exists
    let pointsDisplay = document.querySelector('.profile__points');
    if (!pointsDisplay) {
        // Add points display
        pointsDisplay = document.createElement('div');
        pointsDisplay.className = 'profile__points';
        pointsDisplay.innerHTML = `
            <div class="points-value">${data.points || 0}</div>
            <div class="points-label">Total Points</div>
        `;

        const profileContent = document.querySelector('.profile__content');
        if (profileContent) {
            profileContent.appendChild(pointsDisplay);
        }
    }

    // Add only level badges display
    if (data.badges) {
        const levelBadges = getLevelBadges(data.badges);
        if (levelBadges.length > 0) {
            let badgesContainer = document.querySelector('.profile__badges');
            if (!badgesContainer) {
                badgesContainer = document.createElement('div');
                badgesContainer.className = 'profile__badges';

                const profileContent = document.querySelector('.profile__content');
                if (profileContent) {
                    profileContent.appendChild(badgesContainer);
                }
            }

            badgesContainer.innerHTML = levelBadges.map(badge => {
                const [name, description] = badge.split('|').map(s => s.trim());
                return `
                    <div class="level-badge" onclick="showBadgePreview(this)" 
                         data-badge-name="${name}" data-badge-desc="${description}">
                        <img src="https://cdn.devsync.club/devsync-assets/Badges/${getLevelImage(badge)}" 
                             alt="${name}"
                             class="level-badge__img">
                    </div>
                `;
            }).join('');

            // Refresh dynamic island after badges are updated
            setTimeout(() => {
                if (window.refreshBadgesIsland) {
                    window.refreshBadgesIsland();
                }
            }, 100);
        }
    }
}

function openBannerSidebar() {
    const overlay = document.createElement('div');
    overlay.className = 'banner-sidebar-overlay';
    document.body.appendChild(overlay);

    // Add show class after a short delay to trigger transition
    setTimeout(() => overlay.classList.add('show'), 10);

    const sidebar = document.createElement('div');
    sidebar.className = 'banner-sidebar';

    const banners = [
        { id: 'banner1.gif', name: 'Dark Forest', requiredLevel: 1, theme: 'Mystical' },
        { id: 'banner2.gif', name: 'Mystic Night', requiredLevel: 2, theme: 'Enchanted' },
        { id: 'banner3.gif', name: 'Haunted Castle', requiredLevel: 3, theme: 'Gothic' },
        { id: 'banner4.gif', name: 'Spooky Woods', requiredLevel: 4, theme: 'Horror' },
        { id: 'banner5.gif', name: 'Shadow Realm', requiredLevel: 5, theme: 'Dark' },
        { id: 'banner6.gif', name: 'Phantom Palace', requiredLevel: 6, theme: 'Royal' },
        { id: 'banner7.gif', name: 'Dragon\'s Lair', requiredLevel: 7, theme: 'Epic' },
        { id: 'banner8.gif', name: 'Void Gateway', requiredLevel: 8, theme: 'Cosmic' },
        { id: 'banner9.gif', name: 'Demon\'s Court', requiredLevel: 9, theme: 'Infernal' },
        { id: 'banner10.gif', name: 'Eternal Darkness', requiredLevel: 10, theme: 'Ultimate' }
    ];

    // Get user's current level from badges
    const userLevel = getUserLevel();

    sidebar.innerHTML = `
        <div class="banner-sidebar__content">
            <div class="banner-sidebar__header">
                <h3>Choose Banner</h3>
                <button class="banner-sidebar__close">&times;</button>
            </div>
            <div class="banner-sidebar__info">
                <div class="banner-unlock-progress">
                    <span>Level ${userLevel}</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${(userLevel / 10) * 100}%"></div>
                    </div>
                    <span>${10 - userLevel} levels to unlock all</span>
                </div>
            </div>
            <div class="banner-sidebar__banners">
                ${banners.map(banner => {
        const isUnlocked = userLevel >= banner.requiredLevel;
        return `
                        <div class="banner-option ${isUnlocked ? 'unlocked' : 'locked'}" 
                             data-banner="${banner.id}"
                             ${isUnlocked ? '' : 'disabled'}>
                            <div class="banner-preview">
                                <img src="https://cdn.devsync.club/devsync-assets/Banners/${banner.id}" alt="${banner.name}">
                                ${!isUnlocked ? `
                                    <div class="lock-overlay">
                                        <i class='bx bx-lock'></i>
                                        <span>Unlock at Level ${banner.requiredLevel}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="banner-info">
                                <span class="banner-name">${banner.name}</span>
                                <span class="banner-theme">${banner.theme}</span>
                                ${isUnlocked ? `
                                    <span class="banner-status unlocked">
                                        <i class='bx bx-check'></i> Unlocked
                                    </span>
                                ` : `
                                    <span class="banner-status locked">
                                        <i class='bx bx-lock-alt'></i> Level ${banner.requiredLevel}
                                    </span>
                                `}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(sidebar);
    setTimeout(() => sidebar.classList.add('show'), 10);

    // Close sidebar handler
    sidebar.querySelector('.banner-sidebar__close').addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            sidebar.remove();
            overlay.remove();
        }, 300);
    });

    // Update banner selection handler
    sidebar.querySelectorAll('.banner-option.unlocked').forEach(option => {
        option.addEventListener('click', () => {
            const bannerId = option.dataset.banner;
            const coverImage = document.getElementById('profile-cover');

            // Add fade out effect
            coverImage.style.transition = 'opacity 0.3s ease';
            coverImage.style.opacity = '0';

            // Load new image
            const newImage = new Image();
            newImage.onload = () => {
                setTimeout(() => {
                    coverImage.src = newImage.src;
                    requestAnimationFrame(() => {
                        coverImage.style.opacity = '1';
                    });
                }, 300);
            };
            newImage.src = `https://cdn.devsync.club/devsync-assets/Banners/${bannerId}`;

            localStorage.setItem('profileBanner', bannerId);

            // Add selection effect
            sidebar.querySelectorAll('.banner-option').forEach(opt =>
                opt.classList.remove('selected'));
            option.classList.add('selected');

            // Show toast notification
            showToast('Banner updated successfully!');

            // Close sidebar with delay for visual feedback
            setTimeout(() => {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
                setTimeout(() => {
                    sidebar.remove();
                    overlay.remove();
                }, 300);
            }, 500);
        });
    });
}

function getUserLevel() {
    const levelBadges = document.querySelectorAll('.level-badge');
    const levelMap = {
        'Seeker': 1,
        'Explorer': 2,
        'Tinkerer': 3,
        'Crafter': 4,
        'Architect': 5,
        'Innovator': 6,
        'Strategist': 7,
        'Visionary': 8,
        'Trailblazer': 9,
        'Luminary': 10
    };

    let highestLevel = 0;
    levelBadges.forEach(badge => {
        const badgeName = badge.dataset.badgeName;
        if (levelMap[badgeName] > highestLevel) {
            highestLevel = levelMap[badgeName];
        }
    });

    return highestLevel;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'profile-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i class='bx bx-check'></i>
                <div class="check-overlay"></div>
            </div>
            <div class="toast-message">
                <span class="text">${message}</span>
                <div class="progress-bar"></div>
            </div>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class='bx bx-x'></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);
    // Sequential animations
    requestAnimationFrame(() => {
        toast.classList.add('show');
        const progressBar = toast.querySelector('.progress-bar');
        progressBar.style.animation = 'progress 3s linear forwards';
        toast.querySelector('.check-overlay').style.animation = 'checkmark 0.4s ease-in-out 0.2s forwards';
    });

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

function showBadgePreview(badgeElement) {
    const popup = document.createElement('div');
    popup.className = 'badge-preview-popup';
    const badgeName = badgeElement.dataset.badgeName;
    const badgeDesc = badgeElement.dataset.badgeDesc;
    const badgeImg = badgeElement.querySelector('img')?.src || '';

    popup.innerHTML = `
        <div class="badge-preview-content">
            <div class="badge-preview-img-wrapper">
                <div class="badge-glow"></div>
                <img src="${badgeImg}" alt="${badgeName}" class="badge-preview-img">
                <div class="badge-sparkles">
                    ${Array.from({ length: 5 }, () => '<div class="sparkle"></div>').join('')}
                </div>
            </div>
            <div class="badge-preview-info">
                <h3 class="badge-preview-title">${badgeName}</h3>
                <p class="badge-preview-desc">${badgeDesc}</p>
            </div>
            <button class="close-preview" onclick="this.parentElement.parentElement.remove()">
                <i class='bx bx-x'></i>
            </button>
        </div>
    `;

    document.body.appendChild(popup);
    requestAnimationFrame(() => {
        popup.classList.add('show');
        const sparkles = popup.querySelectorAll('.sparkle');
        sparkles.forEach((sparkle, i) => {
            sparkle.style.animation = `sparkle 1.5s ease-in-out ${i * 0.15}s infinite`;
        });
    });

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('show');
            popup.addEventListener('transitionend', () => popup.remove());
        }
    });
}

function getLevelBadges(badges) {
    return badges.filter(badge => {
        const badgeName = badge.split('|')[0].trim();
        return [
            'Seeker',
            'Explorer',
            'Tinkerer',
            'Crafter',
            'Architect',
            'Innovator',
            'Strategist',
            'Visionary',
            'Trailblazer',
            'Luminary'
        ].includes(badgeName);
    });
}

function getLevelImage(badge) {
    const badgeName = badge.split('|')[0].trim();
    const levelMap = {
        'Seeker': 'level1.png',
        'Explorer': 'level2.png',
        'Tinkerer': 'level3.png',
        'Crafter': 'level4.png',
        'Architect': 'level5.png',
        'Innovator': 'level6.png',
        'Strategist': 'level7.png',
        'Visionary': 'level8.png',
        'Trailblazer': 'level9.png',
        'Luminary': 'level10.png'
    };
    return levelMap[badgeName];
}

function updateProfileStats(data) {
    // Update existing stats in the HTML
    if (document.getElementById('total-points')) {
        updateStatWithAnimation('total-points', data.points || 0);
    }
    if (document.getElementById('merged-prs')) {
        updateStatWithAnimation('merged-prs', data.mergedPRs?.length || 0);
    }
    if (document.getElementById('total-commits')) {
        // Calculate total commits from merged PRs
        const totalCommits = data.mergedPRs?.reduce((total, pr) => total + (pr.commits || 1), 0) || 0;
        updateStatWithAnimation('total-commits', totalCommits);
    }
    if (document.getElementById('days-active')) {
        // Calculate days active based on PR activity
        const daysActive = calculateDaysActive(data.mergedPRs || []);
        updateStatWithAnimation('days-active', daysActive);
    }
}

function calculateDaysActive(mergedPRs) {
    if (!mergedPRs || mergedPRs.length === 0) return 0;

    const dates = mergedPRs.map(pr => new Date(pr.mergedAt)).filter(date => !isNaN(date));
    if (dates.length === 0) return 0;

    const uniqueDates = [...new Set(dates.map(date => date.toDateString()))];
    return uniqueDates.length;
}

function displayActivities(activities) {
    const container = document.querySelector('.activities-grid');
    if (!container) return; // Exit if container doesn't exist

    container.innerHTML = '';

    // Display push events
    if (activities && activities.pushEvents && activities.pushEvents.length > 0) {
        const pushSection = createActivitySection('Recent Pushes', activities.pushEvents, (event) => `
            <div class="activity-card push-card">
                <div class="activity-card__header">
                    <i class='bx bx-git-commit activity-card__icon'></i>
                    <span class="activity-card__date">${formatDate(event.createdAt)}</span>
                </div>
                <h4 class="activity-card__title">${event.repo}</h4>
                <div class="activity-card__commits">
                    ${event.commits?.map(commit => `
                        <p class="commit-message">
                            <i class='bx bx-code-commit'></i>
                            ${commit.message}
                        </p>
                    `).join('') || ''}
                </div>
            </div>
        `);
        container.appendChild(pushSection);
    }

    // Display pull requests
    if (activities && activities.pullRequests && activities.pullRequests.length > 0) {
        const prSection = createActivitySection('Pull Requests', activities.pullRequests, (pr) => `
            <div class="activity-card pr-card">
                <div class="activity-card__header">
                    <i class='bx bx-git-pull-request activity-card__icon'></i>
                    <span class="activity-card__status ${pr.state}">${pr.state}</span>
                    <span class="activity-card__date">${formatDate(pr.createdAt)}</span>
                </div>
                <h4 class="activity-card__title">
                    <a href="${pr.url}" target="_blank">${pr.title}</a>
                </h4>
                <p class="activity-card__repo">${pr.repository}</p>
            </div>
        `);
        container.appendChild(prSection);
    }
}

function updateStatWithAnimation(elementId, finalValue) {
    const element = document.getElementById(elementId);
    const startValue = 0;
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = (finalValue - startValue) / steps;
    let currentValue = startValue;

    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= finalValue) {
            element.textContent = finalValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(currentValue);
        }
    }, duration / steps);
}

function createActivitySection(title, items, cardTemplate) {
    const section = document.createElement('div');
    section.className = 'activity-section';
    section.innerHTML = `
        <h3 class="activity-section__title">
            <span class="title-text">${title}</span>
            <span class="count">${items.length}</span>
        </h3>
        <div class="activity-section__content">
            ${items.map(item => cardTemplate(item)).join('')}
        </div>
    `;
    return section;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
}

// Initialize profile on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile().then(() => {
        initializeAnimations();
    });
});

function initializeAnimations() {
    // Add animation classes when elements come into view
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.1
    });

    // Observe elements with animation classes
    document.querySelectorAll('.animate-fade-in, .animate-slide-left, .animate-slide-right, .animate-fade-up')
        .forEach(element => observer.observe(element));
}

function displayPullRequests(prs) {
    const timeline = document.getElementById('prTimeline');
    timeline.innerHTML = prs.map((pr, index) => {
        const isDevSyncRepo = pr.isDevSyncRepo;
        const statusClass = getStatusClass(pr);
        const statusText = getStatusText(pr);

        return `
            <div class="pr-card" style="animation-delay: ${index * 0.2}s">
                <div class="pr-status ${statusClass}">
                    <i class='bx ${getStatusIcon(pr)}'></i>
                    ${statusText}
                </div>
                <h3 class="pr-title">${pr.title}</h3>
                <a href="${pr.url}" class="pr-repo" target="_blank">
                    <i class='bx bxl-github'></i>
                    ${pr.repository}
                </a>
                <div class="pr-date">
                    <i class='bx bx-time-five'></i>
                    ${formatDate(pr.createdAt)}
                </div>
            </div>
        `;
    }).join('');

    // Initialize animations after adding PR cards
    initializePRAnimations();
}

function getStatusClass(pr) {
    if (!pr.isDevSyncRepo) return 'non-devsync';
    if (pr.isRejected) return 'rejected';
    if (pr.merged && !pr.isDevSyncDetected) return 'waiting';
    if (pr.merged) return 'merged';
    if (pr.closed) return 'closed';
    return 'devsync';
}

function getStatusText(pr) {
    if (!pr.isDevSyncRepo) return 'Not a DevSync Repository';
    if (pr.isRejected) return 'rejected';
    if (pr.merged && !pr.isDevSyncDetected) return 'Waiting for Approval';
    if (pr.merged) return 'Successfully Merged';
    if (pr.closed) return 'Closed';
    return 'DevSync Repository';
}

function getStatusIcon(pr) {
    if (!pr.isDevSyncRepo) return 'bx-x-circle';
    if (pr.isRejected) return 'bx-x-circle';
    if (pr.merged && !pr.isDevSyncDetected) return 'bx-time-five';
    if (pr.merged) return 'bx-check-circle';
    if (pr.closed) return 'bx-x-circle';
    return 'bx-git-pull-request';
}

function initializePRAnimations() {
    // Add scroll progress indicator
    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    document.body.prepend(scrollProgress);

    // Update scroll progress
    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        document.documentElement.style.setProperty('--scroll-percent', `${scrolled}%`);
    });

    // Initialize Intersection Observer for PR cards
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Add a small delay between each card animation
                const index = Array.from(entry.target.parentNode.children).indexOf(entry.target);
                entry.target.style.animationDelay = `${index * 0.1}s`;
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
    });

    // Observe PR cards
    document.querySelectorAll('.pr-card').forEach(card => {
        observer.observe(card);
    });

    // Add parallax effect to cards on mouse move
    document.querySelector('.pr-timeline').addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.pr-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const offsetX = ((x - rect.width / 2) / rect.width) * 10;
            const offsetY = ((y - rect.height / 2) / rect.height) * 10;

            card.style.transform = `perspective(1000px) rotateY(${offsetX}deg) rotateX(${-offsetY}deg) translateZ(10px)`;
        });
    });

    // Reset card transform on mouse leave
    document.querySelector('.pr-timeline').addEventListener('mouseleave', () => {
        document.querySelectorAll('.pr-card').forEach(card => {
            card.style.transform = '';
        });
    });
}

// Referral Code Functionality
function initializeReferralSection(userData) {
    const referralSection = document.getElementById('referral-section');
    const referralInput = document.getElementById('profile-referral-code');
    const saveBtn = document.getElementById('save-referral-btn');
    const referralStatus = document.getElementById('referral-status');
    const ambassadorNameElement = document.getElementById('referral-ambassador-name');
    const inputGroup = document.querySelector('.referral-input-group');

    if (!referralSection) return;

    // Debug logging
    console.log('Initializing referral section with userData:', {
        referralCode: userData.referralCode,
        referredBy: userData.referredBy,
        isAmbassador: userData.isAmbassador,
        ambassadorStatus: userData.ambassadorStatus
    });

    // Show referral section only for authenticated users
    referralSection.style.display = 'block';

    // Check if user is an ambassador
    const isAmbassador = userData.isAmbassador || userData.ambassadorStatus === 'approved' || userData.ambassadorStatus === 'pending';

    // Check if user already has a referral code OR has been referred by someone
    if (userData.referralCode || userData.referredBy) {
        console.log('User has referral data, showing status section');
        // User already has a referral code, hide input and show status
        if (inputGroup) {
            inputGroup.style.display = 'none';
        }
        referralInput.style.display = 'none';
        saveBtn.style.display = 'none';
        referralStatus.style.display = 'block';

        // Show the referral code used
        const userReferralCodeDisplay = document.getElementById('user-referral-code-display');
        if (userReferralCodeDisplay) {
            userReferralCodeDisplay.textContent = userData.referralCode || 'Unknown Code';
        }

        // Show ambassador name if available
        if (ambassadorNameElement) {
            if (userData.referredBy && typeof userData.referredBy === 'object') {
                const displayName = userData.referredBy.name || 'Unknown Ambassador';
                const githubUsername = userData.referredBy.githubUsername ? `(@${userData.referredBy.githubUsername})` : '';
                ambassadorNameElement.innerHTML = `${displayName} ${githubUsername}`;
            } else if (userData.referredBy && typeof userData.referredBy === 'string') {
                // Fallback to load ambassador name by ID, but only if it's a valid ID
                loadAmbassadorName(userData.referredBy);
            } else {
                // No referredBy data available
                ambassadorNameElement.textContent = 'Unknown Ambassador';
            }
        }
    } else if (isAmbassador) {
        console.log('User is ambassador, hiding referral section');
        // Ambassadors cannot use referral codes, hide the entire section
        referralSection.style.display = 'none';
    } else {
        console.log('User has no referral data, showing input form');
        // User doesn't have a referral code and is not an ambassador, show input
        if (inputGroup) {
            inputGroup.style.display = 'block';
        }
        referralInput.style.display = 'block';
        saveBtn.style.display = 'block';
        referralStatus.style.display = 'none';

        // Set up input formatting
        referralInput.addEventListener('input', function () {
            this.value = this.value.toUpperCase();
        });

        // Set up save button - remove any existing listeners first
        saveBtn.removeEventListener('click', saveReferralCode);
        saveBtn.addEventListener('click', saveReferralCode);
    }
}

async function saveReferralCode() {
    const referralInput = document.getElementById('profile-referral-code');
    const saveBtn = document.getElementById('save-referral-btn');
    const referralCode = referralInput.value.trim();

    console.log('saveReferralCode called with:', {
        referralCode,
        currentUserData: window.currentUserData
    });

    if (!referralCode) {
        showNotification('Please enter a referral code', 'error');
        return;
    }

    // Check if user already has a referral code set (prevent duplicate submissions)
    if (window.currentUserData && (window.currentUserData.referralCode || window.currentUserData.referredBy)) {
        console.log('Client-side validation: User already has referral data', {
            referralCode: window.currentUserData.referralCode,
            referredBy: window.currentUserData.referredBy
        });
        showNotification('You have already used a referral code', 'warning');
        // Refresh the UI to show current status
        initializeReferralSection(window.currentUserData);
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';

        const response = await fetch(`${serverUrl}/api/user/verify-referral`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ referralCode })
        });

        // Log response for debugging
        console.log('Referral verification response:', response.status, response.statusText);

        const result = await response.json();

        if (response.ok) {
            showNotification('Referral code saved successfully!', 'success');

            // Clear and hide input field
            referralInput.value = '';
            referralInput.style.display = 'none';
            saveBtn.style.display = 'none';

            // Hide the entire input group
            const inputGroup = document.querySelector('.referral-input-group');
            if (inputGroup) {
                inputGroup.style.display = 'none';
            }

            const referralStatus = document.getElementById('referral-status');
            referralStatus.style.display = 'block';

            // Show the referral code used
            const userReferralCodeDisplay = document.getElementById('user-referral-code-display');
            if (userReferralCodeDisplay) {
                userReferralCodeDisplay.textContent = referralCode;
            }

            // Set ambassador name directly from response or load it
            const ambassadorNameElement = document.getElementById('referral-ambassador-name');
            if (ambassadorNameElement) {
                if (result.ambassadorName) {
                    ambassadorNameElement.textContent = result.ambassadorName;
                } else {
                    // Fallback to loading ambassador name by ID
                    loadAmbassadorName(result.ambassadorId);
                }
            }

            // Update the local state to prevent future submissions
            window.currentUserData = window.currentUserData || {};
            window.currentUserData.referralCode = referralCode;
            window.currentUserData.referredBy = {
                _id: result.ambassadorId,
                name: result.ambassadorName
            };

        } else {
            throw new Error(result.error || 'Failed to save referral code');
        }

    } catch (error) {
        console.error('Error saving referral code:', error);

        // Handle specific error cases
        if (error.message === 'You have already used a referral code') {
            // Check if this is a data inconsistency issue
            console.log('Referral code error detected, checking for data inconsistency...');
            await debugReferralData();

            showNotification('You have already used a referral code. Refreshing your profile...', 'warning');

            // Automatically refresh user data to show current status
            setTimeout(async () => {
                try {
                    await loadProfile();
                } catch (e) {
                    console.error('Failed to refresh profile:', e);
                    window.location.reload();
                }
            }, 1500);
        } else {
            showNotification(error.message || 'Failed to save referral code', 'error');
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bx bx-save"></i> Save';
    }
}

async function loadAmbassadorName(ambassadorId) {
    // Validate ambassadorId before making API call
    if (!ambassadorId || ambassadorId === 'null' || ambassadorId === null || ambassadorId === undefined) {
        console.warn('Invalid ambassador ID provided:', ambassadorId);
        const ambassadorNameElement = document.getElementById('referral-ambassador-name');
        if (ambassadorNameElement) {
            ambassadorNameElement.textContent = 'Unknown Ambassador';
        }
        return;
    }

    // Check if it's a valid MongoDB ObjectId format (24 characters, alphanumeric)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(ambassadorId)) {
        console.warn('Invalid ambassador ID format:', ambassadorId);
        const ambassadorNameElement = document.getElementById('referral-ambassador-name');
        if (ambassadorNameElement) {
            ambassadorNameElement.textContent = 'Unknown Ambassador';
        }
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/ambassadors/${ambassadorId}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const ambassador = await response.json();
            const ambassadorNameElement = document.getElementById('referral-ambassador-name');
            if (ambassadorNameElement) {
                // Show both name and GitHub username for clarity
                const displayName = ambassador.name || 'Unknown Ambassador';
                const githubUsername = ambassador.githubUsername ? `(@${ambassador.githubUsername})` : '';
                ambassadorNameElement.innerHTML = `${displayName} ${githubUsername}`;
            }
        } else {
            throw new Error('Ambassador not found');
        }
    } catch (error) {
        console.error('Error loading ambassador name:', error);
        const ambassadorNameElement = document.getElementById('referral-ambassador-name');
        if (ambassadorNameElement) {
            ambassadorNameElement.textContent = 'Unknown Ambassador';
        }
    }
}

async function debugReferralData() {
    try {
        console.log('=== Debugging Referral Data ===');

        // Check debug endpoint
        const debugResponse = await fetch(`${serverUrl}/api/user/debug-referral`, {
            credentials: 'include'
        });
        const debugData = await debugResponse.json();
        console.log('Debug referral data:', debugData);

        // Check if we need to fix the data
        if (debugData.raw.referredBy && !debugData.populated.referredBy) {
            console.log('Found invalid referral data, attempting to fix...');

            const fixResponse = await fetch(`${serverUrl}/api/user/fix-referral-data`, {
                method: 'POST',
                credentials: 'include'
            });
            const fixResult = await fixResponse.json();
            console.log('Fix result:', fixResult);

            if (fixResult.fixed) {
                showNotification('Fixed invalid referral data. Please refresh the page.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }

    } catch (error) {
        console.error('Error debugging referral data:', error);
    }
}

// Call debug function on page load
if (window.location.search.includes('debug=true')) {
    document.addEventListener('DOMContentLoaded', debugReferralData);
}
function initializeAmbassadorCodeSection(userData) {
    const ambassadorCodeSection = document.getElementById('ambassador-code-section');
    const ambassadorCodeValue = document.getElementById('ambassador-code-value');
    const copyButton = document.getElementById('copy-ambassador-code');

    if (!ambassadorCodeSection) return;

    // Check if user is an approved ambassador
    const isApprovedAmbassador = userData.ambassadorStatus === 'approved' && userData.ambassadorCode;

    if (isApprovedAmbassador) {
        ambassadorCodeSection.style.display = 'block';

        // Display the ambassador code
        if (ambassadorCodeValue) {
            ambassadorCodeValue.textContent = userData.ambassadorCode;
        }

        // Set up copy functionality
        if (copyButton) {
            copyButton.addEventListener('click', function () {
                navigator.clipboard.writeText(userData.ambassadorCode).then(() => {
                    showNotification('Referral code copied to clipboard!', 'success');

                    // Visual feedback
                    const icon = this.querySelector('i');
                    icon.className = 'bx bx-check';
                    setTimeout(() => {
                        icon.className = 'bx bx-copy';
                    }, 2000);
                }).catch(() => {
                    showNotification('Failed to copy code', 'error');
                });
            });
        }

        // Load referral statistics
        loadReferralStats();
    }
}

async function loadReferralStats() {
    try {
        const response = await fetch(`${serverUrl}/api/ambassadors/my-application`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.hasApplication && data.application.status === 'approved') {
                const totalReferrals = document.getElementById('total-referrals');
                const verifiedReferrals = document.getElementById('verified-referrals');

                if (totalReferrals) {
                    totalReferrals.textContent = data.application.membersReferred || 0;
                }
                if (verifiedReferrals) {
                    verifiedReferrals.textContent = data.application.membersReferred || 0;
                }
            }
        }
    } catch (error) {
        console.error('Error loading referral stats:', error);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <div class="notification__content">
            <i class="bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-x-circle' : 'bx-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('notification--show'), 100);

    // Auto remove
    setTimeout(() => {
        notification.classList.remove('notification--show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, 4000);
}
