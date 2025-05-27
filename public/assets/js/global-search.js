class GlobalSearch {
    constructor() {
        this.isOpen = false;
        this.currentHighlight = -1;
        this.searchResults = [];
        this.searchTimeout = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    init() {
        this.createSearchOverlay();
        this.bindEvents();
    }

    createSearchOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'global-search-overlay';
        overlay.id = 'globalSearchOverlay';

        overlay.innerHTML = `
            <div class="global-search-container">
                <div class="global-search-header">
                    <i class="bx bx-search search-icon"></i>
                    <input 
                        type="text" 
                        class="global-search-input" 
                        id="globalSearchInput"
                        placeholder="Search users, projects, or repositories..."
                        autocomplete="off"
                        spellcheck="false"
                    >
                    <span class="search-shortcut">ESC</span>
                </div>
                <div class="global-search-results" id="globalSearchResults">
                    ${this.getInitialContent()}
                </div>
                <div class="search-shortcuts">
                    <div class="search-shortcut-group">
                        <div class="search-shortcut-item">
                            <span class="search-shortcut-key">↑↓</span>
                            <span>Navigate</span>
                        </div>
                        <div class="search-shortcut-item">
                            <span class="search-shortcut-key">Enter</span>
                            <span>Select</span>
                        </div>
                    </div>
                    <div class="search-shortcut-group">
                        <div class="search-shortcut-item">
                            <span class="search-shortcut-key">ESC</span>
                            <span>Close</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.input = overlay.querySelector('#globalSearchInput');
        this.results = overlay.querySelector('#globalSearchResults');
    }

    getInitialContent() {
        return `
            <div class="search-empty">
                <div class="search-empty-icon">
                    <i class="bx bx-search-alt"></i>
                </div>
                <div class="search-empty-title">Search DevSync</div>
                <div class="search-empty-subtitle">Find users, projects, and repositories</div>
            </div>
        `;
    }

    bindEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt+F or Cmd+F to open search
            if ((e.altKey && e.key === 'f') || (e.metaKey && e.key === 'f')) {
                e.preventDefault();
                this.open();
            }

            // ESC to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }

            // Navigation when search is open
            if (this.isOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateResults(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateResults(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectHighlighted();
                }
            }
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Search input events
        this.input.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Focus input when overlay is clicked
        this.overlay.querySelector('.global-search-container').addEventListener('click', (e) => {
            if (!this.input.contains(e.target)) {
                this.input.focus();
            }
        });
    }

    open() {
        this.isOpen = true;
        this.overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focus input after animation
        setTimeout(() => {
            this.input.focus();
        }, 100);

        // Load recent searches or trending content
        this.loadInitialContent();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('show');
        document.body.style.overflow = '';
        this.input.value = '';
        this.currentHighlight = -1;
        this.searchResults = [];

        // Reset to initial content
        setTimeout(() => {
            this.results.innerHTML = this.getInitialContent();
        }, 300);
    }

    async loadInitialContent() {
        if (this.input.value.trim()) return;

        try {
            this.showLoading();

            // Load trending users or recent activity
            const [users, projects] = await Promise.all([
                this.fetchTopUsers(),
                this.fetchRecentProjects()
            ]);

            this.displayTrendingContent(users, projects);
        } catch (error) {
            console.error('Error loading initial content:', error);
            this.results.innerHTML = this.getInitialContent();
        }
    }

    async fetchTopUsers() {
        const cacheKey = 'top-users';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch('/api/leaderboard');
            const users = await response.json();
            const topUsers = users.slice(0, 5);

            this.setCache(cacheKey, topUsers);
            return topUsers;
        } catch (error) {
            console.error('Error fetching top users:', error);
            return [];
        }
    }

    async fetchRecentProjects() {
        const cacheKey = 'recent-projects';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch('/api/accepted-projects');
            const projects = await response.json();
            const recentProjects = projects.slice(0, 3);

            this.setCache(cacheKey, recentProjects);
            return recentProjects;
        } catch (error) {
            console.error('Error fetching recent projects:', error);
            return [];
        }
    }

    displayTrendingContent(users, projects) {
        let html = '';

        if (users.length > 0) {
            html += `
                <div class="search-category">
                    <h3 class="search-category-title">Top Contributors</h3>
                </div>
            `;

            users.forEach(user => {
                html += this.createUserResultItem(user, true);
            });
        }

        if (projects.length > 0) {
            html += `
                <div class="search-category">
                    <h3 class="search-category-title">Recent Projects</h3>
                </div>
            `;

            projects.forEach(project => {
                html += this.createProjectResultItem(project, true);
            });
        }

        this.results.innerHTML = html || this.getInitialContent();
        this.bindResultEvents();
    }

    handleSearch(query) {
        clearTimeout(this.searchTimeout);

        if (!query.trim()) {
            this.loadInitialContent();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    async performSearch(query) {
        try {
            this.showLoading();
            this.currentHighlight = -1;

            const [users, projects] = await Promise.all([
                this.searchUsers(query),
                this.searchProjects(query)
            ]);

            this.searchResults = [
                ...users.map(u => ({ ...u, type: 'user' })),
                ...projects.map(p => ({ ...p, type: 'project' }))
            ];

            this.displaySearchResults(users, projects, query);
        } catch (error) {
            console.error('Search error:', error);
            this.showError();
        }
    }

    async searchUsers(query) {
        try {
            const response = await fetch('/api/leaderboard');
            const users = await response.json();

            return users.filter(user =>
                user.username.toLowerCase().includes(query.toLowerCase()) ||
                (user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 10);
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    async searchProjects(query) {
        try {
            const response = await fetch('/api/accepted-projects');
            const projects = await response.json();

            return projects.filter(project =>
                project.repoLink.toLowerCase().includes(query.toLowerCase()) ||
                project.ownerName.toLowerCase().includes(query.toLowerCase()) ||
                project.description.toLowerCase().includes(query.toLowerCase()) ||
                project.technology.some(tech => tech.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 10);
        } catch (error) {
            console.error('Error searching projects:', error);
            return [];
        }
    }

    displaySearchResults(users, projects, query) {
        let html = '';

        if (users.length === 0 && projects.length === 0) {
            html = `
                <div class="search-empty">
                    <div class="search-empty-icon">
                        <i class="bx bx-search-alt-2"></i>
                    </div>
                    <div class="search-empty-title">No results found</div>
                    <div class="search-empty-subtitle">Try searching for something else</div>
                </div>
            `;
        } else {
            if (users.length > 0) {
                html += `
                    <div class="search-category">
                        <h3 class="search-category-title">Users (${users.length})</h3>
                    </div>
                `;

                users.forEach(user => {
                    html += this.createUserResultItem(user, false, query);
                });
            }

            if (projects.length > 0) {
                html += `
                    <div class="search-category">
                        <h3 class="search-category-title">Projects (${projects.length})</h3>
                    </div>
                `;

                projects.forEach(project => {
                    html += this.createProjectResultItem(project, false, query);
                });
            }
        }

        this.results.innerHTML = html;
        this.bindResultEvents();
    }

    createUserResultItem(user, isTrending = false, query = '') {
        const avatar = `https://github.com/${user.username}.png`;
        const title = this.highlightText(user.username, query);
        const subtitle = `${user.points} points • ${user.mergedPRs?.length || 0} PRs`;
        const badge = isTrending ? 'Trending' : this.getUserBadge(user);

        return `
            <div class="search-result-item" data-type="user" data-username="${user.username}">
                <img src="${avatar}" alt="${user.username}" class="search-result-avatar">
                <div class="search-result-content">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-subtitle">${subtitle}</div>
                </div>
                <div class="search-result-meta">
                    ${badge ? `<div class="search-result-badge">${badge}</div>` : ''}
                    <div class="search-result-points">${user.points} pts</div>
                </div>
            </div>
        `;
    }

    createProjectResultItem(project, isTrending = false, query = '') {
        const title = this.highlightText(project.repoLink.split('/').pop(), query);
        const subtitle = `by ${project.ownerName} • ${project.technology.join(', ')}`;
        const badge = isTrending ? 'Recent' : 'Project';

        return `
            <div class="search-result-item" data-type="project" data-url="${project.repoLink}">
                <div class="search-result-avatar" style="background: linear-gradient(135deg, #FF3366, #FF6B6B); display: flex; align-items: center; justify-content: center;">
                    <i class="bx bx-git-repo-forked" style="color: white; font-size: 20px;"></i>
                </div>
                <div class="search-result-content">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-subtitle">${subtitle}</div>
                </div>
                <div class="search-result-meta">
                    <div class="search-result-badge">${badge}</div>
                </div>
            </div>
        `;
    }

    getUserBadge(user) {
        if (user.rank === 1) return '🏆 #1';
        if (user.rank <= 3) return '🥉 Top 3';
        if (user.rank <= 10) return '⭐ Top 10';
        return null;
    }

    highlightText(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    bindResultEvents() {
        const items = this.results.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectResult(item);
            });

            item.addEventListener('mouseenter', () => {
                this.currentHighlight = index;
                this.updateHighlight();
            });
        });
    }

    navigateResults(direction) {
        const items = this.results.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        this.currentHighlight += direction;

        if (this.currentHighlight < 0) {
            this.currentHighlight = items.length - 1;
        } else if (this.currentHighlight >= items.length) {
            this.currentHighlight = 0;
        }

        this.updateHighlight();
        this.scrollToHighlighted();
    }

    updateHighlight() {
        const items = this.results.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.currentHighlight);
        });
    }

    scrollToHighlighted() {
        const highlighted = this.results.querySelector('.search-result-item.highlighted');
        if (highlighted) {
            highlighted.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    selectHighlighted() {
        const highlighted = this.results.querySelector('.search-result-item.highlighted');
        if (highlighted) {
            this.selectResult(highlighted);
        }
    }

    selectResult(item) {
        const type = item.dataset.type;

        if (type === 'user') {
            const username = item.dataset.username;
            this.navigateToUser(username);
        } else if (type === 'project') {
            const url = item.dataset.url;
            this.navigateToProject(url);
        }

        this.close();
    }

    navigateToUser(username) {
        // Navigate to user profile or leaderboard with user highlighted
        window.location.href = `/leaderboard.html#${username}`;
    }

    navigateToProject(url) {
        // Open project in new tab
        window.open(url, '_blank');
    }

    showLoading() {
        this.results.innerHTML = `
            <div class="search-loading">
                <div class="search-loading-spinner"></div>
                <div class="search-loading-text">Searching...</div>
            </div>
        `;
    }

    showError() {
        this.results.innerHTML = `
            <div class="search-empty">
                <div class="search-empty-icon">
                    <i class="bx bx-error"></i>
                </div>
                <div class="search-empty-title">Search Error</div>
                <div class="search-empty-subtitle">Please try again later</div>
            </div>
        `;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.globalSearch = new GlobalSearch();
});

// Add CSS for search highlight
const style = document.createElement('style');
style.textContent = `
    .search-highlight {
        background: rgba(255, 235, 59, 0.4);
        padding: 1px 2px;
        border-radius: 2px;
        font-weight: 600;
    }
`;
document.head.appendChild(style);
