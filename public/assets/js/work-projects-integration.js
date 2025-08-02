// DevSync Projects Integration Configuration
// This script ensures proper initialization of projects functionality within /projects

document.addEventListener('DOMContentLoaded', function () {
    // Set server URL based on environment
    if (typeof window.serverUrl === 'undefined') {
        window.serverUrl = window.location.origin;
    }

    // console.log('🚀 DevSync Projects Integration starting...');
    // console.log('🌐 Server URL:', window.serverUrl);

    // Initialize all components with delay to ensure DOM is ready
    // Use longer delay to ensure all elements are properly rendered
    setTimeout(() => {
        // console.log('🔧 Starting component initialization...');

        initializeCompactCommunity();
        initializeProjectSummary(); // This now includes retry mechanism
        initializePagination();
        detectThemeChanges();

        // Add smooth scrolling to DevSync projects section
        const projectsSection = document.querySelector('.devsync-projects-section');
        if (projectsSection) {
            addNavigationButton();
        }

        // Include required scripts
        includeRequiredScripts();

        // console.log('✅ DevSync Projects Integration initialized');
    }, 1000); // Increased delay for better reliability
});

// Pagination state management
let paginationState = {
    currentPage: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
    allUsers: [],
    filteredUsers: []
};

// Initialize pagination functionality
function initializePagination() {
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const searchInput = document.getElementById('communitySearch');

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            paginationState.pageSize = parseInt(e.target.value);
            paginationState.currentPage = 1;
            updateCommunityDisplay();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (paginationState.currentPage > 1) {
                paginationState.currentPage--;
                updateCommunityDisplay();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (paginationState.currentPage < paginationState.totalPages) {
                paginationState.currentPage++;
                updateCommunityDisplay();
            }
        });
    }

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterCommunityMembers(e.target.value);
            }, 300);
        });
    }
}

// Filter community members based on search
function filterCommunityMembers(searchTerm) {
    if (!searchTerm.trim()) {
        paginationState.filteredUsers = [...paginationState.allUsers];
    } else {
        const term = searchTerm.toLowerCase();
        paginationState.filteredUsers = paginationState.allUsers.filter(user =>
            user.username?.toLowerCase().includes(term) ||
            user.displayName?.toLowerCase().includes(term) ||
            user.email?.toLowerCase().includes(term)
        );
    }

    paginationState.currentPage = 1;
    updateCommunityDisplay();
}

