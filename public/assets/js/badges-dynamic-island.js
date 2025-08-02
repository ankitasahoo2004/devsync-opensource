// Dynamic Island for Profile Badges
class BadgesDynamicIsland {
    constructor() {
        this.island = null;
        this.isVisible = false;
        this.isExpanded = false;
        this.badges = [];
        this.currentSectionData = [];
        this.currentSectionType = null;
        this.badgesSection = null;
        this.sponsorsSection = null;
        this.recognitionSection = null;
        this.scrollThreshold = 100;
        this.lastScrollY = 0;
        this.sectionThresholds = {
            sponsors: 0,
            badges: 0,
            recognition: 0,
            profile: 0
        };

        // Profile badges data for when clicking on profile badges
        this.profileBadgesData = [];

        this.init();
    }

    init() {
        console.log('Initializing Badges Dynamic Island');
        this.createIsland();
        this.bindEvents();
        this.setupMutationObserver();
        this.observeSections();

        // Initial load if sections are already present
        if (this.badgesSection || this.sponsorsSection || this.recognitionSection) {
            this.loadAllSections();
        } else {
            // Wait for sections to initialize
            setTimeout(() => {
                this.observeSections();
                this.loadAllSections();
            }, 500);
        }

        // Handle potential SPA navigation
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                this.observeSections();
                this.loadAllSections();
            }, 100);
        });

        // Listen for recognition module initialization
        if (window.RecognitionModule) {
            setTimeout(() => {
                this.observeSections();
                this.loadAllSections();
            }, 100);
        } else {
            // Wait for RecognitionModule to be available
            const checkRecognition = setInterval(() => {
                if (window.RecognitionModule) {
                    clearInterval(checkRecognition);
                    setTimeout(() => {
                        this.observeSections();
                        this.loadAllSections();
                    }, 200);
                }
            }, 100);

            // Clear interval after 5 seconds to prevent infinite loop
            setTimeout(() => clearInterval(checkRecognition), 5000);
        }

        // Also listen for DOM changes that might indicate content is loaded
        const checkForCards = setInterval(() => {
            const recognitionCards = document.querySelectorAll('.recognition-card');
            const sponsorElements = document.querySelectorAll('.home-client__grid-item');
            const badgeElements = document.querySelectorAll('.hcs-item-w');

            if (recognitionCards.length > 0 || sponsorElements.length > 0 || badgeElements.length > 0) {
                clearInterval(checkForCards);
                console.log('Dynamic Island: Content detected, initializing sections...');
                this.calculateSectionThresholds();
                this.loadAllSections();
            }
        }, 200);

        // Clear interval after 10 seconds
        setTimeout(() => clearInterval(checkForCards), 10000);
    }

    createIsland() {
        this.island = document.createElement('div');
        this.island.className = 'badges-dynamic-island';
        this.island.innerHTML = `
            <div class="island-content">
                <div class="island-badges"></div>
                <span class="island-text">Items</span>
                <span class="island-count">0</span>
            </div>
            <div class="island-expanded-content">
                <div class="expanded-header">
                    <div class="expanded-title">
                        <i class='bx bx-trophy'></i>
                        Content Overview
                    </div>
                    <button class="close-island">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="expanded-badges-grid"></div>
            </div>
        `;

        document.body.appendChild(this.island);
    }

    bindEvents() {
        // Scroll event to show/hide island and update content
        window.addEventListener('scroll', this.handleScroll.bind(this));

        // Window resize event to recalculate thresholds
        window.addEventListener('resize', this.handleResize.bind(this));

        // Click to expand island
        this.island.querySelector('.island-content').addEventListener('click', () => {
            if (!this.isExpanded) {
                this.expandIsland();
            }
        });

        // Close expanded island
        this.island.querySelector('.close-island').addEventListener('click', (e) => {
            e.stopPropagation();
            this.collapseIsland();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isExpanded && !this.island.contains(e.target)) {
                this.collapseIsland();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.collapseIsland();
            }
        });
    }

    observeSections() {
        // Wait for all sections to be populated
        let attempts = 0;
        const maxAttempts = 50; // 25 seconds

        const checkSections = setInterval(() => {
            attempts++;

            // Find sponsors section (more specific selectors)
            this.sponsorsSection = document.querySelector('[data-client-section]') ||
                document.querySelector('.home-client__grid-w') ||
                document.querySelector('.grid-main.is-home-client');

            // Find badges section
            this.badgesSection = document.querySelector('.hcs-grid-w') ||
                document.querySelector('.grid-main.hcs-grid-w');

            // Find recognition section
            this.recognitionSection = document.querySelector('.recognition-section') ||
                document.querySelector('.recognition-container');

            // Find profile badges section
            this.profileBadgesSection = document.querySelector('.profile__badges');

            // Find profile badges section
            this.profileBadgesSection = document.querySelector('.profile__badges');

            // Check if we have content in any section
            const sponsorElements = document.querySelectorAll('.home-client__grid-item');
            const badgeElements = document.querySelectorAll('.hcs-item-w');
            const recognitionElements = document.querySelectorAll('.recognition-card');
            const profileBadgeElements = document.querySelectorAll('.level-badge');

            const hasContent = sponsorElements.length > 0 ||
                badgeElements.length > 0 ||
                recognitionElements.length > 0 ||
                profileBadgeElements.length > 0;

            console.log(`Dynamic Island Check ${attempts}: Sponsors: ${sponsorElements.length}, Badges: ${badgeElements.length}, Recognition: ${recognitionElements.length}, Profile Badges: ${profileBadgeElements.length}`);

            if (hasContent) {
                console.log('Dynamic Island: Content found, initializing...');
                this.calculateSectionThresholds();
                this.loadAllSections();
                this.bindProfileBadgeEvents();
                clearInterval(checkSections);
            } else if (attempts >= maxAttempts) {
                console.warn('Dynamic Island: No content found after 25 seconds');
                // Try to initialize anyway with whatever sections we can find
                this.calculateSectionThresholds();
                this.loadAllSections();
                this.bindProfileBadgeEvents();
                clearInterval(checkSections);
            }
        }, 500);
    }

    calculateSectionThresholds() {
        const offset = 200; // Distance before section where island should show

        // Calculate sponsor section threshold
        if (this.sponsorsSection) {
            const rect = this.sponsorsSection.getBoundingClientRect();
            this.sectionThresholds.sponsors = Math.max(100, (window.scrollY + rect.top) - offset);
        }

        // Calculate badges section threshold
        if (this.badgesSection) {
            const rect = this.badgesSection.getBoundingClientRect();
            this.sectionThresholds.badges = Math.max(100, (window.scrollY + rect.top) - offset);
        }

        // Calculate recognition section threshold
        if (this.recognitionSection) {
            const rect = this.recognitionSection.getBoundingClientRect();
            this.sectionThresholds.recognition = Math.max(100, (window.scrollY + rect.top) - offset);
        }

        // Calculate profile section threshold
        if (this.profileBadgesSection) {
            const rect = this.profileBadgesSection.getBoundingClientRect();
            this.sectionThresholds.profile = Math.max(100, (window.scrollY + rect.top) - offset);
        }

        console.log('Section thresholds calculated:', this.sectionThresholds);
    }

    loadAllSections() {
        // Load data for all sections
        this.loadSponsorsData();
        this.loadBadgesData();
        this.loadRecognitionData();
        this.loadProfileBadgesData();

        // Set initial section based on scroll position
        this.updateCurrentSection();
    }

    loadSponsorsData() {
        const sponsorElements = document.querySelectorAll('.home-client__grid-item');
        this.sponsorsData = [];

        sponsorElements.forEach((item, index) => {
            const sponsorName = item.getAttribute('data-client-item') || `Sponsor ${index + 1}`;
            const imgElement = item.querySelector('img');

            if (imgElement && imgElement.src) {
                this.sponsorsData.push({
                    name: sponsorName,
                    description: 'Supporting DevSync Community',
                    image: imgElement.src,
                    element: item,
                    type: 'sponsor'
                });
            }
        });

        console.log(`Loaded ${this.sponsorsData.length} sponsors`);
    }

    loadBadgesData() {
        const badgeElements = document.querySelectorAll('.hcs-item-w');
        this.badgesData = [];

        badgeElements.forEach(item => {
            const textMiniElements = item.querySelectorAll('.text-mini');
            if (textMiniElements.length >= 3) {
                const badgeName = textMiniElements[0].textContent.trim();
                const description = textMiniElements[2].textContent.trim();

                // Extract level number from the hcs-img-w class
                const imgElement = item.querySelector('.hcs-img-w');
                if (imgElement) {
                    const classList = Array.from(imgElement.classList);
                    const levelClass = classList.find(cls => cls.startsWith('level'));

                    if (levelClass) {
                        const levelNum = levelClass.replace('level', '');
                        const badgeImage = `https://cdn.devsync.club/devsync-assets/Badges/level${levelNum}.png`;

                        this.badgesData.push({
                            name: badgeName,
                            description: description,
                            image: badgeImage,
                            element: item,
                            type: 'level-badge'
                        });
                    }
                }
            }
        });

        console.log(`Loaded ${this.badgesData.length} badges`);

        // Bind click events to badge items for dynamic island preview
        this.bindIndexItemEvents(this.badgesData);
    }

    loadRecognitionData() {
        const recognitionElements = document.querySelectorAll('.recognition-card');
        this.recognitionData = [];

        recognitionElements.forEach((item, index) => {
            const nameElement = item.querySelector('.recognition-name') || item.querySelector('h3');
            const imgElement = item.querySelector('img');
            const titleElement = item.querySelector('.recognition-title') || item.querySelector('.title');

            const name = nameElement ? nameElement.textContent.trim() : `Member ${index + 1}`;
            const title = titleElement ? titleElement.textContent.trim() : 'Community Member';

            if (imgElement && imgElement.src) {
                this.recognitionData.push({
                    name: name,
                    description: title,
                    image: imgElement.src,
                    element: item,
                    type: 'recognition'
                });
            }
        });

        console.log(`Loaded ${this.recognitionData.length} recognition members`);
    }

    // Debug method to check section status
    debugSections() {
        console.log('=== Dynamic Island Debug ===');
        console.log('Sponsors Section:', this.sponsorsSection);
        console.log('Badges Section:', this.badgesSection);
        console.log('Recognition Section:', this.recognitionSection);
        console.log('Profile Badges Section:', this.profileBadgesSection);
        console.log('Sponsors Data:', this.sponsorsData?.length || 0);
        console.log('Badges Data:', this.badgesData?.length || 0);
        console.log('Recognition Data:', this.recognitionData?.length || 0);
        console.log('Profile Badges Data:', this.profileBadgesData?.length || 0);
        console.log('Current Section Type:', this.currentSectionType);
        console.log('Section Thresholds:', this.sectionThresholds);
        console.log('Current Scroll Y:', window.scrollY);
        console.log('============================');
    }

    // Method to manually reinitialize the island (for debugging or dynamic content)
    reinitialize() {
        console.log('Dynamic Island: Manual reinitialization triggered');
        this.calculateSectionThresholds();
        this.loadAllSections();
        this.debugSections();
    }

    // Cleanup method
    cleanup() {
        if (this.island && this.island.parentNode) {
            this.island.parentNode.removeChild(this.island);
        }
    }

    // Refresh method for SPA navigation
    refresh() {
        console.log('Dynamic Island: Refreshing...');
        setTimeout(() => {
            this.calculateSectionThresholds();
            this.loadAllSections();
        }, 500);
    }

    updateCurrentSection() {
        const scrollY = window.scrollY;
        let newSectionType = null;
        let newSectionData = [];

        // Determine which section we're currently in based on scroll position
        // Check from bottom to top to handle overlapping thresholds correctly
        if (scrollY >= this.sectionThresholds.profile && this.profileBadgesData && this.profileBadgesData.length > 0) {
            newSectionType = 'profile-badges';
            newSectionData = this.profileBadgesData;
        } else if (scrollY >= this.sectionThresholds.recognition && this.recognitionData && this.recognitionData.length > 0) {
            newSectionType = 'recognition';
            newSectionData = this.recognitionData;
        } else if (scrollY >= this.sectionThresholds.badges && this.badgesData && this.badgesData.length > 0) {
            newSectionType = 'badges';
            newSectionData = this.badgesData;
        } else if (scrollY >= this.sectionThresholds.sponsors && this.sponsorsData && this.sponsorsData.length > 0) {
            newSectionType = 'sponsors';
            newSectionData = this.sponsorsData;
        }

        console.log(`Scroll: ${scrollY}, Current Section: ${newSectionType}, Data Length: ${newSectionData.length}`);

        // Update content if section changed
        if (newSectionType !== this.currentSectionType) {
            console.log(`Section changed from ${this.currentSectionType} to ${newSectionType}`);
            this.currentSectionType = newSectionType;
            this.currentSectionData = newSectionData;

            if (this.currentSectionData && this.currentSectionData.length > 0) {
                // Add section transition animation
                this.island.classList.add('section-transition');

                setTimeout(() => {
                    this.renderIslandContent();
                    this.updateSectionInfo();
                }, 150);

                setTimeout(() => {
                    this.island.classList.remove('section-transition');
                }, 600);
            }
        }
    }

    loadBadges() {
        // This method is kept for backward compatibility
        // The new approach uses loadAllSections()
        this.loadAllSections();
    }

    getBadgeType(badgeName) {
        if (['Seeker', 'Explorer', 'Tinkerer', 'Crafter', 'Architect', 'Innovator', 'Strategist', 'Visionary', 'Trailblazer', 'Luminary'].includes(badgeName)) {
            return 'level-badge';
        } else if (['First Contribution', 'Active Contributor', 'Super Contributor'].includes(badgeName)) {
            return 'contrib-badge';
        }
        return 'special-badge';
    }

    renderIslandContent() {
        if (!this.currentSectionData || this.currentSectionData.length === 0) return;

        const islandBadges = this.island.querySelector('.island-badges');
        const expandedGrid = this.island.querySelector('.expanded-badges-grid');

        // Show first 3 items in collapsed view
        const visibleItems = this.currentSectionData.slice(0, 3);

        islandBadges.innerHTML = visibleItems.map(item => `
            <div class="island-badge" data-item-name="${item.name}">
                <img src="${item.image}" alt="${item.name}">
            </div>
        `).join('');

        // Render all items in expanded view
        expandedGrid.innerHTML = this.currentSectionData.map(item => `
            <div class="expanded-badge-item ${item.type}" data-item-name="${item.name}">
                <div class="expanded-badge-icon">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="expanded-badge-info">
                    <div class="expanded-badge-name">${item.name}</div>
                    <div class="expanded-badge-desc">${item.description || 'Achievement unlocked!'}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers for item previews
        this.bindItemPreviewEvents();
    }

    renderIslandBadges() {
        // Backward compatibility - redirect to new method
        this.badges = this.currentSectionData || [];
        this.renderIslandContent();
        this.updateBadgeCount();
    }

    bindItemPreviewEvents() {
        // Island items
        this.island.querySelectorAll('.island-badge').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showItemPreview(item.dataset.itemName);
            });
        });

        // Expanded items
        this.island.querySelectorAll('.expanded-badge-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showItemPreview(item.dataset.itemName);
            });
        });
    }

    bindBadgePreviewEvents() {
        // Backward compatibility - redirect to new method
        this.bindItemPreviewEvents();
    }

    bindIndexItemEvents(items) {
        // Add click events to index page items for dynamic island preview
        items.forEach(item => {
            if (item.element) {
                item.element.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent navigation
                    e.stopPropagation();

                    // Add Hacktoberfest-style click animation to the badge
                    item.element.classList.add('clicked');
                    setTimeout(() => item.element.classList.remove('clicked'), 600);

                    // Create sparkle effect
                    this.createSparkleEffect(item.element);

                    // Set current section to badges and show island
                    this.currentSectionType = 'badges';
                    this.currentSectionData = this.badgesData;

                    // Show the island if not visible with Hacktoberfest-style animation
                    if (!this.isVisible) {
                        this.island.classList.add('hacktober-style');
                        this.showIsland();
                        setTimeout(() => this.island.classList.remove('hacktober-style'), 800);
                    }

                    // Update the island content
                    this.updateSectionInfo();
                    this.renderIslandContent();

                    // Show badge preview with delay for smoother transition
                    setTimeout(() => {
                        this.showBadgePreview(item.name);
                    }, 200);
                });
            }
        });
    }

    bindProfileBadgeEvents() {
        // Find and bind click events to profile page badge elements (only earned badges)
        const profileBadges = document.querySelectorAll('.profile__badges .level-badge');

        if (profileBadges.length > 0) {
            console.log(`Binding events to ${profileBadges.length} earned profile badges`);

            // Load profile badges data first
            this.loadProfileBadgesData();

            profileBadges.forEach((badge, index) => {
                // Prevent default badge preview behavior temporarily
                const originalOnClick = badge.getAttribute('onclick');
                badge.removeAttribute('onclick');

                badge.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Add Hacktoberfest-style click animation to the badge
                    badge.classList.add('clicked');
                    setTimeout(() => badge.classList.remove('clicked'), 600);

                    // Create sparkle effect
                    this.createSparkleEffect(badge);

                    // Get badge info from data attributes
                    const badgeName = badge.dataset.badgeName || `Level Badge ${index + 1}`;
                    const badgeDesc = badge.dataset.badgeDesc || 'Achievement unlocked!';
                    const badgeImg = badge.querySelector('img')?.src || '';

                    // Set current section to profile badges
                    this.currentSectionType = 'profile-badges';
                    this.currentSectionData = this.profileBadgesData || [];

                    // Show the island with Hacktoberfest-style animation
                    if (!this.isVisible) {
                        this.island.classList.add('hacktober-style');
                        this.showIsland();
                        setTimeout(() => this.island.classList.remove('hacktober-style'), 800);
                    }

                    // Update island content with profile badges
                    this.renderIslandContent();
                    this.updateSectionInfo();

                    // Show Hacktoberfest-style animation and expand island
                    setTimeout(() => {
                        this.expandIsland();
                        this.showItemPreview(badgeName);
                    }, 300);
                });

                // Store original onclick for fallback
                if (originalOnClick) {
                    badge.dataset.originalOnclick = originalOnClick;
                }
            });
        } else {
            console.log('No earned profile badges found for event binding');
        }
    } loadProfileBadgesData() {
        // Only load badges that the user has actually earned
        // These are already populated in the .profile__badges container by profile.js
        const profileBadges = document.querySelectorAll('.profile__badges .level-badge');
        this.profileBadgesData = [];

        if (profileBadges.length === 0) {
            console.log('No earned profile badges found');
            return;
        }

        profileBadges.forEach((badge, index) => {
            const badgeName = badge.dataset.badgeName || `Level Badge ${index + 1}`;
            const badgeDesc = badge.dataset.badgeDesc || 'Achievement unlocked!';
            const badgeImg = badge.querySelector('img')?.src || '';

            // Only add badges that have valid data
            if (badgeName && badgeImg) {
                this.profileBadgesData.push({
                    name: badgeName,
                    description: badgeDesc,
                    image: badgeImg,
                    element: badge,
                    type: 'level-badge'
                });
            }
        });

        console.log(`Loaded ${this.profileBadgesData.length} earned profile badges`);
    }

    createSparkleEffect(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create multiple sparkles with different colors and timings
        const sparkleColors = [
            '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1',
            '#a855f7', '#06b6d4', '#10b981', '#f59e0b'
        ];

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'badge-sparkle';

                // Random direction and distance
                const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
                const distance = 25 + Math.random() * 30;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;

                sparkle.style.left = centerX + 'px';
                sparkle.style.top = centerY + 'px';
                sparkle.style.position = 'fixed';
                sparkle.style.background = sparkleColors[i % sparkleColors.length];
                sparkle.style.setProperty('--dx', dx + 'px');
                sparkle.style.setProperty('--dy', dy + 'px');
                sparkle.style.zIndex = '10000';

                // Use enhanced sparkle animation
                sparkle.style.animation = 'enhancedSparkle 1.2s ease-out forwards';

                document.body.appendChild(sparkle);

                // Remove sparkle after animation
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                    }
                }, 1200);
            }, i * 40); // Stagger the sparkles
        }
    }

    updateSectionInfo() {
        const countElement = this.island.querySelector('.island-count');
        const textElement = this.island.querySelector('.island-text');
        const titleElement = this.island.querySelector('.expanded-title');

        if (!this.currentSectionData || this.currentSectionData.length === 0) return;

        countElement.textContent = this.currentSectionData.length;

        // Update text and title based on current section type
        switch (this.currentSectionType) {
            case 'sponsors':
                textElement.textContent = 'Sponsors';
                titleElement.innerHTML = '<i class="bx bx-heart"></i>Our Sponsors';
                break;
            case 'badges':
                textElement.textContent = 'Achievements';
                titleElement.innerHTML = '<i class="bx bx-trophy"></i>Your Achievements';
                break;
            case 'recognition':
                textElement.textContent = 'Team';
                titleElement.innerHTML = '<i class="bx bx-user-circle"></i>Recognition & Awards';
                break;
            case 'profile-badges':
                textElement.textContent = 'Badges';
                titleElement.innerHTML = '<i class="bx bx-award"></i>Your Profile Badges';
                break;
            default:
                textElement.textContent = 'Items';
                titleElement.innerHTML = '<i class="bx bx-grid-alt"></i>Content Overview';
        }

        // Add a subtle pulse animation to indicate section change
        countElement.style.animation = 'none';
        setTimeout(() => {
            countElement.style.animation = 'pulse 0.5s ease';
        }, 10);
    }

    updateBadgeCount() {
        // Backward compatibility - redirect to new method
        this.updateSectionInfo();
    }

    handleScroll() {
        const currentScrollY = window.scrollY;

        // Update current section based on scroll position
        this.updateCurrentSection();

        // Only show island if we have content for current section
        if (!this.currentSectionData || this.currentSectionData.length === 0) {
            if (this.isVisible) {
                this.hideIsland();
            }
            this.lastScrollY = currentScrollY;
            return;
        }

        // Determine if island should be visible
        const shouldShow = this.currentSectionType &&
            ((this.currentSectionType === 'sponsors' && currentScrollY >= this.sectionThresholds.sponsors) ||
                (this.currentSectionType === 'badges' && currentScrollY >= this.sectionThresholds.badges) ||
                (this.currentSectionType === 'recognition' && currentScrollY >= this.sectionThresholds.recognition) ||
                (this.currentSectionType === 'profile-badges' && currentScrollY >= this.sectionThresholds.profile));

        if (shouldShow && !this.isVisible) {
            this.showIsland();
        } else if (!shouldShow && this.isVisible && !this.isExpanded) {
            this.hideIsland();
        }

        this.lastScrollY = currentScrollY;
    }

    handleResize() {
        // Recalculate section thresholds when window is resized
        setTimeout(() => {
            this.calculateSectionThresholds();
            this.updateCurrentSection();
        }, 100);
    }

    showIsland() {
        if (!this.currentSectionData || this.currentSectionData.length === 0) return;

        this.isVisible = true;
        this.island.classList.add('show');

        // Add stagger animation to items
        const items = this.island.querySelectorAll('.island-badge');
        items.forEach((item, index) => {
            setTimeout(() => {
                item.style.animation = 'fadeInUp 0.3s ease forwards';
            }, index * 100);
        });
    }

    hideIsland() {
        this.isVisible = false;
        this.island.classList.remove('show');

        // Collapse if expanded
        if (this.isExpanded) {
            this.collapseIsland();
        }
    }

    expandIsland() {
        this.isExpanded = true;
        this.island.classList.add('expanded');

        // Hide compact content
        this.island.querySelector('.island-content').classList.add('hidden');

        // Add entrance animation to expanded badges
        const expandedBadges = this.island.querySelectorAll('.expanded-badge-item');
        expandedBadges.forEach((badge, index) => {
            badge.style.opacity = '0';
            badge.style.transform = 'translateY(20px)';
            setTimeout(() => {
                badge.style.transition = 'all 0.3s ease';
                badge.style.opacity = '1';
                badge.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    collapseIsland() {
        this.isExpanded = false;
        this.island.classList.remove('expanded');

        // Show compact content
        setTimeout(() => {
            this.island.querySelector('.island-content').classList.remove('hidden');
        }, 200);
    }

    showItemPreview(itemName) {
        const item = this.currentSectionData?.find(i => i.name === itemName);
        if (!item) return;

        // Remove any existing preview
        const existingPreview = document.querySelector('.island-badge-preview');
        if (existingPreview) {
            existingPreview.remove();
        }

        const preview = document.createElement('div');
        preview.className = 'island-badge-preview';
        preview.innerHTML = `
            <div class="island-badge-preview-content">
                <img src="${item.image}" alt="${item.name}" class="island-badge-preview-img">
                <h3 class="island-badge-preview-title">${item.name}</h3>
                <p class="island-badge-preview-desc">${item.description || 'Achievement unlocked!'}</p>
                <button class="island-preview-close">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `;

        document.body.appendChild(preview);

        // Add dropdown animation
        requestAnimationFrame(() => {
            preview.classList.add('show');

            // Add dropdown effect to content
            const content = preview.querySelector('.island-badge-preview-content');
            content.style.transform = 'translateY(-50px) scale(0.8)';
            content.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

            setTimeout(() => {
                content.style.transform = 'translateY(0) scale(1)';
            }, 10);
        });

        // Close handlers
        const closeBtn = preview.querySelector('.island-preview-close');
        const closePreview = () => {
            preview.classList.remove('show');
            setTimeout(() => preview.remove(), 300);
        };

        closeBtn.addEventListener('click', closePreview);
        preview.addEventListener('click', (e) => {
            if (e.target === preview) closePreview();
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closePreview();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    showBadgePreview(badgeName) {
        // Backward compatibility - redirect to new method
        this.showItemPreview(badgeName);
    }

    // Public method to refresh badges (useful when badges are updated)
    refresh() {
        this.loadAllSections();
    }

    // Setup mutation observer for dynamic content
    setupMutationObserver() {
        // Create a mutation observer to watch for dynamic content changes
        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldRecheck = false;

            mutations.forEach((mutation) => {
                // Check if recognition cards or other badge sections were added
                if (mutation.type === 'childList') {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList?.contains('recognition-card') ||
                                node.classList?.contains('hcs-grid-w') ||
                                node.classList?.contains('home-client__grid-w') ||
                                node.classList?.contains('recognition-section') ||
                                node.querySelector?.('.recognition-card, .hcs-grid-w, .home-client__grid-w, .recognition-section')) {
                                shouldRecheck = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (shouldRecheck) {
                // Debounce the recheck to avoid excessive calls
                clearTimeout(this.recheckTimeout);
                this.recheckTimeout = setTimeout(() => {
                    this.observeBadgesSection();
                    this.loadBadges();
                }, 100);
            }
        });

        // Start observing
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Public method to manually show/hide
    toggle(force) {
        if (force !== undefined) {
            if (force) {
                this.showIsland();
            } else {
                this.hideIsland();
            }
        } else {
            if (this.isVisible) {
                this.hideIsland();
            } else {
                this.showIsland();
            }
        }
    }

    // Cleanup method
    cleanup() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        if (this.recheckTimeout) {
            clearTimeout(this.recheckTimeout);
        }

        if (this.island && this.island.parentNode) {
            this.island.parentNode.removeChild(this.island);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the profile page or index page with badges
    const isProfilePage = window.location.pathname === '/profile' ||
        window.location.pathname.includes('profile') ||
        document.querySelector('.profile__badges');

    const isIndexPage = window.location.pathname === '/' ||
        window.location.pathname === '/index.html' ||
        document.querySelector('.hcs-grid-w') ||
        document.querySelector('.home-client__grid-w') ||
        document.querySelector('.recognition-section');

    if (isProfilePage || isIndexPage) {
        // Wait a bit for the content to load, including dynamic content
        setTimeout(() => {
            window.badgesDynamicIsland = new BadgesDynamicIsland();
        }, 1500); // Increased delay to ensure all content loads
    }
});

// Re-initialize if page changes (for SPAs)
window.addEventListener('popstate', () => {
    if (window.badgesDynamicIsland) {
        window.badgesDynamicIsland.refresh();
    }
});

// Export for potential external use
window.BadgesDynamicIsland = BadgesDynamicIsland;

// Global function to refresh the island (can be called from profile.js)
window.refreshBadgesIsland = function () {
    if (window.badgesDynamicIsland) {
        window.badgesDynamicIsland.refresh();
    }
};

// Additional function to manually initialize for dynamic content
window.initBadgesIsland = function () {
    if (!window.badgesDynamicIsland) {
        window.badgesDynamicIsland = new BadgesDynamicIsland();
    } else {
        window.badgesDynamicIsland.refresh();
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.badgesDynamicIsland) {
        window.badgesDynamicIsland.cleanup();
    }
});
