// Recognition Section Functionality
document.addEventListener('DOMContentLoaded', function() {
    
    // Sample recognition data - Replace with real data
    const recognitionData = [
        {
            id: 1,
            name: "John Smith",
            photo: "assets/img/avatars/image1x1.jpg",
            githubId: "johnsmith-dev",
            college: "MIT",
            year: "2024",
            linkedinId: "john-smith-mit",
            title: "Full Stack Developer",
            badge: "Top Contributor"
        },
        {
            id: 2,
            name: "Sarah Johnson",
            photo: "assets/img/avatars/image2x2.jpg",
            githubId: "sarahjohnson",
            college: "Stanford University",
            year: "2023",
            linkedinId: "sarah-johnson-stanford",
            title: "AI/ML Engineer",
            badge: "Innovation Award"
        },
        {
            id: 3,
            name: "Mike Chen",
            photo: "assets/img/avatars/image3x3.jpg",
            githubId: "mikechen-dev",
            college: "UC Berkeley",
            year: "2024",
            linkedinId: "mike-chen-berkeley",
            title: "Backend Developer",
            badge: "Code Quality"
        },
        {
            id: 4,
            name: "Emily Davis",
            photo: "assets/img/avatars/image4x4.jpg",
            githubId: "emilydavis",
            college: "Harvard University",
            year: "2023",
            linkedinId: "emily-davis-harvard",
            title: "Frontend Developer",
            badge: "UI/UX Excellence"
        },
        {
            id: 5,
            name: "Alex Rodriguez",
            photo: "assets/img/avatars/image1x1.jpg",
            githubId: "alexrodriguez",
            college: "Carnegie Mellon",
            year: "2024",
            linkedinId: "alex-rodriguez-cmu",
            title: "DevOps Engineer",
            badge: "Infrastructure Expert"
        },
        {
            id: 6,
            name: "Jessica Lee",
            photo: "assets/img/avatars/image2x2.jpg",
            githubId: "jessicalee-dev",
            college: "UCLA",
            year: "2023",
            linkedinId: "jessica-lee-ucla",
            title: "Data Scientist",
            badge: "Analytics Pioneer"
        },
        {
            id: 7,
            name: "David Kim",
            photo: "assets/img/avatars/image3x3.jpg",
            githubId: "davidkim",
            college: "University of Washington",
            year: "2024",
            linkedinId: "david-kim-uw",
            title: "Mobile Developer",
            badge: "Mobile Excellence"
        },
        {
            id: 8,
            name: "Maria Garcia",
            photo: "assets/img/avatars/image4x4.jpg",
            githubId: "mariagarcia",
            college: "Georgia Tech",
            year: "2023",
            linkedinId: "maria-garcia-gt",
            title: "Security Engineer",
            badge: "Security Champion"
        }
    ];

    // Initialize recognition section
    function initRecognitionSection() {
        createRecognitionGrid();
        createModal();
        attachEventListeners();
    }

    // Create recognition grid
    function createRecognitionGrid() {
        const container = document.querySelector('.recognition-container');
        if (!container) return;

        const gridHTML = `
            <div class="recognition-header">
                <h2 class="recognition-title">Recognition & Awards</h2>
                <p class="recognition-subtitle">
                    Celebrating the outstanding contributors who have made significant impact in our community
                </p>
            </div>
            <div class="recognition-grid">
                ${recognitionData.map(person => `
                    <div class="recognition-card" 
                         data-person-id="${person.id}"
                         tabindex="0"
                         role="button"
                         aria-label="View details for ${person.name}, ${person.title} at ${person.college}">
                        <div class="card-image">
                            <img src="${person.photo}" 
                                 alt="Profile photo of ${person.name}" 
                                 loading="lazy"
                                 onerror="this.src='assets/img/avatars/image1x1.jpg'">
                        </div>
                        <div class="card-content">
                            <h3 class="card-name">${person.name}</h3>
                            <p class="card-title">${person.title}</p>
                            <span class="card-badge">${person.badge}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = gridHTML;
    }

    // Create modal
    function createModal() {
        // Check if modal already exists
        if (modalExists()) {
            return;
        }

        const modalHTML = `
            <div id="recognitionModal" class="recognition-modal">
                <div class="modal-container">
                    <button class="modal-close" id="modalClose" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-image">
                                <img id="modalPhoto" src="" alt="" loading="lazy">
                            </div>
                            <h2 id="modalName" class="modal-name"></h2>
                        </div>
                        <div class="modal-details">
                            <div class="detail-item">
                                <span class="detail-label">
                                    <i class="fab fa-github"></i> GitHub Profile
                                </span>
                                <span class="detail-value">
                                    <a id="modalGithub" href="" target="_blank" rel="noopener noreferrer"></a>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">
                                    <i class="fas fa-university"></i> College
                                </span>
                                <span id="modalCollege" class="detail-value"></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">
                                    <i class="fas fa-calendar-alt"></i> Graduation Year
                                </span>
                                <span id="modalYear" class="detail-value"></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">
                                    <i class="fab fa-linkedin"></i> LinkedIn Profile
                                </span>
                                <span class="detail-value">
                                    <a id="modalLinkedin" href="" target="_blank" rel="noopener noreferrer"></a>
                                </span>
                            </div>
                        </div>
                        <div class="social-links">
                            <a id="modalGithubLink" href="" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="GitHub Profile">
                                <i class="fab fa-github"></i>
                            </a>
                            <a id="modalLinkedinLink" href="" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn Profile">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Attach event listeners
    function attachEventListeners() {
        // Card click events with delegation
        document.addEventListener('click', function(e) {
            const card = e.target.closest('.recognition-card');
            if (card) {
                const personId = parseInt(card.dataset.personId);
                const person = recognitionData.find(p => p.id === personId);
                if (person) {
                    showModal(person);
                }
            }
        });

        // Modal close events
        document.addEventListener('click', function(e) {
            const modal = document.getElementById('recognitionModal');
            const closeBtn = document.getElementById('modalClose');
            
            // Close on close button click
            if (e.target === closeBtn || e.target.closest('#modalClose')) {
                hideModal();
            }
            
            // Close on backdrop click
            if (e.target === modal) {
                hideModal();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('recognitionModal');
            if (modal && modal.classList.contains('show')) {
                if (e.key === 'Escape') {
                    hideModal();
                }
                
                // Trap focus within modal
                if (e.key === 'Tab') {
                    trapFocus(e, modal);
                }
            }
        });

        // Card keyboard navigation
        document.addEventListener('keydown', function(e) {
            const card = e.target.closest('.recognition-card');
            if (card && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                card.click();
            }
        });

        // Touch events for mobile scroll prevention
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    // Trap focus within modal for accessibility
    function trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    // Show modal
    function showModal(person) {
        const modal = document.getElementById('recognitionModal');
        if (!modal) return;

        // Populate modal with person data
        document.getElementById('modalPhoto').src = person.photo;
        document.getElementById('modalPhoto').alt = person.name;
        document.getElementById('modalName').textContent = person.name;
        document.getElementById('modalCollege').textContent = person.college;
        document.getElementById('modalYear').textContent = person.year;
        
        // GitHub links
        const githubUsername = person.githubId;
        const githubUrl = `https://github.com/${githubUsername}`;
        document.getElementById('modalGithub').href = githubUrl;
        document.getElementById('modalGithub').textContent = `@${githubUsername}`;
        document.getElementById('modalGithubLink').href = githubUrl;
        
        // LinkedIn links
        const linkedinUsername = person.linkedinId;
        const linkedinUrl = `https://linkedin.com/in/${linkedinUsername}`;
        document.getElementById('modalLinkedin').href = linkedinUrl;
        document.getElementById('modalLinkedin').textContent = `@${linkedinUsername}`;
        document.getElementById('modalLinkedinLink').href = linkedinUrl;

        // Add blur effect to background
        addBlurEffect();

        // Prevent background scrolling
        preventBackgroundScroll();

        // Show modal with animation
        modal.classList.add('show');

        // Focus management for accessibility
        const closeButton = document.getElementById('modalClose');
        if (closeButton) {
            closeButton.focus();
        }

        // Track opened modal for analytics (if needed)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'recognition_modal_opened', {
                'person_name': person.name,
                'person_college': person.college
            });
        }
    }

    // Hide modal
    function hideModal() {
        const modal = document.getElementById('recognitionModal');
        if (!modal || !modal.classList.contains('show')) return;

        modal.classList.remove('show');
        
        // Restore background scrolling
        restoreBackgroundScroll();

        // Remove blur effect
        removeBlurEffect();

        // Track closed modal for analytics (if needed)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'recognition_modal_closed');
        }
    }

    // Add blur effect to background
    function addBlurEffect() {
        // Get all direct children of body except the modal
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(child => {
            if (child.id !== 'recognitionModal') {
                child.classList.add('modal-blur-bg');
            }
        });
    }

    // Remove blur effect from background
    function removeBlurEffect() {
        const blurredElements = document.querySelectorAll('.modal-blur-bg');
        blurredElements.forEach(element => {
            element.classList.remove('modal-blur-bg');
        });
    }

    // Smooth scroll animation for cards
    function observeCards() {
        const cards = document.querySelectorAll('.recognition-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${index * 0.1}s`;
                    entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                }
            });
        }, { threshold: 0.1 });

        cards.forEach(card => observer.observe(card));
    }

    // Add CSS animation keyframes dynamically
    function addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .recognition-card {
                opacity: 0;
            }

            /* Gradient Text Styles */
            .card-name, .modal-name, .recognition-title {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            /* Button Styles with Gradient and Shadow */
            .card-badge, button:not(.modal-close):not(.social-link), .btn:not(.modal-close):not(.social-link) {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
                box-shadow: 0 8px 25px rgb(232 226 227 / 40%);
                color: #000000 !important;
                border: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .card-badge:hover, button:not(.modal-close):not(.social-link):hover, .btn:not(.modal-close):not(.social-link):hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgb(232 226 227 / 40%);
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
            }

            /* Image Shadow Styles for Dark Mode */
            .card-image img, .modal-image img {
                box-shadow: 0 10px 30px rgba(240, 163, 185, 0.4), 0 5px 15px rgba(188, 174, 220, 0.3);
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .card-image:hover img, .modal-image:hover img {
                box-shadow: 0 15px 40px rgba(240, 163, 185, 0.6), 0 8px 20px rgba(188, 174, 220, 0.5);
            }

            /* Social Links Hover Effect */
            .social-link:hover {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd) !important;
                color: #000000 !important;
            }

            .social-link:hover i {
                color: #000000 !important;
            }

            /* Light Mode Specific Styles */
            html.light .card-name, html.light .modal-name, html.light .recognition-title {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            /* Light Mode Card Glass Effect */
            html.light .recognition-card {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            /* Light Mode Text Visibility */
            html.light .card-title {
                color: #333333 !important;
            }

            html.light .recognition-subtitle {
                color: #555555 !important;
            }

            html.light .modal-content {
                color: #333333;
            }

            html.light .detail-label {
                color: #444444 !important;
            }

            html.light .detail-value {
                color: #222222 !important;
            }

            html.light .card-badge, html.light button:not(.modal-close):not(.social-link), html.light .btn:not(.modal-close):not(.social-link) {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
                box-shadow: 0 8px 25px rgb(232 226 227 / 40%);
                color: #000000 !important;
            }

            html.light .card-badge:hover, html.light button:not(.modal-close):not(.social-link):hover, html.light .btn:not(.modal-close):not(.social-link):hover {
                box-shadow: 0 8px 25px rgb(232 226 227 / 40%);
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd);
            }

            /* Light Mode Image Shadow */
            html.light .card-image img, html.light .modal-image img {
                box-shadow: 0 10px 30px rgba(240, 163, 185, 0.2), 0 5px 15px rgba(188, 174, 220, 0.15);
            }

            html.light .card-image:hover img, html.light .modal-image:hover img {
                box-shadow: 0 15px 40px rgba(240, 163, 185, 0.3), 0 8px 20px rgba(188, 174, 220, 0.25);
            }

            /* Light Mode Social Links Hover */
            html.light .social-link:hover {
                background: linear-gradient(135deg, #f0a3b9, #bcaedc, #9abffd) !important;
                color: #000000 !important;
            }

            html.light .social-link:hover i {
                color: #000000 !important;
            }

            /* Ensure text readability in buttons */
            .card-badge {
                color: #000000 !important;
                text-shadow: none;
            }

            /* Additional button padding and styling */
            .modal-close {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: bold;
            }

            .social-link {
                width: 56px;
                height: 56px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                text-decoration: none;
            }

            .card-badge {
                padding: 8px 16px;
                border-radius: 25px;
                font-size: 0.85rem;
                font-weight: 600;
                display: inline-block;
            }
        `;
        document.head.appendChild(style);
    }

    // Error handling for missing images
    function handleImageErrors() {
        document.addEventListener('error', function(e) {
            if (e.target.tagName === 'IMG' && e.target.closest('.recognition-card, .modal-content')) {
                e.target.src = 'assets/img/avatars/image1x1.jpg';
            }
        }, true);
    }

    // Lazy load images for better performance
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Check if modal already exists to prevent duplicates
    function modalExists() {
        return document.getElementById('recognitionModal') !== null;
    }

    // Variables to store scroll position
    let scrollPosition = 0;

    // Prevent background scrolling when modal is open
    function preventBackgroundScroll() {
        // Store current scroll position
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Apply styles to prevent scrolling
        document.body.classList.add('modal-open');
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    }

    // Restore background scrolling when modal is closed
    function restoreBackgroundScroll() {
        // Remove the modal class and fixed positioning
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollPosition);
    }

    // Touch event handlers for mobile scroll prevention
    let touchStartY = 0;

    function handleTouchStart(e) {
        const modal = document.getElementById('recognitionModal');
        if (modal && modal.classList.contains('show')) {
            touchStartY = e.touches[0].clientY;
        }
    }

    function handleTouchMove(e) {
        const modal = document.getElementById('recognitionModal');
        if (!modal || !modal.classList.contains('show')) return;

        // Only prevent scrolling if touching the modal backdrop (not the container)
        if (e.target === modal) {
            e.preventDefault();
        }
    }

    // Initialize everything
    addAnimationStyles();
    initRecognitionSection();
    handleImageErrors();
    
    // Initialize lazy loading
    setTimeout(initLazyLoading, 100);
    
    // Observe cards for scroll animations
    setTimeout(observeCards, 100);

    // Expose functions globally for external access if needed
    window.RecognitionModule = {
        showModal,
        hideModal,
        recognitionData,
        init: initRecognitionSection
    };

    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is hidden, you could pause animations here if needed
        } else {
            // Page is visible again
        }
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        removeBlurEffect();
        document.body.style.overflow = '';
    });
});