// Update community display with pagination
function updateCommunityDisplay() {
    const communityPreview = document.getElementById('communityPreview');
    const currentPageInfo = document.getElementById('currentPageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!communityPreview) return;

    // Calculate pagination
    paginationState.totalItems = paginationState.filteredUsers.length;
    paginationState.totalPages = Math.ceil(paginationState.totalItems / paginationState.pageSize);

    // Get current page items
    const startIndex = (paginationState.currentPage - 1) * paginationState.pageSize;
    const endIndex = startIndex + paginationState.pageSize;
    const currentPageUsers = paginationState.filteredUsers.slice(startIndex, endIndex);

    // Update display
    if (currentPageUsers.length === 0) {
        communityPreview.innerHTML = '<div class="no-users-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--devsync-text-muted);">No community members found.</div>';
    } else {
        communityPreview.innerHTML = currentPageUsers.map(user => createUserCard(user)).join('');
    }

    // Update pagination info
    if (currentPageInfo) {
        const start = paginationState.totalItems === 0 ? 0 : startIndex + 1;
        const end = Math.min(endIndex, paginationState.totalItems);
        currentPageInfo.textContent = `Showing ${start}-${end} of ${paginationState.totalItems} members`;
    }

    // Update button states
    if (prevBtn) {
        prevBtn.disabled = paginationState.currentPage <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = paginationState.currentPage >= paginationState.totalPages;
    }

    // Update stats
    updateCommunityStats();
}

// Create user card HTML
function createUserCard(user) {
    // Use proper avatar field from database
    const avatarUrl = user.avatarUrl || 'assets/img/avatars/default.png';
    const displayName = user.displayName || user.username || 'Unknown User';
    const username = user.username || 'unknown';
    const email = user.email || 'N/A';
    const githubUsername = user.username || username;

    // Use isAdmin field from backend (which checks ADMIN_GITHUB_IDS)
    const isAdmin = user.isAdmin === true;
    const role = isAdmin ? 'Admin' : 'Contributor';
    const roleClass = isAdmin ? 'role-admin' : 'role-contributor';

    return `
        <div class="user-card-compact" onclick="openGitHubProfile('${githubUsername}')" title="Click to view ${displayName}'s GitHub profile">
            <img src="${avatarUrl}" alt="${displayName}" class="user-avatar" 
                 onerror="this.src='assets/img/avatars/default.png'">
            <div class="user-info">
                <div class="user-name">${displayName}</div>
                <div class="user-username">@${username}</div>
                <div class="user-email" title="${email}">${email}</div>
                <div class="user-role ${roleClass}">${role}</div>
            </div>
        </div>
    `;
}

// Update community stats
function updateCommunityStats() {
    const totalMembersCount = document.getElementById('totalMembersCount');
    const activeMembersCount = document.getElementById('activeMembersCount');
    const topContributorsCount = document.getElementById('topContributorsCount');

    if (totalMembersCount) {
        totalMembersCount.textContent = paginationState.allUsers.length;
    }

    if (activeMembersCount) {
        // Count all users as active (since we're getting real database users)
        activeMembersCount.textContent = paginationState.allUsers.length;
    }

    if (topContributorsCount) {
        // Count admins as top contributors
        const topContributors = paginationState.allUsers.filter(user => user.isAdmin);
        topContributorsCount.textContent = topContributors.length;
    }
}

// Detect theme changes and update CSS variables
function detectThemeChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateThemeVariables();
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });

    // Also listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeVariables);
    }

    // Initial update
    updateThemeVariables();
}

// Update theme variables based on current theme
function updateThemeVariables() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark') ||
        html.getAttribute('data-theme') === 'dark' ||
        (!html.classList.contains('light') &&
            !html.getAttribute('data-theme') &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Update CSS custom properties dynamically
    const root = document.documentElement.style;

    if (isDark) {
        root.setProperty('--devsync-primary', '#22c55e');
        root.setProperty('--devsync-primary-dark', '#16a34a');
        root.setProperty('--devsync-gradient', 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 1))');
    } else {
        root.setProperty('--devsync-primary', '#059669');
        root.setProperty('--devsync-primary-dark', '#047857');
        root.setProperty('--devsync-gradient', 'linear-gradient(45deg, rgba(5, 150, 105, 0.8), rgba(5, 150, 105, 1))');
    }
}

// Add navigation button
function addNavigationButton() {
    const navButton = document.createElement('div');
    navButton.innerHTML = `
        <div class="projects-nav-trigger" style="
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--devsync-card-bg);
            border: 1px solid var(--devsync-border);
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(20px);
            transition: all 0.3s ease;
            z-index: 100;
            color: var(--devsync-text);
            font-size: 1.5rem;
            box-shadow: 0 4px 15px var(--devsync-shadow);
        " title="DevSync Projects">
            <i class='bx bx-code-alt'></i>
        </div>
    `;

    const button = navButton.firstElementChild;
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.background = 'var(--devsync-primary)';
        button.style.color = 'white';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.background = 'var(--devsync-card-bg)';
        button.style.color = 'var(--devsync-text)';
    });

    button.addEventListener('click', () => {
        const projectsSection = document.querySelector('.devsync-projects-section');
        if (projectsSection) {
            projectsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });

    // Add navigation button after a delay to ensure everything is loaded
    setTimeout(() => {
        document.body.appendChild(button);
    }, 2000);
}

// Include required scripts
function includeRequiredScripts() {
    const requiredScripts = [
        'assets/js/auth.js',
        'assets/js/projects.js',
        'assets/css/global-search.css',
        'assets/js/global-search.js'
    ];

    requiredScripts.forEach(src => {
        if (src.endsWith('.css')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = src;
            document.head.appendChild(link);
        } else {
            const script = document.createElement('script');
            script.src = src;
            document.head.appendChild(script);
        }
    });
}

