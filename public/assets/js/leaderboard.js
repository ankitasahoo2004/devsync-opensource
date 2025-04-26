// Global stats update
async function updateGlobalStats() {
    try {
        const response = await fetch(`${serverUrl}/api/stats/global`);
        const stats = await response.json();

        document.querySelector('#globalStats').innerHTML = `
            <div class="stat">
                <h3>${stats.totalMergedPRs}</h3>
                <p>Total Merged PRs</p>
            </div>
            <div class="stat">
                <h3>${stats.activeUsers}</h3>
                <p>Active Users</p>
            </div>
            <div class="stat">
                <h3>${stats.registeredRepos}</h3>
                <p>Registered Repos</p>
            </div>
        `;
    } catch (error) {
        console.error('Error updating global stats:', error);
    }
}

// Sort users based on points and merge timestamps
function sortUsersByPointsAndMerges(users) {
    return users.sort((a, b) => {
        // First sort by points
        if (b.points !== a.points) {
            return b.points - a.points;
        }

        // If points are equal, sort by most recent merge
        const latestMergeA = a.mergedPRs.length > 0 ?
            Math.max(...a.mergedPRs.map(pr => new Date(pr.mergedAt).getTime())) : 0;
        const latestMergeB = b.mergedPRs.length > 0 ?
            Math.max(...b.mergedPRs.map(pr => new Date(pr.mergedAt).getTime())) : 0;

        return latestMergeB - latestMergeA;
    });
}

// Simplified search function
function searchLeaderboard(searchTerm, users) {
    if (!searchTerm) return users;
    const searchString = searchTerm.toLowerCase();
    return users.filter(user => {
        const searchString = searchTerm.toLowerCase();
        // Search by username
        if (user.username.toLowerCase().includes(searchString)) return true;

        // Search by points
        if (user.points.toString().includes(searchString)) return true;

        return false;
    });
}

