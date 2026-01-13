const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://ambika-roller.onrender.com';

export const API_ENDPOINTS = {
  BROLL_PROCESS: `${API_BASE_URL}/api/broll/process`,
  USER_LOGIN: `${API_BASE_URL}/api/user/login`,
};