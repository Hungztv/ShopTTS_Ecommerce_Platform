'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowRight, ShoppingBag, Shield, CheckCircle2, KeyRound } from 'lucide-react';
import * as authService from '@/lib/services/auth-service';
import Cookies from 'js-cookie';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(timer);
    }, []);

    // Check for access_token in URL hash (Supabase redirects with hash fragment)
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
            // Store the token temporarily for password update
            Cookies.set('resetAccessToken', accessToken, { expires: 1 / 24 }); // 1 hour
            if (refreshToken) {
                Cookies.set('refreshToken', refreshToken, { expires: 7 });
            }
            setTokenValid(true);
            // Clean up the URL
            window.history.replaceState(null, '', window.location.pathname);
        } else if (!Cookies.get('resetAccessToken')) {
            setTokenValid(false);
        } else {
            setTokenValid(true);
        }
    }, []);

    // Password strength
    const getPasswordStrength = (pwd: string) => {
        let strength = 0;
        if (pwd.length >= 6) strength++;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(password);
    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    const strengthLabels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setIsSubmitting(true);

        try {
            const accessToken = Cookies.get('resetAccessToken');
            if (!accessToken) {
                setError('Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu link mới.');
                setIsSubmitting(false);
                return;
            }

            const result = await authService.updatePassword(password, accessToken);
            if (result.success) {
                Cookies.remove('resetAccessToken');
                setIsSuccess(true);
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setError(result.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
            }
        } catch {
            setError('Đã xảy ra lỗi, vui lòng thử lại sau.');
        }

        setIsSubmitting(false);
    };

    // Invalid/expired token state
    if (tokenValid === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
                <div className={`max-w-md w-full text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-5">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Link không hợp lệ
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                            Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.
                        </p>
                        <div className="space-y-3">
                            <Link
                                href="/forgot-password"
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group"
                            >
                                Yêu cầu link mới
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/login"
                                className="w-full py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                            >
                                Quay lại đăng nhập
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-indigo-800 to-slate-900" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-slate-500/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="absolute top-[15%] right-[15%] w-20 h-20 border-2 border-white/10 rounded-2xl rotate-12 animate-[spin_20s_linear_infinite]" />
                <div className="absolute bottom-[20%] left-[10%] w-16 h-16 border-2 border-white/10 rounded-full animate-[bounce_3s_ease-in-out_infinite]" />

                <div className={`relative z-10 flex flex-col justify-between w-full p-12 xl:p-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">ShopTTS</span>
                    </div>

                    <div className="max-w-lg">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
                            <KeyRound className="w-4 h-4 text-blue-300" />
                            <span className="text-white/90 text-sm font-medium">Đặt lại mật khẩu</span>
                        </div>
                        <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
                            Mật khẩu
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                                mới!
                            </span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-md">
                            Tạo mật khẩu mới an toàn cho tài khoản của bạn. Sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                        </p>
                    </div>

                    <div className="flex items-center gap-8 text-white/60 text-sm">
                        <span><strong className="text-white font-semibold">Mã hóa</strong> AES-256</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">SSL</strong> Bảo mật</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">100%</strong> An toàn</span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 xl:p-16">
                <div className={`w-full max-w-[440px] transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-slate-700 bg-clip-text text-transparent">
                            ShopTTS
                        </span>
                    </div>

                    {!isSuccess ? (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-5">
                                    <KeyRound className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Đặt mật khẩu mới
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                    Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải có ít nhất 6 ký tự.
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs">!</span>
                                    </div>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                            placeholder="Ít nhất 6 ký tự"
                                            required
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                        </button>
                                    </div>
                                    {/* Password Strength */}
                                    {password && (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex gap-1">
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs font-medium ${passwordStrength <= 1 ? 'text-red-500' : passwordStrength <= 2 ? 'text-yellow-500' : passwordStrength <= 3 ? 'text-lime-500' : 'text-green-500'}`}>
                                                {strengthLabels[passwordStrength - 1] || 'Quá yếu'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full pl-12 pr-12 py-3.5 border rounded-2xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${
                                                confirmPassword && confirmPassword !== password
                                                    ? 'border-red-400 dark:border-red-500 focus:border-red-400'
                                                    : confirmPassword && confirmPassword === password
                                                        ? 'border-green-400 dark:border-green-500 focus:border-green-400'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-indigo-600'
                                            }`}
                                            placeholder="Nhập lại mật khẩu mới"
                                            required
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                        </button>
                                    </div>
                                    {confirmPassword && confirmPassword === password && (
                                        <p className="text-xs text-green-500 flex items-center gap-1.5 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Mật khẩu khớp
                                        </p>
                                    )}
                                    {confirmPassword && confirmPassword !== password && (
                                        <p className="text-xs text-red-500 font-medium">Mật khẩu không khớp</p>
                                    )}
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !password || !confirmPassword}
                                    className="w-full relative bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Đặt lại mật khẩu
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success State */
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-6 animate-[bounce_1s_ease-in-out]">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
                                Đặt lại thành công!
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                                Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...
                            </p>
                            <Link
                                href="/login"
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group"
                            >
                                Đăng nhập ngay
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-10">
                        Cần hỗ trợ?{' '}
                        <Link href="/contact" className="underline hover:text-gray-600 dark:hover:text-gray-400">Liên hệ chúng tôi</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
