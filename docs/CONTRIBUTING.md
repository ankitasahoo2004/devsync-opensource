# Contributing Guide

## 🤝 Welcome Contributors!

Thank you for your interest in contributing to DevSync! This guide will help you understand how to contribute effectively to the project, whether you're fixing a bug, adding a feature, or improving documentation.

## 🎯 How to Contribute

### Types of Contributions

We welcome all types of contributions:

- 🐛 **Bug Fixes**: Help us identify and fix issues
- ✨ **Feature Development**: Add new functionality
- 📚 **Documentation**: Improve or add documentation
- 🎨 **UI/UX Improvements**: Enhance user experience
- 🧪 **Testing**: Add or improve test coverage
- 🔧 **DevOps**: Improve development and deployment processes
- 🌐 **Translations**: Help make DevSync accessible globally

### Ways to Get Started

1. **Browse Issues**: Look for issues labeled `good first issue` or `help wanted`
2. **Report Bugs**: Found a bug? Create a detailed issue report
3. **Suggest Features**: Have an idea? Open a feature request
4. **Improve Documentation**: Help others understand the codebase
5. **Review Pull Requests**: Help review and test pending changes

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/devsync.git
cd devsync

# Add upstream remote
git remote add upstream https://github.com/original-repo/devsync.git
```

### 2. Set Up Development Environment

Follow the [Setup Guide](SETUP_GUIDE.md) to configure your local development environment:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file with development values
# Start development server
npm run dev
```

### 3. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# OR for bug fixes
git checkout -b fix/issue-description
```

## 📝 Development Workflow

### 1. Coding Standards

#### JavaScript Style Guide

- Use **ES6+** features and modern JavaScript
- Follow **camelCase** for variables and functions
- Use **PascalCase** for classes and constructors
- Use **UPPER_SNAKE_CASE** for constants
- Prefer **const** over **let**, avoid **var**

**Example:**
```javascript
// Good
const API_BASE_URL = 'https://api.github.com';
const userController = new UserController();

async function getUserContributions(username) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${username}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

// Avoid
var api_url = 'https://api.github.com';
function get_user_data(user) {
  // ...
}
```

#### CSS Guidelines

- Use **BEM methodology** for class naming
- Prefer **CSS Grid** and **Flexbox** for layouts
- Use **CSS custom properties** for theming
- Follow **mobile-first** responsive design

**Example:**
```css
/* Good */
.project-card {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--border-radius);
}

.project-card__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.project-card__meta {
  color: var(--text-muted);
}

/* Responsive */
@media (min-width: 768px) {
  .project-card {
    grid-template-columns: 1fr 2fr;
  }
}
```

#### File Organization

```
New Feature Structure:
├── models/NewModel.js          # Database schema
├── routes/newRoutes.js         # API endpoints
├── controllers/newController.js # Business logic
├── middleware/newMiddleware.js  # Custom middleware
├── utils/newUtils.js           # Utility functions
├── public/new-page.html        # Frontend page
├── public/assets/css/new.css   # Styles
├── public/assets/js/new.js     # Frontend logic
└── templates/newEmail.html     # Email template
```

### 2. Commit Guidelines

#### Commit Message Format

Follow the **Conventional Commits** specification:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
# Feature
git commit -m "feat(auth): add GitHub OAuth integration"

# Bug fix
git commit -m "fix(api): resolve user profile sync issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api): redesign user authentication flow

BREAKING CHANGE: The authentication API has been redesigned.
Existing integrations will need to be updated."
```

#### Commit Best Practices

- **Make atomic commits**: One logical change per commit
- **Write clear messages**: Explain what and why, not how
- **Reference issues**: Include issue numbers when applicable
- **Keep commits small**: Easier to review and revert if needed

### 3. Pull Request Process

#### Before Creating a PR

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Rebase your feature branch
git checkout feature/your-feature
git rebase main

# Run tests
npm test

# Check code quality
npm run lint
```

#### Creating a Pull Request

1. **Use the PR template** (automatically loaded)
2. **Write a clear title** following commit message format
3. **Describe changes** thoroughly in the description
4. **Link related issues** using keywords like "Fixes #123"
5. **Add screenshots** for UI changes
6. **Request reviews** from relevant maintainers

#### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue_number)

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### 4. Code Review Process

#### For Contributors

- **Be responsive** to feedback
- **Ask questions** if feedback is unclear
- **Make requested changes** promptly
- **Test thoroughly** before requesting re-review

#### For Reviewers

- **Be constructive** and helpful
- **Explain reasoning** behind suggestions
- **Test the changes** when possible
- **Approve when ready** or request specific changes

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test -- --grep "User Model"

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Writing Tests

#### Unit Tests

```javascript
// tests/models/User.test.js
const User = require('../../models/User');

