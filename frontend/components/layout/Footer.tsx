'use client';

import {
    Facebook,
    Instagram,
    Twitter,
    Youtube,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Truck,
    ShieldCheck,
    HeadphonesIcon,
    ArrowRight,
    Send,
    Store,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const footerLinks = {
    company: [
        { label: "Về ShopTTS", href: "/about" },
        { label: "Tuyển dụng", href: "#" },
        { label: "Tin tức & Sự kiện", href: "#" },
        { label: "Liên hệ", href: "/contact" },
        { label: "Hệ thống cửa hàng", href: "/shops" },
    ],
    sellers: [
        { label: "Mở Shop bán hàng", href: "/seller/register" },
        { label: "Kênh Người Bán", href: "/seller" },
        { label: "Quy định bán hàng", href: "#" },
        { label: "Chính sách hoa hồng", href: "#" },
    ],
    support: [
        { label: "Trung tâm trợ giúp", href: "/contact" },
        { label: "Hướng dẫn mua hàng", href: "#" },
        { label: "Chính sách đổi trả 30 ngày", href: "#" },
        { label: "Chính sách bảo hành", href: "#" },
        { label: "Phương thức vận chuyển", href: "#" },
    ],
    legal: [
        { label: "Điều khoản sử dụng", href: "#" },
        { label: "Chính sách bảo mật", href: "#" },
        { label: "Quyền riêng tư", href: "#" },
    ],
};

const features = [
    {
        icon: Truck,
        title: "Giao hàng toàn quốc",
        description: "Miễn phí cho đơn từ 500k",
        color: "from-blue-500/20 to-indigo-500/20 text-blue-400",
    },
    {
        icon: ShieldCheck,
        title: "Chính hãng 100%",
        description: "Bảo hành lên tới 24 tháng",
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-400",
    },
    {
        icon: CreditCard,
        title: "Thanh toán an toàn",
        description: "Bảo mật thông tin tuyệt đối",
        color: "from-violet-500/20 to-purple-500/20 text-violet-400",
    },
    {
        icon: HeadphonesIcon,
        title: "Hỗ trợ 24/7",
        description: "Giải đáp thắc mắc tức thì",
        color: "from-amber-500/20 to-orange-500/20 text-amber-400",
    },
];

export default function Footer() {
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setEmail("");
            setTimeout(() => setSubscribed(false), 4000);
        }
    };

    return (
        <footer className="bg-slate-950 text-slate-300 relative overflow-hidden border-t border-slate-800/80">
            {/* Background ambient lighting */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* ══════════════════ FEATURES RIBBON ══════════════════ */}
            <div className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 group"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm tracking-wide">{feature.title}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════ NEWSLETTER BANNER ══════════════════ */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
                <div className="relative rounded-3xl bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/60 border border-violet-500/20 p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl">
                    <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="text-center lg:text-left max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-3">
                                <Sparkles className="w-3.5 h-3.5" />
                                Ưu đãi độc quyền
                            </div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                                Đăng ký nhận khuyến mãi hàng tuần
                            </h3>
                            <p className="text-slate-400 text-sm mt-1.5">
                                Nhận voucher giảm giá đến 50k cho đơn hàng đầu tiên và cập nhật ưu đãi mới nhất từ ShopTTS.
                            </p>
                        </div>

                        <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex-1 max-w-md">
                            <div className="relative flex items-center">
                                <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Nhập địa chỉ email của bạn..."
                                    required
                                    className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-white text-sm placeholder:text-slate-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/30"
                                >
                                    <span>{subscribed ? "Đã gửi!" : "Đăng ký"}</span>
                                    {subscribed ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* ══════════════════ MAIN LINKS SECTION ══════════════════ */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

                    {/* BRAND INFO */}
                    <div className="lg:col-span-2 space-y-6">
                        <Link href="/" className="inline-flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                <span className="text-white font-black text-xl tracking-wider">S</span>
                            </div>
                            <span className="text-2xl font-black tracking-tight text-white">
                                Shop<span className="text-violet-400">TTS</span>
                            </span>
                        </Link>

                        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                            Nền tảng thương mại điện tử mua sắm hiện đại hàng đầu. Kết nối hàng ngàn cửa hàng uy tín với hàng triệu người tiêu dùng Việt Nam.
                        </p>

                        <div className="space-y-3 pt-1">
                            <a
                                href="tel:1900xxxx"
                                className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-violet-500/50 transition-colors">
                                    <Phone className="w-4 h-4 text-violet-400" />
                                </div>
                                <span>Hotline: <strong className="text-white font-semibold">1900 xxxx</strong> (8h00 - 21h00)</span>
                            </a>

                            <a
                                href="mailto:support@shoptts.vn"
                                className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-violet-500/50 transition-colors">
                                    <Mail className="w-4 h-4 text-violet-400" />
                                </div>
                                <span>Email: <strong className="text-white font-semibold">support@shoptts.vn</strong></span>
                            </a>

                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-violet-400" />
                                </div>
                                <span>Trụ sở: Tòa nhà Innovation, Hà Nội</span>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="pt-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Kết nối với chúng tôi
                            </p>
                            <div className="flex gap-2.5">
                                {[
                                    { icon: Facebook, href: "#", label: "Facebook" },
                                    { icon: Instagram, href: "#", label: "Instagram" },
                                    { icon: Twitter, href: "#", label: "Twitter" },
                                    { icon: Youtube, href: "#", label: "Youtube" }
                                ].map((social, index) => (
                                    <a
                                        key={index}
                                        href={social.href}
                                        aria-label={social.label}
                                        className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-violet-600 hover:border-violet-500 text-slate-400 hover:text-white transition-all duration-300 group"
                                    >
                                        <social.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 1: Về ShopTTS */}
                    <div>
                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-violet-500 pl-3">
                            Về ShopTTS
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-violet-300 transition-colors flex items-center gap-1.5 group"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-violet-400 transition-colors" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* COLUMN 2: Dành cho người bán */}
                    <div>
                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-indigo-500 pl-3">
                            Dành cho Người Bán
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            {footerLinks.sellers.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 group"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-indigo-400 transition-colors" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* COLUMN 3: Hỗ trợ khách hàng */}
                    <div>
                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-purple-500 pl-3">
                            Hỗ trợ Khách Hàng
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            {footerLinks.support.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 group"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-purple-400 transition-colors" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ══════════════════ BOTTOM COPYRIGHT BAR ══════════════════ */}
            <div className="border-t border-slate-800/80 bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                        <p>
                            © {new Date().getFullYear()} <strong className="text-slate-300 font-semibold">ShopTTS</strong>. Tất cả quyền được bảo lưu. Thiết kế cho trải nghiệm mua sắm mượt mà.
                        </p>

                        <div className="flex flex-wrap items-center gap-6">
                            {footerLinks.legal.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.href}
                                    className="hover:text-slate-300 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
