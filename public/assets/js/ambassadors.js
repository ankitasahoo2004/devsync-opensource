/* ===============================================
   AMBASSADORS PAGE JAVASCRIPT
   =============================================== */

document.addEventListener('DOMContentLoaded', function () {
    // Add error handling for extension conflicts
    window.addEventListener('error', function (e) {
        if (e.message && e.message.includes('message channel closed')) {
            console.warn('Extension message channel error ignored:', e.message);
            e.preventDefault();
            return false;
        }
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function (e) {
        if (e.reason && e.reason.message && e.reason.message.includes('message channel closed')) {
            console.warn('Extension promise rejection ignored:', e.reason.message);
            e.preventDefault();
            return false;
        }
    });

    initializeAmbassadorsPage();
});

// Global variables
let currentUser = null;
let ambassadorData = [];
let filteredAmbassadors = [];
let isAdminUser = false;
let adminApplications = [];

// Admin GitHub IDs (should match backend)
const ADMIN_GITHUB_IDS = ['Sayan-dev731']; // Add more admin IDs as needed

// Animation configuration for Anime.js
const animationConfig = {
    cardEntrance: {
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .8)',
        delay: anime.stagger(100)
    },
    cardHover: {
        scale: 1.05,
        duration: 300,
        easing: 'easeOutQuad'
    },
    modalEntrance: {
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutBack'
    },
    toast: {
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad'
    }
};

// Main initialization function
async function initializeAmbassadorsPage() {
    try {
        console.log('Initializing ambassadors page...');

        // Check authentication status
        await checkAuthenticationStatus();

        // Initialize components
        initializeCounterAnimation();
        initializeFilters();
        initializeModals();
        initializeApplicationForm();
        initializeReferralSystem();
        initializeCardAnimations(); // Add card animation initialization

        // Load data
        await loadAmbassadorData();
        await loadLeaderboard();

        // Show admin section if user is admin
        if (isAdminUser) {
            await showAdminSection();
        }

        console.log('Ambassadors page initialized successfully');
    } catch (error) {
        console.error('Error initializing ambassadors page:', error);
        showErrorNotification('Failed to initialize page');
    }
}

/* ===============================================
   AUTHENTICATION & ADMIN CHECK
   =============================================== */

async function checkAuthenticationStatus() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated) {
                currentUser = data.user;
                isAdminUser = ADMIN_GITHUB_IDS.includes(currentUser.username);

                showUserProfile();
                await checkAmbassadorApplication();

                console.log('User authenticated:', currentUser.username, 'Admin:', isAdminUser);
            }
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
    }
}

function showUserProfile() {
    const profileSection = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userUsername = document.getElementById('user-username');

    if (profileSection && currentUser) {
        profileSection.style.display = 'block';

        if (userAvatar) userAvatar.src = currentUser.photos?.[0]?.value || 'assets/img/avatars/default-avatar.svg';
        if (userName) userName.textContent = currentUser.displayName || currentUser.username;
        if (userUsername) userUsername.textContent = `@${currentUser.username}`;

        // Load additional user stats
        loadUserStats();
    }
}

