document.addEventListener('DOMContentLoaded', () => {
    // Sample sponsor data - in a real implementation, this could be fetched from an API
    const sponsors = [
        {
            name: 'Unstop',
            contribution: 'Powered By',
            amount: 'ΞGold',
            link: 'https://unstop.com/',
            logo: 'assets/img/sponsors/unstop.png',
            description: 'Unstop is a comprehensive talent engagement platform that connects students and early professionals with companies and organizations through competitions, assessments, hackathons, and more.',
            twitter: 'https://twitter.com/unstop',
            linkedin: 'https://www.linkedin.com/company/unstop/',
            github: 'https://github.com/unstop'
        },
        {
            name: 'YBM Labs',
            contribution: 'Domain Partner',
            amount: 'Ξ1.20',
            link: 'https://ybmlabs.com/',
            logo: 'assets/img/sponsors/Ylabs.png',
            description: 'YBM Labs is the applied AI and automation wing of Zillusion Pvt. Ltd., built to empower organizations through smart, scalable, and strategic technology solutions. We specialize in transforming complex business challenges into streamlined, intelligent systems using the latest in artificial intelligence, machine learning, and workflow automation. From startups to enterprise teams, we partner with forward-thinking businesses to design, build, and deploy custom solutions that optimize operations, reduce manual effort, and unlock new opportunities for growth. Whether it’s automating internal workflows, building AI-powered products, or integrating intelligent APIs, our focus is always on measurable impact and long-term value.',
            twitter: 'https://twitter.com/ymblabs',
            linkedin: 'https://www.linkedin.com/company/ymblabs/',
            github: 'https://github.com/ymblabs'
        },
        {
            name: 'GitHub Education',
            contribution: 'Platform Partner',
            amount: 'Ξ2.50',
            link: 'https://github.com/education',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
            description: 'GitHub Education helps students, teachers, and schools access the tools and events they need to shape the next generation of software development.',
            twitter: 'https://twitter.com/githubeducation',
            linkedin: 'https://www.linkedin.com/showcase/github-education/',
            github: 'https://github.com/education'
        },
        {
            name: 'MongoDB',
            contribution: 'Database Partner',
            amount: 'Ξ1.75',
            link: 'https://www.mongodb.com/',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
            description: 'MongoDB is a general purpose, document-based, distributed database built for modern application developers and for the cloud era.',
            twitter: 'https://twitter.com/MongoDB',
            linkedin: 'https://www.linkedin.com/company/mongodb/',
            github: 'https://github.com/mongodb'
        },
        {
            name: 'Microsoft Azure',
            contribution: 'Deployment Partner',
            amount: 'Ξ0.90',
            link: 'https://azure.microsoft.com/',
            logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg',
            description: 'Microsoft Azure is a cloud computing service for building, testing, deploying, and managing applications and services through Microsoft-managed data centers.',
            twitter: 'https://twitter.com/Azure',
            linkedin: 'https://www.linkedin.com/company/microsoft-azure/',
            github: 'https://github.com/Azure'
        },
        {
            name: 'MLSA',
            contribution: 'Deployment Partner',
            amount: 'Ξ0.90',
            link: 'https://mvp.microsoft.com/',
            logo: 'assets/img/sponsors/mlsa.png',
            description: 'MLSA is a community of students who are passionate about technology and want to share their knowledge with others. They organize events, workshops, and hackathons to help students learn and grow in the tech field.',
            twitter: 'https://twitter.com/Azure',
            linkedin: 'https://www.linkedin.com/company/microsoft-azure/',
            github: 'https://github.com/Azure'
        },
        {
            name: '',
            contribution: 'Upcoming Partner',
            amount: 'Ξ0.00',
            link: '#',
            logo: 'assets/img/sponsors/minecraft_generic.png',
            description: '',
            twitter: '#',
            linkedin: '#',
            github: '#'
        },
        {
            name: '',
            contribution: 'Upcoming Partner',
            amount: 'Ξ0.00',
            link: '#',
            logo: 'assets/img/sponsors/minecraft_generic.png',
            description: '',
            twitter: '#',
            linkedin: '#',
            github: '#'
        }
    ];


    function renderSponsors() {
        const sponsorContainer = document.querySelector('.nft-collection-list-wrapper .nft-collection-grid');

        // Clear existing content
        sponsorContainer.innerHTML = '';

        // Add dynamic responsive styles
        addSponsorStyles();

        // Add each sponsor
        sponsors.forEach((sponsor, index) => {
            const sponsorElement = document.createElement('div');
            sponsorElement.setAttribute('role', 'listitem');
            sponsorElement.className = 'nft-collection-item w-dyn-item sponsor-card';
            sponsorElement.dataset.sponsorId = index;

            sponsorElement.innerHTML = `
                <div class="nft-link-container sponsor-link">
                    <div class="nft-circle-container sponsor-logo-container">
                        <div class="sponsor-logo-wrapper">
                            <img src="${sponsor.logo}" 
                                 loading="lazy" 
                                 alt="${sponsor.name}" 
                                 class="nft-image sponsor-logo" />
                        </div>
                    </div>
                    <div class="top-margin-m sponsor-info">
                        <p class="sponsor-contribution">${sponsor.contribution}</p>
                        <h3 class="regular-text sponsor-name">${sponsor.name}</h3>
                        <div class="sponsor-amount">${sponsor.amount}</div>
                    </div>
                </div>
            `;

            // Add click event to open modal
            sponsorElement.addEventListener('click', () => {
                openSponsorModal(sponsor);
            });

            sponsorContainer.appendChild(sponsorElement);
        });

        // Setup modal event listeners
        setupModalListeners();
    }

    function addSponsorStyles() {
        // Check if styles already exist
        if (document.getElementById('sponsor-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'sponsor-styles';
        styleSheet.innerHTML = `
            .nft-collection-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 30px;
                width: 100%;
                margin-top: 40px;
            }
            
            .sponsor-card {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                border-radius: 15px;
                overflow: hidden;
                background-color: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                cursor: pointer;
            }
            
            .sponsor-card:hover {
                transform: translateY(-10px);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
            }
            
            .sponsor-link {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 25px 15px;
                height: 100%;
                text-align: center;
                text-decoration: none;
                color: inherit;
            }
            
            .sponsor-logo-container {
                width: 120px;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
                margin-bottom: 20px;
                transition: transform 0.3s ease;
                overflow: hidden;
            }
            
            .sponsor-card:hover .sponsor-logo-container {
                transform: scale(1.1) rotate(5deg);
            }
            
            .sponsor-logo-wrapper {
                width: 85%;
                height: 85%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sponsor-logo {
                max-width: 100%;
                max-height: 100%;
                filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
            }
            
            .sponsor-info {
                width: 100%;
            }
            
            .sponsor-contribution {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
                margin-bottom: 8px;
                font-weight: 500;
            }
            
            .sponsor-name {
                margin-bottom: 10px;
                font-size: 1.2rem;
                font-weight: 600;
            }
            
            .sponsor-amount {
                font-size: 1.1rem;
                color: #FF4D5A;
                font-weight: 700;
                position: relative;
                display: inline-block;
            }
            
            .sponsor-amount:after {
                content: '';
                position: absolute;
                width: 0;
                height: 2px;
                bottom: -4px;
                left: 0;
                background-color: #FF4D5A;
                transition: width 0.3s ease;
            }
            
            .sponsor-card:hover .sponsor-amount:after {
                width: 100%;
            }
            
            @media (max-width: 991px) {
                .nft-collection-grid {
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                .sponsor-logo-container {
                    width: 100px;
                    height: 100px;
                }
            }
            
            @media (max-width: 767px) {
                .nft-collection-grid {
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 15px;
                }
                
                .sponsor-logo-container {
                    width: 80px;
                    height: 80px;
                }
                
                .sponsor-name {
                    font-size: 1rem;
                }
            }
            
            @media (max-width: 479px) {
                .nft-collection-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                
                .sponsor-link {
                    padding: 15px 10px;
                }
                
                .sponsor-contribution {
                    font-size: 0.8rem;
                }
                
                .sponsor-name {
                    font-size: 0.9rem;
                    margin-bottom: 5px;
                }
                
                .sponsor-amount {
                    font-size: 0.9rem;
                }
            }
        `;

        document.head.appendChild(styleSheet);
    }

    function setupModalListeners() {
        const modal = document.getElementById('sponsor-modal');
        const closeBtn = modal.querySelector('.modal-close');

        // Close modal when clicking the X button
        closeBtn.addEventListener('click', () => {
            closeModal();
        });

        // Close modal when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close modal when pressing ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    function openSponsorModal(sponsor) {
        const modal = document.getElementById('sponsor-modal');
        const modalContent = modal.querySelector('.modal-content');

        // Set modal content
        document.getElementById('modal-image').src = sponsor.logo;
        document.getElementById('modal-image').alt = sponsor.name;
        document.getElementById('modal-title').textContent = sponsor.name;
        document.getElementById('modal-contribution').textContent = sponsor.contribution;
        document.getElementById('modal-description').textContent = sponsor.description || 'No description available.';
        document.getElementById('modal-amount').textContent = sponsor.amount;

        // Set social links
        document.getElementById('modal-website').href = sponsor.link;
        document.getElementById('modal-twitter').href = sponsor.twitter || '#';
        document.getElementById('modal-linkedin').href = sponsor.linkedin || '#';
        document.getElementById('modal-github').href = sponsor.github || '#';
        document.getElementById('modal-link').href = sponsor.link;

        // Show the modal with animation
        modal.classList.add('show');
        setTimeout(() => {
            modalContent.classList.add('show');
        }, 10);

        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('sponsor-modal');
        const modalContent = modal.querySelector('.modal-content');

        // Hide modal with animation
        modalContent.classList.remove('show');
        setTimeout(() => {
            modal.classList.remove('show');
        }, 300);

        // Re-enable body scrolling
        document.body.style.overflow = '';
    }

    // Initialize sponsors section
    renderSponsors();
});
