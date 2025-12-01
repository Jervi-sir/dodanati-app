// src/utils/axios-instance.ts
import axios from 'axios';
import { BASE_URL } from './api';

type CreateOpts = {
  baseURL?: string;
  requiresAuth?: boolean; // default behavior for this instance
};

// token lives in this module (no zustand import)
let currentToken: string | null = null;

export function createAxiosInstance(opts: CreateOpts = {}) {
  const { baseURL = BASE_URL, requiresAuth = true } = opts;

  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  // Attach bearer only if needed
  instance.interceptors.request.use((config) => {
    let needsAuth = requiresAuth;
    const h: any = config.headers || {};
    if (h['X-Requires-Auth'] !== undefined) {
      const v = h['X-Requires-Auth'];
      needsAuth = v === false || v === 'false' || v === 0 || v === '0' ? false : true;
      delete h['X-Requires-Auth'];
    }
    if (needsAuth && currentToken) {
      h.Authorization = `Bearer ${currentToken}`;
    }
    config.headers = h;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      // Optional: handle 401s globally
      // if (error?.response?.status === 401) { /* maybe clear token */ }
      return Promise.reject(error);
    }
  );

  return instance;
}

// Default instance requires auth by default.
const api = createAxiosInstance({ requiresAuth: true });
export default api;

// If you ever need a dedicated public instance:
export const apiPublic = createAxiosInstance({ requiresAuth: false });

// Or build custom ones on the fly:
export const getCustomAxios = (customBaseURL: string, requiresAuth = true) =>
  createAxiosInstance({ baseURL: customBaseURL, requiresAuth });

// Example per-request public call:
// api.get('/public', { headers: { 'X-Requires-Auth': false } });

export const setAuthToken = (token: string | null) => {
  currentToken = token; // <-- make interceptors see the token

  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = (): string | null => currentToken;