// Leaderboard update function
async function updateLeaderboard(timeRange = 'all', filterBy = 'points') {
    try {
        const response = await fetch(`${serverUrl}/api/leaderboard`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();

        // Debug logging
        console.log('Fetched users:', users);

        if (!users || users.length === 0) {
            document.getElementById('leaderboardList').innerHTML = `
                <div class="no-data">No users found</div>
            `;
            document.getElementById('topWinners').innerHTML = `
                <div class="no-data">No winners yet</div>
            `;
            return;
        }

        // Update top 3 winners
        const winnersHtml = renderTopWinners(users.slice(0, 3));
        document.getElementById('topWinners').innerHTML = winnersHtml;

        // Update remaining leaderboard
        const leaderboardHtml = renderLeaderboardList(users.slice(3));
        document.getElementById('leaderboardList').innerHTML = leaderboardHtml;

        // Store users globally for search
        window.leaderboardUsers = users;

        // Update DOM with initial data
        updateLeaderboardDisplay(users);
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        handleLeaderboardError(error);
    }
}

// Add function to update leaderboard display
function updateLeaderboardDisplay(users, isSearching = false) {
    // Always show top 3 winners
    const winners = window.leaderboardUsers ? window.leaderboardUsers.slice(0, 3) : users.slice(0, 3);
    document.getElementById('topWinners').innerHTML = renderTopWinners(winners);

    if (isSearching) {
        // During search, show all users in list format with original ranks
        const leaderboardHtml = users.map(user => renderLeaderboardItem(user, true)).join('');
        document.getElementById('leaderboardList').innerHTML = leaderboardHtml;
    } else {
        // Normal display of remaining users
        const remainingUsers = users.slice(3);
        document.getElementById('leaderboardList').innerHTML = renderLeaderboardList(remainingUsers);
    }
}

function renderTopWinners(winners) {
    if (winners.length === 0) return '';

    const positions = ['second', 'first', 'third'];
    const [first, second, third] = winners;

    return `
        ${second ? renderWinnerCard(second, 'second', 2) : ''}
        ${renderWinnerCard(first, 'first', 1)}
        ${third ? renderWinnerCard(third, 'third', 3) : ''}
    `;
}

function renderWinnerCard(user, position, rank) {
    const essentialBadges = getEssentialBadges(user.badges);
    return `
        <div class="winner-card ${position}" data-user="${user.username}">
            <div class="winner-medal">
                <i class='bx ${rank === 1 ? 'bxs-crown' : 'bx-medal'}'></i>
            </div>
            <img src="https://github.com/${user.username}.png" 
                 alt="${user.username}" 
                 class="winner-img"
                 onerror="this.src='assets/img/default-avatar.png'">
            <div class="winner-content">
                <h3>${user.username}</h3>
                <div class="stats">
                    <div class="points">
                        <span class="points-value">${user.points}</span>
                        <span class="points-label">points</span>
                    </div>
                    <div class="divider"></div>
                    <div class="merges">
                        <span class="merges-value">${user.mergedPRs.length}</span>
                        <span class="merges-label">merges</span>
                    </div>
                </div>
                <div class="badges">
                    ${essentialBadges.map(badge => `<span class="badge">${badge.split('|')[0]}</span>`).join('')}
                </div>
            </div>
            ${renderTrendIndicator(user.trend)}
        </div>
    `;
}

function renderLeaderboardList(users) {
    if (users.length === 0) return '<div class="no-data">No users found</div>';

    // First 10 runners-up (positions 4-13)
    const runnersUp = users.slice(0, 10);
    const remainingUsers = users.slice(10);

    return `
        <div class="runners-up-grid">
            ${runnersUp.map((user, index) => `
                <div class="runner-up-card" data-user="${user.username}">
                    <span class="rank">#${user.rank || index + 4}</span>
                    <img src="https://github.com/${user.username}.png" 
                         alt="${user.username}" 
                         class="user-img"
                         onerror="this.src='assets/img/default-avatar.png'">
                    <div class="user-info">
                        <h4>${user.username}</h4>
                        <div class="user-stats">
                            <span class="stat-item">
                                <i class='bx bx-trophy'></i>
                                ${user.points}
                            </span>
                            <span class="stat-divider">•</span>
                            <span class="stat-item">
                                <i class='bx bx-git-merge'></i>
                                ${user.mergedPRs.length}
                            </span>
                        </div>
                        <div class="badges-container">
                            ${getEssentialBadges(user.badges).map(badge => `<span class="badge">${badge.split('|')[0]}</span>`).join('')}
                        </div>
                    </div>
                    ${renderTrendIndicator(user.trend)}
                </div>
            `).join('')}
        </div>
        <div class="leaderboard-list">
            ${remainingUsers.map(user => renderLeaderboardItem(user)).join('')}
        </div>
    `;
}

function renderLeaderboardItem(user, isSearchResult = false) {
    return `
        <div class="leaderboard-item" data-user="${user.username}">
            <span class="rank">#${user.rank}</span>
            <div class="user-profile">
                <img src="https://github.com/${user.username}.png" 
                     alt="${user.username}" 
                     class="user-img"
                     onerror="this.src='assets/img/default-avatar.png'">
                <div class="user-info">
                    <h4>${user.username}</h4>
                    <div class="user-stats">
                        <span class="stat-item">
                            <i class='bx bx-trophy'></i>
                            ${user.points}
                        </span>
                        <span class="stat-divider">•</span>
                        <span class="stat-item">
                            <i class='bx bx-git-merge'></i>
                            ${user.mergedPRs.length}
                        </span>
                    </div>
                    <div class="badges-container">
                        ${getEssentialBadges(user.badges).map(badge => `<span class="badge">${badge.split('|')[0]}</span>`).join('')}
                    </div>
                </div>
            </div>
            ${renderTrendIndicator(user.trend)}
        </div>
    `;
}

function handleLeaderboardError(error) {
    const errorHtml = `
        <div class="error-message">
            <i class='bx bx-error-circle'></i>
            <p>Failed to load leaderboard</p>
            <small>${error.message}</small>
            <button onclick="updateLeaderboard()" class="retry-button">
                <i class='bx bx-refresh'></i> Retry
            </button>
        </div>
    `;

    document.getElementById('leaderboardList').innerHTML = errorHtml;
    document.getElementById('topWinners').innerHTML = '';
}

function renderTrendIndicator(trend) {
    if (trend === 0) return '';
    const isPositive = trend > 0;
    return `
        <span class="trend ${isPositive ? 'up' : 'down'}">
            <i class='bx bx-${isPositive ? 'up' : 'down'}-arrow-alt'></i>
            ${Math.abs(trend)}%
        </span>
    `;
}

// Add function to toggle merge list visibility
function toggleMerges(id) {
    const mergeList = document.getElementById(id);
    const button = mergeList.previousElementSibling;
    const icon = button.querySelector('i');

    mergeList.classList.toggle('hidden');
    if (mergeList.classList.contains('hidden')) {
        icon.classList.replace('bx-chevron-up', 'bx-chevron-down');
    } else {
        icon.classList.replace('bx-chevron-down', 'bx-chevron-up');
    }
}

// Add helper functions
function getEssentialBadges(badges) {
    const levelBadge = badges.find(badge => badge.includes('|'));
    const contributionBadge = badges.find(badge =>
        ['First Contribution', 'Active Contributor', 'Super Contributor'].includes(badge)
    );
    return [levelBadge, contributionBadge].filter(Boolean);
}

function getLevelImage(levelBadge) {
    if (!levelBadge || !levelBadge.includes('|')) return null;
    const badgeName = levelBadge.split('|')[0].trim();
    const levelMap = {
        'Cursed Newbie': 'level1',
        'Graveyard Shifter': 'level2',
        'Night Stalker': 'level3',
        'Skeleton of Structure': 'level4',
        'Phantom Architect': 'level5',
        'Haunted Debugger': 'level6',
        'Lord of Shadows': 'level7',
        'Dark Sorcerer': 'level8',
        'Demon Crafter': 'level9',
        'Eternal Revenge': 'level10'
    };
    return levelMap[badgeName] ? `assets/img/badges/levels/${levelMap[badgeName]}.png` : null;
}

function createBadgePreviewPopup(badgeImage, badgeName) {
    const popup = document.createElement('div');
    popup.className = 'badge-preview-popup';
    popup.innerHTML = `
        <div class="badge-preview-content">
            <img src="${badgeImage}" alt="${badgeName}" class="badge-preview-img">
            <h3 class="badge-preview-title">${badgeName}</h3>
            <button class="close-popup close-preview">&times;</button>
        </div>
    `;
    return popup;
}

function createUserDetailPopup(user) {
    const popup = document.createElement('div');
    popup.className = 'badge-popup user-detail-popup';
    popup.innerHTML = `
        <div class="badge-popup-content">
            <div class="badge-popup-header">
                <div class="user-header-info">
                    <img src="https://github.com/${user.username}.png" 
                         alt="${user.username}" 
                         class="popup-user-img"
                         onerror="this.src='assets/img/default-avatar.png'">
                    <div class="user-header-text">
                        <h3>${user.username}</h3>
                        <div class="user-stats-summary">
                            <span><i class='bx bx-trophy'></i> ${user.points} points</span>
                            <span><i class='bx bx-git-merge'></i> ${user.mergedPRs.length} merges</span>
                        </div>
                    </div>
                </div>
                <button class="close-popup">&times;</button>
            </div>
            
            <div class="user-detail-content">
                <div class="badges-section">
                    <h4>Achievements</h4>
                    <div class="badge-grid">
                        ${user.badges.map(badge => {
        const [name, description] = badge.split('|').map(s => s.trim());
        const levelImage = getLevelImage(badge);
        return `
                                <div class="badge-item ${levelImage ? 'level-badge' : 'contrib-badge'}">
                                    ${levelImage ?
                `<img src="${levelImage}" 
                                             alt="${name}" 
                                             class="badge-icon"
                                             onclick="event.stopPropagation(); 
                                                     const preview = createBadgePreviewPopup('${levelImage}', '${name}');
                                                     document.body.appendChild(preview);
                                                     setTimeout(() => preview.classList.add('show'), 10);"
                                             style="cursor: pointer">` :
                `<i class='bx bx-medal'></i>`
            }
                                    <div class="badge-info">
                                        <span class="badge-name">${name}</span>
                                        ${description ? `<span class="badge-description">${description}</span>` : ''}
                                    </div>
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>

                <div class="prs-section">
                    <h4>Recent Contributions</h4>
                    <div class="pr-grid">
                        ${user.mergedPRs.slice(0, 5).map(pr => `
                            <div class="pr-item">
                                <div class="pr-header">
                                    <i class='bx bx-git-pull-request'></i>
                                    <span class="pr-date">${new Date(pr.mergedAt).toLocaleDateString()}</span>
                                </div>
                                <div class="pr-title">${pr.title}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    return popup;
}

// Modify the click event listener to handle badge preview popup closing
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalStats();
    updateLeaderboard();

    const searchInput = document.getElementById('leaderboardSearch');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value;
            const filteredUsers = searchLeaderboard(searchTerm, window.leaderboardUsers || []);
            updateLeaderboardDisplay(filteredUsers, searchTerm.length > 0);
        }, 300);
    });

    // Auto-update every 5 minutes
    setInterval(() => {
        updateGlobalStats();
        updateLeaderboard();
    }, 10 * 60 * 1000);

    // Add user detail popup functionality
    document.addEventListener('click', (e) => {
        const userCard = e.target.closest('.winner-card, .leaderboard-item, .runner-up-card');
        if (userCard) {
            const username = userCard.dataset.user;
            const user = window.leaderboardUsers.find(u => u.username === username);
            if (user) {
                const popup = createUserDetailPopup(user);
                document.body.appendChild(popup);
                setTimeout(() => popup.classList.add('show'), 10);
            }
        }

        if (e.target.classList.contains('close-popup') || e.target.classList.contains('close-preview')) {
            const popup = e.target.closest('.badge-popup, .badge-preview-popup');
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }
    });
});

// Initialize leaderboard
document.addEventListener('DOMContentLoaded', () => {
    // Initial updates
    updateGlobalStats();
    updateLeaderboard();

    // Add filter event listeners
    const filterBtns = document.querySelectorAll('.filter-btn');
    const timeRange = document.getElementById('timeRange');

    // Add search functionality
    const searchInput = document.getElementById('leaderboardSearch');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value;
            const filteredUsers = searchLeaderboard(searchTerm, window.leaderboardUsers || []);
            updateLeaderboardDisplay(filteredUsers, searchTerm.length > 0);
        }, 300);
    });

    // Auto-update every 5 minutes
    setInterval(() => {
        updateGlobalStats();
        updateLeaderboard(
            timeRange.value,
            document.querySelector('.filter-btn.active').dataset.filter
        );
    }, 5 * 60 * 1000);
});
