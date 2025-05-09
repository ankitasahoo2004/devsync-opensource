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
            role: 'Founder & Frontend Developer',
            description: `<p>Creative Frontend Developer passionate about building responsive, user-friendly interfaces. I specialize in translating design concepts into functional, accessible web experiences while maintaining clean code standards and performance optimization.</p>
                     <p>Skills: HTML5, CSS3, JavaScript, React, Responsive Design, UI/UX Principles, Figma, Git</p>`,
            linkedin: 'https://www.linkedin.com/in/ankita-priyadarshini-sahoo-529517291/',
            github: 'https://github.com/ankitasahoo2004',
            instagram: 'https://www.instagram.com/_.ankitasahoo._/'
        },
        'member-shubham': {
            name: 'Shubham Kumar',
            role: 'Founder & Mern Stack Developer',
            description: `<p>Full-stack developer specializing in the MERN stack with experience in building scalable web applications. Focused on creating efficient server-side architectures and seamless frontend-backend integration.</p>
                     <p>Skills: MongoDB, Express.js, React, Node.js, REST APIs, JWT Authentication, Mongoose</p>`,
            linkedin: 'https://www.linkedin.com/in/shubham-yadav-07199a24b/',
            github: 'https://github.com/Shubham66020',
            instagram: 'https://www.instagram.com/shubham._.yadav._/'
        },
        'member-sayan': {
            name: 'Sayan Karmakar',
            role: 'Founder & Backend Developer',
            description: `<p>Backend specialist focused on server-side logic, database architecture, and API development. Committed to building secure, high-performance systems that power seamless user experiences.</p>
                     <p>Skills: Node.js, Express, MongoDB, SQL, API Development, Authentication, Performance Optimization</p>`,
            linkedin: 'https://www.linkedin.com/in/sayan-karmakar-01239a242/',
            github: 'https://github.com/Sayan-dev731',
            instagram: 'https://www.instagram.com/code_it884/'
        },
        'member-kunal': {
            name: 'Kunal Sharma',
            role: 'Founder & Full Stack Developer',
            description: `<p>Versatile developer experienced in both frontend and backend technologies. Capable of handling all aspects of web development from concept to deployment while ensuring cross-platform compatibility.</p>
                     <p>Skills: React, Node.js, Express, MongoDB, RESTful APIs, Git, AWS Basics, CI/CD Pipelines</p>`,
            linkedin: 'https://www.linkedin.com/in/kunal-kumar-2ab402263/',
            github: 'https://github.com/ku12al',
            instagram: 'https://www.instagram.com/kunal_sharma7739/'
        },
        'member-susmita': {
            name: 'Susmita Mahato',
            role: 'Graphic Designer',
            description: `<p>Creative visual designer specializing in digital media with a strong understanding of branding principles. Creates compelling visual assets that enhance user engagement and communicate brand identity effectively.</p>
                     <p>Skills: Adobe Photoshop, Illustrator, Figma, UI Design, Branding, Typography, Color Theory</p>`,
            linkedin: 'https://www.linkedin.com/in/susmita-mahato-29707b31b/',
            github: 'https://github.com/SusmitaMahato',
            instagram: 'https://www.instagram.com/susmita_1282006/'
        },
        'member-aditya': {
            name: 'Aditya Sinha',
            role: 'Mern Stack Developer, Frontend Lead',
            description: `<p>Technical lead specializing in MERN stack development with a focus on frontend architecture. Implements best practices for state management, component reuse, and performance optimization in complex applications.</p>
                     <p>Skills: React Hooks, Redux, Context API, Next.js, TypeScript, Storybook, Jest Testing</p>`,
            linkedin: 'https://www.linkedin.com/in/aditya-sinha-1952172a0/',
            github: 'https://github.com/dev-adityasinha',
            instagram: 'https://www.instagram.com/id.adityasinha/'
        },
        'member-ansh': {
            name: 'Ansh Raj',
            role: 'Code Reviewer',
            description: `<p>Detail-oriented developer focused on maintaining code quality through comprehensive reviews. Ensures adherence to coding standards, identifies potential issues, and suggests optimizations for better maintainability.</p>
                     <p>Skills: Code Analysis, Debugging, Performance Review, Documentation, ESLint, Prettier, Git</p>`,
            linkedin: 'https://www.linkedin.com/in/ansh-raj-b66960317/',
            github: 'https://github.com/anshraj-21',
            instagram: 'https://www.instagram.com/ansh_pvtx21?igsh=MTVzYmNmcjhraHloYw%3D%3D'
        },
        'member-riya': {
            name: 'Riya Ghosh',
            role: 'Graphic Designer',
            description: `<p>Visual designer creating engaging digital experiences through thoughtful composition and brand-aligned aesthetics. Specializes in creating marketing materials, social media graphics, and UI components.</p>
                     <p>Skills: Adobe Creative Suite, Canva, UI Prototyping, Illustration, Visual Hierarchy, Design Systems</p>`,
            linkedin: 'https://www.linkedin.com/in/riya-ghosh-07b74732a/',
            github: 'https://github.com/Riya-1606',
            instagram: 'https://www.instagram.com/riya_160607/'
        },
        'member-shubhamR': {
            name: 'Shubham Raj',
            role: 'Developer',
            description: `<p>Software developer contributing to various aspects of application development. Implements features, fixes bugs, and collaborates with team members to deliver functional and efficient solutions.</p>
                     <p>Skills: JavaScript, React Basics, Git Version Control, Problem Solving, Agile Methodologies</p>`,
            linkedin: 'https://www.linkedin.com/in/shubham-raj-a0a123324/',
            github: 'https://github.com/Shubham06-Code',
            instagram: 'https://www.instagram.com/'
        },
        'member-tripti': {
            name: 'Tripti Kumari',
            role: 'Media Scheduling',
            description: `<p>Content strategist responsible for planning and coordinating media distribution across platforms. Ensures consistent messaging and optimal timing for maximum audience engagement and brand visibility.</p>
                     <p>Skills: Content Calendars, Social Media Platforms, Analytics Tools, Hootsuite, Buffer, Canva</p>`,
            linkedin: 'https://www.linkedin.com/in/tripti-kumari-58405632a/',
            github: 'https://github.com/Tripti-30',
            instagram: 'https://www.instagram.com/triptik806/'
        },
        'member-subhalaxmi': {
            name: 'A B Subhalaxmi',
            role: 'Design Contributor',
            description: `<p>Creative contributor assisting with design tasks including asset creation, layout refinement, and visual concept development. Supports the design team in maintaining visual consistency across platforms.</p>
                     <p>Skills: Figma Components, Adobe XD, Design Collaboration, Asset Export, Style Guide Adherence</p>`,
            linkedin: 'https://www.linkedin.com/in/a-b-subhalaxmi-1aa6a5344/',
            github: 'https://github.com/subhalaxmi2307',
            instagram: 'https://www.instagram.com/itsjusttt_a.b?igsh=MWZoY2k2amh5c3Z4Nw%3D%3D'
        },
        'member-shahanwaz': {
            name: 'Shahanwaz',
            role: 'Full Stack Developer',
            description: `<p>Versatile developer handling both client-side and server-side programming. Builds complete web applications with attention to security, scalability, and user experience.</p>
                     <p>Skills: React, Node.js, Database Design, API Integration, Deployment, Docker Basics, JWT</p>`,
            linkedin: 'https://www.linkedin.com/in/md-shahanwaz-/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/'
        },
        'member-aditya': {
            name: 'Aditya Kumar',
            role: 'API Developer',
            description: `<p>Specialist in designing and implementing robust APIs that serve as the backbone for web and mobile applications. Focuses on creating well-documented, versioned, and secure interfaces.</p>
                     <p>Skills: RESTful API Design, GraphQL, Swagger/OpenAPI, Postman, Rate Limiting, Caching</p>`,
            linkedin: 'https://www.linkedin.com/in/aditya-kumar-46bb7524b/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/'
        },
        'member-tisha': {
            name: 'Tisha Jeswani',
            role: 'Sponsorship Outreach',
            description: `<p>Partnership coordinator responsible for identifying and engaging potential sponsors. Develops sponsorship packages and maintains relationships with partners to support organizational goals.</p>
                     <p>Skills: Proposal Writing, Networking, Partnership Development, CRM Tools, Communication</p>`,
            linkedin: 'https://www.linkedin.com/in/tisha-jeswani-0a9441342/',
            github: 'https://github.com/tishajeswani33',
            instagram: 'https://www.instagram.com/_._tisha_2505/'
        },
        'member-umang': {
            name: 'Umang Bhasin',
            role: 'Sponsorship Outreach',
            description: `<p>Business development specialist focused on creating sponsorship opportunities and strategic partnerships. Works to align sponsor objectives with organizational needs for mutual benefit.</p>
                     <p>Skills: Negotiation, Market Research, Presentation Skills, Relationship Management</p>`,
            linkedin: 'https://www.linkedin.com/in/umang-bhasin-b7878a294/',
            github: 'https://github.com/UmangBhasin',
            instagram: 'https://www.instagram.com/_umang__11?igsh=NjFudDdrMWY1dmFo'
        },
        'member-samriddhi': {
            name: 'Samriddhi Chandak',
            role: 'Sponsorship Outreach',
            description: `<p>Engagement coordinator building relationships with potential sponsors and partners. Develops customized sponsorship proposals and tracks engagement metrics to measure success.</p>
                     <p>Skills: Outreach Campaigns, Email Marketing, Follow-up Strategies, Benefit Fulfillment</p>`,
            linkedin: 'https://www.linkedin.com/in/samriddhi-chandak-19b40430b/',
            github: 'https://github.com/samm00711',
            instagram: 'https://www.instagram.com/samriddhi.hie_/'
        },
        'member-rishikesh': {
            name: 'Rishikesh Raj',
            role: 'Team Management',
            description: `<p>Operations lead coordinating team activities and workflows. Facilitates communication between departments and ensures projects stay on track through effective planning and resource allocation.</p>
                     <p>Skills: Agile Methodologies, Task Delegation, Conflict Resolution, Productivity Tools, Jira</p>`,
            linkedin: 'https://www.linkedin.com/in/rishikesh-raj-b68642250/',
            github: 'https://github.com/Rishikesh-001',
            instagram: 'https://www.instagram.com/_raj_rishikesh'
        },
        'member-bhavya': {
            name: 'Bhavya Priyadarshini',
            role: 'Project Verification',
            description: `<p>Quality assurance specialist reviewing project deliverables against requirements and standards. Identifies inconsistencies and potential improvements before final release.</p>
                     <p>Skills: Testing Procedures, Requirement Analysis, Feedback Delivery, Documentation Review</p>`,
            linkedin: 'https://www.linkedin.com/in/bhavya-priyadarshani-ab127928a/',
            github: 'https://github.com/05bhavs',
            instagram: 'https://www.instagram.com/its_.bhavs?igsh=MWo5cmUwcndnODFkeQ%3D%3D&utm_source=qr'
        },
        'member-rishi': {
            name: 'Rishi Soni',
            role: 'AI Developer',
            description: `<p>AI specialist developing intelligent systems and machine learning models. Implements algorithms for data processing, pattern recognition, and predictive analytics to enhance applications.</p>
                     <p>Skills: Python, TensorFlow, PyTorch, NLP, Computer Vision, Model Training, Azure AI</p>`,
            linkedin: 'https://www.linkedin.com/in/rishi-soni-28986923b/',
            github: 'https://github.com/rishi02soni',
            instagram: 'https://www.instagram.com/rishi.soni03/'
        },
        'member-vineet': {
            name: 'Vineet Dubey',
            role: 'Developer',
            description: `<p>Software engineer contributing to application development across the stack. Implements features, troubleshoots issues, and collaborates with team members to deliver quality solutions.</p>
                     <p>Skills: JavaScript, React Components, API Consumption, Debugging, Code Documentation</p>`,
            linkedin: 'https://www.linkedin.com/in/vineet-dubey64/',
            github: 'https://github.com/VineetDubey4',
            instagram: 'https://www.instagram.com/theonly_vineet/'
        },
        'member-rudra': {
            name: 'Rudra Prakash Sahu',
            role: 'Social Media Manager',
            description: `<p>Digital content strategist overseeing social media presence and engagement. Develops posting schedules, analyzes metrics, and implements campaigns to grow audience and interaction.</p>
                     <p>Skills: Content Strategy, Community Management, Analytics, Platform Algorithms, Trend Analysis</p>`,
            linkedin: 'https://www.linkedin.com/in/rudra-prakash-sahu-981b90315/',
            github: 'https://github.com/hs-rudra-05',
            instagram: 'https://www.instagram.com/rudra_prakash005/'
        },
        'member-karthik': {
            name: 'Karthik Gupta',
            role: 'Tester',
            description: `<p>Quality assurance engineer ensuring software reliability through systematic testing. Identifies, documents, and helps resolve defects while verifying fixes meet quality standards.</p>
                     <p>Skills: Test Case Development, Bug Tracking, Regression Testing, Selenium, Jest, Postman</p>`,
            linkedin: 'https://www.linkedin.com/in/kartik-gupta-275873331/',
            github: 'https://github.com/kartik-gupta-26',
            instagram: 'https://www.instagram.com/'
        },
        'member-aryan': {
            name: 'Aryan Baibhav',
            role: 'Outreach Manager',
            description: `<p>Community engagement specialist building relationships with external stakeholders. Coordinates participation in events and develops strategies to expand organizational reach and impact.</p>
                     <p>Skills: Public Relations, Event Coordination, Networking, Presentation Skills, CRM Tools</p>`,
            linkedin: 'https://www.linkedin.com/in/aryan-baibhav01/',
            github: 'https://github.com/Aryanbaibhav',
            instagram: 'https://www.instagram.com/_aryan_0x0_/'
        },
        'member-krish': {
            name: 'Krish Maurya',
            role: 'Lead Editor',
            description: `<p>Content editor ensuring all published materials meet quality standards. Reviews technical documentation, blog posts, and marketing content for clarity, accuracy, and consistency.</p>
                     <p>Skills: Copy Editing, Technical Writing, Style Guides, SEO Basics, Content Management</p>`,
            linkedin: 'https://www.linkedin.com/in/krish-maurya-59699732b/',
            github: 'https://github.com/krishmaurya21',
            instagram: 'https://www.instagram.com/krrishmaurya21/'
        },
        'member-livas': {
            name: 'T. Livas',
            role: 'Outreach Manager',
            description: `<p>Community relations specialist developing partnerships and engagement opportunities. Identifies collaboration prospects and represents the organization at external events and forums.</p>
                     <p>Skills: Partnership Development, Public Speaking, Networking Strategies, Brand Advocacy</p>`,
            linkedin: 'https://www.linkedin.com/in/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/__.livas?igsh=MTI2M3ludWY3YXQ3bw%3D%3D'
        },
        'member-nitesh': {
            name: 'Nitesh Raj',
            role: 'Project Reviewer',
            description: `<p>Technical reviewer evaluating project deliverables against specifications and best practices. Provides constructive feedback to improve code quality, architecture, and documentation.</p>
                     <p>Skills: Code Review, Architectural Assessment, Technical Feedback, Quality Metrics</p>`,
            linkedin: 'https://www.linkedin.com/in/',
            github: 'https://github.com/niteshraj2310',
            instagram: 'https://www.instagram.com/nitesh.svg'
        },
        'member-amritesh': {
            name: 'Amritesh Raj',
            role: 'Graphic Designer',
            description: `<p>Visual designer creating digital assets for web and social media platforms. Develops graphics that communicate brand identity and enhance user engagement across channels.</p>
                     <p>Skills: Adobe Creative Cloud, Brand Identity, Digital Illustration, Layout Design</p>`,
            linkedin: 'https://www.linkedin.com/in/amritesh-raj-6710bb328/',
            github: 'https://github.com/Amritesh-001',
            instagram: 'https://www.instagram.com/amritesh.4709'
        },
        'member-divyanshu': {
            name: 'Divyanshu Soni',
            role: 'Discord Moderator',
            description: `<p>Community manager overseeing Discord server operations and engagement. Facilitates discussions, enforces guidelines, and creates welcoming environments for members to connect.</p>
                     <p>Skills: Community Guidelines, Conflict Resolution, Engagement Strategies, Bot Management</p>`,
            linkedin: 'https://www.linkedin.com/in/divyanshu-soni-938468334/',
            github: 'https://github.com/DivyanshuXOR',
            instagram: 'https://www.instagram.com/divyanshu._.soni_22/'
        }
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
