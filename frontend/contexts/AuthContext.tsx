'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import type { User } from '@/types/auth';
import * as authService from '@/lib/services/auth-service';
import { resetSessionId } from '@/lib/services/behavior-service';
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; message?: string }>;
    signInWithOAuth: (provider: string) => Promise<void>;
    setUserFromTokens: (accessToken: string, refreshToken: string) => Promise<boolean>;
    signOut: () => Promise<void>;
    refreshUserRoles: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const normalizeUserRoles = (result: { user?: User; appRoles?: string[] }): User | null => {
        if (!result.user) return null;

        const normalizedRoles = result.appRoles?.length
            ? result.appRoles
            : result.user.roles ?? [];

        return {
            ...result.user,
            roles: normalizedRoles,
        };
    };

    // Khởi tạo: Kiểm tra token, lấy user
    useEffect(() => {
        const initAuth = async () => {
            const accessToken = Cookies.get('accessToken');
            const supabaseAccessToken = Cookies.get('supabaseAccessToken') || accessToken;

            if (accessToken && supabaseAccessToken) {
                const result = await authService.getMeWithRoles(supabaseAccessToken);
                if (result.success && result.user) {
                    setUser(normalizeUserRoles(result));
                } else {
                    // Token hết hạn, thử refresh
                    const refreshTokenValue = Cookies.get('refreshToken');
                    if (refreshTokenValue) {
                        const refreshResult = await authService.refreshToken(refreshTokenValue);
                        if (refreshResult.success && refreshResult.accessToken) {
                            Cookies.set('accessToken', refreshResult.accessToken, { expires: 1 });
                            if (refreshResult.supabaseAccessToken) {
                                Cookies.set('supabaseAccessToken', refreshResult.supabaseAccessToken, { expires: 1 });
                            }
                            if (refreshResult.refreshToken) {
                                Cookies.set('refreshToken', refreshResult.refreshToken, { expires: 7 });
                            }
                            // Retry get user
                            const retrySupabaseToken = refreshResult.supabaseAccessToken || refreshResult.accessToken;
                            const retryResult = await authService.getMeWithRoles(retrySupabaseToken);
                            if (retryResult.success && retryResult.user) {
                                setUser(normalizeUserRoles(retryResult));
                            }
                        } else {
                            // Clear cookies
                            Cookies.remove('accessToken');
                            Cookies.remove('supabaseAccessToken');
                            Cookies.remove('refreshToken');
                        }
                    }
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);
    // Đăng nhập
    const signIn = async (email: string, password: string) => {
        const result = await authService.signIn({ email, password });

        if (result.success && result.accessToken) {
            Cookies.set('accessToken', result.accessToken, { expires: 1 }); // 1 ngày
            if (result.supabaseAccessToken) {
                Cookies.set('supabaseAccessToken', result.supabaseAccessToken, { expires: 1 });
            }
            if (result.refreshToken) {
                Cookies.set('refreshToken', result.refreshToken, { expires: 7 }); // 7 ngày
            }
            if (result.user) {
                setUser(normalizeUserRoles(result));
                resetSessionId(result.user.id);
            }
        }

        return { success: result.success, message: result.message || result.error };
    };
    // Đăng ký
    const signUp = async (email: string, password: string, fullName?: string) => {
        const result = await authService.signUp({ email, password, fullName });

        if (result.success && result.accessToken) {
            Cookies.set('accessToken', result.accessToken, { expires: 1 });
            if (result.supabaseAccessToken) {
                Cookies.set('supabaseAccessToken', result.supabaseAccessToken, { expires: 1 });
            }
            if (result.refreshToken) {
                Cookies.set('refreshToken', result.refreshToken, { expires: 7 });
            }
            if (result.user) {
                setUser(normalizeUserRoles(result));
                resetSessionId(result.user.id);
            }
        }

        return { success: result.success, message: result.message || result.error };
    };
    // Đăng xuất
    const signOut = async () => {
        const supabaseAccessToken = Cookies.get('supabaseAccessToken') || Cookies.get('accessToken');
        if (supabaseAccessToken) {
            await authService.signOut(supabaseAccessToken);
        }
        Cookies.remove('accessToken');
        Cookies.remove('supabaseAccessToken');
        Cookies.remove('refreshToken');
        setUser(null);
        resetSessionId(null);
    };

    // OAuth Login (Google, GitHub, etc.)
    const signInWithOAuth = async (provider: string) => {
        const callbackUrl = `${window.location.origin}/auth/callback`;
        const result = await authService.getOAuthUrl(provider, callbackUrl);
        if (result.success && result.url) {
            window.location.href = result.url;
        } else {
            throw new Error(result.message || `Không thể đăng nhập với ${provider}`);
        }
    };

    // Set user from tokens (used by OAuth callback)
    const setUserFromTokens = async (accessToken: string, refreshToken: string): Promise<boolean> => {
        Cookies.set('supabaseAccessToken', accessToken, { expires: 1 });
        Cookies.set('refreshToken', refreshToken, { expires: 7 });

        // Get user info and app roles
        const result = await authService.getMeWithRoles(accessToken);
        if (result.success && result.user) {
            // Generate app access token via refresh
            const refreshResult = await authService.refreshToken(refreshToken);
            if (refreshResult.success && refreshResult.accessToken) {
                Cookies.set('accessToken', refreshResult.accessToken, { expires: 1 });
                if (refreshResult.supabaseAccessToken) {
                    Cookies.set('supabaseAccessToken', refreshResult.supabaseAccessToken, { expires: 1 });
                }
                if (refreshResult.refreshToken) {
                    Cookies.set('refreshToken', refreshResult.refreshToken, { expires: 7 });
                }
            } else {
                // Use supabase token as fallback
                Cookies.set('accessToken', accessToken, { expires: 1 });
            }
            setUser(normalizeUserRoles(result));
            resetSessionId(result.user.id);
            return true;
        }
        return false;
    };
    // Refresh roles từ backend (dùng sau khi seller được duyệt)
    const refreshUserRoles = useCallback(async () => {
        // Ưu tiên dùng accessToken (app JWT, validate cục bộ, ko phụ thuộc Supabase)
        const token = Cookies.get('accessToken') || Cookies.get('supabaseAccessToken');
        if (!token) return;

        let result = await authService.getMeWithRoles(token);

        // Nếu token hết hạn → thử refresh rồi retry
        if (!result.success) {
            const refreshTokenValue = Cookies.get('refreshToken');
            if (refreshTokenValue) {
                const refreshResult = await authService.refreshToken(refreshTokenValue);
                if (refreshResult.success && refreshResult.accessToken) {
                    Cookies.set('accessToken', refreshResult.accessToken, { expires: 1 });
                    if (refreshResult.supabaseAccessToken) {
                        Cookies.set('supabaseAccessToken', refreshResult.supabaseAccessToken, { expires: 1 });
                    }
                    if (refreshResult.refreshToken) {
                        Cookies.set('refreshToken', refreshResult.refreshToken, { expires: 7 });
                    }
                    // Retry với token mới
                    result = await authService.getMeWithRoles(refreshResult.accessToken);
                }
            }
        }

        if (result.success && result.user) {
            setUser(normalizeUserRoles(result));
        }
    }, []);
    return (
        <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signIn, signUp, signInWithOAuth, setUserFromTokens, signOut, refreshUserRoles }}>
            {children}
        </AuthContext.Provider>
    );
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}