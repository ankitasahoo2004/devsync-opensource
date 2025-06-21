function initializeTeamInteractions() {
    const container = document.querySelector('.grid');
    const teamMembers = document.querySelectorAll('.image');
    const teamNames = document.querySelectorAll('.team_member');

    function highlightTeamMember(memberName, controlId) {
        // Find corresponding elements
        const targetMember = [...teamMembers].find(member =>
            member.getAttribute('data-member') === memberName || member.id === controlId
        );
        const targetName = [...teamNames].find(name =>
            name.getAttribute('data-controls') === controlId ||
            name.querySelector('span').textContent.trim() === memberName
        );

        // Add highlight classes
        if (targetMember) {
            targetMember.classList.add('selected');
            teamMembers.forEach(member => {
                if (member !== targetMember) {
                    member.classList.add('faded');
                }
            });
        }

        if (targetName) {
            targetName.classList.add('active');
            // Add animation trigger for social link
            const socialLink = targetName.querySelector('a span');
            if (socialLink) {
                socialLink.style.transform = 'translateX(0)';
                socialLink.style.opacity = '1';
            }
            teamNames.forEach(name => {
                if (name !== targetName) {
                    name.classList.add('faded');
                    // Reset other social links
                    const otherLink = name.querySelector('a span');
                    if (otherLink) {
                        otherLink.style.transform = '';
                        otherLink.style.opacity = '';
                    }
                }
            });
        }
    }

    function resetHighlights() {
        teamMembers.forEach(member => {
            member.classList.remove('selected', 'faded');
        });
        teamNames.forEach(name => {
            name.classList.remove('active', 'faded');
            // Reset all social links
            const socialLink = name.querySelector('a span');
            if (socialLink) {
                socialLink.style.transform = '';
                socialLink.style.opacity = '';
            }
        });
    }

    // Handle image hover effects
    teamMembers.forEach(member => {
        member.addEventListener('mouseenter', () => {
            const memberName = member.getAttribute('data-member');
            const memberId = member.id;
            highlightTeamMember(memberName, memberId);
        });

        member.addEventListener('mouseleave', resetHighlights);
    });

    // Handle name hover effects
    teamNames.forEach(name => {
        name.addEventListener('mouseenter', () => {
            const controlId = name.getAttribute('data-controls');
            const memberName = name.querySelector('span').textContent.trim();
            highlightTeamMember(memberName, controlId);
        });

        name.addEventListener('mouseleave', resetHighlights);
    });

    // Handle name keyboard interactions
    teamNames.forEach(name => {
        name.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const controlId = name.getAttribute('data-controls');
                const memberName = name.querySelector('span').textContent.trim();
                highlightTeamMember(memberName, controlId);
            }
        });
    });
}