async function loadUserStats() {
    try {
        const response = await fetch('/api/user/stats', {
            credentials: 'include'
        });

        if (response.ok) {
            const stats = await response.json();
            const userPoints = document.getElementById('user-points');
            const userRank = document.getElementById('user-rank');
            const userBadge = document.getElementById('user-badge');

            if (userPoints) userPoints.textContent = stats.points || 0;
            if (userBadge) userBadge.textContent = stats.badges?.[stats.badges.length - 1] || 'Newcomer';

            // Calculate rank (simplified)
            if (userRank) userRank.textContent = '#' + (Math.floor(Math.random() * 100) + 1);
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function checkAmbassadorApplication() {
    if (!currentUser) {
        console.log('No user authenticated, skipping application check');
        return;
    }

    try {
        const response = await fetch('/api/ambassadors/my-application', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            updateApplicationButton(data);
        }
    } catch (error) {
        console.error('Error checking ambassador application:', error);
    }
}

function updateApplicationButton(applicationData) {
    const applyBtn = document.getElementById('apply-ambassador-btn');
    if (!applyBtn) return;

    if (applicationData.hasApplication) {
        const status = applicationData.application.status;
        switch (status) {
            case 'pending':
                applyBtn.innerHTML = '<i class="fas fa-clock"></i> Application Pending';
                applyBtn.disabled = true;
                applyBtn.classList.add('btn--disabled');
                break;
            case 'approved':
                applyBtn.innerHTML = '<i class="fas fa-star"></i> Ambassador Active';
                applyBtn.disabled = true;
                applyBtn.classList.add('btn--success');

                // Show referral code if approved
                showReferralCode(applicationData.application);
                break;
            case 'rejected':
                applyBtn.innerHTML = '<i class="fas fa-redo"></i> Reapply';
                applyBtn.disabled = false;
                break;
        }
    } else {
        applyBtn.addEventListener('click', () => {
            openApplicationModal();
        });
    }
}

function openApplicationModal() {
    if (!currentUser) {
        showErrorNotification('Please log in to apply for the ambassador program.');
        return;
    }

    const modal = document.getElementById('application-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function showReferralCode(application) {
    const profileSection = document.getElementById('user-profile');
    if (profileSection && application.referralCode) {
        const referralDiv = document.createElement('div');
        referralDiv.className = 'user-profile__referral';
        referralDiv.innerHTML = `
            <div class="referral-code">
                <h4><i class="fas fa-users"></i> Your Referral Code</h4>
                <div class="referral-code__value">
                    <span id="referral-code-text">${application.referralCode}</span>
                    <button class="btn btn--sm btn--outline" onclick="copyReferralCode()">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <p class="referral-code__stats">
                    Referrals: ${application.membersReferred || 0} | 
                    Points Earned: ${application.ambassadorPoints || 0}
                </p>
            </div>
        `;
        profileSection.appendChild(referralDiv);
    }
}

function copyReferralCode() {
    const codeText = document.getElementById('referral-code-text').textContent;
    navigator.clipboard.writeText(codeText).then(() => {
        showSuccessNotification('Referral code copied to clipboard!');
    }).catch(() => {
        showErrorNotification('Failed to copy referral code');
    });
}

/* ===============================================
   ADMIN SECTION
   =============================================== */

async function showAdminSection() {
    try {
        // Create admin section HTML
        const adminSection = document.createElement('section');
        adminSection.className = 'admin-section';
        adminSection.innerHTML = `
            <div class="container">
                <div class="admin-section__header">
                    <h2><i class="fas fa-shield-alt"></i> Admin Panel</h2>
                    <div class="admin-section__stats" id="admin-stats">
                        <div class="admin-stat">
                            <span class="admin-stat__value" id="pending-count">-</span>
                            <span class="admin-stat__label">Pending</span>
                        </div>
                        <div class="admin-stat">
                            <span class="admin-stat__value" id="approved-count">-</span>
                            <span class="admin-stat__label">Approved</span>
                        </div>
                        <div class="admin-stat">
                            <span class="admin-stat__value" id="rejected-count">-</span>
                            <span class="admin-stat__label">Rejected</span>
                        </div>
                        <div class="admin-stat">
                            <span class="admin-stat__value" id="total-referrals">-</span>
                            <span class="admin-stat__label">Referrals</span>
                        </div>
                    </div>
                </div>

                <div class="admin-section__filters">
                    <button class="btn btn--sm" onclick="loadAdminApplications('pending')" id="filter-pending">
                        Pending Applications
                    </button>
                    <button class="btn btn--sm btn--outline" onclick="loadAdminApplications('approved')" id="filter-approved">
                        Approved
                    </button>
                    <button class="btn btn--sm btn--outline" onclick="loadAdminApplications('rejected')" id="filter-rejected">
                        Rejected
                    </button>
                    <button class="btn btn--sm btn--outline" onclick="loadAdminApplications('')" id="filter-all">
                        All Applications
                    </button>
                    <button class="btn btn--sm btn--success" onclick="syncReferralCounts()" id="sync-referrals">
                        <i class="fas fa-sync-alt"></i> Sync Referrals
                    </button>
                </div>

                <div class="admin-applications" id="admin-applications">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading applications...
                    </div>
                </div>
            </div>
        `;

        // Insert admin section before the main content
        const mainContent = document.querySelector('.main');
        if (mainContent) {
            document.body.insertBefore(adminSection, mainContent);
        } else {
            // Fallback: insert after user profile
            const userProfile = document.getElementById('user-profile');
            if (userProfile) {
                userProfile.parentNode.insertBefore(adminSection, userProfile.nextSibling);
            }
        }

        // Wait for DOM to update, then load admin data
        setTimeout(async () => {
            await loadAdminStats();
            await loadAdminApplications('pending');
        }, 100);

    } catch (error) {
        console.error('Error showing admin section:', error);
    }
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/ambassadors/admin/stats', {
            credentials: 'include'
        });

        if (response.ok) {
            let stats;
            try {
                stats = await response.json();
            } catch (parseError) {
                console.error('Failed to parse admin stats JSON:', parseError);
                showMockAdminStats();
                return;
            }

            // Wait for elements to be available
            const pendingElement = document.getElementById('pending-count');
            const approvedElement = document.getElementById('approved-count');
            const rejectedElement = document.getElementById('rejected-count');
            const referralsElement = document.getElementById('total-referrals');

            if (pendingElement) pendingElement.textContent = stats.applicationStats.pending || 0;
            if (approvedElement) approvedElement.textContent = stats.applicationStats.approved || 0;
            if (rejectedElement) rejectedElement.textContent = stats.applicationStats.rejected || 0;
            if (referralsElement) referralsElement.textContent = stats.totalReferrals || 0;
        } else if (response.status === 404) {
            console.log('Admin stats endpoint not found (404) - loading mock data');
            showMockAdminStats();
        } else {
            console.error('Failed to load admin stats:', response.status);
            showMockAdminStats();
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        showMockAdminStats();
    }
}

async function loadAdminApplications(status = '') {
    try {
        const container = document.getElementById('admin-applications');
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                Loading applications...
            </div>
        `;

        // Update filter buttons
        document.querySelectorAll('.admin-section__filters button').forEach(btn => {
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
        });

        const activeFilter = status ? `filter-${status}` : 'filter-all';
        const activeBtn = document.getElementById(activeFilter);
        if (activeBtn) {
            activeBtn.classList.remove('btn--outline');
            activeBtn.classList.add('btn--primary');
        }

        const url = status ? `/api/ambassadors/admin/applications?status=${status}` : '/api/ambassadors/admin/applications';
        const response = await fetch(url, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            adminApplications = data.applications || [];
            renderAdminApplications(adminApplications);
        } else {
            // Better error handling for backend issues
            let errorMessage = 'Failed to load applications';
            if (response.status === 404) {
                errorMessage = 'Admin API not available. Backend may not be running.';
            } else if (response.status === 401 || response.status === 403) {
                errorMessage = 'Access denied. Admin privileges required.';
            } else if (response.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Error loading admin applications:', error);
        document.getElementById('admin-applications').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Cannot Load Applications</h3>
                <p>${error.message}</p>
                <div class="error-state__actions">
                    <button class="btn btn--primary" onclick="loadAdminApplications()">
                        <i class="fas fa-redo"></i>
                        Retry
                    </button>
                    <button class="btn btn--outline" onclick="loadMockData()">
                        <i class="fas fa-flask"></i>
                        Load Test Data
                    </button>
                </div>
            </div>
        `;
    }
}

/* ===============================================
   MOCK DATA FOR TESTING
   =============================================== */

function loadMockData() {
    // Mock applications data for testing when backend is not available
    const mockApplications = [
        {
            _id: 'mock1',
            name: 'John Doe',
            email: 'john.doe@university.edu',
            university: 'MIT',
            year: '3',
            major: 'Computer Science',
            github: 'johndoe',
            specialization: 'fullstack',
            motivation: 'I am passionate about open source development and want to build a community at my university.',
            experience: 'I have contributed to several open source projects including React and Node.js.',
            activities: 'I plan to organize hackathons, workshops, and coding bootcamps.',
            status: 'pending',
            appliedAt: new Date().toISOString(),
            userId: {
                username: 'johndoe',
                avatarUrl: 'https://via.placeholder.com/80'
            }
        },
        {
            _id: 'mock2',
            name: 'Jane Smith',
            email: 'jane.smith@stanford.edu',
            university: 'Stanford University',
            year: '4',
            major: 'Software Engineering',
            github: 'janesmith',
            specialization: 'frontend',
            motivation: 'I want to promote diversity in tech and help other students learn programming.',
            experience: 'I have been coding for 4 years and have internship experience at Google.',
            activities: 'I will focus on workshops for underrepresented groups and mentoring programs.',
            status: 'approved',
            referralCode: 'DSA-ABC123',
            membersReferred: 5,
            appliedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            reviewNotes: 'Excellent candidate with strong background.',
            userId: {
                username: 'janesmith',
                avatarUrl: 'https://via.placeholder.com/80'
            }
        },
        {
            _id: 'mock3',
            name: 'Bob Wilson',
            email: 'bob.wilson@berkeley.edu',
            university: 'UC Berkeley',
            year: '2',
            major: 'Computer Engineering',
            github: 'bobwilson',
            specialization: 'backend',
            motivation: 'Limited motivation provided.',
            experience: 'New to programming, only basic projects.',
            activities: 'Not well defined activities.',
            status: 'rejected',
            appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            reviewNotes: 'Needs more experience before joining the program.',
            userId: {
                username: 'bobwilson',
                avatarUrl: 'https://via.placeholder.com/80'
            }
        }
    ];

    adminApplications = mockApplications;
    renderAdminApplications(mockApplications);
    showInfoNotification('Loaded mock data for testing. Backend connection not available.');
}

function showMockAdminStats() {
    // Show mock stats when backend is not available
    const pendingElement = document.getElementById('pending-count');
    const approvedElement = document.getElementById('approved-count');
    const rejectedElement = document.getElementById('rejected-count');
    const referralsElement = document.getElementById('total-referrals');

    if (pendingElement) pendingElement.textContent = '1';
    if (approvedElement) approvedElement.textContent = '1';
    if (rejectedElement) rejectedElement.textContent = '1';
    if (referralsElement) referralsElement.textContent = '5';

    showInfoNotification('Loaded mock admin stats. Backend connection not available.');
}

function loadMockAmbassadorData() {
    // Mock ambassador data for testing when backend is not available
    ambassadorData = [
        {
            _id: 'mock-amb-1',
            name: 'Jane Smith',
            email: 'jane.smith@stanford.edu',
            university: 'Stanford University',
            major: 'Software Engineering',
            github: 'janesmith',
            specialization: 'frontend',
            userId: {
                username: 'janesmith',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            referralCode: 'DSA-ABC123',
            membersReferred: 12,
            totalPoints: 850,
            badges: ['Mentor', 'Top Contributor']
        },
        {
            _id: 'mock-amb-2',
            name: 'Alex Johnson',
            email: 'alex.johnson@mit.edu',
            university: 'MIT',
            major: 'Computer Science',
            github: 'alexjohnson',
            specialization: 'fullstack',
            userId: {
                username: 'alexjohnson',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            referralCode: 'DSA-XYZ789',
            membersReferred: 8,
            totalPoints: 620,
            badges: ['Community Builder']
        },
        {
            _id: 'mock-amb-3',
            name: 'Sarah Davis',
            email: 'sarah.davis@berkeley.edu',
            university: 'UC Berkeley',
            major: 'Data Science',
            github: 'sarahdavis',
            specialization: 'data',
            userId: {
                username: 'sarahdavis',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            referralCode: 'DSA-LMN456',
            membersReferred: 5,
            totalPoints: 450,
            badges: ['Innovator']
        }
    ];

    filteredAmbassadors = [...ambassadorData];
    renderAmbassadorGrid();
    hideLoadingState();
    showInfoNotification('Loaded mock ambassador data. Backend connection not available.');
}

function renderMockLeaderboard() {
    // Mock leaderboard data for testing when backend is not available
    const mockLeaderboard = [
        {
            _id: 'mock-amb-1',
            name: 'Jane Smith',
            university: 'Stanford University',
            userId: {
                username: 'janesmith',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            membersReferred: 12,
            totalPoints: 850
        },
        {
            _id: 'mock-amb-2',
            name: 'Alex Johnson',
            university: 'MIT',
            userId: {
                username: 'alexjohnson',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            membersReferred: 8,
            totalPoints: 620
        },
        {
            _id: 'mock-amb-3',
            name: 'Sarah Davis',
            university: 'UC Berkeley',
            userId: {
                username: 'sarahdavis',
                avatarUrl: 'https://via.placeholder.com/150'
            },
            membersReferred: 5,
            totalPoints: 450
        }
    ];

    renderLeaderboard(mockLeaderboard);
    showInfoNotification('Loaded mock leaderboard data. Backend connection not available.');
}

function renderAdminApplications(applications) {
    const container = document.getElementById('admin-applications');

    if (applications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No applications found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-applications-grid">
            ${applications.map(app => createApplicationCard(app)).join('')}
        </div>
    `;
}

function createApplicationCard(app) {
    const statusClass = app.status || 'pending';
    const appliedDate = new Date(app.appliedAt || app.createdAt).toLocaleDateString();
    const isApproved = app.status === 'approved';

    return `
        <div class="application-card application-card--${statusClass}" data-id="${app._id}">
            <div class="application-card__header">
                <div class="application-card__avatar">
                    <img src="${app.userId?.avatarUrl || app.user?.avatarUrl || 'assets/img/avatars/default-avatar.svg'}" 
                         alt="${app.name}" />
                    <div class="application-card__status-badge">
                        <span class="status-badge status-badge--${statusClass}">
                            <i class="fas fa-${getStatusIcon(statusClass)}"></i>
                            ${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
                        </span>
                    </div>
                </div>
                
                <div class="application-card__info">
                    <h3 class="application-card__name">${app.name}</h3>
                    <p class="application-card__username">@${app.userId?.username || app.github || 'N/A'}</p>
                    <p class="application-card__university">
                        <i class="fas fa-graduation-cap"></i>
                        ${app.university}
                    </p>
                    <p class="application-card__date">
                        <i class="fas fa-calendar"></i>
                        Applied ${appliedDate}
                    </p>
                </div>

                <!-- Admin Actions -->
                <div class="application-card__admin-actions">
                    ${app.status === 'pending' ? `
                        <button class="admin-action-btn admin-action-btn--approve" onclick="approveApplication('${app._id}')" title="Approve Application">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="admin-action-btn admin-action-btn--reject" onclick="rejectApplication('${app._id}')" title="Reject Application">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    
                    <button class="admin-action-btn admin-action-btn--edit" onclick="editApplication('${app._id}')" title="Edit Application">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    ${app.status === 'rejected' ? `
                        <button class="admin-action-btn admin-action-btn--reapply" onclick="enableReapplication('${app._id}', '${app.name}')" title="Allow Reapplication">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="admin-action-btn admin-action-btn--delete" onclick="deleteApplication('${app._id}', '${app.name}')" title="Delete Application">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                    
                    <button class="admin-action-btn admin-action-btn--notes" onclick="showReviewModal('${app._id}')" title="Add/View Notes">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            </div>

            <div class="application-card__body">
                <div class="application-card__details">
                    <div class="detail-row">
                        <div class="detail-label">
                            <i class="fas fa-envelope"></i>
                            Email
                        </div>
                        <div class="detail-value">${app.email}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">
                            <i class="fas fa-user-graduate"></i>
                            Academic Info
                        </div>
                        <div class="detail-value">${app.major} • Year ${app.year}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">
                            <i class="fas fa-code"></i>
                            Specialization
                        </div>
                        <div class="detail-value">
                            <span class="specialization-tag">${formatSpecialization(app.specialization)}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">
                            <i class="fab fa-github"></i>
                            GitHub
                        </div>
                        <div class="detail-value">
                            <a href="https://github.com/${app.github}" target="_blank" class="github-link">
                                ${app.github}
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>

                    ${app.referralCode || isApproved ? `
                        <div class="detail-row detail-row--referral">
                            <div class="detail-label">
                                <i class="fas fa-link"></i>
                                Referral Code
                            </div>
                            <div class="detail-value">
                                ${app.referralCode ? `
                                    <div class="referral-code-display">
                                        <code class="referral-code">${app.referralCode}</code>
                                        <button class="copy-btn" onclick="copyToClipboard('${app.referralCode}')" title="Copy Code">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        ${isApproved ? `
                                            <span class="referral-stats">
                                                <i class="fas fa-users"></i>
                                                ${app.membersReferred || 0} referrals
                                            </span>
                                        ` : ''}
                                    </div>
                                ` : isApproved ? `
                                    <button class="btn btn--sm btn--outline" onclick="generateReferralCode('${app._id}')">
                                        <i class="fas fa-plus"></i>
                                        Generate Code
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="application-card__content">
                    <div class="content-section">
                        <h4>
                            <i class="fas fa-lightbulb"></i>
                            Motivation
                        </h4>
                        <p class="content-text">${app.motivation}</p>
                    </div>

                    ${app.experience ? `
                        <div class="content-section">
                            <h4>
                                <i class="fas fa-laptop-code"></i>
                                Experience
                            </h4>
                            <p class="content-text">${app.experience}</p>
                        </div>
                    ` : ''}

                    ${app.activities ? `
                        <div class="content-section">
                            <h4>
                                <i class="fas fa-calendar-check"></i>
                                Planned Activities
                            </h4>
                            <p class="content-text">${app.activities}</p>
                        </div>
                    ` : ''}

                    ${app.reviewNotes ? `
                        <div class="content-section content-section--notes">
                            <h4>
                                <i class="fas fa-sticky-note"></i>
                                Review Notes
                            </h4>
                            <p class="content-text content-text--notes">${app.reviewNotes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="application-card__footer">
                <div class="application-card__meta">
                    <span class="meta-item">
                        <i class="fas fa-clock"></i>
                        ${getTimeAgo(app.appliedAt || app.createdAt)}
                    </span>
                    ${app.reviewedAt ? `
                        <span class="meta-item">
                            <i class="fas fa-user-check"></i>
                            Reviewed ${getTimeAgo(app.reviewedAt)}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Helper functions for application cards
function getStatusIcon(status) {
    const icons = {
        'pending': 'clock',
        'approved': 'check-circle',
        'rejected': 'times-circle'
    };
    return icons[status] || 'circle';
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
}

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccessNotification('Referral code copied to clipboard!');
    }).catch(() => {
        showErrorNotification('Failed to copy referral code');
    });
}

// Edit application function
function editApplication(applicationId) {
    const application = adminApplications.find(app => app._id === applicationId);
    if (!application) {
        showErrorNotification('Application not found');
        return;
    }

    showEditApplicationModal(application);
}

// Generate referral code function
async function generateReferralCode(applicationId) {
    try {
        const response = await fetch(`/api/ambassadors/admin/applications/${applicationId}/generate-referral`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            showSuccessNotification(`Referral code generated: ${result.referralCode}`);

            // Refresh the applications to show the new code
            await loadAdminApplications();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate referral code');
        }
    } catch (error) {
        console.error('Error generating referral code:', error);
        showErrorNotification(`Failed to generate referral code: ${error.message}`);
    }
}

async function approveApplication(applicationId) {
    if (!confirm('Are you sure you want to approve this application?')) {
        return;
    }

    try {
        const reviewNotes = prompt('Enter approval notes (optional):') || '';

        const response = await fetch(`/api/ambassadors/admin/approve/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ reviewNotes })
        });

        if (response.ok) {
            const data = await response.json();
            showSuccessNotification(`${data.ambassador.name} approved successfully! Referral code: ${data.ambassador.referralCode}`);

            // Reload current applications
            await loadAdminStats();
            await loadAdminApplications('pending');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to approve application');
        }

    } catch (error) {
        console.error('Error approving application:', error);
        showErrorNotification(error.message || 'Failed to approve application');
    }
}

async function rejectApplication(applicationId) {
    const reviewNotes = prompt('Enter rejection reason:');
    if (!reviewNotes) {
        return;
    }

    if (!confirm('Are you sure you want to reject this application?')) {
        return;
    }

    try {
        const response = await fetch(`/api/ambassadors/admin/reject/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ reviewNotes })
        });

        if (response.ok) {
            const data = await response.json();
            showSuccessNotification(`${data.ambassador.name} application rejected`);

            // Reload current applications
            await loadAdminStats();
            await loadAdminApplications('pending');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reject application');
        }

    } catch (error) {
        console.error('Error rejecting application:', error);
        showErrorNotification(error.message || 'Failed to reject application');
    }
}

function showReviewModal(applicationId) {
    const application = adminApplications.find(app => app._id === applicationId);
    if (!application) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal__overlay">
            <div class="modal__content">
                <div class="modal__header">
                    <h3>Review Notes - ${application.name}</h3>
                    <button class="modal__close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <form id="review-form" onsubmit="submitReviewNotes(event, '${applicationId}')">
                        <div class="form-group">
                            <label for="admin-notes">Admin Notes:</label>
                            <textarea id="admin-notes" name="adminNotes" rows="4" class="form-control"
                                placeholder="Add your notes about this application...">${application.adminNotes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Current Review Notes:</label>
                            <div class="review-notes-display">
                                ${application.reviewNotes || 'No review notes yet'}
                            </div>
                        </div>
                        <div class="modal__actions">
                            <button type="submit" class="btn btn--primary">Save Notes</button>
                            <button type="button" class="btn btn--outline" onclick="this.closest('.modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function submitReviewNotes(event, applicationId) {
    event.preventDefault();

    const form = event.target;
    const adminNotes = form.adminNotes.value;

    try {
        const response = await fetch(`/api/ambassadors/admin/${applicationId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ adminNotes })
        });

        if (response.ok) {
            showSuccessNotification('Notes updated successfully');
            form.closest('.modal').remove();

            // Update the application in memory
            const appIndex = adminApplications.findIndex(app => app._id === applicationId);
            if (appIndex !== -1) {
                adminApplications[appIndex].adminNotes = adminNotes;
            }
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update notes');
        }

    } catch (error) {
        console.error('Error updating notes:', error);
        showErrorNotification(error.message || 'Failed to update notes');
    }
}

// Sync referral counts for all ambassadors
async function syncReferralCounts() {
    try {
        const syncButton = document.getElementById('sync-referrals');
        if (syncButton) {
            syncButton.disabled = true;
            syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        }

        const response = await fetch('/api/ambassadors/admin/sync-referrals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            showSuccessNotification(`Referral counts synced successfully! Updated ${result.totalAmbassadors} ambassadors.`);

            // Reload admin stats and applications to show updated counts
            await loadAdminStats();
            await loadAdminApplications('');

        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to sync referral counts');
        }

    } catch (error) {
        console.error('Error syncing referral counts:', error);
        showErrorNotification(error.message || 'Failed to sync referral counts');
    } finally {
        // Reset button state
        const syncButton = document.getElementById('sync-referrals');
        if (syncButton) {
            syncButton.disabled = false;
            syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Referrals';
        }
    }
}

/* ===============================================
   DATA LOADING
   =============================================== */

async function loadAmbassadorData() {
    try {
        showLoadingState();

        const response = await fetch('/api/ambassadors');

        if (response.ok) {
            try {
                ambassadorData = await response.json();
                filteredAmbassadors = [...ambassadorData];
                renderAmbassadorGrid();
                hideLoadingState();
            } catch (parseError) {
                console.error('Failed to parse ambassadors JSON:', parseError);
                loadMockAmbassadorData();
            }
        } else if (response.status === 404) {
            console.log('Ambassadors endpoint not found (404) - loading mock data');
            loadMockAmbassadorData();
        } else {
            console.error('Failed to fetch ambassadors:', response.status);
            loadMockAmbassadorData();
        }

    } catch (error) {
        console.error('Error loading ambassador data:', error);
        loadMockAmbassadorData();
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/ambassadors/leaderboard');

        if (response.ok) {
            try {
                const leaderboard = await response.json();
                renderLeaderboard(leaderboard);
            } catch (parseError) {
                console.error('Failed to parse leaderboard JSON:', parseError);
                renderMockLeaderboard();
            }
        } else if (response.status === 404) {
            console.log('Leaderboard endpoint not found (404) - loading mock data');
            renderMockLeaderboard();
        } else {
            console.error('Failed to fetch leaderboard:', response.status);
            renderMockLeaderboard();
        }

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        renderMockLeaderboard();
    }
}

/* ===============================================
   LEADERBOARD RENDERING
   =============================================== */

function renderLeaderboard(leaderboard) {
    const container = document.getElementById('ambassador-leaderboard');
    if (!container) return;

    container.innerHTML = leaderboard.map((ambassador, index) => {
        const rankClass = index < 3 ? `leaderboard__rank--${index + 1}` : 'leaderboard__rank--other';

        return `
            <div class="leaderboard__item">
                <div class="leaderboard__rank ${rankClass}">
                    ${ambassador.rank}
                </div>
                <div class="leaderboard__avatar">
                    <img src="${ambassador.avatarUrl || 'assets/img/avatars/default-avatar.svg'}" 
                         alt="${ambassador.name}" />
                </div>
                <div class="leaderboard__info">
                    <h4 class="leaderboard__name">${ambassador.name}</h4>
                    <p class="leaderboard__university">${ambassador.university}</p>
                </div>
                <div class="leaderboard__stats">
                    <div class="leaderboard__stat">
                        <span class="leaderboard__stat-value">${ambassador.ambassadorPoints}</span>
                        <span class="leaderboard__stat-label">Points</span>
                    </div>
                    <div class="leaderboard__stat">
                        <span class="leaderboard__stat-value">${ambassador.eventsOrganized}</span>
                        <span class="leaderboard__stat-label">Events</span>
                    </div>
                    <div class="leaderboard__stat">
                        <span class="leaderboard__stat-value">${ambassador.membersReferred}</span>
                        <span class="leaderboard__stat-label">Referrals</span>
                    </div>
                    <div class="leaderboard__stat">
                        <span class="leaderboard__stat-value">${ambassador.devSyncPoints}</span>
                        <span class="leaderboard__stat-label">DevSync</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ===============================================
   AMBASSADOR GRID RENDERING
   =============================================== */

function renderAmbassadorGrid() {
    const grid = document.getElementById('ambassadors-grid');
    if (!grid) return;

    if (filteredAmbassadors.length === 0) {
        showEmptyState();
        return;
    }

    grid.innerHTML = filteredAmbassadors.map(ambassador => createAmbassadorCard(ambassador)).join('');
    hideEmptyState();

    // Animate cards entrance after rendering
    setTimeout(() => {
        animateCardsEntrance();
    }, 50);
}

function createAmbassadorCard(ambassador) {
    const user = ambassador.userId || {};
    const specializations = Array.isArray(ambassador.specialization) ?
        ambassador.specialization : [ambassador.specialization];

    const isAdmin = ambassador.role === 'admin';

    return `
        <div class="ambassador-card ${isAdmin ? 'ambassador-card--admin' : ''}" data-ambassador-id="${ambassador._id}" onclick="showAmbassadorModal('${ambassador._id}')">
            ${isAdmin ? `<div class="ambassador-card__role-badge ambassador-card__role-badge--admin">Admin</div>` :
            `<div class="ambassador-card__role-badge ambassador-card__role-badge--ambassador">Ambassador</div>`}
            
            ${isAdminUser ? `
                <div class="ambassador-card__admin-actions">
                    <button class="admin-action-btn admin-action-btn--edit" onclick="event.stopPropagation(); editAmbassador('${ambassador._id}')" title="Edit Ambassador">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-action-btn admin-action-btn--delete" onclick="event.stopPropagation(); deleteAmbassador('${ambassador._id}', '${ambassador.name}')" title="Remove Ambassador">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}
            
            <div class="ambassador-card__header">
                <div class="ambassador-card__avatar">
                    <img src="${user.avatarUrl || 'assets/img/avatars/default-avatar.svg'}" 
                         alt="${ambassador.name}" />
                </div>
                <div class="ambassador-card__info">
                    <h3 class="ambassador-card__name">${ambassador.name}</h3>
                    <p class="ambassador-card__title">${isAdmin ? 'Lead Ambassador' : 'Student Ambassador'}</p>
                    <p class="ambassador-card__university">${ambassador.university}</p>
                </div>
            </div>
            
            <div class="ambassador-card__stats">
                <div class="ambassador-card__stat">
                    <span class="ambassador-card__stat-value">${ambassador.ambassadorPoints || 0}</span>
                    <span class="ambassador-card__stat-label">Points</span>
                </div>
                <div class="ambassador-card__stat">
                    <span class="ambassador-card__stat-value">${ambassador.eventsOrganized || 0}</span>
                    <span class="ambassador-card__stat-label">Events</span>
                </div>
            </div>
            
            <div class="ambassador-card__bio">
                ${ambassador.bio || 'Passionate about open-source development and community building.'}
            </div>
            
            <div class="ambassador-card__specialization">
                ${specializations.slice(0, 2).map(spec => `
                    <span class="ambassador-card__tag">${formatSpecialization(spec)}</span>
                `).join('')}
                ${specializations.length > 2 ? `<span class="ambassador-card__tag">+${specializations.length - 2}</span>` : ''}
            </div>
            
            <div class="ambassador-card__footer">
                <div class="ambassador-card__links">
                    ${user.username ? `
                        <a href="https://github.com/${user.username}" target="_blank" class="ambassador-card__link" onclick="event.stopPropagation()">
                            <i class="fab fa-github"></i>
                        </a>
                    ` : ''}
                    ${ambassador.linkedinUrl ? `
                        <a href="${ambassador.linkedinUrl}" target="_blank" class="ambassador-card__link" onclick="event.stopPropagation()">
                            <i class="fab fa-linkedin"></i>
                        </a>
                    ` : ''}
                </div>
                <div class="ambassador-card__region">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${ambassador.country || 'Global'}</span>
                </div>
            </div>
        </div>
    `;
}

function formatSpecialization(spec) {
    const specializations = {
        'frontend': 'Frontend',
        'backend': 'Backend',
        'fullstack': 'Full-Stack',
        'mobile': 'Mobile',
        'devops': 'DevOps',
        'ai-ml': 'AI/ML',
        'blockchain': 'Blockchain',
        'cybersecurity': 'Security'
    };
    return specializations[spec] || spec;
}

/* ===============================================
   APPLICATION FORM
   =============================================== */

function initializeApplicationForm() {
    const applyBtn = document.getElementById('apply-btn');
    const applyAmbassadorBtn = document.getElementById('apply-ambassador-btn');
    const modal = document.getElementById('application-modal');
    const cancelBtn = document.getElementById('cancel-application');

    // Function to show application modal
    function showApplicationModal() {
        if (!currentUser) {
            showAuthenticationModal();
            return;
        }

        // Show referral code input first if user doesn't have one
        if (!currentUser.referralCode) {
            showReferralCodeModal();
        } else {
            // Direct to application modal
            modal.classList.add('active');
        }
    }

    // Set up both apply buttons
    if (applyBtn && modal) {
        applyBtn.addEventListener('click', showApplicationModal);
        console.log('Apply button event listener added');
    } else {
        console.warn('Apply button or modal not found:', { applyBtn: !!applyBtn, modal: !!modal });
    }

    if (applyAmbassadorBtn && modal) {
        applyAmbassadorBtn.addEventListener('click', showApplicationModal);
        console.log('Apply ambassador button event listener added');
    } else {
        console.warn('Apply ambassador button or modal not found:', { applyAmbassadorBtn: !!applyAmbassadorBtn, modal: !!modal });
    }

    // Handle modal close buttons
    const closeButtons = modal?.querySelectorAll('.modal__close');
    closeButtons?.forEach(btn => {
        btn.addEventListener('click', function () {
            modal.classList.remove('active');
        });
    });

    // Handle cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            modal.classList.remove('active');
        });
    }

    // Handle form submission
    const form = document.getElementById('application-form');
    if (form) {
        form.addEventListener('submit', submitApplication);
    }
}

function showReferralCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'referral-code-modal';
    modal.innerHTML = `
        <div class="modal__overlay">
            <div class="modal__content">
                <div class="modal__header">
                    <h3>🔗 Join with Ambassador Code</h3>
                    <button class="modal__close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <p class="referral-modal__description">
                        Do you have an ambassador referral code? Enter it below to join the community with proper attribution.
                    </p>
                    <div class="form__group">
                        <label for="referral-code-input" class="form__label">Ambassador Referral Code (Optional)</label>
                        <input type="text" 
                               id="referral-code-input" 
                               class="form__input" 
                               placeholder="Enter referral code"
                               style="text-transform: uppercase;">
                        <small class="form__help">Leave blank if you don't have a referral code</small>
                    </div>
                </div>
                <div class="modal__actions">
                    <button type="button" class="btn btn--primary" onclick="processReferralAndContinue()">
                        <i class="fas fa-arrow-right"></i>
                        Continue to Application
                    </button>
                    <button type="button" class="btn btn--outline" onclick="skipReferralAndContinue()">
                        Skip for Later
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-uppercase input
    const input = modal.querySelector('#referral-code-input');
    input.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });
}

async function processReferralAndContinue() {
    const input = document.getElementById('referral-code-input');
    const referralCode = input.value.trim();

    if (referralCode) {
        try {
            showLoadingNotification('Verifying referral code...');

            const response = await fetch('/api/user/verify-referral', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ referralCode })
            });

            const result = await response.json();

            if (response.ok) {
                showSuccessNotification('Referral code verified successfully!');
                currentUser.referralCode = referralCode;
                currentUser.referredBy = result.ambassadorId;
            } else {
                showErrorNotification(result.error || 'Invalid referral code');
                return; // Don't continue if verification failed
            }
        } catch (error) {
            console.error('Error verifying referral:', error);
            showErrorNotification('Failed to verify referral code');
            return;
        }
    }

    // Close referral modal and open application modal
    document.getElementById('referral-code-modal').remove();
    const applicationModal = document.getElementById('application-modal');
    if (applicationModal) {
        applicationModal.classList.add('active');
    }
}

function skipReferralAndContinue() {
    // Close referral modal and open application modal
    document.getElementById('referral-code-modal').remove();
    const applicationModal = document.getElementById('application-modal');
    if (applicationModal) {
        applicationModal.classList.add('active');
    }
}

async function submitApplication(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const applicationData = Object.fromEntries(formData);

    // Remove the terms checkbox from the data
    delete applicationData.terms;

    try {
        showLoadingNotification('Submitting your application...');

        const response = await fetch('/api/ambassadors/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(applicationData)
        });

        const result = await response.json();

        if (response.ok) {
            showSuccessNotification('Application submitted successfully! We\'ll review it and get back to you soon.');
            // Close the modal properly
            const modal = document.getElementById('application-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            await checkAmbassadorApplication(); // Update button state
        } else {
            throw new Error(result.error || 'Failed to submit application');
        }

    } catch (error) {
        console.error('Error submitting application:', error);
        showErrorNotification(error.message || 'Failed to submit application. Please try again.');
    }
}

/* ===============================================
   REFERRAL SYSTEM
   =============================================== */

function initializeReferralSystem() {
    // Add referral input to user profile section if user is not an ambassador
    if (currentUser && !isAdminUser) {
        addReferralInput();
    }
}

function addReferralInput() {
    const profileSection = document.getElementById('user-profile');
    if (profileSection) {
        const referralDiv = document.createElement('div');
        referralDiv.className = 'user-profile__referral-input';
        referralDiv.innerHTML = `
            <div class="referral-input">
                <h4><i class="fas fa-user-plus"></i> Join with Ambassador Code</h4>
                <div class="referral-input__form">
                    <input type="text" id="referral-code-input" class="form-control" 
                           placeholder="Enter ambassador referral code (e.g., DSA-ABC123)">
                    <button class="btn btn--primary btn--sm" onclick="verifyReferralCode()">
                        <i class="fas fa-check"></i> Verify
                    </button>
                </div>
                <p class="referral-input__help">
                    Have a referral code from an ambassador? Enter it to get verified!
                </p>
            </div>
        `;
        profileSection.appendChild(referralDiv);
    }
}

async function verifyReferralCode() {
    const input = document.getElementById('referral-code-input');
    const referralCode = input.value.trim().toUpperCase();

    if (!referralCode) {
        showErrorNotification('Please enter a referral code');
        return;
    }

    if (!referralCode.match(/^DSA-[A-Z0-9]{6}$/)) {
        showErrorNotification('Invalid referral code format. Should be like: DSA-ABC123');
        return;
    }

    try {
        showLoadingNotification('Verifying referral code...');

        const response = await fetch('/api/ambassadors/verify-referral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ referralCode })
        });

        const result = await response.json();

        if (response.ok) {
            showSuccessNotification(
                `Successfully verified! You were referred by ${result.ambassador.name} from ${result.ambassador.university}. The ambassador earned ${result.pointsAwarded} points!`
            );

            // Remove the referral input
            document.querySelector('.user-profile__referral-input').remove();
        } else {
            throw new Error(result.error || 'Failed to verify referral code');
        }

    } catch (error) {
        console.error('Error verifying referral:', error);
        showErrorNotification(error.message || 'Failed to verify referral code');
    }
}

/* ===============================================
   MODALS & UI HELPERS
   =============================================== */

function initializeModals() {
    // Close modal when clicking overlay
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal__overlay')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    });

    // Close modal with close button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal__close') || e.target.closest('.modal__close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Modal management
function closeModal() {
    const modal = document.getElementById('ambassador-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Helper function to format specialization
function formatSpecialization(spec) {
    if (!spec) return 'General Development';

    const specializationMap = {
        'web': 'Web Development',
        'mobile': 'Mobile Development',
        'backend': 'Backend Development',
        'frontend': 'Frontend Development',
        'fullstack': 'Full Stack Development',
        'ai': 'AI/Machine Learning',
        'ml': 'Machine Learning',
        'data': 'Data Science',
        'devops': 'DevOps',
        'ui': 'UI/UX Design',
        'ux': 'UI/UX Design',
        'blockchain': 'Blockchain',
        'cybersecurity': 'Cybersecurity',
        'cloud': 'Cloud Computing',
        'game': 'Game Development'
    };

    const formatted = specializationMap[spec.toLowerCase()] || spec;
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Close modal when clicking the close button
    document.addEventListener('click', function (e) {
        if (e.target.matches('.modal__close, .modal__close *')) {
            closeModal();
        }

        // Close modal when clicking outside the modal content
        if (e.target.matches('.modal__overlay')) {
            closeModal();
        }
    });

    // Close modal with escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

function showAmbassadorModal(ambassadorId) {
    const ambassador = ambassadorData.find(a => a._id === ambassadorId);
    if (!ambassador) return;

    const modalBody = document.getElementById('modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = createAmbassadorModalContent(ambassador);

    const modal = document.getElementById('ambassador-modal');
    if (modal) {
        modal.classList.add('active');
        // Add entrance animation
        setTimeout(() => {
            animateModalEntrance(modal);
        }, 10);
    }
}

function createAmbassadorModalContent(ambassador) {
    const user = ambassador.userId || {};
    const specializations = Array.isArray(ambassador.specialization) ?
        ambassador.specialization : [ambassador.specialization];

    return `
        <div class="ambassador-modal__header">
            <div class="ambassador-modal__avatar">
                <img src="${user.avatarUrl || 'assets/img/avatars/default-avatar.svg'}" 
                     alt="${ambassador.name}" />
            </div>
            <div class="ambassador-modal__info">
                <h2>${ambassador.name}</h2>
                <p class="ambassador-modal__title">DevSync Student Ambassador</p>
                <p class="ambassador-modal__university">
                    <i class="fas fa-graduation-cap"></i>
                    ${ambassador.university}
                </p>
            </div>
        </div>
        
        <div class="ambassador-modal__stats">
            <div class="ambassador-modal__stat">
                <span class="ambassador-modal__stat-value">${ambassador.ambassadorPoints || 0}</span>
                <span class="ambassador-modal__stat-label">Ambassador Points</span>
            </div>
            <div class="ambassador-modal__stat">
                <span class="ambassador-modal__stat-value">${ambassador.eventsOrganized || 0}</span>
                <span class="ambassador-modal__stat-label">Events Organized</span>
            </div>
            <div class="ambassador-modal__stat">
                <span class="ambassador-modal__stat-value">${ambassador.membersReferred || 0}</span>
                <span class="ambassador-modal__stat-label">Members Referred</span>
            </div>
            <div class="ambassador-modal__stat">
                <span class="ambassador-modal__stat-value">${user.points || 0}</span>
                <span class="ambassador-modal__stat-label">DevSync Points</span>
            </div>
        </div>
        
        <div class="ambassador-modal__section">
            <h3><i class="fas fa-user"></i> About</h3>
            <p class="ambassador-modal__bio">
                ${ambassador.bio || 'Passionate about open-source development and community building.'}
            </p>
        </div>
        
        <div class="ambassador-modal__section">
            <h3><i class="fas fa-code"></i> Specializations</h3>
            <div class="ambassador-modal__specializations">
                ${specializations.map(spec => `
                    <span class="ambassador-modal__tag">${formatSpecialization(spec)}</span>
                `).join('')}
            </div>
        </div>
        
        <div class="ambassador-modal__section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <p class="ambassador-modal__bio">
                ${ambassador.country || 'Global'} • ${ambassador.region || 'International'}
            </p>
        </div>
        
        <div class="ambassador-modal__section">
            <h3><i class="fas fa-link"></i> Connect</h3>
            <div class="ambassador-modal__links">
                ${user.username ? `
                    <a href="https://github.com/${user.username}" target="_blank" class="ambassador-modal__link">
                        <i class="fab fa-github"></i>
                        <span>GitHub Profile</span>
                    </a>
                ` : ''}
                ${ambassador.linkedinUrl ? `
                    <a href="${ambassador.linkedinUrl}" target="_blank" class="ambassador-modal__link">
                        <i class="fab fa-linkedin"></i>
                        <span>LinkedIn</span>
                    </a>
                ` : ''}
                ${ambassador.portfolioUrl ? `
                    <a href="${ambassador.portfolioUrl}" target="_blank" class="ambassador-modal__link">
                        <i class="fas fa-globe"></i>
                        <span>Portfolio</span>
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

function initializeFilters() {
    // Placeholder for filter functionality
    console.log('Filters initialized');
}

function showLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'block';
}

function hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'none';
}

function showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'block';
}

function hideEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.style.display = 'none';
}

function showErrorState() {
    const grid = document.getElementById('ambassadors-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load ambassadors</h3>
                <p>Please try refreshing the page.</p>
                <button class="btn btn--primary" onclick="loadAmbassadorData()">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

function initializeCounterAnimation() {
    const counters = document.querySelectorAll('.hero__stat-number[data-count]');

    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const stepTime = 50;
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, stepTime);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

/* ===============================================
   AUTHENTICATION MODAL
   =============================================== */

function showAuthenticationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal__overlay"></div>
        <div class="modal__content">
            <button class="modal__close" onclick="this.closest('.modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal__body">
                <div class="auth-modal">
                    <div class="auth-modal__header">
                        <i class="fab fa-github"></i>
                        <h2>Authentication Required</h2>
                        <p>Please log in with GitHub to apply for the Ambassador Program</p>
                    </div>
                    <div class="auth-modal__actions">
                        <a href="/api/auth/github" class="btn btn--primary">
                            <i class="fab fa-github"></i>
                            Login with GitHub
                        </a>
                        <button class="btn btn--secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.querySelector('.modal__overlay').addEventListener('click', () => {
        modal.remove();
    });
}

/* ===============================================
   NOTIFICATION SYSTEM
   =============================================== */

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showLoadingNotification(message) {
    showNotification(message, 'loading');
}

function showNotification(message, type = 'info') {
    // Create or get toast container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icon = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        loading: 'fas fa-spinner fa-spin',
        info: 'fas fa-info-circle'
    }[type];

    // Create toast content
    const toastContent = document.createElement('div');
    toastContent.className = 'toast__content';

    const toastIcon = document.createElement('div');
    toastIcon.className = 'toast__icon';
    toastIcon.innerHTML = `<i class="${icon}"></i>`;

    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast__message';
    toastMessage.textContent = message;

    toastContent.appendChild(toastIcon);
    toastContent.appendChild(toastMessage);

    // Add close button if not loading
    if (type !== 'loading') {
        const toastClose = document.createElement('button');
        toastClose.className = 'toast__close';
        toastClose.innerHTML = '<i class="fas fa-times"></i>';
        toastClose.addEventListener('click', () => removeToast(toast));
        toastContent.appendChild(toastClose);
    }

    toast.appendChild(toastContent);
    container.appendChild(toast);

    // Add entrance animation
    animateToastEntrance(toast);

    // Auto remove after delay (except loading)
    if (type !== 'loading') {
        setTimeout(() => {
            removeToast(toast);
        }, type === 'error' ? 7000 : 5000);
    }

    return toast; // Return reference for manual removal
}

function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300); // Match animation duration
    }
}

function showSuccessNotification(message) {
    return showNotification(message, 'success');
}

function showErrorNotification(message) {
    return showNotification(message, 'error');
}

function showWarningNotification(message) {
    return showNotification(message, 'warning');
}

function showLoadingNotification(message) {
    return showNotification(message, 'loading');
}

/* ===============================================
   ADMIN FUNCTIONS
   =============================================== */

async function deleteAmbassador(ambassadorId, ambassadorName) {
    if (!isAdminUser) {
        showErrorNotification('Access denied. Admin privileges required.');
        return;
    }

    // Confirmation dialog with animation
    const confirmed = await showConfirmDialog(
        'Delete Ambassador',
        `Are you sure you want to delete ambassador "${ambassadorName}"? This action cannot be undone.`,
        'Delete',
        'Cancel'
    );

    if (!confirmed) return;

    const loadingToast = showLoadingNotification('Deleting ambassador...');

    try {
        const response = await fetch(`/api/ambassadors/${ambassadorId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete ambassador: ${response.statusText}`);
        }

        // Remove the card with animation
        const cardElement = document.querySelector(`[data-ambassador-id="${ambassadorId}"]`);
        if (cardElement) {
            await animateCardRemoval(cardElement);
        }

        // Update local data
        ambassadorData = ambassadorData.filter(amb => amb._id !== ambassadorId);
        filteredAmbassadors = filteredAmbassadors.filter(amb => amb._id !== ambassadorId);

        removeToast(loadingToast);
        showSuccessNotification(`Ambassador "${ambassadorName}" has been deleted successfully.`);

        // Update ambassador count
        updateAmbassadorCount();

    } catch (error) {
        console.error('Error deleting ambassador:', error);
        removeToast(loadingToast);
        showErrorNotification('Failed to delete ambassador. Please try again.');
    }
}

async function showConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.opacity = '0';

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-dialog__header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-dialog__body">
                <p>${message}</p>
            </div>
            <div class="confirm-dialog__footer">
                <button class="btn btn--outline confirm-cancel">${cancelText}</button>
                <button class="btn btn--danger confirm-delete">${confirmText}</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // Animate in
        anime({
            targets: modal,
            opacity: [0, 1],
            duration: 200,
            easing: 'easeOutQuad'
        });

        anime({
            targets: dialog,
            scale: [0.8, 1],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutBack'
        });

        // Event handlers
        const cancelBtn = dialog.querySelector('.confirm-cancel');
        const deleteBtn = dialog.querySelector('.confirm-delete');

        const cleanup = () => {
            anime({
                targets: modal,
                opacity: [1, 0],
                duration: 200,
                easing: 'easeInQuad',
                complete: () => modal.remove()
            });
        };

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });

        deleteBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });
    });
}