// Initialize compact community functionality with pagination
function initializeCompactCommunity() {
    loadCommunityData();
}

// Debug function to check if summary elements exist
function checkSummaryElements() {
    const elements = {
        acceptedCount: document.getElementById('acceptedCount'),
        totalCount: document.getElementById('totalCount'),
        communityCount: document.getElementById('communityCount')
    };

    // console.log('📊 Summary Elements Check:');
    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            // console.log(`✅ ${key}: Element found`);
        } else {
            // console.log(`❌ ${key}: Element NOT found`);
        }
    });

    return elements;
}

// Enhanced initialization with better element checking
function initializeProjectSummary() {
    const summaryCards = document.querySelectorAll('.summary-card');

    // console.log(`🎯 Found ${summaryCards.length} summary cards`);

    summaryCards.forEach(card => {
        card.addEventListener('click', function () {
            const tab = this.dataset.tab;
            if (tab === 'community') {
                // Scroll to community section
                const communitySection = document.querySelector('.users-section');
                if (communitySection) {
                    communitySection.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (tab) {
                // Handle tab switching for projects
                const tabButton = document.querySelector(`.tab-button[data-tab="${tab}"]`);
                if (tabButton) {
                    tabButton.click();
                }
            }
        });
    });

    // Check elements before loading data with multiple attempts
    setTimeout(() => {
        checkSummaryElements();
        // Load summary data with retry mechanism
        loadProjectSummaryDataWithRetry();
    }, 200);

    // Backup check after a longer delay
    setTimeout(() => {
        const elements = checkSummaryElements();
        const elementsWithDash = Object.values(elements).filter(el => el && el.textContent === '-');

        if (elementsWithDash.length > 0) {
            // console.log('🔄 Some elements still showing "-", retrying data load...');
            loadProjectSummaryDataWithRetry();
        }
    }, 2000);
}

// Set loading state for statistics
function setLoadingState() {
    const elements = ['acceptedCount', 'totalCount', 'communityCount'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
            element.style.color = 'var(--devsync-primary)';
        }
    });
}

// Clear loading state and set values
function clearLoadingState(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.style.color = '';

        // Add a subtle animation
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }
}

// Load summary data with retry mechanism
async function loadProjectSummaryDataWithRetry(retryCount = 0) {
    const maxRetries = 3;

    try {
        await loadProjectSummaryData();
    } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error);

        if (retryCount < maxRetries) {
            // console.log(`🔄 Retrying in ${(retryCount + 1) * 1000}ms...`);
            setTimeout(() => {
                loadProjectSummaryDataWithRetry(retryCount + 1);
            }, (retryCount + 1) * 1000);
        } else {
            console.error('❌ All retry attempts failed');
            if (window.showToast) {
                window.showToast('Failed to load statistics after multiple attempts', 'error', 5000);
            }
        }
    }
}