function initializeModal() {
    const modal = document.getElementById('user-modal');
    const modalContent = modal.querySelector('.modal-content');
    const closeBtn = document.getElementById('close-modal');

    const teamCards = document.querySelectorAll('[id^="member-"]');

    const teamData = {
        'member-ankita': {
            name: 'Ankita Priyadarshini Sahoo',
            role: 'Founder & CEO',
            description: `<p>Creative Frontend Developer passionate about building responsive, user-friendly interfaces. I specialize in translating design concepts into functional, accessible web experiences while maintaining clean code standards and performance optimization.</p>`,
            linkedin: 'https://www.linkedin.com/in/ankita-priyadarshini-sahoo-529517291/',
            github: 'https://github.com/ankitasahoo2004',
            instagram: 'https://www.instagram.com/_.ankitasahoo._/'
        },
        'member-shubham': {
            name: 'Shubham Kumar',
            role: 'Founder & COO',
            description: `<p>Full-stack developer specializing in the MERN stack with experience in building scalable web applications. Focused on creating efficient server-side architectures and seamless frontend-backend integration.</p>`,
            linkedin: 'https://www.linkedin.com/in/shubham-yadav-07199a24b/',
            github: 'https://github.com/Shubham66020',
            instagram: 'https://www.instagram.com/shubham._.yadav._/'
        },
        'member-sayan': {
            name: 'Sayan Karmakar',
            role: 'Founder & CTO',
            description: `<p>Backend specialist focused on server-side logic, database architecture, and API development. Committed to building secure, high-performance systems that power seamless user experiences.</p>`,
            linkedin: 'https://www.linkedin.com/in/sayan-karmakar-01239a242/',
            github: 'https://github.com/Sayan-dev731',
            instagram: 'https://www.instagram.com/code_it884/'
        },
        'member-ansh': {
            name: 'Ansh Raj',
            role: 'Community Manager',
            description: `<p>Detail-oriented developer focused on maintaining code quality through comprehensive reviews. Ensures adherence to coding standards, identifies potential issues, and suggests optimizations for better maintainability.</p>`,
            linkedin: 'https://www.linkedin.com/in/ansh-raj-b66960317/',
            github: 'https://github.com/anshraj-21',
            instagram: 'https://www.instagram.com/ansh_pvtx21?igsh=MTVzYmNmcjhraHloYw%3D%3D'
        },
        'member-krish': {
            name: 'Krish Maurya',
            role: 'Partnership Manager',
            description: `<p>Content editor ensuring all published materials meet quality standards. Reviews technical documentation, blog posts, and marketing content for clarity, accuracy, and consistency.</p>`,
            linkedin: 'https://www.linkedin.com/in/krish-maurya-59699732b/',
            github: 'https://github.com/krishmaurya21',
            instagram: 'https://www.instagram.com/krrishmaurya21/'
        },
        'member-divyanshu': {
            name: 'Divyanshu Soni',
            role: 'Creative Designer',
            description: `<p>Community manager overseeing Discord server operations and engagement. Facilitates discussions, enforces guidelines, and creates welcoming environments for members to connect.</p>`,
            linkedin: 'https://www.linkedin.com/in/divyanshu-soni-938468334/',
            github: 'https://github.com/DivyanshuXOR',
            instagram: 'https://www.instagram.com/divyanshu._.soni_22/'
        },
        'member-debasmita': {
            name: 'Debasmita Behera',
            role: 'Creative Producer',
            description: `<p>Community manager overseeing Discord server operations and engagement. Facilitates discussions, enforces guidelines, and creates welcoming environments for members to connect.</p>`,
            linkedin: 'https://www.linkedin.com/',
            github: 'https://github.com/debsmi',
            instagram: 'https://www.instagram.com/'
        },
        'member-naman': {
            name: 'Naman Soni',
            role: 'Full Stack Developer',
            description: `<p>Community manager overseeing Discord server operations and engagement. Facilitates discussions, enforces guidelines, and creates welcoming environments for members to connect.</p>`,
            linkedin: 'https://www.linkedin.com/in/namansoni18/',
            github: 'https://github.com/NamanSoni18',
            instagram: 'https://www.instagram.com/developer_naman.20'
        },
        'member-niraj': {
            name: 'Niraj Kumar Sharma',
            role: 'Visual Content Creator',
            description: `<p>Community manager overseeing Discord server operations and engagement. Facilitates discussions, enforces guidelines, and creates welcoming environments for members to connect.</p>`,
            linkedin: 'https://www.linkedin.com/in/niraj-kumar-sharma-3770b1213/',
            github: 'https://github.com/nikush1',
            instagram: 'https://www.instagram.com/nirajsharma_08'
        },
    };

    function openModal(memberId) {
        const data = teamData[memberId] || {
            name: 'Team Member',
            role: 'Developer',
            description: '<p>Team member description coming soon...</p>',
            linkedin: '#',
            github: '#',
            instagram: '#'
        };

        const img = document.querySelector(`#${memberId} img`);

        document.getElementById('modal-image').src = img.src;
        document.getElementById('modal-name').textContent = data.name;
        document.getElementById('modal-role').textContent = data.role;
        document.getElementById('modal-description').innerHTML = data.description;
        document.getElementById('modal-linkedin').href = data.linkedin;
        document.getElementById('modal-github').href = data.github;
        document.getElementById('modal-instagram').href = data.instagram;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalContent.classList.add('show');
            });
        });
    }

    function closeModal() {
        modalContent.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }

    teamCards.forEach(card => {
        const img = card.querySelector('img');
        if (img) {
            img.addEventListener('click', () => openModal(card.id));
        }
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeTeamInteractions();

    // Smooth scroll to team member when clicking on name
    const teamMembers = document.querySelectorAll('.team_member');
    teamMembers.forEach(member => {
        member.addEventListener('click', () => {
            const targetId = member.getAttribute('data-controls');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    });

    // Intersection Observer for scroll-based animations
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all team members and images
    const elementsToAnimate = document.querySelectorAll('.team_member, .image');
    elementsToAnimate.forEach((element, index) => {
        element.style.setProperty('--animation-order', index + 1);
        observer.observe(element);
    });

    // Handle hover interactions
    const grid = document.querySelector('.grid');
    const allItems = document.querySelectorAll('.team_member, .image');

    grid.addEventListener('mouseover', () => {
        grid.classList.add('has-hover');
    });

    grid.addEventListener('mouseout', () => {
        grid.classList.remove('has-hover');
    });

    initializeModal();
});