/* ===============================================
   ANIMATION FUNCTIONS
   =============================================== */

function animateCardsEntrance() {
    const cards = document.querySelectorAll('.ambassador-card');

    // Check if anime.js is available
    if (typeof anime === 'undefined') {
        console.warn('Anime.js not loaded, skipping card animations');
        return;
    }

    // Reset cards for animation
    anime.set(cards, {
        scale: 0.8,
        opacity: 0
    });

    // Animate cards in with stagger
    anime({
        targets: cards,
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .8)',
        delay: anime.stagger(100, { start: 200 })
    });
}

function animateCardHover(card, isEntering) {
    if (typeof anime === 'undefined') return;

    anime({
        targets: card,
        scale: isEntering ? 1.05 : 1,
        duration: 300,
        easing: 'easeOutQuad'
    });
}

async function animateCardRemoval(card) {
    if (typeof anime === 'undefined') {
        card.remove();
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        anime({
            targets: card,
            scale: [1, 0.8],
            opacity: [1, 0],
            duration: 400,
            easing: 'easeInQuad',
            complete: () => {
                card.remove();
                resolve();
            }
        });
    });
}

function animateModalEntrance(modal) {
    if (typeof anime === 'undefined') return;

    const content = modal.querySelector('.modal-content');

    anime.set(modal, { opacity: 0 });
    anime.set(content, { scale: 0.5, opacity: 0 });

    anime({
        targets: modal,
        opacity: [0, 1],
        duration: 200,
        easing: 'easeOutQuad'
    });

    anime({
        targets: content,
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutBack'
    });
}

