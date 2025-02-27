const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://devsync-backend.vercel.app'
    : 'http://localhost:3000';

export const API_ROUTES = {
    AUTH_CHECK: `${BASE_URL}/api/user`,
    GITHUB_LOGIN: `${BASE_URL}/auth/github`,
    USER_STATS: `${BASE_URL}/api/user/stats`,
    LEADERBOARD: `${BASE_URL}/api/leaderboard`,
    LOGOUT: `${BASE_URL}/logout`
};