describe('User Model', () => {
  describe('Badge Assignment', () => {
    it('should assign First Contribution badge for 1 merged PR', async () => {
      const user = new User({
        githubId: '12345',
        username: 'testuser',
        email: 'test@example.com',
        mergedPRs: [{
          repoId: 'test/repo',
          prNumber: 1,
          title: 'Test PR',
          mergedAt: new Date()
        }]
      });

      await user.save();
      const badges = await assignBadges(user);
      
      expect(badges).toContain('First Contribution');
    });
  });
});
```

#### Integration Tests

```javascript
// tests/api/auth.test.js
const request = require('supertest');
const app = require('../../app');

describe('Authentication API', () => {
  it('should redirect to GitHub OAuth', async () => {
    const response = await request(app)
      .get('/auth/github')
      .expect(302);
    
    expect(response.headers.location).toContain('github.com');
  });
});
```

### Test Coverage Requirements

- **Minimum 80%** overall coverage
- **New features** must include comprehensive tests
- **Bug fixes** should include regression tests
- **Critical paths** require 95%+ coverage

## 📚 Documentation Standards

### Code Documentation

#### Function Documentation

```javascript
/**
 * Calculate points for user contributions
 * @param {Array} mergedPRs - Array of merged pull requests
 * @param {string} userId - GitHub user ID
 * @returns {Promise<number>} Total points earned
 * @throws {Error} When calculation fails
 * 
 * @example
 * const points = await calculatePoints(user.mergedPRs, user.githubId);
 * console.log(`User earned ${points} points`);
 */
async function calculatePoints(mergedPRs, userId) {
  // Implementation...
}
```

#### API Documentation

```javascript
/**
 * @route GET /api/user/stats
 * @description Get user statistics and contribution data
 * @access Private (requires authentication)
 * @param {string} req.user.githubId - Authenticated user's GitHub ID
 * @returns {Object} User statistics including points, badges, and contributions
 * @example
 * // Response
 * {
 *   "totalContributions": 15,
 *   "totalPoints": 750,
 *   "badges": ["Newcomer", "Active Contributor"],
 *   "rank": 12
 * }
 */
```

### README Updates

When adding new features, update relevant README sections:

- **Installation instructions** for new dependencies
- **Configuration** for new environment variables
- **Usage examples** for new features
- **API documentation** for new endpoints

## 🐛 Bug Reporting

### Creating Effective Bug Reports

#### Use the Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. Windows 10, macOS Big Sur, Ubuntu 20.04]
- Browser: [e.g. Chrome 91, Firefox 89, Safari 14]
- Node.js Version: [e.g. 16.14.0]
- DevSync Version: [e.g. 1.2.3]

## Additional Context
Add any other context about the problem here.
```

#### Bug Report Best Practices

- **Search existing issues** before creating new ones
- **Provide minimal reproduction** steps
- **Include error messages** and stack traces
- **Test on latest version** when possible
- **Be specific** about the environment

## ✨ Feature Requests

### Creating Feature Requests

#### Use the Feature Request Template

```markdown
## Feature Summary
Brief description of the feature you're proposing.

## Problem Statement
What problem does this feature solve? Who would benefit from it?

## Proposed Solution
Detailed description of how you envision this feature working.

## Alternatives Considered
What other solutions have you considered?

## Additional Context
Any other context, screenshots, or examples that would help.

## Implementation Ideas
If you have ideas about how to implement this, share them here.
```

#### Feature Request Guidelines

- **Align with project goals** and vision
- **Consider existing alternatives** before proposing
- **Provide use cases** and user stories
- **Think about implementation** complexity
- **Be open to discussion** and iteration

## 🏆 Recognition

### Contribution Recognition

We recognize contributors in several ways:

- **Contributors section** in README
- **Release notes** acknowledgments
- **GitHub contributions** graph
- **Special badges** for significant contributions
- **Maintainer status** for consistent contributors

### Becoming a Maintainer

Maintainers are community members who have shown:

- **Consistent contributions** over time
- **Understanding** of the codebase and architecture
- **Helpful code reviews** and mentoring
- **Positive community** interaction
- **Commitment** to the project's goals

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Code Reviews**: Direct feedback on pull requests
- **Documentation**: Comprehensive guides and references

### Community Guidelines

- **Be respectful** and inclusive
- **Help others** learn and contribute
- **Give constructive** feedback
- **Credit others'** work and ideas
- **Follow the Code of Conduct**

## 📄 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior

- **Use welcoming** and inclusive language
- **Be respectful** of differing viewpoints and experiences
- **Accept constructive** criticism gracefully
- **Focus on what's best** for the community
- **Show empathy** towards other community members

### Unacceptable Behavior

- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned with this Code of Conduct.

## 🎯 Conclusion

Contributing to DevSync is a great way to:

- **Learn new technologies** and best practices
- **Build your portfolio** with real-world projects
- **Connect with other developers** in the community
- **Make a positive impact** on open-source software
- **Gain recognition** for your contributions

We're excited to see what you'll build with us! If you have any questions, don't hesitate to reach out through any of our communication channels.

Happy coding! 🚀