function animateToastEntrance(toast) {
    if (typeof anime === 'undefined') return;

    anime.set(toast, {
        translateY: -50,
        opacity: 0
    });

    anime({
        targets: toast,
        translateY: [- 50, 0],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad'
    });
}

function initializeCardAnimations() {
    // Add hover effects to existing cards with proper browser compatibility
    document.addEventListener('mouseenter', (e) => {
        const card = findClosestElement(e.target, 'ambassador-card');
        if (card) {
            animateCardHover(card, true);
        }
    }, true);

    document.addEventListener('mouseleave', (e) => {
        const card = findClosestElement(e.target, 'ambassador-card');
        if (card) {
            animateCardHover(card, false);
        }
    }, true);
}

// Helper function for browser compatibility
function findClosestElement(element, className) {
    if (!element) return null;

    // Modern browsers
    if (element.closest) {
        return element.closest('.' + className);
    }

    // Fallback for older browsers
    let current = element;
    while (current && current !== document) {
        if (current.classList && current.classList.contains(className)) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function showInfoNotification(message) {
    return showNotification(message, 'info');
}

// ===============================================
// MODERN FRAMER-INSPIRED ANIMATIONS WITH ANIME.JS
// ===============================================

// Initialize all modern animations
function initModernAnimations() {
    initScrollAnimations();
    initHeroAnimations();
    initCardAnimations();
    initInteractionAnimations();
    initScrollIndicator();

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        animatePageEntrance();
    });
}

