'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { setUserFromTokens } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase OAuth returns tokens in the URL hash fragment
                // Format: #access_token=...&expires_at=...&expires_in=...&refresh_token=...&token_type=bearer&type=signup
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (!accessToken || !refreshToken) {
                    // Also check query params (some OAuth flows use query instead of hash)
                    const searchParams = new URLSearchParams(window.location.search);
                    const queryAccessToken = searchParams.get('access_token');
                    const queryRefreshToken = searchParams.get('refresh_token');

                    if (queryAccessToken && queryRefreshToken) {
                        const success = await setUserFromTokens(queryAccessToken, queryRefreshToken);
                        if (success) {
                            setStatus('success');
                            setTimeout(() => router.push('/'), 1500);
                        } else {
                            throw new Error('Không thể xác thực người dùng');
                        }
                        return;
                    }

                    // Check for error
                    const error = params.get('error') || searchParams.get('error');
                    const errorDescription = params.get('error_description') || searchParams.get('error_description');
                    
                    if (error) {
                        throw new Error(errorDescription || error);
                    }

                    throw new Error('Không tìm thấy token xác thực');
                }

                const success = await setUserFromTokens(accessToken, refreshToken);
                if (success) {
                    setStatus('success');
                    setTimeout(() => router.push('/'), 1500);
                } else {
                    throw new Error('Không thể xác thực người dùng');
                }
            } catch (error: unknown) {
                console.error('OAuth callback error:', error);
                setStatus('error');
                setErrorMsg(error instanceof Error ? error.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
            }
        };

        handleCallback();
    }, [setUserFromTokens, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Đang xác thực...
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Vui lòng đợi trong giây lát
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Đăng nhập thành công!
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Đang chuyển hướng...
                            </p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Đăng nhập thất bại
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                {errorMsg}
                            </p>
                            <button
                                onClick={() => router.push('/login')}
                                className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl transition-colors"
                            >
                                Quay lại đăng nhập
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
