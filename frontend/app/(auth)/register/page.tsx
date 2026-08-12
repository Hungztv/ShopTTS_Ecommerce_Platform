'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, ShoppingBag, Gift, Zap, Bell, ChevronLeft, Heart } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const { signUp, signInWithOAuth } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleOAuthLogin = async (provider: string) => {
        try {
            setError('');
            setOauthLoading(provider);
            await signInWithOAuth(provider);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : `Đăng ký với ${provider} thất bại`;
            setError(message);
            setOauthLoading(null);
        }
    };

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
        const result = await signUp(email, password, fullName);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.message || 'Đăng ký thất bại');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Left Panel — Form */}
            <div className="w-full lg:w-[50%] flex items-center justify-center p-6 sm:p-10 xl:p-16">
                <div className={`w-full max-w-[480px] transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-slate-700 bg-clip-text text-transparent">
                            ShopTTS
                        </span>
                    </div>

                    {/* Back to login */}
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 group transition-colors">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Quay lại đăng nhập
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Tạo tài khoản mới
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Đăng ký miễn phí để bắt đầu mua sắm
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Họ và tên
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                    placeholder="Nguyễn Văn A"
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Email <span className="text-red-400">*</span>
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                    placeholder="name@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Mật khẩu <span className="text-red-400">*</span>
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
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                            {/* Password Strength Indicator */}
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
                                Xác nhận mật khẩu <span className="text-red-400">*</span>
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
                                    placeholder="Nhập lại mật khẩu"
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
                                    <Check className="w-3.5 h-3.5" /> Mật khẩu khớp
                                </p>
                            )}
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-xs text-red-500 font-medium">Mật khẩu không khớp</p>
                            )}
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer group pt-1">
                            <div className="relative mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={agreeTerms}
                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                    className="peer sr-only"
                                    required
                                />
                                <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                                </div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors">
                                Tôi đồng ý với{' '}
                                <Link href="/terms" className="text-indigo-600 hover:underline font-medium">Điều khoản dịch vụ</Link>
                                {' '}và{' '}
                                <Link href="/privacy" className="text-indigo-600 hover:underline font-medium">Chính sách bảo mật</Link>
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !agreeTerms}
                            className="w-full relative bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group mt-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Tạo tài khoản
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700/50" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-xs text-gray-400 uppercase tracking-wider font-medium">
                                hoặc đăng ký với
                            </span>
                        </div>
                    </div>

                    {/* Social */}
                    <div className="flex justify-center">
                        <button
                            onClick={() => handleOAuthLogin('google')}
                            disabled={!!oauthLoading}
                            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {oauthLoading === 'google' ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Đăng ký với Google</span>
                        </button>
                    </div>

                    {/* Login link */}
                    <div className="mt-7 text-center">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                            Đã có tài khoản?{' '}
                        </span>
                        <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Panel — Branding */}
            <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden">
                {/* Layered gradient background */}
                <div className="absolute inset-0 bg-gradient-to-bl from-slate-600 via-indigo-800 to-slate-900" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                {/* Decorative blobs */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-slate-500/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                {/* Floating shapes */}
                <div className="absolute top-[12%] left-[15%] w-20 h-20 border-2 border-white/10 rounded-2xl -rotate-12 animate-[spin_25s_linear_infinite]" />
                <div className="absolute bottom-[15%] right-[10%] w-14 h-14 border-2 border-white/10 rounded-full animate-[bounce_4s_ease-in-out_infinite]" />
                <div className="absolute top-[55%] left-[20%] w-10 h-10 bg-white/5 rounded-lg rotate-45" />

                {/* Content */}
                <div className={`relative z-10 flex flex-col justify-between w-full p-12 xl:p-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {/* Top — Logo */}
                    <div className="flex items-center gap-3 justify-end">
                        <span className="text-xl font-bold text-white tracking-tight">ShopTTS</span>
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Center — Hero */}
                    <div className="max-w-lg">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
                            <Heart className="w-4 h-4 text-blue-300 fill-blue-300" />
                            <span className="text-white/90 text-sm font-medium">100K+ khách hàng tin tưởng</span>
                        </div>
                        <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
                            Gia nhập
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                                cộng đồng!
                            </span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-md">
                            Tạo tài khoản để nhận ưu đãi độc quyền, tích điểm đổi thưởng và trải nghiệm mua sắm thông minh.
                        </p>

                        {/* Benefit cards */}
                        <div className="space-y-3 mt-10">
                            {[
                                { icon: Gift, label: 'Giảm 10% đơn hàng đầu tiên', color: 'from-blue-500/20 to-cyan-500/20' },
                                { icon: Zap, label: 'Tích điểm đổi quà hấp dẫn', color: 'from-amber-500/20 to-yellow-500/20' },
                                { icon: Bell, label: 'Thông báo ưu đãi độc quyền', color: 'from-indigo-500/20 to-slate-500/20' },
                            ].map(({ icon: Icon, label, color }, idx) => (
                                <div
                                    key={idx}
                                    className={`group flex items-center gap-4 bg-gradient-to-r ${color} backdrop-blur-sm rounded-2xl p-4 hover:bg-white/[0.12] transition-all duration-300 cursor-default`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Icon className="w-5 h-5 text-white/90" />
                                    </div>
                                    <span className="text-white/90 font-medium text-sm">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom — Stats */}
                    <div className="flex items-center gap-8 text-white/60 text-sm">
                        <span><strong className="text-white font-semibold">4.9</strong> ⭐ Đánh giá</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">24/7</strong> Hỗ trợ</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">30 ngày</strong> Đổi trả</span>
                    </div>
                </div>
            </div>
        </div>
    );
}