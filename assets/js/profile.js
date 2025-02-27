async function fetchUserProfile() {
    try {
        const response = await fetch('http://localhost:3000/api/user', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch detailed GitHub data
        const githubResponse = await fetch(`https://api.github.com/users/${data.user.username}`);
        const githubData = await githubResponse.json();

        // Load contribution graph
        document.getElementById('contribution-graph').src = `https://ghchart.rshah.org/${data.user.username}`;

        // Update profile information
        document.getElementById('profile-img').src = githubData.avatar_url;
        document.getElementById('profile-name').textContent = githubData.name || githubData.login;
        document.getElementById('profile-bio').textContent = githubData.bio || '';
        
        // Update additional profile details
        document.getElementById('profile-location').textContent = githubData.location || 'Not specified';
        document.getElementById('profile-company').textContent = githubData.company || 'Not specified';
        document.getElementById('profile-blog').href = githubData.blog;
        document.getElementById('profile-blog').textContent = githubData.blog || 'Not specified';
        document.getElementById('profile-twitter').textContent = githubData.twitter_username || 'Not specified';
        
        // Update stats with animations
        updateStatWithAnimation('repos', githubData.public_repos);
        updateStatWithAnimation('followers', githubData.followers);
        updateStatWithAnimation('following', githubData.following);
        
        // Fetch and display activities
        fetchActivities(data.user.username);

        // Add this line after loading the other profile data
        await fetchRecentMerges(data.user.username);

        // Fetch additional GitHub activities
        await Promise.all([
            fetchPushEvents(data.user.username),
            fetchPullRequests(data.user.username),
            fetchIssues(data.user.username)
        ]);

    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

// Add this new function for animated stat updates
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

async function fetchActivities(username) {
    try {
        const response = await fetch(`http://localhost:3000/api/github/activity/${username}`);
        const activities = await response.json();
        displayActivities(activities);
    } catch (error) {
        console.error('Failed to load activities:', error);
    }
}

function displayActivities(activities) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = activities.map(activity => {
        const icon = getActivityIcon(activity.type);
        const time = new Date(activity.created_at).toLocaleDateString();
        
        return `
            <div class="activity__item" data-type="${activity.type.toLowerCase()}">
                <div class="activity__header">
                    <i class="bx ${icon} activity__icon"></i>
                    <span class="activity__time">${time}</span>
                </div>
                <h3 class="activity__title">${activity.title}</h3>
                <a href="${activity.repo_url}" class="activity__repo" target="_blank">
                    ${activity.repo_name}
                </a>
                ${activity.description ? 
                    `<p class="activity__description">${activity.description}</p>` : 
                    ''}
            </div>
        `;
    }).join('');
}

function getActivityIcon(type) {
    const icons = {
        'push': 'bx-git-repo-forked',
        'pr': 'bx-git-pull-request',
        'issue': 'bx-message-square-detail',
        'default': 'bx-code-alt'
    };
    return icons[type.toLowerCase()] || icons.default;
}

// Filter activities
document.addEventListener('DOMContentLoaded', () => {
    const filters = document.querySelectorAll('.activity__filter');
    
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Update active filter
            filters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            
            // Filter activities
            const type = filter.dataset.filter;
            const items = document.querySelectorAll('.activity__item');
            
            items.forEach(item => {
                if (type === 'all' || item.dataset.type === type) {
                    item.style.display = 'grid';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Initial load
    fetchUserProfile().then(() => {
        initializeAnimations();
    });
});

// Remove initializeAnimations function that used GSAP
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

// Update stat hover animations to use CSS only
const stats = document.querySelectorAll('.stat');
stats.forEach(stat => {
    stat.addEventListener('mouseenter', () => {
        gsap.to(stat, {
            y: -10,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    stat.addEventListener('mouseleave', () => {
        gsap.to(stat, {
            y: 0,
            duration: 0.3,
            ease: "power2.out"
        });
    });
});

async function fetchRecentMerges(username) {
    try {
        // First fetch user's repositories
        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`);
        const repos = await reposResponse.json();

        // Get recent commits from each repo
        const mergePromises = repos.map(async repo => {
            try {
                const commitsResponse = await fetch(
                    `https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=10`
                );
                const commits = await commitsResponse.json();
                return commits.map(commit => ({
                    ...commit,
                    repo: repo.name,
                    repo_url: repo.html_url
                }));
            } catch (error) {
                console.error(`Error fetching commits for ${repo.name}:`, error);
                return [];
            }
        });

        const allMerges = await Promise.all(mergePromises);
        const merges = allMerges
            .flat()
            .sort((a, b) => new Date(b.commit.author.date) - new Date(a.commit.author.date))
            .slice(0, 10); // Show only the 10 most recent merges

        displayMerges(merges);
    } catch (error) {
        console.error('Error fetching merges:', error);
    }
}

function displayMerges(merges) {
    const timelineContainer = document.getElementById('merges-timeline');
    timelineContainer.innerHTML = merges.map((merge, index) => {
        const date = new Date(merge.commit.author.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="merge-item" style="animation-delay: ${index * 0.2}s">
                <div class="merge-content">
                    <div class="merge-header">
                        <img src="${merge.author?.avatar_url || 'assets/img/default-avatar.png'}" 
                             alt="${merge.commit.author.name}" 
                             class="merge-avatar">
                        <div class="merge-info">
                            <div class="merge-author">${merge.commit.author.name}</div>
                            <div class="merge-date">${date}</div>
                        </div>
                    </div>
                    <h3 class="merge-title">${merge.commit.message}</h3>
                    <a href="${merge.repo_url}" class="merge-repo" target="_blank">
                        <i class='bx bx-git-repo-forked'></i>
                        ${merge.repo}
                    </a>
                </div>
            </div>
        `;
    }).join('');

    // Add intersection observer for animation
    const mergeItems = document.querySelectorAll('.merge-item');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    mergeItems.forEach(item => observer.observe(item));
}

async function fetchPushEvents(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}/events`);
        const events = await response.json();
        const pushEvents = events.filter(event => event.type === 'PushEvent');
        displayPushEvents(pushEvents.slice(0, 5));
    } catch (error) {
        console.error('Failed to fetch push events:', error);
    }
}

async function fetchPullRequests(username) {
    try {
        const response = await fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}`);
        const data = await response.json();
        displayPullRequests(data.items.slice(0, 5));
    } catch (error) {
        console.error('Failed to fetch pull requests:', error);
    }
}

async function fetchIssues(username) {
    try {
        const response = await fetch(`https://api.github.com/search/issues?q=type:issue+author:${username}`);
        const data = await response.json();
        displayIssues(data.items.slice(0, 5));
    } catch (error) {
        console.error('Failed to fetch issues:', error);
    }
}

function displayPushEvents(events) {
    const container = document.querySelector('.activities-grid');
    const pushSection = createActivitySection('Recent Pushes', events, (event) => `
        <div class="activity-card push-card">
            <div class="activity-card__header">
                <i class='bx bx-git-commit activity-card__icon'></i>
                <span class="activity-card__date">${formatDate(event.created_at)}</span>
            </div>
            <h4 class="activity-card__title">${event.repo.name}</h4>
            <div class="activity-card__commits">
                ${event.payload.commits?.map(commit => `
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

function displayPullRequests(prs) {
    const container = document.querySelector('.activities-grid');
    const prSection = createActivitySection('Pull Requests', prs, (pr) => `
        <div class="activity-card pr-card">
            <div class="activity-card__header">
                <i class='bx bx-git-pull-request activity-card__icon'></i>
                <span class="activity-card__status ${pr.state}">${pr.state}</span>
                <span class="activity-card__date">${formatDate(pr.created_at)}</span>
            </div>
            <h4 class="activity-card__title">
                <a href="${pr.html_url}" target="_blank">${pr.title}</a>
            </h4>
            <p class="activity-card__repo">${pr.repository_url.split('/').slice(-1)}</p>
        </div>
    `);
    container.appendChild(prSection);
}

function displayIssues(issues) {
    const container = document.querySelector('.activities-grid');
    const issueSection = createActivitySection('Issues', issues, (issue) => `
        <div class="activity-card issue-card">
            <div class="activity-card__header">
                <i class='bx bx-error-circle activity-card__icon'></i>
                <span class="activity-card__status ${issue.state}">${issue.state}</span>
                <span class="activity-card__date">${formatDate(issue.created_at)}</span>
            </div>
            <h4 class="activity-card__title">
                <a href="${issue.html_url}" target="_blank">${issue.title}</a>
            </h4>
            <p class="activity-card__repo">${issue.repository_url.split('/').slice(-1)}</p>
            ${issue.labels.length ? `
                <div class="activity-card__labels">
                    ${issue.labels.map(label => `
                        <span class="label" style="background: #${label.color}">${label.name}</span>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `);
    container.appendChild(issueSection);
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