// Page entrance animation
function animatePageEntrance() {
    if (typeof anime === 'undefined') return;

    // Animate hero elements
    anime.timeline()
        .add({
            targets: '.hero__badge',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutQuart'
        })
        .add({
            targets: '.hero__title',
            translateY: [40, 0],
            opacity: [0, 1],
            duration: 1000,
            easing: 'easeOutQuart'
        }, '-=600')
        .add({
            targets: '.hero__description',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutQuart'
        }, '-=400')
        .add({
            targets: '.hero__stat',
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 600,
            delay: anime.stagger(100),
            easing: 'easeOutQuart'
        }, '-=200');
}

// Modern card hover animations
function animateCardHover(card, isHovering) {
    if (typeof anime === 'undefined') return;

    const avatar = card.querySelector('.ambassador-card__avatar');
    const name = card.querySelector('.ambassador-card__name');
    const stats = card.querySelectorAll('.ambassador-card__stat-value');

    if (isHovering) {
        anime({
            targets: card,
            translateY: [-8, -12],
            scale: [1, 1.02],
            duration: 300,
            easing: 'easeOutQuart'
        });

        anime({
            targets: avatar,
            scale: [1, 1.1],
            rotate: [0, 5],
            duration: 400,
            easing: 'easeOutBack'
        });

        anime({
            targets: name,
            scale: [1, 1.05],
            duration: 300,
            easing: 'easeOutQuart'
        });

        anime({
            targets: stats,
            scale: [1, 1.1],
            duration: 300,
            delay: anime.stagger(50),
            easing: 'easeOutBack'
        });
    } else {
        anime({
            targets: card,
            translateY: 0,
            scale: 1,
            duration: 300,
            easing: 'easeOutQuart'
        });

        anime({
            targets: avatar,
            scale: 1,
            rotate: 0,
            duration: 400,
            easing: 'easeOutQuart'
        });

        anime({
            targets: name,
            scale: 1,
            duration: 300,
            easing: 'easeOutQuart'
        });

        anime({
            targets: stats,
            scale: 1,
            duration: 300,
            easing: 'easeOutQuart'
        });
    }
}

