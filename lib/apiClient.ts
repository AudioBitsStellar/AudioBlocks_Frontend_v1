import axios from 'axios';
import Cookies from 'js-cookie';
import { getValidatedEnv } from './env';

const { NEXT_PUBLIC_API_URL } = getValidatedEnv();

const apiClient = axios.create({
  baseURL: NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('audioblocks_jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove('audioblocks_jwt');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
