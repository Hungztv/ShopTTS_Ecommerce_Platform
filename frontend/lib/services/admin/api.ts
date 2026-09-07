import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add token
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('accessToken') || Cookies.get('supabaseAccessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = Cookies.get('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_URL}/SupabaseAuth/refresh`, {
                        refreshToken
                    });

                    if (response.data.accessToken) {
                        Cookies.set('accessToken', response.data.accessToken, { expires: 1 });
                        if (response.data.supabaseAccessToken) {
                            Cookies.set('supabaseAccessToken', response.data.supabaseAccessToken, { expires: 1 });
                        }
                        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    // Refresh failed, redirect to login
                    Cookies.remove('accessToken');
                    Cookies.remove('supabaseAccessToken');
                    Cookies.remove('refreshToken');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

// Generic API response type
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export default api;