// Scroll-triggered animations
function initScrollAnimations() {
    if (typeof anime === 'undefined') return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateElementOnScroll(entry.target);
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('section, .ambassador-card, .filter__group').forEach(el => {
        observer.observe(el);
    });
}

function animateElementOnScroll(element) {
    if (typeof anime === 'undefined') return;

    if (element.classList.contains('ambassador-card')) {
        anime({
            targets: element,
            translateY: [40, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutQuart'
        });
    } else if (element.classList.contains('filter__group')) {
        anime({
            targets: element,
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 600,
            easing: 'easeOutQuart'
        });
    }
}

// Hero visual animations
function initHeroAnimations() {
    if (typeof anime === 'undefined') return;

    // Floating animation for hero visual
    anime({
        targets: '.hero__visual',
        translateY: [-10, 10],
        duration: 4000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
    });

    // Rotate orbits
    anime({
        targets: '.hero__orbit',
        rotate: 360,
        duration: 20000,
        loop: true,
        easing: 'linear'
    });

    // Counter-rotate inner elements
    anime({
        targets: '.hero__node',
        rotate: -360,
        duration: 20000,
        loop: true,
        easing: 'linear'
    });

    // Floating icons
    anime({
        targets: '.hero__float',
        translateY: [-15, 15],
        duration: 3000,
        direction: 'alternate',
        loop: true,
        delay: anime.stagger(500),
        easing: 'easeInOutSine'
    });
}

// Interactive animations
function initInteractionAnimations() {
    // Button hover effects
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            if (typeof anime === 'undefined') return;

            anime({
                targets: btn,
                scale: 1.05,
                duration: 200,
                easing: 'easeOutQuart'
            });
        });

        btn.addEventListener('mouseleave', () => {
            if (typeof anime === 'undefined') return;

            anime({
                targets: btn,
                scale: 1,
                duration: 200,
                easing: 'easeOutQuart'
            });
        });
    });

    // Filter animation
    document.querySelectorAll('select, input').forEach(input => {
        input.addEventListener('focus', () => {
            if (typeof anime === 'undefined') return;

            anime({
                targets: input,
                scale: 1.02,
                duration: 200,
                easing: 'easeOutQuart'
            });
        });

        input.addEventListener('blur', () => {
            if (typeof anime === 'undefined') return;

            anime({
                targets: input,
                scale: 1,
                duration: 200,
                easing: 'easeOutQuart'
            });
        });
    });
}

