# DevSync 2025 - Open Source Community Platform

![DevSync Logo](public/assets/img/logo.png)

A modern, interactive platform designed to foster open-source collaboration and track developer contributions during the DevSync 2025 event.

## 🚀 Features

- **Project Management**
  - Submit open-source projects for review
  - Track project status (pending/accepted/rejected)
  - Admin review system with feedback

- **User Dashboard**
  - GitHub integration
  - Pull request tracking
  - Contribution statistics
  - Activity timeline

- **Leaderboard System**
  - Real-time rankings
  - Points-based rewards
  - Achievement badges
  - Contribution trends

- **Community Features**
  - Developer profiles
  - Project collaboration
  - Team networking
  - Event schedule

## 🛠️ Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- UI Components: Boxicons, Swiper.js
- Animations: ScrollReveal.js
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: GitHub OAuth

## 🌟 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/devsync.git
cd devsync
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

4. Start the development server:
```bash
npm run dev
```

## 📁 Project Structure

```
devsync/
├── public/
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   ├── index.html
│   ├── projects.html
│   └── ...
├── models/
│   ├── User.js
│   └── Repo.js
├── routes/
└── index.js
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- GitHub API for OAuth integration
- All contributors who participate in DevSync 2025
- Open source community for inspiration

## 📬 Contact

Project Link: [https://github.com/yourusername/devsync](https://github.com/yourusername/devsync)
