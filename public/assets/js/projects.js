document.addEventListener('DOMContentLoaded', () => {
    // console.log('Projects.js loaded and DOM ready');

    // Global debug function for testing button clicks
    window.testViewRepoButtons = function () {
        // console.log('=== Testing View Repository Buttons ===');
        const allViewRepoButtons = document.querySelectorAll('.view-repo');
        // console.log(`Found ${allViewRepoButtons.length} view-repo buttons`);

        allViewRepoButtons.forEach((btn, index) => {
            const url = btn.dataset.url;
            const computedStyle = window.getComputedStyle(btn);
            // console.log(`Button ${index + 1}:`, {
            //     element: btn,
            //     url: url,
            //     pointerEvents: computedStyle.pointerEvents,
            //     cursor: computedStyle.cursor,
            //     zIndex: computedStyle.zIndex,
            //     position: computedStyle.position,
            //     isVisible: btn.offsetParent !== null,
            //     clientRect: btn.getBoundingClientRect()
            // });
        });

        return allViewRepoButtons;
    };

    // Global function to manually test a button click
    window.testButtonClick = function (buttonIndex = 0) {
        const buttons = document.querySelectorAll('.view-repo');
        if (buttons[buttonIndex]) {
            // console.log('Manually triggering click on button:', buttonIndex);
            buttons[buttonIndex].click();
        } else {
            // console.log('Button not found at index:', buttonIndex);
        }
    };

    // Global function to check for event conflicts
    window.checkEventConflicts = function () {
        // console.log('=== Checking for Event Conflicts ===');
        const containers = [
            { name: 'Projects Container', element: document.getElementById('projectsContainer') },
            { name: 'Accepted Container', element: document.getElementById('acceptedContainer') },
            { name: 'Admin Container', element: document.getElementById('adminContainer') }
        ];

        containers.forEach(({ name, element }) => {
            if (element) {
                const listeners = getEventListeners ? getEventListeners(element) : 'getEventListeners not available';
                // console.log(`${name} listeners:`, listeners);
            }
        });
    };

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
                    <div class="search-input-wrapper">
                        <i class="bx bx-search search-icon"></i>
                        <input type="text" 
                               class="search-bar" 
                               placeholder="Search by repository name, owner, or technology..."
                               id="userProjectSearch">
                        <button type="button" class="search-clear" id="searchClear" style="display: none;">
                            <i class="bx bx-x"></i>
                        </button>
                    </div>
                </div>
                <div class="projects-grid" id="userProjectsGrid">
                    ${renderProjects(projects)}
                </div>
            `;

            // Add event delegation for project interactions
            const handleProjectClick = (e) => {
                // console.log('Click detected on:', e.target, 'Classes:', e.target.className); // Debug log

                // Handle view repository button clicks with enhanced prevention
                const viewBtn = e.target.closest('.view-repo');
                if (viewBtn) {
                    // Immediately prevent all default behaviors and stop propagation
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    const repoUrl = viewBtn.getAttribute('data-url') || viewBtn.dataset.url;
                    // console.log('View repo clicked. URL found:', repoUrl); // Debug log
                    // console.log('Button element:', viewBtn); // Debug log

                    if (!repoUrl) {
                        console.error('No repository URL found on button:', viewBtn);
                        showToast('Repository URL not found', 'error');
                        return false;
                    }

                    // Validate URL
                    try {
                        new URL(repoUrl);
                    } catch (urlError) {
                        console.error('Invalid URL:', repoUrl);
                        showToast('Invalid repository URL', 'error');
                        return false;
                    }

                    // Open repository in new tab with additional safety measures
                    try {
                        // console.log('Attempting to open URL:', repoUrl); // Debug log

                        // Use a timeout to ensure the event is fully handled first
                        setTimeout(() => {
                            const newWindow = window.open(repoUrl, '_blank', 'noopener,noreferrer');
                            if (newWindow) {
                                // console.log('Repository opened successfully');
                                // showToast('Repository opened in new tab', 'success', 2000);
                            } else {
                                console.warn('Popup blocked, trying alternative method');
                                // showToast('Please allow popups to open repository links', 'warning');

                                // Create a temporary link and click it
                                const tempLink = document.createElement('a');
                                tempLink.href = repoUrl;
                                tempLink.target = '_blank';
                                tempLink.rel = 'noopener noreferrer';
                                tempLink.style.display = 'none';
                                document.body.appendChild(tempLink);
                                tempLink.click();
                                document.body.removeChild(tempLink);
                            }
                        }, 0);

                    } catch (error) {
                        console.error('Failed to open repository:', error);
                        showToast('Failed to open repository. Please try again.', 'error');
                    }

                    return false; // Ensure no further processing
                }

                // Handle delete button clicks
                const deleteBtn = e.target.closest('.delete-project');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();

                    const projectId = deleteBtn.getAttribute('data-id');
                    if (projectId) {
                        deleteProject(projectId);
                    }
                    return false;
                }

                // Handle project card clicks for details (only if not clicking on buttons)
                const projectCard = e.target.closest('.project-card');
                if (projectCard && !e.target.closest('.project-actions') && !e.target.closest('button')) {
                    const projectId = projectCard.dataset.projectId;
                    if (projectId) {
                        showProjectDetails(projectId);
                    }
                }
            };

            // Remove existing event listener if it exists and add the new one with capture
            projectsContainer.removeEventListener('click', handleProjectClick, true);
            projectsContainer.removeEventListener('click', handleProjectClick, false);
            projectsContainer.addEventListener('click', handleProjectClick, true); // Use capture phase

            // Add filter functionality
            const filterBtns = projectsContainer.querySelectorAll('.filter-btn');
            const projectsGrid = document.getElementById('userProjectsGrid');

            // Function to perform search
            const performSearch = (searchTerm) => {
                // First apply the current filter state
                let baseProjects = filterState.view === 'all' ?
                    projects :
                    projects.filter(project => project.reviewStatus === filterState.view);

                // Then apply search filter on top of the filtered projects
                const filteredProjects = searchTerm ?
                    baseProjects.filter(project =>
                        project.repoLink.toLowerCase().includes(searchTerm) ||
                        project.ownerName.toLowerCase().includes(searchTerm) ||
                        project.technology.some(tech => tech.toLowerCase().includes(searchTerm))
                    ) : baseProjects;

                if (filteredProjects.length === 0) {
                    const message = searchTerm ?
                        `No projects found matching "${searchTerm}"` :
                        'No projects found';
                    projectsGrid.innerHTML = `<p class="no-results">${message}</p>`;
                } else {
                    projectsGrid.innerHTML = renderProjects(filteredProjects);

                    /* The above JavaScript code is adding a search result summary to the webpage if a
                    search term is provided. It creates a new `div` element with the class name
                    'search-results-summary' and sets its inner HTML to display the number of
                    projects found that match the search term. The summary is then inserted at the
                    beginning of the `projectsGrid` element. */
                    // // Add search result summary if searching
                    // if (searchTerm) {
                    //     const summary = document.createElement('div');
                    //     summary.className = 'search-results-summary';
                    //     summary.innerHTML = `
                    //         <p>Found ${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} 
                    //         matching "${searchTerm}"</p>
                    //     `;
                    //     projectsGrid.insertBefore(summary, projectsGrid.firstChild);
                    // }
                }
            };

            filterBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const filterValue = btn.dataset.filter;
                    filterState.view = filterValue; // Update state
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Reapply search if there's a search term
                    const searchBar = document.getElementById('userProjectSearch');
                    const currentSearchTerm = searchBar ? searchBar.value.toLowerCase() : '';
                    if (currentSearchTerm) {
                        performSearch(currentSearchTerm);
                    } else {
                        await refreshProjectsView('view');
                    }
                });
            });

            // Add search functionality
            const searchBar = document.getElementById('userProjectSearch');
            const searchClear = document.getElementById('searchClear');
            let debounceTimer;

            searchBar.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();

                // Show/hide clear button
                if (searchTerm.length > 0) {
                    searchClear.style.display = 'flex';
                } else {
                    searchClear.style.display = 'none';
                }

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    performSearch(searchTerm);
                }, 300);
            });

            // Add keyboard shortcuts
            searchBar.addEventListener('keydown', (e) => {
                // Escape key clears search
                if (e.key === 'Escape') {
                    searchBar.value = '';
                    searchClear.style.display = 'none';
                    performSearch('');
                    searchBar.blur();
                }
            });

            // Clear search functionality
            searchClear.addEventListener('click', () => {
                searchBar.value = '';
                searchClear.style.display = 'none';
                performSearch('');
                searchBar.focus();
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
            if (selectedTechs.has(tech)) {
                showToast(`"${tech}" is already added`, 'warning', 2000);
                return;
            }

            if (selectedTechs.size >= 10) {
                showToast('You can add up to 10 technologies only', 'warning', 3000);
                return;
            }

            const chip = document.createElement('div');
            chip.className = 'tech-chip';
            chip.innerHTML = `
                ${tech}
                <span class="remove-chip" data-tech="${tech}">×</span>
            `;
            wrapper.insertBefore(chip, input);
            selectedTechs.add(tech);
            updateHiddenInput();

            // Clear input and hide suggestions immediately
            input.value = '';
            suggestionsDiv.classList.remove('active');
            suggestionsDiv.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));

            // Clear the suggestions content to prevent stale data
            suggestionsDiv.innerHTML = '';

            // Show success feedback for first few additions
            if (selectedTechs.size <= 3) {
                showToast(`"${tech}" added successfully`, 'success', 1500);
            }

            // Focus back to input for continuous typing
            setTimeout(() => {
                input.focus();
                // Ensure cursor is at the end and input is ready for new text
                input.setSelectionRange(input.value.length, input.value.length);
            }, 100);
        };

        const removeChip = (tech) => {
            const chip = wrapper.querySelector(`[data-tech="${tech}"]`).parentElement;
            chip.style.transform = 'scale(0.8)';
            chip.style.opacity = '0';
            setTimeout(() => {
                chip.remove();
                selectedTechs.delete(tech);
                updateHiddenInput();
            }, 200);
        };

        const updateHiddenInput = () => {
            hiddenInput.value = Array.from(selectedTechs).join(',');
        };

        const showSuggestions = (query) => {
            if (!query || query.trim().length === 0) {
                suggestionsDiv.classList.remove('active');
                suggestionsDiv.innerHTML = '';
                return;
            }

            const filtered = technologies.filter(tech =>
                tech.toLowerCase().includes(query.toLowerCase()) &&
                !selectedTechs.has(tech)
            );

            if (filtered.length === 0) {
                suggestionsDiv.classList.remove('active');
                suggestionsDiv.innerHTML = '';
                return;
            }

            suggestionsDiv.innerHTML = filtered
                .slice(0, 8) // Limit to 8 suggestions for better UX
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
                    } else if (input.value) {
                        // If no suggestion is selected but there's text, try to add it as-is
                        e.preventDefault();
                        const exactMatch = technologies.find(tech =>
                            tech.toLowerCase() === input.value.toLowerCase()
                        );
                        if (exactMatch) {
                            addChip(exactMatch);
                        } else {
                            showToast('Please select from the suggestions or type a valid technology', 'warning', 3000);
                        }
                    }
                    break;

                case 'Escape':
                    suggestionsDiv.classList.remove('active');
                    suggestionsDiv.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
                    input.blur();
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

                // Ensure input is cleared and ready for next entry
                input.value = '';
                suggestionsDiv.classList.remove('active');
                suggestionsDiv.innerHTML = '';

                // Clear any selections
                suggestionsDiv.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));

                // Focus back to input for next entry with proper delay
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(0, 0); // Reset cursor position
                }, 150);
            }
        });

        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-chip')) {
                removeChip(e.target.dataset.tech);
                // Focus back to input after removing chip with proper delay
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }, 150);
            } else if (e.target === input || wrapper.contains(e.target)) {
                // Always focus input when clicking in wrapper area
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                    // Show suggestions if there's text
                    if (input.value.trim()) {
                        showSuggestions(input.value);
                    }
                }, 50);
            }
        });

        // Enhanced focus management
        input.addEventListener('focus', () => {
            // Show suggestions immediately if there's text to search
            if (input.value.trim()) {
                showSuggestions(input.value);
            }
            // Ensure input is ready for typing
            setTimeout(() => {
                input.setSelectionRange(input.value.length, input.value.length);
            }, 50);
        });

        input.addEventListener('blur', (e) => {
            // Delay hiding suggestions to allow clicks
            setTimeout(() => {
                if (!wrapper.contains(document.activeElement) &&
                    !suggestionsDiv.contains(document.activeElement)) {
                    suggestionsDiv.classList.remove('active');
                    suggestionsDiv.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
                }
            }, 200);
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.classList.remove('active');
                // Clear any selections
                suggestionsDiv.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
            }
        });
    };

    const showLoginPrompt = () => {
        authContainer.innerHTML = `
            <div class="auth-prompt">
                <h3>Please log in to submit a project</h3>
                <a href="${serverUrl}/api/auth/github" class="button">
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

        // Basic validation
        if (!repoLink || !technologies.length || !form.description.value.trim()) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        try {
            // Show loading modal
            showModal('loading', 'Submitting Project...', 'Please wait while we process your submission.');

            // Validate GitHub URL format
            if (!isValidGithubUrl(repoLink)) {
                removeExistingModals();
                showToast('Invalid GitHub repository URL. Please provide a valid GitHub repository link.', 'error');
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
                removeExistingModals();
                showToast('Project submitted successfully! 🎉', 'success');
                showModal('success', 'Success!', 'Your project has been submitted and is now under review. You will be notified once it\'s approved.', async () => {
                    form.reset();
                    // Reset technology chips
                    const techWrapper = document.getElementById('techChipsWrapper');
                    if (techWrapper) {
                        const chips = techWrapper.querySelectorAll('.tech-chip');
                        chips.forEach(chip => chip.remove());
                    }
                    const hiddenInput = document.getElementById('technology');
                    if (hiddenInput) {
                        hiddenInput.value = '';
                    }
                    // Switch to view tab and refresh projects
                    const viewTabButton = document.querySelector('[data-tab="view"]');
                    if (viewTabButton) {
                        viewTabButton.click();
                    }
                });
            } else {
                throw new Error(data.error || 'Failed to submit project');
            }
        } catch (error) {
            removeExistingModals();
            console.error('Submission error:', error);
            showToast(error.message || 'Failed to submit project. Please try again.', 'error');
            showModal('error', 'Submission Failed', error.message || 'An error occurred while submitting your project. Please check your connection and try again.');
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
                                    <h4>Follow coding standards and write clean, tested code.</h4>
                                </div>
                                <div class="terms-section__content">
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term2">
                                        <label for="term2"></label>
                                    </div>
                                    <h4>Submit only original or properly licensed work.</h4>
                                </div>
                                <div class="terms-section__content">
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term3">
                                        <label for="term3"></label>
                                    </div>
                                    <h4>Respect community guidelines and communicate professionally.</h4>
                                </div>
                                <div class="terms-section__content">
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term4">
                                        <label for="term4"></label>
                                    </div>
                                    <h4>Maintain my code and respond to feedback on time.</h4>
                                </div>
                                <div class="terms-section__content">
                                </div>
                            </div>
                            <div class="terms-section">
                                <div class="terms-section__header">
                                    <div class="custom-checkbox">
                                        <input type="checkbox" id="term5">
                                        <label for="term5"></label>
                                    </div>
                                    <h4>Participate in code reviews and implement required changes.</h4>
                                </div>
                                <div class="terms-section__content">
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

    // Enhanced Toast Notification System with improved positioning
    function showToast(message, type = 'info', duration = 5000) {
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
    }

    function removeToast(toast) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }

    // Enhanced Modal System with proper positioning and z-index
    function showModal(type, title, message, callback) {
        removeExistingModals();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        const iconMap = {
            loading: 'bx-loader-alt bx-spin',
            success: 'bx-check-circle',
            error: 'bx-x-circle',
            confirm: 'bx-help-circle',
            info: 'bx-info-circle'
        };

        const colorMap = {
            loading: '#3b82f6',
            success: '#10b981',
            error: '#ef4444',
            confirm: '#f59e0b',
            info: '#06b6d4'
        };

        modal.innerHTML = `
            <div class="modal-container" style="
                width: 90%;
                max-width: 500px;
                margin: 20px;
            ">
                <div class="modal-content" style="
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    transform: scale(0.9) translateY(20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    position: relative;
                ">
                    <div class="modal-header" style="
                        padding: 30px 30px 20px;
                        text-align: center;
                        position: relative;
                    ">
                        <div class="modal-icon-wrapper" style="
                            width: 64px;
                            height: 64px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 16px;
                            background: ${colorMap[type]}20;
                            border: 1px solid ${colorMap[type]}40;
                        ">
                            <i class="bx ${iconMap[type]} modal-icon" style="
                                font-size: 28px;
                                color: ${colorMap[type]};
                            "></i>
                        </div>
                        <h3 class="modal-title" style="
                            font-size: 24px;
                            font-weight: 700;
                            margin: 0;
                            color: #1e293b;
                        ">${title}</h3>
                        ${type !== 'loading' ? `
                            <button class="modal-close" style="
                                position: absolute;
                                top: 20px;
                                right: 20px;
                                background: none;
                                border: none;
                                cursor: pointer;
                                width: 32px;
                                height: 32px;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: all 0.2s ease;
                                color: #64748b;
                            ">
                                <i class="bx bx-x"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="modal-body" style="
                        padding: 0 30px 20px;
                        text-align: center;
                    ">
                        <p class="modal-message" style="
                            font-size: 16px;
                            line-height: 1.5;
                            margin: 0;
                            color: #64748b;
                        ">${message}</p>
                    </div>
                    ${type === 'confirm' ? `
                        <div class="modal-actions" style="
                            padding: 20px 30px 30px;
                            display: flex;
                            gap: 12px;
                            justify-content: center;
                        ">
                            <button class="modal-button modal-button--secondary" style="
                                padding: 12px 24px;
                                border-radius: 10px;
                                border: none;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                min-width: 100px;
                                background: rgba(100, 116, 139, 0.1);
                                color: #64748b;
                            ">Cancel</button>
                            <button class="modal-button modal-button--primary" style="
                                padding: 12px 24px;
                                border-radius: 10px;
                                border: none;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                min-width: 100px;
                                background: linear-gradient(135deg, #e51837, #ff4d5a);
                                color: white;
                                box-shadow: 0 4px 12px rgba(229, 24, 55, 0.3);
                            ">Confirm</button>
                        </div>
                    ` : type !== 'loading' ? `
                        <div class="modal-actions" style="
                            padding: 20px 30px 30px;
                            display: flex;
                            gap: 12px;
                            justify-content: center;
                        ">
                            <button class="modal-button modal-button--primary" style="
                                padding: 12px 24px;
                                border-radius: 10px;
                                border: none;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                min-width: 100px;
                                background: linear-gradient(135deg, #e51837, #ff4d5a);
                                color: white;
                                box-shadow: 0 4px 12px rgba(229, 24, 55, 0.3);
                            ">OK</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Force a reflow to ensure the modal is in the DOM
        modal.offsetHeight;

        // Trigger animation
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(1) translateY(0)';
                content.style.opacity = '1';
            }
        }, 10);

        // Event handlers
        if (type === 'confirm') {
            const confirmBtn = modal.querySelector('.modal-button--primary');
            const cancelBtn = modal.querySelector('.modal-button--secondary');

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    closeModal(modal, () => callback && callback(true));
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    closeModal(modal, () => callback && callback(false));
                });
            }
        } else if (type !== 'loading') {
            const okBtn = modal.querySelector('.modal-button--primary');
            const closeBtn = modal.querySelector('.modal-close');

            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    closeModal(modal, callback);
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    closeModal(modal, callback);
                });
            }
        }

        // Close on overlay click (but not on content click)
        modal.addEventListener('click', (e) => {
            if (e.target === modal && type !== 'loading') {
                closeModal(modal, callback);
            }
        });

        // Add hover effects to buttons
        const buttons = modal.querySelectorAll('.modal-button');
        buttons.forEach(button => {
            if (button.classList.contains('modal-button--primary')) {
                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'translateY(-1px)';
                    button.style.boxShadow = '0 6px 16px rgba(229, 24, 55, 0.4)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 4px 12px rgba(229, 24, 55, 0.3)';
                });
            } else {
                button.addEventListener('mouseenter', () => {
                    button.style.background = 'rgba(100, 116, 139, 0.2)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.background = 'rgba(100, 116, 139, 0.1)';
                });
            }
        });

        // Add close button hover effect
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
                closeBtn.style.color = '#1e293b';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'none';
                closeBtn.style.color = '#64748b';
            });
        }

        return modal;
    }

    function closeModal(modal, callback) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.9) translateY(20px)';
            content.style.opacity = '0';
        }
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';

        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 300);
    }

    // Remove existing modals with improved cleanup
    function removeExistingModals() {
        const existingModals = document.querySelectorAll('.modal-overlay');
        existingModals.forEach(modal => {
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(0.9) translateY(20px)';
                content.style.opacity = '0';
            }
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';

            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 100);
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

            // Enhanced event delegation for accepted projects
            const handleAcceptedProjectClick = (e) => {
                // console.log('Accepted project click event:', e.target);

                // Handle view repository button clicks with enhanced prevention
                const viewBtn = e.target.closest('.view-repo');
                if (viewBtn) {
                    // console.log('View repo button clicked:', viewBtn);
                    // Immediately prevent all default behaviors and stop propagation
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    const repoUrl = viewBtn.dataset.url;
                    // console.log('Repository URL:', repoUrl);

                    if (!repoUrl) {
                        console.error('No repository URL found on button:', viewBtn);
                        showToast('Repository URL not found', 'error');
                        return false;
                    }

                    // Validate URL
                    try {
                        new URL(repoUrl);
                    } catch (urlError) {
                        console.error('Invalid URL:', repoUrl);
                        showToast('Invalid repository URL', 'error');
                        return false;
                    }

                    // Open repository in new tab with additional safety measures
                    setTimeout(() => {
                        try {
                            const newWindow = window.open(repoUrl, '_blank', 'noopener,noreferrer');
                            if (newWindow) {
                                // console.log('Repository opened successfully');
                                showToast('Repository opened in new tab', 'success', 2000);
                            } else {
                                console.warn('Popup blocked, trying alternative method');
                                // showToast('Please allow popups to open repository links', 'warning');

                                // Create a temporary link and click it
                                const tempLink = document.createElement('a');
                                tempLink.href = repoUrl;
                                tempLink.target = '_blank';
                                tempLink.rel = 'noopener noreferrer';
                                tempLink.style.display = 'none';
                                document.body.appendChild(tempLink);
                                tempLink.click();
                                document.body.removeChild(tempLink);
                            }
                        } catch (error) {
                            console.error('Failed to open repository:', error);
                            showToast('Failed to open repository. Please try again.', 'error');
                        }
                    }, 0);

                    return false;
                }

                // Handle project card clicks (excluding buttons)
                const projectCard = e.target.closest('.project-card');
                if (projectCard && !e.target.closest('.project-actions') && !e.target.closest('button')) {
                    const projectId = projectCard.dataset.projectId;
                    if (projectId) {
                        showProjectDetails(projectId);
                    }
                }
            };

            // Remove any existing event listeners and add the new one with capture
            acceptedContainer.removeEventListener('click', handleAcceptedProjectClick, true);
            acceptedContainer.removeEventListener('click', handleAcceptedProjectClick, false);
            acceptedContainer.addEventListener('click', handleAcceptedProjectClick, true); // Use capture phase

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
                     data-project-data='${JSON.stringify(project).replace(/'/g, "&apos;")}'
                     style="animation-delay: ${index * 0.1}s; cursor: pointer;">
                    <div class="project-owner">
                        <strong>Owner:</strong> ${project.ownerName}
                    </div>
                    <h4>
                        <i class='bx bx-code-alt'></i>
                        ${project.repoLink.split('/').pop()}
                    </h4>
                    <div class="project-preview">
                        <span class="description-preview">Click to view details</span>
                    </div>
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

        // Enhanced admin event handler
        const handleAdminClick = async (e) => {
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
                // Enhanced view repository handling for admin section
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const repoUrl = viewBtn.dataset.url;
                // console.log('Admin view repo clicked. URL:', repoUrl);

                if (!repoUrl) {
                    console.error('No repository URL found on admin button:', viewBtn);
                    showToast('Repository URL not found', 'error');
                    return false;
                }

                // Validate URL
                try {
                    new URL(repoUrl);
                } catch (urlError) {
                    console.error('Invalid URL:', repoUrl);
                    showToast('Invalid repository URL', 'error');
                    return false;
                }

                // Open repository in new tab with additional safety measures
                setTimeout(() => {
                    try {
                        const newWindow = window.open(repoUrl, '_blank', 'noopener,noreferrer');
                        if (newWindow) {
                            // console.log('Admin repository opened successfully');
                            showToast('Repository opened in new tab', 'success', 2000);
                        } else {
                            console.warn('Admin popup blocked, trying alternative method');
                            // showToast('Please allow popups to open repository links', 'warning');

                            // Create a temporary link and click it
                            const tempLink = document.createElement('a');
                            tempLink.href = repoUrl;
                            tempLink.target = '_blank';
                            tempLink.rel = 'noopener noreferrer';
                            tempLink.style.display = 'none';
                            document.body.appendChild(tempLink);
                            tempLink.click();
                            document.body.removeChild(tempLink);
                        }
                    } catch (error) {
                        console.error('Failed to open admin repository:', error);
                        showToast('Failed to open repository. Please try again.', 'error');
                    }
                }, 0);

                return false;
            }
        };

        // Remove any existing event listeners and add with capture mode
        container.removeEventListener('click', handleAdminClick, true);
        container.removeEventListener('click', handleAdminClick, false);
        container.addEventListener('click', handleAdminClick, true); // Use capture phase
    };

    // Add helper functions to render projects
    const renderProjects = (projects) => {
        return projects.length > 0 ?
            projects.map((project, index) => `
                <div class="project-card" 
                     data-project-id="${project._id}"
                     data-project-data='${JSON.stringify(project).replace(/'/g, "&apos;")}'
                     style="animation-delay: ${index * 0.1}s; cursor: pointer;">
                    <div class="review-status ${project.reviewStatus}">
                        ${getReviewStatusIcon(project.reviewStatus)}
                        ${getReviewStatusText(project.reviewStatus)}
                    </div>
                    <h4>
                        <i class='bx bx-code-alt'></i>
                        ${project.repoLink.split('/').pop()}
                    </h4>
                    <div class="project-preview">
                        <span class="description-preview">Click to view details</span>
                    </div>
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
            <div class="project-card ${project.reviewStatus}" 
                 data-project-id="${project._id}"
                 data-project-data='${JSON.stringify(project).replace(/'/g, "&apos;")}'
                 style="cursor: pointer;">
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
                <div class="project-preview">
                    <span class="description-preview">Click to view details</span>
                </div>
                <div class="tech-stack">
                    ${project.technology.map(tech =>
            `<span class="tech-tag">
                            <i class='bx bx-code-curly'></i>
                            ${tech}
                        </span>`
        ).join('')}
                </div>
                <div class="admin-actions-container">
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

    // Function to show project details in a popup
    window.showProjectDetails = function (projectId) {
        // console.log('🔍 Showing project details for ID:', projectId);

        // Find the project data from the card
        const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
        if (!projectCard) {
            console.error('❌ Project card not found for ID:', projectId);
            return;
        }

        const projectDataStr = projectCard.getAttribute('data-project-data');
        if (!projectDataStr) {
            console.error('❌ Project data not found in card');
            return;
        }

        let project;
        try {
            project = JSON.parse(projectDataStr);
            // console.log('✅ Project data parsed:', project);
        } catch (error) {
            console.error('❌ Error parsing project data:', error);
            return;
        }

        const repoName = project.repoLink.split('/').pop();
        const submissionDate = project.submittedAt ? new Date(project.submittedAt).toLocaleDateString() : 'Unknown';
        const reviewDate = project.reviewedAt ? new Date(project.reviewedAt).toLocaleDateString() : 'Not reviewed';

        const modalContent = `
            <div class="project-details-modal">
                <div class="project-header">
                    <div class="project-title">
                        <i class='bx bx-code-alt'></i>
                        <h2>${repoName}</h2>
                    </div>
                    <div class="project-status ${project.reviewStatus}">
                        ${getReviewStatusIcon(project.reviewStatus)}
                        ${getReviewStatusText(project.reviewStatus)}
                    </div>
                </div>
                
                <div class="project-info-grid">
                    <div class="info-section">
                        <h3><i class='bx bx-user'></i> Project Owner</h3>
                        <p>${project.ownerName}</p>
                    </div>
                    
                    <div class="info-section">
                        <h3><i class='bx bx-link-external'></i> Repository</h3>
                        <a href="${project.repoLink}" target="_blank" class="repo-link-detail">
                            ${project.repoLink}
                            <i class='bx bx-external-link'></i>
                        </a>
                    </div>
                    
                    <div class="info-section full-width">
                        <h3><i class='bx bx-detail'></i> Description</h3>
                        <div class="description-content">
                            ${project.description}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h3><i class='bx bx-code-curly'></i> Technologies</h3>
                        <div class="tech-stack-modal">
                            ${project.technology.map(tech =>
            `<span class="tech-tag-modal">
                                    <i class='bx bx-code-curly'></i>
                                    ${tech}
                                </span>`
        ).join('')}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h3><i class='bx bx-calendar'></i> Submission Date</h3>
                        <p>${submissionDate}</p>
                    </div>
                    
                    ${project.reviewStatus !== 'pending' ? `
                        <div class="info-section">
                            <h3><i class='bx bx-calendar-check'></i> Review Date</h3>
                            <p>${reviewDate}</p>
                        </div>
                    ` : ''}
                    
                    ${project.successPoints ? `
                        <div class="info-section">
                            <h3><i class='bx bx-trophy'></i> Success Points</h3>
                            <p class="points-display">${project.successPoints} points</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="window.open('${project.repoLink}', '_blank')">
                        <i class='bx bxl-github'></i>
                        View on GitHub
                    </button>
                </div>
            </div>
        `;

        // console.log('📝 Generated modal content:', modalContent.substring(0, 100) + '...');

        // Remove any existing project modals
        const existingModals = document.querySelectorAll('.project-modal-overlay');
        existingModals.forEach(modal => modal.remove());

        // Create the modal with proper z-index and positioning
        const modal = document.createElement('div');
        modal.className = 'project-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;

        modal.innerHTML = `
            <div class="project-modal-content" style="
                background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95));
                border-radius: 16px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                transform: scale(0.9) translateY(20px);
                opacity: 0;
                transition: all 0.3s ease;
                position: relative;
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <h2 style="margin: 0; color: #fff;">Project Details</h2>
                    <button class="modal-close" style="
                        background: none;
                        border: none;
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 50%;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 40px;
                        height: 40px;
                    ">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem; color: #fff;">
                    ${modalContent}
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        const githubBtn = modal.querySelector('.btn-primary');

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeProjectModal();
        });

        // Handle GitHub button click
        if (githubBtn) {
            githubBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(project.repoLink, '_blank');
            });
        }

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.color = '#fff';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProjectModal();
            }
        });

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Add to DOM and show with animation
        document.body.appendChild(modal);
        // console.log('✅ Modal added to DOM');

        // Force reflow
        modal.offsetHeight;

        // Show modal with animation
        setTimeout(() => {
            // console.log('🎬 Starting modal animation');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            const content = modal.querySelector('.project-modal-content');
            if (content) {
                content.style.transform = 'scale(1) translateY(0)';
                content.style.opacity = '1';
                // console.log('✅ Modal content animated');
            }
        }, 10);

        // Function to close modal
        function closeProjectModal() {
            const content = modal.querySelector('.project-modal-content');
            if (content) {
                content.style.transform = 'scale(0.9) translateY(20px)';
                content.style.opacity = '0';
            }
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';

            setTimeout(() => {
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
                document.body.style.overflow = '';
            }, 300);
        }

        // Store close function globally for external access
        window.closeProjectModal = closeProjectModal;
    };

    // Start the authentication check process
    checkAuthAndInitialize();

    // Initialize users section
    initializeUsersSection();
});
