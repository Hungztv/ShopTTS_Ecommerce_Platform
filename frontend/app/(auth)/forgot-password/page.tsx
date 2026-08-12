'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ChevronLeft, ShoppingBag, Shield, CheckCircle2, KeyRound } from 'lucide-react';
import * as authService from '@/lib/services/auth-service';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setMounted(true), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await authService.forgotPassword(email);
            setIsSubmitted(true);
        } catch {
            setError('Đã xảy ra lỗi, vui lòng thử lại sau.');
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
                            <Shield className="w-4 h-4 text-blue-300" />
                            <span className="text-white/90 text-sm font-medium">Bảo mật tài khoản</span>
                        </div>
                        <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
                            Khôi phục
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                                mật khẩu
                            </span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-md">
                            Đừng lo lắng! Chỉ cần nhập email đã đăng ký và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
                        </p>

                        {/* Info cards */}
                        <div className="space-y-3 mt-10">
                            {[
                                { icon: Mail, label: 'Kiểm tra hộp thư đến và spam' },
                                { icon: KeyRound, label: 'Link đặt lại có hiệu lực 24 giờ' },
                                { icon: Shield, label: 'Thông tin của bạn luôn được bảo mật' },
                            ].map(({ icon: Icon, label }, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 cursor-default"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Icon className="w-5 h-5 text-white/90" />
                                    </div>
                                    <span className="text-white/80 font-medium text-sm">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="flex items-center gap-8 text-white/60 text-sm">
                        <span><strong className="text-white font-semibold">24/7</strong> Hỗ trợ</span>
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

                    {/* Back to login */}
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 group transition-colors">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Quay lại đăng nhập
                    </Link>

                    {!isSubmitted ? (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-5">
                                    <KeyRound className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Quên mật khẩu?
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                    Nhập email đã đăng ký tài khoản. Chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
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
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email}
                                    className="w-full relative bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Gửi link đặt lại
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
                                Kiểm tra email!
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến:
                            </p>
                            <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-8">
                                {email}
                            </p>

                            <div className="bg-slate-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-8 text-left">
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <strong className="text-gray-800 dark:text-gray-200">Không nhận được email?</strong>
                                    <br />
                                    Kiểm tra thư mục spam hoặc thử lại sau vài phút. Link đặt lại có hiệu lực trong 24 giờ.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setEmail('');
                                    }}
                                    className="w-full py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                >
                                    Thử email khác
                                </button>
                                <Link
                                    href="/login"
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-700 to-slate-700 hover:from-indigo-800 hover:to-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 group"
                                >
                                    Quay lại đăng nhập
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
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
