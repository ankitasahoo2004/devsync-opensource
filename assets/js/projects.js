document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const authContainer = document.getElementById('authContainer');
    const projectForm = document.getElementById('projectForm');

    // Add loading state UI
    function showLoading(message = 'Loading...') {
        loadingState.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        loadingState.style.display = 'block';
    }

    // Add error state UI
    function showError(message) {
        loadingState.innerHTML = `
            <div class="error-state">
                <i class='bx bx-error-circle'></i>
                <p>${message}</p>
                <button onclick="window.location.reload()">Try Again</button>
            </div>
        `;
        loadingState.style.display = 'block';
    }

    // Enhance form validation
    function validateForm(formData) {
        const errors = [];

        if (!formData.repoLink.match(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/)) {
            errors.push('Please enter a valid GitHub repository URL');
        }

        if (formData.description.length < 50) {
            errors.push('Description must be at least 50 characters');
        }

        if (formData.technology.length === 0) {
            errors.push('Please select at least one technology');
        }

        return errors;
    }

    // Handle form submission with enhanced error handling
    async function handleSubmit(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Submitting...';

        const formData = {
            repoLink: e.target.repoLink.value,
            ownerName: e.target.ownerName.value,
            technology: Array.from(e.target.technology.selectedOptions).map(opt => opt.value),
            description: e.target.description.value
        };

        const errors = validateForm(formData);
        if (errors.length > 0) {
            alert(errors.join('\n'));
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/projects', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess('Project submitted successfully!');
                e.target.reset();
            } else {
                throw new Error(data.error || 'Failed to submit project');
            }
        } catch (error) {
            showError(error.message || 'Failed to submit project. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }

    // Success message UI
    function showSuccess(message) {
        const successAlert = document.createElement('div');
        successAlert.className = 'success-alert';
        successAlert.innerHTML = `
            <i class='bx bx-check-circle'></i>
            <p>${message}</p>
        `;
        document.body.appendChild(successAlert);

        setTimeout(() => {
            successAlert.remove();
        }, 3000);
    }

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
                    <label for="technology">Technologies Used</label>
                    <select id="technology" name="technology" multiple required class="technology-select">
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                        <option value="php">PHP</option>
                        <option value="ruby">Ruby</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                        <option value="typescript">TypeScript</option>
                    </select>
                    <small class="helper-text">Click to select multiple technologies (use Ctrl/Cmd + Click)</small>
                </div>

                <div class="form-group">
                    <label for="description">Project Description</label>
                    <textarea id="description" name="description" required 
                              placeholder="Describe your project and what kind of contributors you're looking for..."></textarea>
                </div>

                <button type="submit" class="submit-button">
                    <i class='bx bx-upload'></i>
                    Submit Project
                </button>
            </form>
        `;

        const technologySelect = document.getElementById('technology');
        technologySelect.size = 5;

        // Initialize form submission handler
        document.getElementById('projectForm').addEventListener('submit', handleSubmit);
    };

    const showLoginPrompt = () => {
        authContainer.innerHTML = `
            <div class="auth-prompt">
                <h3>Please log in to submit a project</h3>
                <a href="http://localhost:3000/auth/github" class="button">
                    <i class='bx bxl-github'></i> Login with GitHub
                </a>
            </div>
        `;
    };

    const checkAuthAndInitialize = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/user', {
                credentials: 'include'
            });
            const data = await response.json();

            loadingState.style.display = 'none';
            authContainer.style.display = 'block';

            if (data.isAuthenticated) {
                showProjectForm();
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

    // Start the authentication check process
    checkAuthAndInitialize();
});