// Load project summary data with improved error handling
async function loadProjectSummaryData() {
    // console.log('📊 Loading project summary data...');
    // console.log('🌐 Server URL:', window.serverUrl);

    // Check elements exist before loading
    const elementsCheck = checkSummaryElements();

    // Set loading state
    setLoadingState();

    try {
        // Load accepted projects count
        // console.log('🔄 Fetching accepted projects...');
        const acceptedResponse = await fetch(`${window.serverUrl}/api/accepted-projects`);
        // console.log('📡 Accepted projects response status:', acceptedResponse.status);

        if (acceptedResponse.ok) {
            const acceptedData = await acceptedResponse.json();
            // console.log('📊 Accepted projects data:', acceptedData);
            const acceptedCount = Array.isArray(acceptedData) ? acceptedData.length : 0;
            clearLoadingState('acceptedCount', acceptedCount);
            // console.log(`✅ Accepted projects loaded: ${acceptedCount}`);
        } else {
            console.error('❌ Failed to load accepted projects:', acceptedResponse.status, acceptedResponse.statusText);
            clearLoadingState('acceptedCount', '0');
        }

        // Load total projects count - try multiple endpoints
        let totalCount = 0;

        // First try admin endpoint for all projects
        // console.log('🔄 Trying admin endpoint for total projects...');
        try {
            const adminResponse = await fetch(`${window.serverUrl}/api/admin/projects`, {
                credentials: 'include'
            });
            // console.log('📡 Admin projects response status:', adminResponse.status);

            if (adminResponse.ok) {
                const adminData = await adminResponse.json();
                // console.log('📊 Admin projects data length:', Array.isArray(adminData) ? adminData.length : 'Not array');
                totalCount = Array.isArray(adminData) ? adminData.length : 0;
                // console.log(`✅ Total projects (admin): ${totalCount}`);
            }
        } catch (adminError) {
            // console.log('⚠️ Admin endpoint not accessible:', adminError.message);
        }

        // If admin endpoint fails, try regular projects endpoint
        if (totalCount === 0) {
            // console.log('🔄 Trying regular projects endpoint...');
            try {
                const projectsResponse = await fetch(`${window.serverUrl}/api/projects`);
                // console.log('📡 Regular projects response status:', projectsResponse.status);

                if (projectsResponse.ok) {
                    const projectsData = await projectsResponse.json();
                    // console.log('📊 Regular projects data length:', Array.isArray(projectsData) ? projectsData.length : 'Not array');
                    totalCount = Array.isArray(projectsData) ? projectsData.length : 0;
                    // console.log(`✅ Total projects (regular): ${totalCount}`);
                }
            } catch (projectsError) {
                console.error('❌ Failed to load from projects endpoint:', projectsError);
            }
        }

        // Last resort: try user-specific projects endpoint
        if (totalCount === 0) {
            // console.log('🔄 Trying alternative endpoint for projects count...');
            try {
                // Try to get projects from stats endpoint
                const statsResponse = await fetch(`${window.serverUrl}/api/stats/global`);
                // console.log('📡 Stats response status:', statsResponse.status);

                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    // console.log('📊 Stats data:', statsData);

                    if (statsData.registeredRepos) {
                        totalCount = statsData.registeredRepos;
                        // console.log(`✅ Total projects from stats: ${totalCount}`);
                    }
                }
            } catch (statsError) {
                console.error('❌ Stats endpoint also failed:', statsError);
                // console.log('🎯 Setting fallback count of 0');
                totalCount = 0;
            }
        }

        // Update total count display
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement) {
            totalCountElement.textContent = totalCount;
            // console.log(`✅ Total count displayed: ${totalCount} in element:`, totalCountElement);
        } else {
            console.warn('⚠️ Element #totalCount not found in DOM');
        }

        // Load community count
        // console.log('🔄 Fetching community users...');
        const usersResponse = await fetch(`${window.serverUrl}/api/users`);
        // console.log('📡 Users response status:', usersResponse.status);

        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            // console.log('📊 Users data length:', Array.isArray(usersData) ? usersData.length : 'Not array');
            const communityCountElement = document.getElementById('communityCount');
            const userCount = Array.isArray(usersData) ? usersData.length : 0;

            if (communityCountElement) {
                communityCountElement.textContent = userCount;
                // console.log(`✅ Community count loaded: ${userCount} in element:`, communityCountElement);
            } else {
                console.warn('⚠️ Element #communityCount not found in DOM');
            }
        } else {
            console.error('❌ Failed to load community data:', usersResponse.status, usersResponse.statusText);
            // Set default value
            const communityCountElement = document.getElementById('communityCount');
            if (communityCountElement) {
                communityCountElement.textContent = '0';
                // console.log('⚠️ Set default community count to 0');
            }
        }

        // Final verification - check all elements have values
        setTimeout(() => {
            const finalCheck = {
                acceptedCount: document.getElementById('acceptedCount')?.textContent,
                totalCount: document.getElementById('totalCount')?.textContent,
                communityCount: document.getElementById('communityCount')?.textContent
            };
            // console.log('🔍 Final statistics check:', finalCheck);
        }, 500);

    } catch (error) {
        console.error('❌ Error loading summary data:', error);

        // Set default values for all counters
        const acceptedCount = document.getElementById('acceptedCount');
        const totalCount = document.getElementById('totalCount');
        const communityCount = document.getElementById('communityCount');

        if (acceptedCount) {
            acceptedCount.textContent = '0';
            // console.log('🔧 Set default accepted count to 0');
        }
        if (totalCount) {
            totalCount.textContent = '0';
            // console.log('🔧 Set default total count to 0');
        }
        if (communityCount) {
            communityCount.textContent = '0';
            // console.log('🔧 Set default community count to 0');
        }

        // Show toast notification about the error
        if (window.showToast) {
            window.showToast('Failed to load project statistics', 'warning', 3000);
        }
    }
}

