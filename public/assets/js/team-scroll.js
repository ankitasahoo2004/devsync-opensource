document.addEventListener('DOMContentLoaded', () => {
    const teamMembers = document.querySelectorAll('.team_member');
    const images = document.querySelectorAll('.image');

    // Create an Intersection Observer
    const options = {
        root: null,
        rootMargin: '-50% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Get the member ID
                const memberId = entry.target.getAttribute('data-member');

                // Remove active class from all items
                teamMembers.forEach(member => member.classList.remove('active'));
                images.forEach(image => image.classList.remove('active'));

                // Add active class to matching items
                entry.target.classList.add('active');
                document.querySelector(`.image[data-member="${memberId}"]`).classList.add('active');
            }
        });
    }, options);

    // Observe all team members
    teamMembers.forEach(member => {
        observer.observe(member);
    });
});
