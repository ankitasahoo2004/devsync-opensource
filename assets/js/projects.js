document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loadingState');
    const authContainer = document.getElementById('authContainer');

    const API_BASE_URL = 'https://devsync-backend.azurewebsites.net';

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
                <a href="${API_BASE_URL}/auth/github" class="button">
                    <i class='bx bxl-github'></i> Login with GitHub
                </a>
            </div>
        `;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;

        const formData = {
            repoLink: form.repoLink.value,
            ownerName: form.ownerName.value,
            technology: Array.from(form.technology.selectedOptions).map(opt => opt.value),
            description: form.description.value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Project submitted successfully!');
                form.reset();
            } else {
                throw new Error(data.error || 'Failed to submit project');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to submit project. Please try again.');
        }
    };

    const checkAuthAndInitialize = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user`, {
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