// Load community data with pagination support
async function loadCommunityData() {
    try {
        const response = await fetch(`${window.serverUrl}/api/users`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            paginationState.allUsers = Array.isArray(data) ? data : [];
            paginationState.filteredUsers = [...paginationState.allUsers];
            updateCommunityDisplay();
        } else {
            // Use sample data for demonstration
            paginationState.allUsers = generateSampleUsers();
            paginationState.filteredUsers = [...paginationState.allUsers];
            updateCommunityDisplay();
        }
    } catch (error) {
        // console.log('Failed to load community data, using sample data');
        paginationState.allUsers = generateSampleUsers();
        paginationState.filteredUsers = [...paginationState.allUsers];
        updateCommunityDisplay();
    }
}

// Generate sample users for demonstration
function generateSampleUsers() {
    const sampleUsers = [];
    const sampleData = [
        { name: 'Alex Chen', email: 'alex.chen@example.com', isAdmin: true },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', isAdmin: false },
        { name: 'Mike Rodriguez', email: 'mike.rodriguez@example.com', isAdmin: false },
        { name: 'Emily Wang', email: 'emily.wang@example.com', isAdmin: false },
        { name: 'David Kim', email: 'david.kim@example.com', isAdmin: true },
        { name: 'Jessica Brown', email: 'jessica.brown@example.com', isAdmin: false },
        { name: 'Ryan Martinez', email: 'ryan.martinez@example.com', isAdmin: false },
        { name: 'Lisa Zhang', email: 'lisa.zhang@example.com', isAdmin: false },
        { name: 'Tom Wilson', email: 'tom.wilson@example.com', isAdmin: false },
        { name: 'Anna Garcia', email: 'anna.garcia@example.com', isAdmin: false },
        { name: 'Chris Lee', email: 'chris.lee@example.com', isAdmin: false },
        { name: 'Maya Patel', email: 'maya.patel@example.com', isAdmin: true },
        { name: 'Jake Taylor', email: 'jake.taylor@example.com', isAdmin: false },
        { name: 'Sophie Miller', email: 'sophie.miller@example.com', isAdmin: false },
        { name: 'Ben Anderson', email: 'ben.anderson@example.com', isAdmin: false },
        { name: 'Rachel Green', email: 'rachel.green@example.com', isAdmin: false },
        { name: 'Kevin Liu', email: 'kevin.liu@example.com', isAdmin: false },
        { name: 'Amy Thompson', email: 'amy.thompson@example.com', isAdmin: false },
        { name: 'Daniel Park', email: 'daniel.park@example.com', isAdmin: false },
        { name: 'Zoe Adams', email: 'zoe.adams@example.com', isAdmin: false },
        { name: 'Marcus Davis', email: 'marcus.davis@example.com', isAdmin: false },
        { name: 'Olivia Moore', email: 'olivia.moore@example.com', isAdmin: false },
        { name: 'Nathan Hall', email: 'nathan.hall@example.com', isAdmin: false },
        { name: 'Grace Wong', email: 'grace.wong@example.com', isAdmin: true },
        { name: 'Tyler Reed', email: 'tyler.reed@example.com', isAdmin: false }
    ];

    for (let i = 0; i < sampleData.length; i++) {
        const userData = sampleData[i];
        const username = userData.name.toLowerCase().replace(' ', '_');

        sampleUsers.push({
            id: i + 1,
            displayName: userData.name,
            username: username,
            email: userData.email,
            isAdmin: userData.isAdmin,
            avatarUrl: `assets/img/avatars/avatar-${(i % 10) + 1}.png`,
            createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    return sampleUsers;
}

// Show user details modal
function showUserDetails(userId) {
    const user = paginationState.allUsers.find(u => u.id == userId || u.username === userId);
    if (!user) return;

    const modalContent = `
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <img src="${user.avatar_url || 'assets/img/avatars/default.png'}" 
                 alt="${user.username}" 
                 style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--devsync-primary);"
                 onerror="this.src='assets/img/avatars/default.png'">
            <div>
                <h4 style="margin: 0; color: var(--devsync-text);">${user.username}</h4>
                <p style="margin: 0; color: var(--devsync-text-muted); font-size: 0.9rem;">${user.total_points || 0} points</p>
            </div>
        </div>
        <div style="color: var(--devsync-text-muted); line-height: 1.6;">
            <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
            <p><strong>Last Active:</strong> ${new Date(user.last_active || user.created_at).toLocaleDateString()}</p>
            ${user.github_username ? `<p><strong>GitHub:</strong> <a href="https://github.com/${user.github_username}" target="_blank" style="color: var(--devsync-primary);">@${user.github_username}</a></p>` : ''}
        </div>
    `;

    window.showCustomModal(`${user.username}'s Profile`, modalContent);
}

// Make showUserDetails available globally
window.showUserDetails = showUserDetails;

// Open GitHub profile in new tab
function openGitHubProfile(githubUsername) {
    if (githubUsername && githubUsername !== 'unknown') {
        const githubUrl = `https://github.com/${githubUsername}`;
        window.open(githubUrl, '_blank', 'noopener,noreferrer');
    } else {
        // Show toast notification if no GitHub username available
        if (window.showToast) {
            window.showToast('GitHub profile not available for this user', 'info');
        }
    }
}

// Make openGitHubProfile available globally
window.openGitHubProfile = openGitHubProfile;

// console.log('DevSync Projects Integration initialized successfully!');

// Enhance tab switching with animations
const enhanceTabSwitching = () => {
    const tabButtons = document.querySelectorAll('.devsync-projects-container .tab-button');
    const tabContents = document.querySelectorAll('.devsync-projects-container .tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Add loading animation
            tabContents.forEach(content => {
                if (content.classList.contains('active')) {
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        content.classList.remove('active');
                    }, 150);
                }
            });

            // Show new tab with animation
            setTimeout(() => {
                const newTab = document.getElementById(targetTab + 'Section');
                if (newTab) {
                    newTab.classList.add('active');
                    newTab.style.opacity = '0';
                    newTab.style.transform = 'translateY(20px)';

                    setTimeout(() => {
                        newTab.style.opacity = '1';
                        newTab.style.transform = 'translateY(0)';
                    }, 50);
                }
            }, 150);

            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
};

// Initialize enhanced tab switching after a short delay
setTimeout(enhanceTabSwitching, 1000);

// Enhanced Toast Notification System (imported from projects.js)
window.showToast = function (message, type = 'info', duration = 5000) {
    // Ensure toast container exists with proper styling
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
    }

    const iconMap = {
        success: 'bx-check-circle',
        error: 'bx-error-circle',
        warning: 'bx-error',
        info: 'bx-info-circle'
    };

    const colorMap = {
        success: {
            bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
            color: '#047857',
            border: 'rgba(16, 185, 129, 0.2)',
            icon: '#10b981'
        },
        error: {
            bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
            color: '#dc2626',
            border: 'rgba(239, 68, 68, 0.2)',
            icon: '#ef4444'
        },
        warning: {
            bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
            color: '#d97706',
            border: 'rgba(245, 158, 11, 0.2)',
            icon: '#f59e0b'
        },
        info: {
            bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05))',
            color: '#0891b2',
            border: 'rgba(6, 182, 212, 0.2)',
            icon: '#06b6d4'
        }
    };

    const colors = colorMap[type] || colorMap.info;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.style.cssText = `
        background: ${colors.bg};
        backdrop-filter: blur(20px);
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid ${colors.border};
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        min-width: 320px;
        max-width: 400px;
        color: ${colors.color};
        cursor: pointer;
    `;

    toast.innerHTML = `
        <div class="toast__content" style="
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <i class="bx ${iconMap[type] || iconMap.info} toast__icon" style="
                font-size: 20px;
                flex-shrink: 0;
                color: ${colors.icon};
            "></i>
            <span class="toast__message" style="
                flex: 1;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.4;
            ">${message}</span>
            <button class="toast__close" style="
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s ease;
                color: inherit;
            ">
                <i class="bx bx-x" style="font-size: 16px;"></i>
            </button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Show toast with animation
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 100);

    // Auto remove
    const autoRemove = setTimeout(() => {
        removeToast(toast);
    }, duration);

    // Add hover effects
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
    });

    // Toast hover effect
    toast.addEventListener('mouseenter', () => {
        toast.style.transform = 'translateX(-5px) scale(1.02)';
    });
    toast.addEventListener('mouseleave', () => {
        toast.style.transform = 'translateX(0) scale(1)';
    });

    // Manual close
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(autoRemove);
        removeToast(toast);
    });

    // Click toast to close
    toast.addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeToast(toast);
    });

    return toast;
};

function removeToast(toast) {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 400);
}

// Add CSS for toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .toast {
        cursor: pointer;
    }
    
    .toast:hover {
        background: rgba(255, 255, 255, 0.15) !important;
    }
`;
document.head.appendChild(toastStyles);