// Scroll progress indicator
function initScrollIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    document.body.appendChild(indicator);

    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

        if (typeof anime === 'undefined') {
            indicator.style.transform = `translateX(${scrolled - 100}%)`;
        } else {
            anime({
                targets: indicator,
                translateX: `${scrolled - 100}%`,
                duration: 100,
                easing: 'easeOutQuart'
            });
        }
    });
}

// Enhanced card grid animation
function animateCardGrid() {
    if (typeof anime === 'undefined') return;

    const cards = document.querySelectorAll('.ambassador-card');

    anime({
        targets: cards,
        translateY: [60, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(100, { start: 200 }),
        easing: 'easeOutQuart'
    });
}

// Initialize modern animations
initModernAnimations();

/* ===============================================
   DELETE FUNCTIONALITY WITH GSAP/ANIME.JS ANIMATIONS
   =============================================== */

// Delete Ambassador Function
async function deleteAmbassador(ambassadorId, ambassadorName) {
    showDeleteConfirmation(
        'Remove Ambassador',
        `Are you sure you want to remove "${ambassadorName}" from the ambassador program? This action cannot be undone.`,
        async () => {
            try {
                // Animate card removal
                const card = document.querySelector(`[data-ambassador-id="${ambassadorId}"]`);
                if (card && typeof anime !== 'undefined') {
                    await animateCardRemoval(card);
                }

                const response = await fetch(`/api/ambassadors/admin/ambassadors/${ambassadorId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Remove from local data
                    ambassadorData = ambassadorData.filter(ambassador => ambassador._id !== ambassadorId);
                    filteredAmbassadors = filteredAmbassadors.filter(ambassador => ambassador._id !== ambassadorId);

                    // Re-render the grid
                    renderAmbassadors();

                    showSuccessNotification(`${ambassadorName} has been removed from the ambassador program.`);

                    // Update admin stats if visible
                    if (isAdminUser) {
                        loadAdminStats();
                    }
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to remove ambassador');
                }
            } catch (error) {
                console.error('Error removing ambassador:', error);
                showErrorNotification(`Failed to remove ambassador: ${error.message}`);
            }
        }
    );
}

// Delete Application Function (for rejected applications)
async function deleteApplication(applicationId, applicantName) {
    showDeleteConfirmation(
        'Delete Application',
        `Are you sure you want to permanently delete the application from "${applicantName}"? This action cannot be undone.`,
        async () => {
            const loadingToast = showLoadingNotification('Deleting application...');
            try {
                // Animate application card removal
                const card = document.querySelector(`[data-id="${applicationId}"]`);
                if (card && typeof anime !== 'undefined') {
                    await animateCardRemoval(card);
                }

                const response = await fetch(`/api/ambassadors/admin/applications/${applicationId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Remove from local data
                    adminApplications = adminApplications.filter(app => app._id !== applicationId);

                    // Re-render applications
                    renderAdminApplications(adminApplications);

                    removeToast(loadingToast);
                    showSuccessNotification(`Application from ${applicantName} has been deleted.`);

                    // Update admin stats
                    loadAdminStats();
                } else {
                    let errorMessage = 'Failed to delete application';
                    try {
                        const error = await response.json();
                        errorMessage = error.error || error.message || errorMessage;
                    } catch (parseError) {
                        if (response.status === 404) {
                            errorMessage = 'Application not found';
                        } else if (response.status === 403) {
                            errorMessage = 'Access denied. Admin privileges required.';
                        } else if (response.status >= 500) {
                            errorMessage = 'Server error. Please try again later.';
                        } else {
                            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        }
                    }
                    removeToast(loadingToast);
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error('Error deleting application:', error);
                removeToast(loadingToast);
                showErrorNotification(`Failed to delete application: ${error.message}`);
            }
        }
    );
}

// Edit Ambassador Function (placeholder for future implementation)
function editAmbassador(ambassadorId) {
    showInfoNotification('Edit functionality will be available soon!');
    // TODO: Implement edit modal
}

// Enable Reapplication Function
async function enableReapplication(applicationId, applicantName) {
    showDeleteConfirmation(
        'Enable Reapplication',
        `Allow "${applicantName}" to reapply? This will reset their application status to pending and notify them that they can submit a new application.`,
        async () => {
            const loadingToast = showLoadingNotification('Enabling reapplication...');
            try {
                // Try to call backend API
                const response = await fetch(`/api/ambassadors/admin/applications/${applicationId}/enable-reapply`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Update local data
                    const index = adminApplications.findIndex(app => app._id === applicationId);
                    if (index !== -1) {
                        adminApplications[index].status = 'pending';
                        adminApplications[index].reviewNotes = (adminApplications[index].reviewNotes || '') + ' [Reapplication enabled]';
                    }

                    // Re-render applications
                    renderAdminApplications(adminApplications);

                    removeToast(loadingToast);
                    showSuccessNotification(`${applicantName} can now reapply. Their status has been reset to pending.`);

                    // Update admin stats
                    loadAdminStats();
                } else {
                    // Handle backend unavailable - simulate the action
                    console.log('Backend not available - simulating reapplication enable with mock data');

                    // Update local data
                    const index = adminApplications.findIndex(app => app._id === applicationId);
                    if (index !== -1) {
                        adminApplications[index].status = 'pending';
                        adminApplications[index].reviewNotes = (adminApplications[index].reviewNotes || '') + ' [Reapplication enabled - Mock mode]';
                    }

                    // Re-render applications
                    renderAdminApplications(adminApplications);

                    removeToast(loadingToast);
                    showSuccessNotification(`${applicantName} can now reapply. Status reset to pending. (Mock mode - backend unavailable)`);
                }
            } catch (error) {
                console.error('Error enabling reapplication:', error);

                // Fallback: simulate the action when network fails
                const index = adminApplications.findIndex(app => app._id === applicationId);
                if (index !== -1) {
                    adminApplications[index].status = 'pending';
                    adminApplications[index].reviewNotes = (adminApplications[index].reviewNotes || '') + ' [Reapplication enabled - Offline mode]';
                }

                renderAdminApplications(adminApplications);
                removeToast(loadingToast);
                showSuccessNotification(`${applicantName} can now reapply. Status reset to pending. (Offline mode)`);
            }
        }
    );
}

// Delete Confirmation Modal
function showDeleteConfirmation(title, message, onConfirm) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.delete-confirmation-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'delete-confirmation-modal';
    modal.innerHTML = `
        <div class="delete-confirmation-content">
            <h3>
                <i class="fas fa-exclamation-triangle"></i>
                ${title}
            </h3>
            <p>${message}</p>
            <div class="delete-confirmation-actions">
                <button class="btn btn--secondary" onclick="hideDeleteConfirmation()">Cancel</button>
                <button class="btn btn--danger" onclick="confirmDelete()">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Store the confirm function
    window.confirmDeleteAction = onConfirm;

    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('active');

        if (typeof anime !== 'undefined') {
            anime({
                targets: '.delete-confirmation-content',
                scale: [0.8, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }
    }, 10);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideDeleteConfirmation();
        }
    });
}

function hideDeleteConfirmation() {
    const modal = document.querySelector('.delete-confirmation-modal');
    if (modal) {
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.delete-confirmation-content',
                scale: [1, 0.8],
                opacity: [1, 0],
                duration: 200,
                easing: 'easeInQuart',
                complete: () => {
                    modal.remove();
                }
            });
        } else {
            modal.remove();
        }
    }
    window.confirmDeleteAction = null;
}

function confirmDelete() {
    if (window.confirmDeleteAction) {
        window.confirmDeleteAction();
        hideDeleteConfirmation();
    }
}

// Card Removal Animation
async function animateCardRemoval(card) {
    return new Promise((resolve) => {
        if (typeof anime !== 'undefined') {
            anime({
                targets: card,
                scale: [1, 0],
                opacity: [1, 0],
                rotateY: [0, 90],
                duration: 500,
                easing: 'easeInQuart',
                complete: resolve
            });
        } else {
            // Fallback CSS animation
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'scale(0)';
            card.style.opacity = '0';
            setTimeout(resolve, 300);
        }
    });
}

// Enhanced Animations with GSAP (if available)
function initAdvancedAnimations() {
    // Check if GSAP is available
    if (typeof gsap !== 'undefined') {
        console.log('GSAP detected, enabling advanced animations');

        // Advanced card hover animations with GSAP
        document.addEventListener('mouseenter', (e) => {
            const card = findClosestElement(e.target, 'ambassador-card');
            if (card) {
                gsap.to(card, {
                    y: -12,
                    scale: 1.03,
                    rotationY: 5,
                    duration: 0.3,
                    ease: "back.out(1.7)"
                });

                gsap.to(card.querySelector('.ambassador-card__avatar'), {
                    scale: 1.1,
                    rotation: 5,
                    duration: 0.4,
                    ease: "elastic.out(1, 0.3)"
                });
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            const card = findClosestElement(e.target, 'ambassador-card');
            if (card) {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    rotationY: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });

                gsap.to(card.querySelector('.ambassador-card__avatar'), {
                    scale: 1,
                    rotation: 0,
                    duration: 0.4,
                    ease: "power2.out"
                });
            }
        }, true);
    } else {
        console.log('GSAP not available, using Anime.js animations');
    }
}

/* ===============================================
   EDIT APPLICATION MODAL
   =============================================== */

function showEditApplicationModal(application) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.edit-application-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'edit-application-modal modal active';
    modal.innerHTML = `
        <div class="modal__overlay"></div>
        <div class="modal__content modal__content--large">
            <div class="modal__header">
                <h3>
                    <i class="fas fa-edit"></i>
                    Edit Application - ${application.name}
                </h3>
                <button class="modal__close" onclick="hideEditApplicationModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal__body">
                <form class="edit-application-form" id="edit-application-form">
                    <input type="hidden" id="edit-app-id" value="${application._id}">
                    
                    <div class="form__grid">
                        <div class="form__group">
                            <label for="edit-app-name" class="form__label">Full Name</label>
                            <input type="text" id="edit-app-name" name="name" class="form__input" 
                                   value="${application.name}" required>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-email" class="form__label">Email Address</label>
                            <input type="email" id="edit-app-email" name="email" class="form__input" 
                                   value="${application.email}" required>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-university" class="form__label">University</label>
                            <input type="text" id="edit-app-university" name="university" class="form__input" 
                                   value="${application.university}" required>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-year" class="form__label">Year of Study</label>
                            <select id="edit-app-year" name="year" class="form__select" required>
                                <option value="1" ${application.year === '1' ? 'selected' : ''}>1st Year</option>
                                <option value="2" ${application.year === '2' ? 'selected' : ''}>2nd Year</option>
                                <option value="3" ${application.year === '3' ? 'selected' : ''}>3rd Year</option>
                                <option value="4" ${application.year === '4' ? 'selected' : ''}>4th Year</option>
                                <option value="graduate" ${application.year === 'graduate' ? 'selected' : ''}>Graduate</option>
                                <option value="phd" ${application.year === 'phd' ? 'selected' : ''}>PhD</option>
                            </select>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-major" class="form__label">Major/Field of Study</label>
                            <input type="text" id="edit-app-major" name="major" class="form__input" 
                                   value="${application.major}" required>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-github" class="form__label">GitHub Username</label>
                            <input type="text" id="edit-app-github" name="github" class="form__input" 
                                   value="${application.github}" required>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-specialization" class="form__label">Primary Specialization</label>
                            <select id="edit-app-specialization" name="specialization" class="form__select" required>
                                <option value="frontend" ${application.specialization === 'frontend' ? 'selected' : ''}>Frontend Development</option>
                                <option value="backend" ${application.specialization === 'backend' ? 'selected' : ''}>Backend Development</option>
                                <option value="fullstack" ${application.specialization === 'fullstack' ? 'selected' : ''}>Full-Stack Development</option>
                                <option value="mobile" ${application.specialization === 'mobile' ? 'selected' : ''}>Mobile Development</option>
                                <option value="devops" ${application.specialization === 'devops' ? 'selected' : ''}>DevOps & Cloud</option>
                                <option value="ai-ml" ${application.specialization === 'ai-ml' ? 'selected' : ''}>AI & Machine Learning</option>
                                <option value="blockchain" ${application.specialization === 'blockchain' ? 'selected' : ''}>Blockchain</option>
                                <option value="cybersecurity" ${application.specialization === 'cybersecurity' ? 'selected' : ''}>Cybersecurity</option>
                            </select>
                        </div>

                        <div class="form__group">
                            <label for="edit-app-status" class="form__label">Status</label>
                            <select id="edit-app-status" name="status" class="form__select" required>
                                <option value="pending" ${application.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="approved" ${application.status === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div class="form__group">
                        <label for="edit-app-experience" class="form__label">Open Source Experience</label>
                        <textarea id="edit-app-experience" name="experience" class="form__textarea" rows="4">${application.experience || ''}</textarea>
                    </div>

                    <div class="form__group">
                        <label for="edit-app-motivation" class="form__label">Motivation</label>
                        <textarea id="edit-app-motivation" name="motivation" class="form__textarea" rows="4" required>${application.motivation}</textarea>
                    </div>

                    <div class="form__group">
                        <label for="edit-app-activities" class="form__label">Planned Activities</label>
                        <textarea id="edit-app-activities" name="activities" class="form__textarea" rows="3">${application.activities || ''}</textarea>
                    </div>

                    <div class="form__group">
                        <label for="edit-app-notes" class="form__label">Review Notes (Admin Only)</label>
                        <textarea id="edit-app-notes" name="reviewNotes" class="form__textarea" rows="3" 
                                  placeholder="Add internal notes about this application...">${application.reviewNotes || ''}</textarea>
                    </div>

                    ${application.referralCode ? `
                        <div class="form__group">
                            <label for="edit-app-referral" class="form__label">Referral Code</label>
                            <div class="referral-input-group">
                                <input type="text" id="edit-app-referral" name="referralCode" class="form__input" 
                                       value="${application.referralCode}" readonly>
                                <button type="button" class="btn btn--outline btn--sm" onclick="copyToClipboard('${application.referralCode}')">
                                    <i class="fas fa-copy"></i>
                                    Copy
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </form>
            </div>
            <div class="modal__actions">
                <button type="button" class="btn btn--secondary" onclick="hideEditApplicationModal()">Cancel</button>
                <button type="submit" form="edit-application-form" class="btn btn--primary">
                    <i class="fas fa-save"></i>
                    Save Changes
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#edit-application-form');
    form.addEventListener('submit', handleEditApplicationSubmit);

    // Show modal with animation
    setTimeout(() => {
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.modal__content',
                scale: [0.8, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }
    }, 10);

    // Close on backdrop click
    modal.querySelector('.modal__overlay').addEventListener('click', hideEditApplicationModal);
}

function hideEditApplicationModal() {
    const modal = document.querySelector('.edit-application-modal');
    if (modal) {
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.modal__content',
                scale: [1, 0.8],
                opacity: [1, 0],
                duration: 200,
                easing: 'easeInQuart',
                complete: () => {
                    modal.remove();
                }
            });
        } else {
            modal.remove();
        }
    }
}

async function handleEditApplicationSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const applicationData = Object.fromEntries(formData);
    const applicationId = applicationData.applicationId || document.getElementById('edit-app-id').value;

    // Remove the hidden ID field from data
    delete applicationData.applicationId;

    const loadingToast = showLoadingNotification('Updating application...');

    try {
        const response = await fetch(`/api/ambassadors/admin/applications/${applicationId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(applicationData)
        });

        if (response.ok) {
            let updatedApplication;
            try {
                updatedApplication = await response.json();
            } catch (parseError) {
                console.error('Failed to parse response JSON:', parseError);
                throw new Error('Invalid server response');
            }

            // Update local data
            const index = adminApplications.findIndex(app => app._id === applicationId);
            if (index !== -1) {
                adminApplications[index] = { ...adminApplications[index], ...updatedApplication.application };
            }

            // Re-render applications
            renderAdminApplications(adminApplications);

            hideEditApplicationModal();
            removeToast(loadingToast);
            showSuccessNotification('Application updated successfully!');

            // Update admin stats
            await loadAdminStats();
        } else {
            let errorMessage = 'Failed to update application';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (parseError) {
                if (response.status === 404) {
                    errorMessage = 'Application not found';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. Admin privileges required.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error updating application:', error);
        removeToast(loadingToast);
        showErrorNotification(`Failed to update application: ${error.message}`);
    }
}/* ===============================================
   NOTIFICATION SYSTEM
   =============================================== */

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showInfoNotification(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(notif => notif.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 400);
        }
    }, 5000);
}

/* ===============================================
   INITIALIZATION
   =============================================== */

// Initialize advanced animations
initAdvancedAnimations();
