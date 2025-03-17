// ✅ Function to check if the user is logged in
async function checkLoginStatus() {
    try {
        const response = await fetch("https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net/api/user", {
            method: "GET",
            credentials: "include" // 🔥 Ensures cookies are sent with the request
        });

        const data = await response.json();
        console.log("User Data:", data);

        if (data.isAuthenticated) {
            // ✅ Redirect to profile page if logged in
            window.location.href = "/profile.html";
        }
    } catch (error) {
        console.error("Error checking login status:", error);
    }
}

// ✅ Function to dynamically set the GitHub login URL
function setupGitHubLogin() {
    if (typeof config !== 'undefined' && config.GITHUB_AUTH_URL) {
        const loginBtn = document.querySelector('.login__button');
        if (loginBtn) {
            loginBtn.href = config.GITHUB_AUTH_URL;
            console.log("GitHub Login URL Set:", config.GITHUB_AUTH_URL);
        }
    } else {
        console.error("config.js is not loaded or GITHUB_AUTH_URL is undefined");
    }
}

// ✅ Function to create animated particles (Original Code)
function createParticles() {
    const particles = document.querySelector('.particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3});
            left: ${Math.random() * 100}vw;
            top: ${Math.random() * 100}vh;
            border-radius: 50%;
            pointer-events: none;
            opacity: 0;
            animation: particleFloat ${Math.random() * 3 + 2}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        particles.appendChild(particle);
    }
}

// ✅ Function to handle background hover effects (Original Code)
function setupHoverEffects() {
    const circles = document.querySelectorAll('.background span');
    circles.forEach(circle => {
        circle.addEventListener('mouseover', () => {
            circle.style.transform = 'scale(1.1)';
            circle.style.transition = 'transform 0.3s ease';
        });

        circle.addEventListener('mouseout', () => {
            circle.style.transform = 'scale(1)';
        });
    });
}

// ✅ Function to add mouse movement animation to the login card (Original Code)
function setupCardAnimation() {
    document.addEventListener('mousemove', (e) => {
        const card = document.querySelector('.login__card');
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const angleX = (y - centerY) / 30;
        const angleY = (centerX - x) / 30;

        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    });

    // ✅ Reset card position when mouse leaves
    document.querySelector('.login__card').addEventListener('mouseleave', () => {
        const card = document.querySelector('.login__card');
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
}

// ✅ Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔹 Page Loaded: Initializing login script...");
    
    checkLoginStatus();  // ✅ Check if the user is already logged in
    setupGitHubLogin();  // ✅ Set the GitHub login button URL
    createParticles();    // ✅ Load animated particles
    setupHoverEffects();  // ✅ Add background hover effects
    setupCardAnimation(); // ✅ Add login card animation
});