// Initialize intersection observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe project cards for scroll animations
setTimeout(() => {
    const cards = document.querySelectorAll('.project-card, .admin-project-card, .user-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}, 2000);

// console.log('DevSync Projects Integration initialized successfully!');

// Add custom modal system for better integration
window.showCustomModal = function (title, content, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: var(--main-light, #fff);">${title}</h3>
                <button class="modal-close" style="
                    background: none;
                    border: none;
                    color: var(--main-light, #fff);
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div style="margin-bottom: 1.5rem; color: rgba(255, 255, 255, 0.8);">
                ${content}
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="modal-cancel button" style="background: rgba(255, 255, 255, 0.1);">Cancel</button>
                <button class="modal-confirm button" style="background: linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 1));">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add click handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('.modal-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('.modal-confirm').addEventListener('click', () => {
        if (callback) callback(true);
        document.body.removeChild(modal);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
};

// Demo functions for testing enhanced modals and toasts
window.showDemoToast = function (type, message) {
    if (window.showToast) {
        window.showToast(message, type, 4000);
    } else {
        // console.log('Toast function not available');
    }
};

window.showDemoModal = function () {
    if (window.showCustomModal) {
        window.showCustomModal(
            'Enhanced Modal Demo',
            `
                <div style="text-align: left; margin: 1rem 0;">
                    <p style="margin-bottom: 1rem;">This is an example of our enhanced modal system with:</p>
                    <ul style="margin: 0; padding-left: 1.5rem; color: var(--devsync-text-muted);">
                        <li>Proper positioning and z-index</li>
                        <li>Beautiful backdrop blur effects</li>
                        <li>Smooth animations and transitions</li>
                        <li>Responsive design for all devices</li>
                        <li>Modern, elegant styling</li>
                        <li>Click-outside-to-close functionality</li>
                    </ul>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--devsync-text-muted);">
                        Perfect for project submissions, confirmations, and user interactions!
                    </p>
                </div>
            `,
            () => {
                window.showToast('Modal closed successfully! 👍', 'success', 3000);
            }
        );
    } else {
        alert('Modal function not available');
    }
};
