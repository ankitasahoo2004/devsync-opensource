document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const authContainer = document.getElementById('authContainer');
    const projectsContainer = document.getElementById('projectsContainer');

    // Add this at the top level of the DOMContentLoaded callback
    let currentUser = null;

    // Add filter state tracking
    const filterState = {
        admin: 'all',
        view: 'all'
    };

    // Add refresh function
    const refreshProjectsView = async (section) => {
        try {
            const container = section === 'admin' ?
                document.getElementById('adminProjectsGrid') :
                document.getElementById('userProjectsGrid');

            if (!container) return;

            const endpoint = section === 'admin' ?
                `${serverUrl}/api/admin/projects` :
                `${serverUrl}/api/projects/${currentUser.id}`;

            const response = await fetch(endpoint, { credentials: 'include' });
            const projects = await response.json();

            // Apply current filter
            const filteredProjects = filterState[section] === 'all' ?
                projects :
                projects.filter(project => project.reviewStatus === filterState[section]);

            // Update grid with filtered projects
            container.innerHTML = section === 'admin' ?
                renderAdminProjects(filteredProjects) :
                renderProjects(filteredProjects);

            // Update active filter button
            const filterBtns = container.closest('.projects-container, .admin-container')
                .querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filterState[section]);
            });
        } catch (error) {
            console.error(`Error refreshing ${section} projects:`, error);
        }
    };

    // Tab handling
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const targetSection = document.getElementById(`${tabName}Section`);
            targetSection.classList.add('active');

            // Refresh projects when switching to view tab
            if (tabName === 'view' && currentUser) {
                await refreshProjectsView('view');
            }
        });
    });

    const deleteProject = async (projectId) => {
        showModal('confirm', 'Delete Project', 'Are you sure you want to delete this project?', async (confirmed) => {
            if (!confirmed) return;

            try {
                const response = await fetch(`${serverUrl}/api/projects/${projectId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                const data = await response.json();

                if (response.ok) {
                    const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
                    if (projectCard) {
                        projectCard.style.opacity = '0';
                        projectCard.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            projectCard.remove();
                            if (!document.querySelector('.project-card')) {
                                projectsContainer.innerHTML = '<p class="no-projects">No projects submitted yet.</p>';
                            }
                        }, 300);
                    }
                    showModal('success', 'Success', 'Project deleted successfully!');
                    await refreshProjectsView('view');
                } else {
                    throw new Error(data.error || 'Failed to delete project');
                }
            } catch (error) {
                showModal('error', 'Error', error.message || 'Failed to delete project. Please try again.');
            }
        });
    };

    const displayUserProjects = async (userId) => {
        try {
            const response = await fetch(`${serverUrl}/api/projects/${userId}`, {
                credentials: 'include'
            });
            const projects = await response.json();

            projectsContainer.innerHTML = `
                <div class="filter-container">
                    <button class="filter-btn active" data-filter="all">
                        <i class='bx bx-list-ul'></i> All
                    </button>
                    <button class="filter-btn" data-filter="pending">
                        <i class='bx bx-time-five'></i> In Review
                    </button>
                    <button class="filter-btn" data-filter="accepted">
                        <i class='bx bx-check-circle'></i> Accepted
                    </button>
                    <button class="filter-btn" data-filter="rejected">
                        <i class='bx bx-x-circle'></i> Rejected
                    </button>
                </div>
                <div class="search-container">
                    <input type="text" 
                           class="search-bar" 
                           placeholder="Search by repository name, owner, or technology..."
                           id="userProjectSearch">
                </div>
                <div class="projects-grid" id="userProjectsGrid">
                    ${renderProjects(projects)}
                </div>
            `;

            // Add event delegation for view repository buttons
            projectsContainer.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-repo');
                if (viewBtn) {
                    const repoUrl = viewBtn.dataset.url;
                    showModal('confirm', 'View Repository', 'Would you like to visit this repository on GitHub?', (confirmed) => {
                        if (confirmed) {
                            window.open(repoUrl, '_blank');
                        }
                    });
                }
            });

            // Add filter functionality
            const filterBtns = projectsContainer.querySelectorAll('.filter-btn');
            const projectsGrid = document.getElementById('userProjectsGrid');

            filterBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const filterValue = btn.dataset.filter;
                    filterState.view = filterValue; // Update state
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    await refreshProjectsView('view');
                });
            });

            // Add search functionality
            const searchBar = document.getElementById('userProjectSearch');
            let debounceTimer;

            searchBar.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredProjects = projects.filter(project =>
                        project.repoLink.toLowerCase().includes(searchTerm) ||
                        project.ownerName.toLowerCase().includes(searchTerm) ||
                        project.technology.some(tech => tech.toLowerCase().includes(searchTerm))
                    );

                    projectsGrid.innerHTML = filteredProjects.length ?
                        renderProjects(filteredProjects) :
                        '<p class="no-results">No matching projects found</p>';
                }, 300);
            });
        } catch (error) {
            console.error('Error fetching user projects:', error);
            projectsContainer.innerHTML = '<p class="error-message">Failed to load projects.</p>';
        }
    };

    const getReviewStatusIcon = (status) => {
        const icons = {
            pending: '<i class="bx bx-time-five"></i>',
            accepted: '<i class="bx bx-check-circle"></i>',
            rejected: '<i class="bx bx-x-circle"></i>'
        };
        return icons[status] || icons.pending;
    };

    const getReviewStatusText = (status) => {
        const texts = {
            pending: 'Pending Review',
            accepted: 'Project Accepted',
            rejected: 'Project Rejected'
        };
        return texts[status] || texts.pending;
    };

    const reviewProject = async (projectId, status) => {
        try {
            if (status === 'rejected') {
                // Create rejection reason modal
                const modal = document.createElement('div');
                modal.className = 'modal';
                const overlay = document.createElement('div');
                overlay.className = 'modal__overlay';

                modal.innerHTML = `
                    <div class="modal__content">
                        <h3 class="modal__title">Provide Rejection Reason</h3>
                        <textarea class="modal__textarea" 
                                placeholder="Please provide a detailed reason for rejection..."
                                rows="4"></textarea>
                        <div class="modal__actions">
                            <button class="modal__button modal__button--confirm">Submit</button>
                            <button class="modal__button modal__button--cancel">Cancel</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(overlay);
                document.body.appendChild(modal);

                setTimeout(() => {
                    modal.classList.add('show');
                    overlay.classList.add('show');
                }, 10);

                // Handle rejection reason submission
                return new Promise((resolve, reject) => {
                    const submitBtn = modal.querySelector('.modal__button--confirm');
                    const cancelBtn = modal.querySelector('.modal__button--cancel');
                    const textarea = modal.querySelector('.modal__textarea');

                    submitBtn.addEventListener('click', async () => {
                        const rejectionReason = textarea.value.trim();
                        if (!rejectionReason) {
                            textarea.classList.add('error');
                            return;
                        }
                        modal.remove();
                        overlay.remove();
                        await processReview(projectId, status, rejectionReason);
                        resolve();
                    });

                    cancelBtn.addEventListener('click', () => {
                        modal.remove();
                        overlay.remove();
                        reject(new Error('Review cancelled'));
                    });

                    textarea.addEventListener('input', () => {
                        textarea.classList.remove('error');
                    });
                });
            } else {
                await processReview(projectId, status);
            }
        } catch (error) {
            removeExistingModals();
            showModal('error', 'Error', error.message || 'Failed to review project');
        }
    };

    const processReview = async (projectId, status, rejectionReason) => {
        // Show loading modal
        showModal('loading', 'Processing...', 'Sending email notification...');

        const response = await fetch(`${serverUrl}/api/admin/projects/${projectId}/review`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status,
                rejectionReason
            })
        });

        if (!response.ok) {
            throw new Error('Failed to review project');
        }

        const data = await response.json();

        // Remove loading modal
        removeExistingModals();

        // Show success modal
        if (status === 'accepted') {
            showModal('success', 'Project Accepted!', 'Project owner has been notified via email.');
        } else {
            showModal('success', 'Project Rejected', 'Project owner has been notified via email.');
        }

        // Refresh both sections with current filters
        await Promise.all([
            refreshProjectsView('admin'),
            refreshProjectsView('view')
        ]);
    };

    const showProjectForm = () => {
        authContainer.innerHTML = `
            <form id="projectForm" class="project-form">
                <div class="form-group">
                    <label for="repoLink">Repository Link</label>
                    <input type="url" id="repoLink" name="repoLink" required 
                           placeholder="https://github.com/username/repository">
                </div>

                <div class="form-group">
                    <label for="ownerName">Repository Owner</label>
                    <input type="text" id="ownerName" name="ownerName" required 
                           placeholder="GitHub Username">
                </div>

                <div class="form-group">
                    <label for="techInput">Technologies Used</label>
                    <div class="tech-input-container">
                        <div class="tech-chips-wrapper" id="techChipsWrapper">
                            <input type="text" id="techInput" class="tech-input" 
                                   placeholder="Type to add technologies...">
                        </div>
                        <div class="tech-suggestions" id="techSuggestions"></div>
                    </div>
                    <input type="hidden" id="technology" name="technology" required>
                </div>

                <div class="form-group">
                    <label for="description">Project Description</label>
                    <textarea id="description" name="description" required 
                              placeholder="Describe your project and what kind of contributors you're looking for..."></textarea>
                </div>

                <div class="terms-section">
                    <div class="terms-checkbox-container">
                        <input type="checkbox" id="termsAccepted" required>
                        <label for="termsAccepted">I have read and agree to the 
                            <a href="#" id="showTermsBtn">Terms & Conditions and Project Submission Policy</a>
                        </label>
                    </div>
                </div>

                <button type="submit" class="submit-button" disabled>
                    <i class='bx bx-upload'></i>
                    Submit Project
                </button>
            </form>
        `;

        // Initialize chip input functionality
        initializeTechChips();
        initializeTermsAndConditions();

        // Initialize form submission handler
        document.getElementById('projectForm').addEventListener('submit', handleSubmit);
    };

    const initializeTechChips = () => {
        const wrapper = document.getElementById('techChipsWrapper');
        const input = document.getElementById('techInput');
        const suggestionsDiv = document.getElementById('techSuggestions');
        const hiddenInput = document.getElementById('technology');
        const selectedTechs = new Set();

        const technologies = [
            'Mobile App', 'Web App', 'Desktop App', 'Mac App', 'Windows App', 'Linux App', 'Browser Extension', 'Wearable App', 'Smart TV App', 'IoT Device App', 'Game', 'Command-Line Tool', 'AI', 'Machine Learning', 'Deep Learning', 'Augmented Reality', 'Virtual Reality', 'Blockchain', 'Cybersecurity', 'Cloud Computing', 'Big Data', 'Data Analytics', 'DevOps', 'Robotics', 'Edge Computing', 'Quantum Computing', '3D Modeling', 'Voice Assistant', 'Speech Recognition', 'Automation', 'RPA', 'API', 'SDK', 'Microservices', 'Serverless Application', 'Chatbot', 'SaaS', 'PaaS', 'IoT Platform', 'Embedded System', 'Progressive Web App', 'Hybrid Mobile App', 'Cross-Platform App', 'Single Page Application', 'Static Site', 'Dynamic Web App', 'Backend Service', 'REST API', 'GraphQL API', 'gRPC Service', 'Desktop Widget', 'Electron App', 'Flutter App', 'React Native App', 'PWA', 'Smart Home App', 'Automotive App', 'VR Game', 'AR Game', 'Mobile Game', 'Cloud Function', 'Lambda Function', 'Edge Service', 'Streaming App', 'Video Conferencing App', 'Data Visualization App', 'E-commerce Platform', 'CRM System', 'ERP System', 'CMS', 'Headless CMS', 'Data Lake', 'Data Warehouse', 'ETL Pipeline', 'BI Dashboard', 'Recommendation Engine', 'Image Recognition', 'Natural Language Processing', 'Computer Vision', 'Predictive Analytics', 'Sentiment Analysis', 'Face Detection', 'Speech Synthesis', 'OCR', 'Anomaly Detection', 'FinTech App', 'HealthTech App', 'EdTech App', 'HRTech App', 'Social Media Platform', 'Marketplace Platform', 'Supply Chain Platform', 'Digital Wallet', 'Payment Gateway', 'API Gateway', 'Containerized App', 'Kubernetes Service', 'Monitoring Tool', 'Logging Tool', 'CI Tool', 'CD Tool', 'Load Balancer', 'Reverse Proxy', 'Firewall', 'VPN App', 'Encryption Service', 'Digital Signature Service', 'Identity Provider', 'SSO Service', 'Other'
        ];

        const addChip = (tech) => {
            if (selectedTechs.has(tech)) return;

            const chip = document.createElement('div');
            chip.className = 'tech-chip';
            chip.innerHTML = `
                ${tech}
                <span class="remove-chip" data-tech="${tech}">×</span>
            `;
            wrapper.insertBefore(chip, input);
            selectedTechs.add(tech);
            updateHiddenInput();
        };

        const removeChip = (tech) => {
            const chip = wrapper.querySelector(`[data-tech="${tech}"]`).parentElement;
            chip.remove();
            selectedTechs.delete(tech);
            updateHiddenInput();
        };

        const updateHiddenInput = () => {
            hiddenInput.value = Array.from(selectedTechs).join(',');
        };

        const showSuggestions = (query) => {
            const filtered = technologies.filter(tech =>
                tech.toLowerCase().includes(query.toLowerCase()) &&
                !selectedTechs.has(tech)
            );

            if (filtered.length === 0 || !query) {
                suggestionsDiv.classList.remove('active');
                return;
            }

            suggestionsDiv.innerHTML = filtered
                .map(tech => `<div class="suggestion-item" data-tech="${tech}">${tech}</div>`)
                .join('');
            suggestionsDiv.classList.add('active');
        };

        // Event Listeners
        input.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });

        input.addEventListener('keydown', (e) => {
            const suggestions = suggestionsDiv.querySelectorAll('.suggestion-item');
            const selected = suggestionsDiv.querySelector('.selected');
            let nextSelected;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (!suggestionsDiv.classList.contains('active')) {
                        showSuggestions(input.value);
                        return;
                    }
                    if (!selected) {
                        nextSelected = suggestions[0];
                    } else {
                        const next = Array.from(suggestions).indexOf(selected) + 1;
                        nextSelected = suggestions[next] || suggestions[0];
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (!selected) {
                        nextSelected = suggestions[suggestions.length - 1];
                    } else {
                        const prev = Array.from(suggestions).indexOf(selected) - 1;
                        nextSelected = suggestions[prev] || suggestions[suggestions.length - 1];
                    }
                    break;

                case 'Enter':
                    if (selected) {
                        e.preventDefault();
                        addChip(selected.dataset.tech);
                        input.value = '';
                        suggestionsDiv.classList.remove('active');
                    }
                    break;

                case 'Escape':
                    suggestionsDiv.classList.remove('active');
                    break;
            }

            if (nextSelected) {
                selected?.classList.remove('selected');
                nextSelected.classList.add('selected');
                nextSelected.scrollIntoView({ block: 'nearest' });
            }
        });

        suggestionsDiv.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                addChip(item.dataset.tech);
                input.value = '';
                suggestionsDiv.classList.remove('active');
                input.focus();
            }
        });

        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-chip')) {
                removeChip(e.target.dataset.tech);
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                suggestionsDiv.classList.remove('active');
            }
        });
    };

    const showLoginPrompt = () => {
        authContainer.innerHTML = `
            <div class="auth-prompt">
                <h3>Please log in to submit a project</h3>
                <a href="${serverUrl}/auth/github" class="button">
                    <i class='bx bxl-github'></i> Login with GitHub
                </a>
            </div>
        `;
    };

    const isValidGithubUrl = (url) => {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname === 'github.com' &&
                parsedUrl.pathname.split('/').length === 3;
        } catch {
            return false;
        }
    };

    const checkRepoAccessibility = async (repoLink) => {
        try {
            const [owner, repo] = repoLink.split('/').slice(-2);

            // First try to use GitHub API to verify
            try {
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);

                // Handle rate limit errors
                if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
                    console.warn('GitHub API rate limit reached, falling back to direct URL check');
                    // Fall back to a direct URL check if rate limited
                    const htmlResponse = await fetch(repoLink);
                    if (!htmlResponse.ok) {
                        throw new Error('Repository not found or inaccessible');
                    }
                    return true;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error('Repository not found or inaccessible');
                }

                if (data.private) {
                    throw new Error('Repository must be public');
                }

                return true;
            } catch (apiError) {
                // If it's a rate limit error, try direct URL access as fallback
                if (apiError.message.includes('rate limit')) {
                    const htmlResponse = await fetch(repoLink);
                    if (!htmlResponse.ok) {
                        throw new Error('Repository not found or inaccessible');
                    }
                    return true;
                }
                throw apiError;
            }
        } catch (error) {
            throw new Error(error.message || 'Failed to verify repository accessibility');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const repoLink = form.repoLink.value.trim();
        const technologies = form.technology.value.split(',').filter(Boolean);

        try {
            // Show loading modal
            showModal('loading', 'Submitting Project...', 'Please wait while we process your submission.');

            // Validate GitHub URL format
            if (!isValidGithubUrl(repoLink)) {
                removeExistingModals();
                setTimeout(() => {
                    showModal('error', 'Error!', 'Invalid GitHub repository URL. Please provide a valid GitHub repository link.');
                }, 300);
                return;
            }

            // Check if repository is accessible and public
            await checkRepoAccessibility(repoLink);

            const formData = {
                repoLink: repoLink,
                ownerName: form.ownerName.value,
                technology: technologies,
                description: form.description.value
            };

            const response = await fetch(`${serverUrl}/api/projects`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showModal('success', 'Success!', 'Project submitted successfully!', async () => {
                    form.reset();
                    // Switch to view tab and refresh projects
                    const viewTabButton = document.querySelector('[data-tab="view"]');
                    viewTabButton.click();
                });
            } else {
                throw new Error(data.error || 'Failed to submit project');
            }
        } catch (error) {
            removeExistingModals();
            setTimeout(() => {
                showModal('error', 'Error!', error.message || 'Failed to submit project. Please try again.');
            }, 300);
        }
    };

    const initializeTermsAndConditions = () => {
        const submitButton = document.querySelector('.submit-button');
        const termsCheckbox = document.getElementById('termsAccepted');
        const showTermsBtn = document.getElementById('showTermsBtn');

        // Terms content
        const terms = {
            projectPolicy: [
                "All submitted projects must be public GitHub repositories.",
                "Projects must have clear documentation and README files.",
                "Projects must not contain malicious code or violate any laws.",
                "Submissions must be original work or have proper licenses.",
                "Project maintainers are responsible for reviewing and managing contributions.",
                "DevSync reserves the right to remove any project that violates these guidelines."
            ],
            participation: [
                "Contributors must follow the project's code of conduct.",
                "All contributions must be made through pull requests.",
                "Participants agree to responsibly handle any security issues.",
                "DevSync is not liable for any issues arising from project collaboration.",
                "Points are awarded based on accepted contributions only.",
                "Harassment or inappropriate behavior will result in immediate removal."
            ]
        };

        const showTermsModal = () => {
            const modal = document.createElement('div');
            modal.className = 'terms-modal';
            modal.innerHTML = `
                <div class="terms-modal__overlay"></div>
                <div class="terms-modal__content">
                    <div class="terms-modal__header">
                        <h3>Terms & Conditions</h3>
                        <div class="terms-progress">
                            <div class="terms-progress__bar"></div>
                            <span class="terms-progress__text">0/5 Accepted</span>
                        </div>
                        <button class="terms-modal__close">
                            <i class='bx bx-x'></i>
                        </button>
                    </div>
                    <div class="terms-modal__body">
                        <div class="terms-sections">
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term1">
                                        <label for="term1"></label>
                                    </div>
                                    <h4>Code Quality Standards</h4>
                                </div>
                                <div class="terms-section__content">
                                    <p>I agree to maintain high code quality standards, including:</p>
                                    <ul>
                                        <li>Following project coding conventions</li>
                                        <li>Writing clean, documented code</li>
                                        <li>Performing proper testing before submission</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term2">
                                        <label for="term2"></label>
                                    </div>
                                    <h4>Intellectual Property Rights</h4>
                                </div>
                                <div class="terms-section__content">
                                    <p>I confirm that:</p>
                                    <ul>
                                        <li>All submitted code is my original work</li>
                                        <li>I have rights to share this code</li>
                                        <li>I understand the project's licensing terms</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term3">
                                        <label for="term3"></label>
                                    </div>
                                    <h4>Community Guidelines</h4>
                                </div>
                                <div class="terms-section__content">
                                    <p>I agree to follow community guidelines, including:</p>
                                    <ul>
                                        <li>Respectful communication</li>
                                        <li>Collaborative problem-solving</li>
                                        <li>Supporting fellow developers</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term4">
                                        <label for="term4"></label>
                                    </div>
                                    <h4>Project Maintenance</h4>
                                </div>
                                <div class="terms-section__content">
                                    <p>I understand my responsibilities regarding:</p>
                                    <ul>
                                        <li>Timely response to feedback</li>
                                        <li>Bug fixes and maintenance</li>
                                        <li>Version control best practices</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term5">
                                        <label for="term5"></label>
                                    </div>
                                    <h4>Code Review Process</h4>
                                </div>
                                <div class="terms-section__content">
                                    <p>I agree to participate in the code review process by:</p>
                                    <ul>
                                        <li>Accepting constructive feedback</li>
                                        <li>Making requested changes</li>
                                        <li>Following review guidelines</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="terms-modal__footer">
                        <button class="terms-modal__button terms-modal__button--secondary">Decline</button>
                        <button class="terms-modal__button terms-modal__button--primary" disabled>Accept & Continue</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Trigger animation after a small delay
            setTimeout(() => modal.classList.add('show'), 50);

            // Handle checkbox changes
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
            const acceptButton = modal.querySelector('.terms-modal__button--primary');
            const progressBar = modal.querySelector('.terms-progress__bar');
            const progressText = modal.querySelector('.terms-progress__text');

            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const checkedCount = [...checkboxes].filter(cb => cb.checked).length;
                    const progress = (checkedCount / checkboxes.length) * 100;

                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${checkedCount}/${checkboxes.length} Accepted`;

                    acceptButton.disabled = checkedCount !== checkboxes.length;

                    if (checkedCount === checkboxes.length) {
                        acceptButton.classList.add('ready');
                    } else {
                        acceptButton.classList.remove('ready');
                    }
                });
            });

            // Handle section expand/collapse
            const sections = modal.querySelectorAll('.terms-section');
            sections.forEach(section => {
                const header = section.querySelector('.terms-section__header');
                const content = section.querySelector('.terms-section__content');

                header.addEventListener('click', (e) => {
                    if (!e.target.matches('input') && !e.target.matches('label')) {
                        section.classList.toggle('expanded');

                        if (section.classList.contains('expanded')) {
                            content.style.maxHeight = content.scrollHeight + 'px';
                        } else {
                            content.style.maxHeight = '0';
                        }
                    }
                });
            });

            // Close modal handlers
            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector('.terms-modal__close').addEventListener('click', closeModal);
            modal.querySelector('.terms-modal__button--secondary').addEventListener('click', closeModal);
            modal.querySelector('.terms-modal__overlay').addEventListener('click', closeModal);

            // Accept button handler
            modal.querySelector('.terms-modal__button--primary').addEventListener('click', () => {
                // Handle terms acceptance here
                closeModal();
                // Continue with project submission
                submitProject();
            });
        };

        // Event listeners
        showTermsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTermsModal();
        });

        termsCheckbox.addEventListener('change', () => {
            submitButton.disabled = !termsCheckbox.checked;
        });
    };

    // Initialize terms modal
    function initTermsModal() {
        const termsContent = `
            <div class="modal__terms">
                <div class="modal__terms-content">
                    <div class="modal__terms-header">
                        <h3 class="modal__terms-title">Terms and Conditions</h3>
                        <button class="modal__terms-close">×</button>
                    </div>
                    <div class="modal__terms-body">
                        <div class="terms__section">
                            <h4>1. Project Guidelines</h4>
                            <p>By submitting a project, you agree to:</p>
                            <ul>
                                <li>Provide accurate and complete project information</li>
                                <li>Submit original work or properly credit sources</li>
                                <li>Follow community guidelines and coding standards</li>
                                <li>Maintain respectful communication</li>
                            </ul>
                        </div>
                        <!-- Add more sections as needed -->
                    </div>
                    <div class="modal__terms-footer">
                        <button class="modal__terms-button modal__terms-button--secondary">Cancel</button>
                        <button class="modal__terms-button modal__terms-button--primary">Accept & Continue</button>
                    </div>
                </div>
            </div>
        `;

        // Inject modal HTML
        document.body.insertAdjacentHTML('beforeend', termsContent);

        // Get modal elements
        const modal = document.querySelector('.modal__terms');
        const closeBtn = modal.querySelector('.modal__terms-close');
        const cancelBtn = modal.querySelector('.modal__terms-button--secondary');
        const acceptBtn = modal.querySelector('.modal__terms-button--primary');

        // Add event listeners
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        acceptBtn.addEventListener('click', () => {
            // Handle terms acceptance
            modal.style.display = 'none';
            // Additional acceptance logic here
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Prevent scroll when modal is open
        modal.addEventListener('show', () => {
            document.body.style.overflow = 'hidden';
        });

        modal.addEventListener('hide', () => {
            document.body.style.overflow = '';
        });

        return modal;
    }

    // Add these utility functions for the modal
    function showModal(type, title, message, callback) {
        removeExistingModals();

        const modal = document.createElement('div');
        modal.className = 'modal';

        const overlay = document.createElement('div');
        overlay.className = 'modal__overlay';

        const iconMap = {
            loading: 'bx bx-loader-alt',
            success: 'bx bx-check-circle',
            error: 'bx bx-x-circle',
            confirm: 'bx bx-help-circle'
        };

        modal.innerHTML = `
            <div class="modal__content">
                <i class="modal__icon ${type} ${iconMap[type]}"></i>
                <h3 class="modal__title">${title}</h3>
                <p class="modal__message">${message}</p>
                ${type === 'confirm' ? `
                    <div class="modal__actions">
                        <button class="modal__button modal__button--confirm">Yes</button>
                        <button class="modal__button modal__button--cancel">No</button>
                    </div>
                ` : type !== 'loading' ? `
                    <button class="modal__button">OK</button>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
            overlay.classList.add('show');
        }, 10);

        if (type === 'confirm') {
            const confirmBtn = modal.querySelector('.modal__button--confirm');
            const cancelBtn = modal.querySelector('.modal__button--cancel');

            confirmBtn.addEventListener('click', () => {
                closeModal(modal, overlay, () => callback(true));
            });

            cancelBtn.addEventListener('click', () => {
                closeModal(modal, overlay, () => callback(false));
            });
        } else if (type !== 'loading') {
            const button = modal.querySelector('.modal__button');
            button.addEventListener('click', () => {
                closeModal(modal, overlay, callback);
            });
        }
    }

    function closeModal(modal, overlay, callback) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            overlay.remove();
            if (callback) callback();
        }, 300);
    }

    // Add this new function to remove existing modals
    function removeExistingModals() {
        const existingModals = document.querySelectorAll('.modal, .modal__overlay');
        existingModals.forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }

    // Add this after checkAuthAndInitialize initialization
    const loadAcceptedProjects = async () => {
        try {
            const response = await fetch(`${serverUrl}/api/accepted-projects`);

            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }

            const projects = await response.json();
            const acceptedContainer = document.getElementById('acceptedContainer');

            acceptedContainer.innerHTML = `
                <div class="search-container">
                    <input type="text" 
                           class="search-bar" 
                           placeholder="Search by repository name, owner, or technology..."
                           id="acceptedProjectSearch">
                </div>
                <div class="projects-grid" id="acceptedProjectsGrid">
                    ${renderPublicProjects(projects)}
                </div>
            `;

            // Add event delegation for view repository buttons
            acceptedContainer.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-repo');
                if (viewBtn) {
                    const repoUrl = viewBtn.dataset.url;
                    showModal('confirm', 'View Repository', 'Would you like to visit this repository on GitHub?', (confirmed) => {
                        if (confirmed) {
                            window.open(repoUrl, '_blank');
                        }
                    });
                }
            });

            // Add search functionality
            const searchBar = document.getElementById('acceptedProjectSearch');
            const projectsGrid = document.getElementById('acceptedProjectsGrid');
            let debounceTimer;

            searchBar.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredProjects = projects.filter(project =>
                        project.repoLink.toLowerCase().includes(searchTerm) ||
                        project.ownerName.toLowerCase().includes(searchTerm) ||
                        project.technology.some(tech => tech.toLowerCase().includes(searchTerm))
                    );

                    projectsGrid.innerHTML = filteredProjects.length ?
                        renderPublicProjects(filteredProjects) :
                        '<p class="no-results">No matching projects found</p>';
                }, 300);
            });
        } catch (error) {
            console.error('Error loading accepted projects:', error);
            document.getElementById('acceptedContainer').innerHTML =
                '<p class="error-message">Failed to load projects. Please try again.</p>';
        }
    };

    const renderPublicProjects = (projects) => {
        return projects.length > 0 ?
            projects.map((project, index) => `
                <div class="project-card" 
                     data-project-id="${project._id}"
                     style="animation-delay: ${index * 0.1}s">
                    <div class="project-owner">
                        <strong>Owner:</strong> ${project.ownerName}
                    </div>
                    <h4>
                        <i class='bx bx-code-alt'></i>
                        ${project.repoLink.split('/').pop()}
                    </h4>
                    <p>${project.description}</p>
                    <div class="tech-stack">
                        ${project.technology.map(tech =>
                `<span class="tech-tag">
                                <i class='bx bx-code-curly'></i>
                                ${tech}
                            </span>`
            ).join('')}
                    </div>
                    <div class="project-actions accepted-projects-button">
                        <button class="repo-link view-repo" data-url="${project.repoLink}">
                            <i class='bx bxl-github'></i>
                            View Repository
                        </button>
                    </div>
                </div>
            `).join('') : '<p class="no-projects">No accepted projects yet.</p>';
    };

    const checkAuthAndInitialize = async () => {
        try {
            // Load accepted projects regardless of authentication
            await loadAcceptedProjects();

            const response = await fetch(`${serverUrl}/api/user`, {
                credentials: 'include'
            });
            const data = await response.json();

            loadingState.style.display = 'none';
            authContainer.style.display = 'block';

            if (data.isAuthenticated) {
                currentUser = data.user; // Store user data
                showProjectForm();
                await displayUserProjects(currentUser.id);

                // Check if user is admin
                const adminResponse = await fetch(`${serverUrl}/api/admin/verify`, {
                    credentials: 'include'
                });
                const adminData = await adminResponse.json();
                currentUser.isAdmin = adminData.isAdmin;
            } else {
                showLoginPrompt();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            loadingState.innerHTML = `
                <p class="error-message">Failed to load. Please refresh the page.</p>
            `;
        }
    };

    // Add admin panel handler
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.dataset.tab;

            if (tabName === 'admin') {
                if (!currentUser || !currentUser.isAdmin) {
                    showModal('error', 'Unauthorized', 'You do not have admin privileges.');
                    return;
                }

                showModal('success', 'Welcome Admin', `Welcome ${currentUser.username}!`, async () => {
                    await loadAllProjects();
                });
            }

            // ...existing tab handling code...

            if (tabName === 'accepted') {
                await loadAcceptedProjects();
            }

            // ...existing admin tab handling code...
        });
    });

    const loadAllProjects = async () => {
        try {
            const response = await fetch(`${serverUrl}/api/admin/projects`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }

            const projects = await response.json();
            const adminContainer = document.getElementById('adminContainer');

            adminContainer.innerHTML = `
                <div class="filter-container">
                    <button class="filter-btn active" data-filter="all">
                        <i class='bx bx-list-ul'></i> All
                    </button>
                    <button class="filter-btn" data-filter="pending">
                        <i class='bx bx-time-five'></i> In Review
                    </button>
                    <button class="filter-btn" data-filter="accepted">
                        <i class='bx bx-check-circle'></i> Accepted
                    </button>
                    <button class="filter-btn" data-filter="rejected">
                        <i class='bx bx-x-circle'></i> Rejected
                    </button>
                </div>
                <div class="search-container">
                    <input type="text" 
                           class="search-bar" 
                           placeholder="Search by repository name, owner, or technology..."
                           id="adminProjectSearch">
                </div>
                <div class="projects-grid" id="adminProjectsGrid">
                    ${renderAdminProjects(projects)}
                </div>
            `;

            // Add filter functionality
            const filterBtns = adminContainer.querySelectorAll('.filter-btn');
            const projectsGrid = document.getElementById('adminProjectsGrid');

            filterBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const filterValue = btn.dataset.filter;
                    filterState.admin = filterValue; // Update state
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    await refreshProjectsView('admin');
                });
            });

            // Add search functionality for admin section
            const searchBar = document.getElementById('adminProjectSearch');
            let debounceTimer;

            searchBar.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredProjects = projects.filter(project =>
                        project.repoLink.toLowerCase().includes(searchTerm) ||
                        project.ownerName.toLowerCase().includes(searchTerm) ||
                        project.technology.some(tech => tech.toLowerCase().includes(searchTerm))
                    );

                    projectsGrid.innerHTML = filteredProjects.length ?
                        renderAdminProjects(filteredProjects) :
                        '<p class="no-results">No matching projects found</p>';
                }, 300);
            });

            // Add event delegation for admin actions
            addAdminEventListeners(adminContainer);
        } catch (error) {
            console.error('Error loading all projects:', error);
            document.getElementById('adminContainer').innerHTML =
                '<p class="error-message">Failed to load projects. Please try again.</p>';
        }
    };

    // Add this new function to handle admin panel events
    const addAdminEventListeners = (container) => {
        // Keep track of buttons being processed
        const processingButtons = new Set();

        // Single event listener for all buttons
        container.addEventListener('click', async (e) => {
            const updatePointsBtn = e.target.closest('.update-points');
            const deleteBtn = e.target.closest('.delete-project');
            const acceptBtn = e.target.closest('.accept-project');
            const rejectBtn = e.target.closest('.reject-project');
            const viewBtn = e.target.closest('.view-repo');

            // Handle update points
            if (updatePointsBtn) {
                if (processingButtons.has(updatePointsBtn)) return;
                const projectId = updatePointsBtn.dataset.id;
                const successInput = container.querySelector(`.success-points[data-project="${projectId}"]`);
                const successPoints = parseInt(successInput.value);

                if (successPoints < 0 || successPoints > 500) {
                    showModal('error', 'Invalid Points', 'Success points must be between 0 and 500');
                    return;
                }

                try {
                    processingButtons.add(updatePointsBtn);
                    updatePointsBtn.disabled = true;
                    updatePointsBtn.style.opacity = '0.7';
                    updatePointsBtn.style.cursor = 'not-allowed';

                    showModal('loading', 'Updating Points...', 'Please wait while we send the notification email...');

                    const response = await fetch(`${serverUrl}/api/admin/projects/${projectId}/points`, {
                        method: 'PATCH',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ successPoints })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update points');
                    }

                    removeExistingModals();
                    showModal('success', 'Success', 'Points updated and notification email sent!');
                    successInput.value = successPoints;

                    const pointsControl = updatePointsBtn.closest('.points-control');
                    pointsControl.style.borderColor = 'var(--first-color)';
                    setTimeout(() => {
                        pointsControl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }, 2000);

                    await refreshProjectsView('admin');
                } catch (error) {
                    removeExistingModals();
                    showModal('error', 'Error', 'Failed to update points. Please try again.');
                } finally {
                    processingButtons.delete(updatePointsBtn);
                    updatePointsBtn.disabled = false;
                    updatePointsBtn.style.opacity = '1';
                    updatePointsBtn.style.cursor = 'pointer';
                }
                return;
            }

            // Handle other buttons
            if (deleteBtn) {
                const projectId = deleteBtn.dataset.id;
                if (!projectId) return;
                showModal('confirm', 'Delete Project', 'Are you sure you want to delete this project?', async (confirmed) => {
                    if (!confirmed) return;

                    try {
                        showModal('loading', 'Deleting Project...', 'Please wait while we send the notification email...');

                        const response = await fetch(`${serverUrl}/api/projects/${projectId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });

                        if (!response.ok) {
                            throw new Error('Failed to delete project');
                        }

                        removeExistingModals();

                        const projectCard = container.querySelector(`.project-card[data-project-id="${projectId}"]`);

                        if (projectCard) {
                            showModal('success', 'Success', 'Project deleted and notification email sent!');

                            projectCard.style.transition = 'all 0.3s ease';
                            projectCard.style.opacity = '0';
                            projectCard.style.transform = 'scale(0.9)';

                            setTimeout(() => {
                                projectCard.remove();

                                const projectsGrid = document.getElementById('adminProjectsGrid');
                                const remainingCards = projectsGrid.querySelectorAll('.project-card');

                                if (remainingCards.length === 0) {
                                    projectsGrid.innerHTML = '<p class="no-projects">No projects submitted yet.</p>';
                                }
                            }, 300);
                        }

                        // Refresh both sections with current filters
                        await Promise.all([
                            refreshProjectsView('admin'),
                            refreshProjectsView('view')
                        ]);
                    } catch (error) {
                        removeExistingModals();
                        showModal('error', 'Error', 'Failed to delete project. Please try again.');
                    }
                });
            }

            if (acceptBtn) {
                const projectId = acceptBtn.dataset.id;
                showModal('confirm', 'Accept Project', 'Are you sure you want to accept this project?', async (confirmed) => {
                    if (confirmed) {
                        await reviewProject(projectId, 'accepted');
                    }
                });
            }

            if (rejectBtn) {
                const projectId = rejectBtn.dataset.id;
                showModal('confirm', 'Reject Project', 'Are you sure you want to reject this project?', async (confirmed) => {
                    if (confirmed) {
                        await reviewProject(projectId, 'rejected');
                    }
                });
            }

            if (viewBtn) {
                const repoUrl = viewBtn.dataset.url;
                showModal('confirm', 'View Repository', `Would you like to view this repository on GitHub?`, (confirmed) => {
                    if (confirmed) {
                        window.open(repoUrl, '_blank');
                    }
                });
            }
        });
    };

    // Add helper functions to render projects
    const renderProjects = (projects) => {
        return projects.length > 0 ?
            projects.map((project, index) => `
                <div class="project-card" 
                     data-project-id="${project._id}"
                     style="animation-delay: ${index * 0.1}s">
                    <div class="review-status ${project.reviewStatus}">
                        ${getReviewStatusIcon(project.reviewStatus)}
                        ${getReviewStatusText(project.reviewStatus)}
                    </div>
                    <h4>
                        <i class='bx bx-code-alt'></i>
                        ${project.repoLink.split('/').pop()}
                    </h4>
                    <p>${project.description}</p>
                    <div class="tech-stack">
                        ${project.technology.map(tech =>
                `<span class="tech-tag">
                                <i class='bx bx-code-curly'></i>
                                ${tech}
                            </span>`
            ).join('')}
                    </div>
                    <div class="project-new">
                    <div class="project-actions project-buttons">
                        <button class="repo-link view-repo" data-url="${project.repoLink}">
                            <i class='bx bxl-github'></i>
                            View Repository
                        </button>
                        ${project.reviewStatus === 'pending' && currentUser.id === project.userId ? `
                            <button class="delete-project" data-id="${project._id}">
                                <i class='bx bx-trash'></i>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                    </div>
                    </div>
                    `).join('') : '<p class="no-projects">No projects submitted yet.</p>';
    };

    const renderAdminProjects = (projects) => {
        return projects.length ? projects.map(project => `
            <div class="project-card ${project.reviewStatus}" data-project-id="${project._id}">
                <div class="review-status ${project.reviewStatus}">
                    ${getReviewStatusIcon(project.reviewStatus)}
                    ${getReviewStatusText(project.reviewStatus)}
                </div>
                <div class="project-owner">
                    <strong>Owner:</strong> ${project.ownerName}
                </div>
                <h4>
                    <i class='bx bx-code-alt'></i>
                    ${project.repoLink.split('/').pop()}
                </h4>
                <p>${project.description}</p>
                <div class="tech-stack">
                    ${project.technology.map(tech =>
            `<span class="tech-tag">
                            <i class='bx bx-code-curly'></i>
                            ${tech}
                        </span>`
        ).join('')}
                </div>
                ${project.reviewStatus === 'pending' ? `
                    <div class="review-buttons">
                        <button class="accept-project" data-id="${project._id}">
                            <i class='bx bx-check'></i>
                            Accept
                        </button>
                        <button class="reject-project" data-id="${project._id}">
                            <i class='bx bx-x'></i>
                            Reject
                        </button>
                    </div>
                ` : ''}
                ${project.reviewStatus === 'accepted' ? `
                    <div class="points-control">
                        <div class="points-field">
                            <label class="success-font">Success Points (earned for successful merge)</label>
                            <input type="number" 
                                   class="points-input success-points" 
                                   value="${project.successPoints || 50}" 
                                   min="0" 
                                   max="500"
                                   step="5"
                                   data-project="${project._id}">
                        </div>
                        <button class="update-points" data-id="${project._id}">
                            <i class='bx bx-save'></i>
                            Update Project Points
                        </button>
                    </div>
                ` : ''}
                <div class="project-action-buttons">
                <div class="project-actions">
                    <div class="action-buttons">
                        <button class="repo-link view-repo" data-url="${project.repoLink}">
                            <i class='bx bxl-github'></i>
                            View Repository
                        </button>
                        <button class="delete-project" data-id="${project._id}">
                            <i class='bx bx-trash'></i>
                            Delete
                        </button>
                    </div>
                </div>
                </div>
            </div>
        `).join('') : '<p class="no-projects">No projects submitted yet.</p>';
    };

    const loadRegisteredUsers = async () => {
        try {
            const response = await fetch(`${serverUrl}/api/users`, {
                credentials: 'include'
            });
            const users = await response.json();
            return users;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    };

    const renderUsers = (users) => {
        const usersGrid = document.querySelector('.users-grid');
        usersGrid.innerHTML = users.map(user => `
            <div class="user-card" onclick="window.open('https://github.com/${user.username}', '_blank')">
                <div class="user-header">
                    <img src="${user.avatarUrl}" alt="${user.displayName}" class="user-avatar">
                    <div class="user-info">
                        <h3>${user.displayName || user.username}</h3>
                        <p>@${user.username}</p>
                    </div>
                </div>
                <div class="user-details">
                    <div class="user-detail">
                        <i class='bx bx-envelope'></i>
                        <span>${user.email}</span>
                    </div>
                    <div class="user-detail">
                        <i class='bx bx-user-check'></i>
                        <span class="user-role ${user.isAdmin ? 'admin' : 'contributor'}">
                            ${user.isAdmin ? 'Admin' : 'Contributor'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const searchUsers = (users, searchTerm) => {
        return users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const initializeUsersSection = async () => {
        const allUsers = await loadRegisteredUsers();
        renderUsers(allUsers);

        const searchInput = document.querySelector('.users-search input');
        searchInput.addEventListener('input', (e) => {
            const filteredUsers = searchUsers(allUsers, e.target.value);
            renderUsers(filteredUsers);
        });
    };

    // Start the authentication check process
    checkAuthAndInitialize();

    // Initialize users section
    initializeUsersSection();
});
