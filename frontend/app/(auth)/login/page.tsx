'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShoppingBag, Star, Truck, Shield, ChevronRight } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithOAuth } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            const message = error instanceof Error ? error.message : `Đăng nhập với ${provider} thất bại`;
            setError(message);
            setOauthLoading(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        const result = await signIn(email, password);

        if (result.success) {
            router.push('/');
        } else {
            setError(result.message || 'Đăng nhập thất bại');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                {/* Layered gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-indigo-800 to-slate-900" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                {/* Decorative blobs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-slate-500/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                {/* Floating shapes */}
                <div className="absolute top-[15%] right-[15%] w-20 h-20 border-2 border-white/10 rounded-2xl rotate-12 animate-[spin_20s_linear_infinite]" />
                <div className="absolute bottom-[20%] left-[10%] w-16 h-16 border-2 border-white/10 rounded-full animate-[bounce_3s_ease-in-out_infinite]" />
                <div className="absolute top-[60%] right-[25%] w-12 h-12 bg-white/5 rounded-xl rotate-45" />

                {/* Content */}
                <div className={`relative z-10 flex flex-col justify-between w-full p-12 xl:p-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {/* Top — Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">ShopTTS</span>
                    </div>

                    {/* Center — Hero */}
                    <div className="max-w-lg">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
                            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                            <span className="text-white/90 text-sm font-medium">Nền tảng mua sắm #1 Việt Nam</span>
                        </div>
                        <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
                            Chào mừng
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                                trở lại!
                            </span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-md">
                            Đăng nhập để truy cập hàng ngàn sản phẩm chất lượng, ưu đãi độc quyền và trải nghiệm mua sắm thông minh với AI.
                        </p>

                        {/* Feature cards */}
                        <div className="grid grid-cols-3 gap-3 mt-10">
                            {[
                                { icon: Truck, label: 'Miễn phí\nvận chuyển' },
                                { icon: Shield, label: 'Bảo hành\nchính hãng' },
                                { icon: Star, label: 'Đổi trả\n30 ngày' },
                            ].map(({ icon: Icon, label }, idx) => (
                                <div
                                    key={idx}
                                    className="group bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm rounded-2xl p-4 text-center transition-all duration-300 cursor-default"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <Icon className="w-5 h-5 text-white/90" />
                                    </div>
                                    <span className="text-xs text-white/70 font-medium whitespace-pre-line leading-tight">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom — Stats */}
                    <div className="flex items-center gap-8 text-white/60 text-sm">
                        <span><strong className="text-white font-semibold">100K+</strong> Khách hàng</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">50K+</strong> Sản phẩm</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span><strong className="text-white font-semibold">4.9</strong> ⭐ Đánh giá</span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
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

                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Đăng nhập
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Nhập thông tin tài khoản để tiếp tục
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
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Email
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
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Mật khẩu
                                </label>
                                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input type="checkbox" className="peer sr-only" />
                                <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors">
                                Ghi nhớ đăng nhập
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full relative bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700/50" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-xs text-gray-400 uppercase tracking-wider font-medium">
                                hoặc tiếp tục với
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
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Tiếp tục với Google</span>
                        </button>
                    </div>

                    {/* Register link */}
                    <div className="mt-8 text-center">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                            Chưa có tài khoản?{' '}
                        </span>
                        <Link href="/register" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 group">
                            Đăng ký miễn phí
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
                        Bằng việc đăng nhập, bạn đồng ý với{' '}
                        <Link href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-400">Điều khoản</Link>
                        {' '}và{' '}
                        <Link href="/privacy" className="underline hover:text-gray-600 dark:hover:text-gray-400">Chính sách bảo mật</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}