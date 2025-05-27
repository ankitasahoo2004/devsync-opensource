class AdminSearch {
    constructor() {
        this.isOpen = false;
        this.currentFilter = 'all';
        this.searchData = {
            users: [],
            prs: [],
            repos: [],
            events: []
        };
        this.currentHighlighted = -1;
        this.debounceTimer = null;

        this.init();
    }

    init() {
        this.createSearchOverlay();
        this.bindEvents();
        this.loadSearchData();
    }

    createSearchOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'admin-search-overlay';
        overlay.innerHTML = `
            <div class="admin-search-container">
                <div class="admin-search-header">
                    <i class='bx bx-search admin-search-icon'></i>
                    <input 
                        type="text" 
                        class="admin-search-input" 
                        placeholder="Search users, PRs, repositories, events..."
                        autocomplete="off"
                        spellcheck="false"
                    >
                    <div class="admin-search-shortcut">ESC</div>
                </div>
                
                <div class="admin-search-filters">
                    <div class="admin-filter-chip active" data-filter="all">
                        <i class='bx bx-globe'></i> All
                    </div>
                    <div class="admin-filter-chip" data-filter="users">
                        <i class='bx bx-user'></i> Users
                    </div>
                    <div class="admin-filter-chip" data-filter="prs">
                        <i class='bx bx-git-pull-request'></i> Pull Requests
                    </div>
                    <div class="admin-filter-chip" data-filter="repos">
                        <i class='bx bx-git-repo-forked'></i> Repositories
                    </div>
                    <div class="admin-filter-chip" data-filter="events">
                        <i class='bx bx-calendar'></i> Events
                    </div>
                </div>
                
                <div class="admin-search-results">
                    <div class="admin-search-empty">
                        <div class="admin-search-empty-icon">
                            <i class='bx bx-search'></i>
                        </div>
                        <div class="admin-search-empty-title">Start typing to search</div>
                        <div class="admin-search-empty-subtitle">Search across users, pull requests, repositories, and events</div>
                    </div>
                </div>
                
                <div class="admin-search-shortcuts">
                    <div class="admin-search-shortcut-group">
                        <div class="admin-search-shortcut-item">
                            <span class="admin-search-shortcut-key">↑↓</span>
                            <span>Navigate</span>
                        </div>
                        <div class="admin-search-shortcut-item">
                            <span class="admin-search-shortcut-key">↵</span>
                            <span>Select</span>
                        </div>
                        <div class="admin-search-shortcut-item">
                            <span class="admin-search-shortcut-key">ESC</span>
                            <span>Close</span>
                        </div>
                    </div>
                    <div class="admin-search-shortcut-item">
                        <span>DevSync Admin Search</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.container = overlay.querySelector('.admin-search-container');
        this.input = overlay.querySelector('.admin-search-input');
        this.results = overlay.querySelector('.admin-search-results');
    }

    bindEvents() {
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const shortcutKey = isMac ? e.metaKey : e.altKey;

            if (shortcutKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                this.open();
            }

            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Search input
        this.input.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Filter chips
        this.overlay.addEventListener('click', (e) => {
            if (e.target.closest('.admin-filter-chip')) {
                const chip = e.target.closest('.admin-filter-chip');
                this.setFilter(chip.dataset.filter);
            }
        });

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Result clicks
        this.results.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.admin-search-result-item');
            if (resultItem) {
                this.handleResultClick(resultItem);
            }
        });
    }

    async loadSearchData() {
        try {
            const [usersRes, prsRes, reposRes, eventsRes] = await Promise.all([
                fetch(`${serverUrl}/api/users`, { credentials: 'include' }),
                fetch(`${serverUrl}/api/admin/all-prs`, { credentials: 'include' }),
                fetch(`${serverUrl}/api/admin/projects`, { credentials: 'include' }),
                fetch(`${serverUrl}/api/events`, { credentials: 'include' })
            ]);

            this.searchData = {
                users: await usersRes.json(),
                prs: await prsRes.json(),
                repos: await reposRes.json(),
                events: await eventsRes.json()
            };
        } catch (error) {
            console.error('Failed to load search data:', error);
        }
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focus input after animation
        setTimeout(() => {
            this.input.focus();
        }, 100);

        // Refresh data when opening
        this.loadSearchData();
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.overlay.classList.remove('show');
        document.body.style.overflow = '';
        this.input.value = '';
        this.currentHighlighted = -1;
        this.showEmptyState();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update filter chips
        this.overlay.querySelectorAll('.admin-filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });

        // Re-run search with current input
        this.handleSearch(this.input.value);
    }

    handleSearch(query) {
        clearTimeout(this.debounceTimer);

        if (!query.trim()) {
            this.showEmptyState();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, 150);
    }

    performSearch(query) {
        const results = this.searchInData(query);
        this.displayResults(results, query);
        this.currentHighlighted = -1;
    }

    searchInData(query) {
        const searchTerm = query.toLowerCase();
        const results = {
            users: [],
            prs: [],
            repos: [],
            events: []
        };

        // Search users
        if (this.currentFilter === 'all' || this.currentFilter === 'users') {
            results.users = this.searchData.users.filter(user =>
                user.username.toLowerCase().includes(searchTerm) ||
                (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm))
            );
        }

        // Search PRs
        if (this.currentFilter === 'all' || this.currentFilter === 'prs') {
            results.prs = this.searchData.prs.filter(pr =>
                pr.title.toLowerCase().includes(searchTerm) ||
                pr.username.toLowerCase().includes(searchTerm) ||
                pr.repository.toLowerCase().includes(searchTerm) ||
                pr.status.toLowerCase().includes(searchTerm)
            );
        }

        // Search repositories
        if (this.currentFilter === 'all' || this.currentFilter === 'repos') {
            results.repos = this.searchData.repos.filter(repo =>
                repo.repoLink.toLowerCase().includes(searchTerm) ||
                repo.ownerName.toLowerCase().includes(searchTerm) ||
                repo.description.toLowerCase().includes(searchTerm) ||
                repo.technology.some(tech => tech.toLowerCase().includes(searchTerm)) ||
                repo.reviewStatus.toLowerCase().includes(searchTerm)
            );
        }

        // Search events
        if (this.currentFilter === 'all' || this.currentFilter === 'events') {
            results.events = this.searchData.events.filter(event =>
                event.name.toLowerCase().includes(searchTerm) ||
                event.type.toLowerCase().includes(searchTerm) ||
                event.mode.toLowerCase().includes(searchTerm) ||
                (event.venue && event.venue.toLowerCase().includes(searchTerm)) ||
                (event.description && event.description.toLowerCase().includes(searchTerm))
            );
        }

        return results;
    }

    displayResults(results, query) {
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

        if (totalResults === 0) {
            this.showNoResults(query);
            return;
        }

        let html = '';

        // Users section
        if (results.users.length > 0) {
            html += this.createResultsSection('Users', 'bx-user', results.users.map(user =>
                this.createUserResult(user, query)
            ));
        }

        // PRs section
        if (results.prs.length > 0) {
            html += this.createResultsSection('Pull Requests', 'bx-git-pull-request', results.prs.map(pr =>
                this.createPRResult(pr, query)
            ));
        }

        // Repositories section
        if (results.repos.length > 0) {
            html += this.createResultsSection('Repositories', 'bx-git-repo-forked', results.repos.map(repo =>
                this.createRepoResult(repo, query)
            ));
        }

        // Events section
        if (results.events.length > 0) {
            html += this.createResultsSection('Events', 'bx-calendar', results.events.map(event =>
                this.createEventResult(event, query)
            ));
        }

        this.results.innerHTML = html;
    }

    createResultsSection(title, icon, items) {
        return `
            <div class="admin-search-category">
                <h3 class="admin-search-category-title">
                    <i class='bx ${icon} admin-category-icon'></i>
                    ${title}
                </h3>
            </div>
            ${items.join('')}
        `;
    }

    createUserResult(user, query) {
        return `
            <div class="admin-search-result-item" data-type="user" data-id="${user._id}" data-username="${user.username}">
                <img src="${user.avatarUrl}" alt="${user.username}" class="admin-search-result-avatar">
                <div class="admin-search-result-content">
                    <div class="admin-search-result-title">${this.highlightText(user.displayName || user.username, query)}</div>
                    <div class="admin-search-result-subtitle">@${this.highlightText(user.username, query)} • ${this.highlightText(user.email, query)}</div>
                </div>
                <div class="admin-search-result-meta">
                    ${user.isAdmin ? '<div class="admin-search-result-badge">Admin</div>' : ''}
                    <div class="admin-search-result-info">User</div>
                </div>
            </div>
        `;
    }

    createPRResult(pr, query) {
        return `
            <div class="admin-search-result-item" data-type="pr" data-id="${pr._id}" data-username="${pr.username}">
                <div class="admin-search-result-icon">
                    <i class='bx bx-git-pull-request'></i>
                </div>
                <div class="admin-search-result-content">
                    <div class="admin-search-result-title">${this.highlightText(pr.title, query)}</div>
                    <div class="admin-search-result-subtitle">${this.highlightText(pr.repository, query)} • by @${this.highlightText(pr.username, query)}</div>
                </div>
                <div class="admin-search-result-meta">
                    <div class="admin-search-result-badge ${pr.status}">${pr.status.toUpperCase()}</div>
                    <div class="admin-search-result-info">#${pr.prNumber}</div>
                </div>
            </div>
        `;
    }

    createRepoResult(repo, query) {
        const repoName = repo.repoLink.split('/').pop();
        return `
            <div class="admin-search-result-item" data-type="repo" data-id="${repo._id}">
                <div class="admin-search-result-icon">
                    <i class='bx bx-git-repo-forked'></i>
                </div>
                <div class="admin-search-result-content">
                    <div class="admin-search-result-title">${this.highlightText(repoName, query)}</div>
                    <div class="admin-search-result-subtitle">${this.highlightText(repo.ownerName, query)} • ${repo.technology.slice(0, 2).join(', ')}</div>
                </div>
                <div class="admin-search-result-meta">
                    <div class="admin-search-result-badge ${repo.reviewStatus}">${repo.reviewStatus.toUpperCase()}</div>
                    <div class="admin-search-result-info">${repo.successPoints || 50} pts</div>
                </div>
            </div>
        `;
    }

    createEventResult(event, query) {
        return `
            <div class="admin-search-result-item" data-type="event" data-id="${event._id}">
                <div class="admin-search-result-icon">
                    <i class='bx bx-calendar'></i>
                </div>
                <div class="admin-search-result-content">
                    <div class="admin-search-result-title">${this.highlightText(event.name, query)}</div>
                    <div class="admin-search-result-subtitle">${new Date(event.date).toLocaleDateString()} • ${this.highlightText(event.type, query)}</div>
                </div>
                <div class="admin-search-result-meta">
                    <div class="admin-search-result-badge">${event.mode.toUpperCase()}</div>
                    <div class="admin-search-result-info">${event.filledSlots}/${event.totalSlots}</div>
                </div>
            </div>
        `;
    }

    highlightText(text, query) {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="admin-search-highlight">$1</span>');
    }

    showEmptyState() {
        this.results.innerHTML = `
            <div class="admin-search-empty">
                <div class="admin-search-empty-icon">
                    <i class='bx bx-search'></i>
                </div>
                <div class="admin-search-empty-title">Start typing to search</div>
                <div class="admin-search-empty-subtitle">Search across users, pull requests, repositories, and events</div>
            </div>
        `;
    }

    showNoResults(query) {
        this.results.innerHTML = `
            <div class="admin-search-empty">
                <div class="admin-search-empty-icon">
                    <i class='bx bx-search-alt-2'></i>
                </div>
                <div class="admin-search-empty-title">No results found</div>
                <div class="admin-search-empty-subtitle">Try adjusting your search or filters for "${query}"</div>
            </div>
        `;
    }

    handleKeyNavigation(e) {
        const items = this.results.querySelectorAll('.admin-search-result-item');

        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentHighlighted = Math.min(this.currentHighlighted + 1, items.length - 1);
                this.updateHighlight(items);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.currentHighlighted = Math.max(this.currentHighlighted - 1, 0);
                this.updateHighlight(items);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.currentHighlighted >= 0 && items[this.currentHighlighted]) {
                    this.handleResultClick(items[this.currentHighlighted]);
                }
                break;
        }
    }

    updateHighlight(items) {
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.currentHighlighted);
        });

        // Scroll highlighted item into view
        if (this.currentHighlighted >= 0 && items[this.currentHighlighted]) {
            items[this.currentHighlighted].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    handleResultClick(resultItem) {
        const type = resultItem.dataset.type;
        const id = resultItem.dataset.id;
        const username = resultItem.dataset.username;

        this.close();

        // Navigate to appropriate section or perform action based on result type
        switch (type) {
            case 'user':
                this.navigateToUserPRs(username);
                break;
            case 'pr':
                this.navigateToUserPRs(username);
                break;
            case 'repo':
                this.navigateToRepos();
                break;
            case 'event':
                this.navigateToEvents();
                break;
        }
    }

    navigateToUserPRs(username) {
        // Switch to pending section and open user modal
        const pendingMenuItem = document.querySelector('.menu-item[data-section="pending"]');
        if (pendingMenuItem) {
            pendingMenuItem.click();

            // Wait for data to load then open user modal
            setTimeout(() => {
                const userCard = document.querySelector(`[data-username="${username}"]`);
                if (userCard) {
                    userCard.click();
                }
            }, 1000);
        }
    }

    navigateToRepos() {
        const reposMenuItem = document.querySelector('.menu-item[data-section="repos"]');
        if (reposMenuItem) {
            reposMenuItem.click();
        }
    }

    navigateToEvents() {
        // Navigate to events page
        window.location.href = 'events.html';
    }
}

// Initialize admin search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-dashboard')) {
        window.adminSearch = new AdminSearch();
    }
});
