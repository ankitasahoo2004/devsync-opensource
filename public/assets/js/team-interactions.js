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
            role: 'Founder, Design Lead & Frontend Developer',
            description: `<p>Creative Frontend Developer passionate about building responsive, user-friendly interfaces. I stay up-to-date with the latest technologies to craft elegant digital solutions, currently leading Design and Frontend at DevSync.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/ankita-priyadarshini-sahoo-529517291/',
            github: 'https://github.com/ankitasahoo2004',
            instagram: 'https://www.instagram.com/_.ankitasahoo._/'
        },
        'member-shubham': {
            name: 'Shubham Kumar',
            role: 'Founder & Mern Stack Developer',
            description: `<p>Enthusiastic frontend developer with a knack for creating visually appealing and user-friendly web applications. Committed to delivering high-quality code and continuously learning new technologies.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/shubham-kumar-0b1a1a1b8/',
            github: 'https://github.com/Shubham66020',
            instagram: 'https://www.instagram.com/shubhamkumar_0b1a1a1b8/'
        },
        'member-sayan': {
            name: 'Sayan Karmakar',
            role: 'Founder & Backend Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/sayan-karmakar-01239a242/',
            github: 'https://github.com/Sayan-dev731',
            instagram: 'https://www.instagram.com/code_it884/'
        },
        'member-kunal': {
            name: 'Kunal Sharma',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/kunal-kumar-2ab402263/',
            github: 'https://github.com/ku12al',
            instagram: 'https://www.instagram.com/kunal_sharma7739/'
        },
        'member-susmita': {
            name: 'Susmita Mahato',
            role: 'Graphic Designer',
            description: `<p>Passionate Graphic Designer with a strong foundation in web technologies, dedicated to creating visually engaging and user-friendly designs. Currently contributing to design and visual strategy at DevSync.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/susmita-mahato-29707b31b/',
            github: 'https://github.com/SusmitaMahato',
            instagram: 'https://www.instagram.com/susmita_1282006/'
        },
        'member-aditya': {
            name: 'Aditya Sinha',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/aditya-sinha-1952172a0/',
            github: 'https://github.com/dev-adityasinha',
            instagram: 'https://www.instagram.com/id.adityasinha/'
        },
        'member-ansh': {
            name: 'Ansh Raj',
            role: 'Code Riewer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/ansh-raj-b66960317/',
            github: 'https://github.com/anshraj-21',
            instagram: 'https://www.instagram.com/ansh_pvtx21?igsh=MTVzYmNmcjhraHloYw%3D%3D'
        },
        'member-riya': {
            name: 'Riya Ghosh',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/riya-ghosh-07b74732a/',
            github: 'https://github.com/Riya-1606',
            instagram: 'https://www.instagram.com/riya_160607/'
        },
        'member-shubham': {
            name: 'Shubham Raj',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/shubham-raj-a0a123324/',
            github: 'https://github.com/Shubham06-Code',
            instagram: 'https://www.instagram.com/'
        },
        'member-tripti': {
            name: 'Tripti Kumari',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/tripti-kumari-58405632a/',
            github: 'https://github.com/Tripti-30',
            instagram: 'https://www.instagram.com/triptik806/'
        },
        'member-subhalaxmi': {
            name: 'A B Subhalaxmi',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/a-b-subhalaxmi-1aa6a5344/',
            github: 'https://github.com/subhalaxmi2307',
            instagram: 'https://www.instagram.com/itsjusttt_a.b?igsh=MWZoY2k2amh5c3Z4Nw%3D%3D'
        },
        'member-shahanwaz': {
            name: 'Shahanwaz',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/md-shahanwaz-/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/'
        },
        'member-aditya': {
            name: 'Aditya Kumar',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/aditya-kumar-46bb7524b/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/'
        },
        'member-tisha': {
            name: 'Tisha Jeswani',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/tisha-jeswani-0a9441342/',
            github: 'https://github.com/tishajeswani33',
            instagram: 'https://www.instagram.com/_._tisha_2505/'
        },
        'member-umang': {
            name: 'Umang Bhasin',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/umang-bhasin-b7878a294/',
            github: 'https://github.com/UmangBhasin',
            instagram: 'https://www.instagram.com/_umang__11?igsh=NjFudDdrMWY1dmFo'
        },
        'member-samriddhi': {
            name: 'Samriddhi Chandak',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/samriddhi-chandak-19b40430b/',
            github: 'https://github.com/samm00711',
            instagram: 'https://www.instagram.com/samriddhi.hie_/'
        },
        'member-rishikesh': {
            name: 'Rishikesh Raj',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/rishikesh-raj-b68642250/',
            github: 'https://github.com/Rishikesh-001',
            instagram: 'https://www.instagram.com/_raj_rishikesh'
        },
        'member-bhavya': {
            name: 'Bhavya Priyadarshini',
            role: 'Founder & Full Stack Developer',
            description: `<p>A frontend developer who loves turning ideas into clean, creative web experiences. I'm still figuring things out, learning as I go, and having a bit of fun along the way.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/bhavya-priyadarshani-ab127928a/',
            github: 'https://github.com/05bhavs',
            instagram: 'https://www.instagram.com/its_.bhavs?igsh=MWo5cmUwcndnODFkeQ%3D%3D&utm_source=qr'
        },
        'member-rishi': {
            name: 'Rishi Soni',
            role: 'Founder & Full Stack Developer',
            description: `<p>My name is Rishi, a 2nd-year B.Tech student from a tier 3 college with a strong passion for coding and technology. Founder of The Coding Planet, Tech Lead of Infinity Coders Club, and a Microsoft Beta Student Ambassador. Interests: AI, ML, Java. Projects: Jarvis assistant (Python), GenAI image converter (GANs). Certified in Azure, ML, GenAI, Cloud. Passionate mentor and community builder.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/rishi-soni-28986923b/',
            github: 'https://github.com/rishi02soni',
            instagram: 'https://www.instagram.com/rishi.soni03/'
        },
        'member-vineet': {
            name: 'Vineet Dubey',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/vineet-dubey64/',
            github: 'https://github.com/VineetDubey4',
            instagram: 'https://www.instagram.com/theonly_vineet/'
        },
        'member-rudra': {
            name: 'Rudra Prakash Sahu',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/rudra-prakash-sahu-981b90315/',
            github: 'https://github.com/hs-rudra-05',
            instagram: 'https://www.instagram.com/rudra_prakash005/'
        },
        'member-karthik': {
            name: 'Karthik Gupta',
            role: 'Founder & Full Stack Developer',
            description: `<p>Hi everyone! I hope you're doing well. I am Karthik. In this DevSync, I'm currently working on testing. I'm focusing on ensuring everything runs smoothly..!</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/kartik-gupta-275873331/',
            github: 'https://github.com/kartik-gupta-26',
            instagram: 'https://www.instagram.com/'
        },
        'member-aryan': {
            name: 'Aryan Baibhav',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/aryan-baibhav01/',
            github: 'https://github.com/Aryanbaibhav',
            instagram: 'https://www.instagram.com/_aryan_0x0_/'
        },
        'member-krish': {
            name: 'Krish Maurya',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/krish-maurya-59699732b/',
            github: 'https://github.com/krishmaurya21',
            instagram: 'https://www.instagram.com/krrishmaurya21/'
        },
        'member-livas': {
            name: 'T. Livas',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/',
            github: 'https://github.com/',
            instagram: 'https://www.instagram.com/__.livas?igsh=MTI2M3ludWY3YXQ3bw%3D%3D'
        },
        'member-nitesh': {
            name: 'Nitesh Raj',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/',
            github: 'https://github.com/niteshraj2310',
            instagram: 'https://www.instagram.com/nitesh.svg'
        },
        'member-amritesh': {
            name: 'Amritesh Raj',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/amritesh-raj-6710bb328/',
            github: 'https://github.com/Amritesh-001',
            instagram: 'https://www.instagram.com/amritesh.4709'
        },
        'member-divyanshu': {
            name: 'Divyanshu Soni',
            role: 'Founder & Full Stack Developer',
            description: `<p>Passionate frontend developer with a strong foundation in web technologies. Dedicated to building responsive and interactive web applications that enhance user experience.</p>
                         <p>Skills: HTML5, CSS3, JavaScript, React, UI/UX Design</p>`,
            linkedin: 'https://www.linkedin.com/in/divyanshu-soni-938468334/',
            github: 'https://github.com/DivyanshuXOR',
            instagram: 'https://www.instagram.com/divyanshu._.soni_22/'
        },
        // Add more team member data as needed
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
