'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Search, Package, ShieldCheck, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { shopsPublicService, ShopPublic } from '@/lib/services/public-api';

export default function ShopsDirectoryPage() {
    const [shops, setShops] = useState<ShopPublic[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchShops = async () => {
            setLoading(true);
            try {
                const data = await shopsPublicService.getAll(search);
                setShops(data);
            } catch (err) {
                console.error('Failed to load shops:', err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchShops();
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
                    <Link href="/" className="hover:text-primary-600 transition-colors">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white font-medium">Hệ thống cửa hàng</span>
                </nav>

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white p-8 md:p-12 mb-10 shadow-lg">
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-4 text-purple-100 border border-white/20">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Đối tác chính hãng & Gian hàng uy tín</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                            Hệ Thống Cửa Hàng ShopTTS
                        </h1>
                        <p className="text-purple-100 text-base md:text-lg mb-6 leading-relaxed">
                            Khám phá hàng ngàn gian hàng đối tác được kiểm duyệt kỹ lưỡng, cung cấp sản phẩm chính hãng với nhiều ưu đãi độc quyền.
                        </p>

                        {/* Search Input */}
                        <div className="relative max-w-md">
                            <input
                                type="text"
                                placeholder="Tìm kiếm tên cửa hàng..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-md transition-all"
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    {/* Decorative Background Circles */}
                    <div className="absolute right-0 top-0 -mt-8 -mr-8 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute right-24 bottom-0 -mb-12 w-64 h-64 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />
                </div>

                {/* Shops Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 animate-pulse space-y-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                        <Store className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy cửa hàng nào</h3>
                        <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                            Không có cửa hàng nào khớp với từ khóa tìm kiếm của bạn. Hãy thử đổi từ khóa khác.
                        </p>
                        <button
                            onClick={() => setSearch('')}
                            className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shops.map((shop) => (
                            <Link
                                key={shop.id}
                                href={`/shops/${shop.slug}`}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        {shop.logoUrl ? (
                                            <img
                                                src={shop.logoUrl}
                                                alt={shop.name}
                                                className="w-16 h-16 rounded-2xl object-cover border border-gray-100 dark:border-gray-700 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                                                {shop.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                    {shop.name}
                                                </h3>
                                                <span title="Gian hàng chính hãng" className="inline-flex">
                                                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Package className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{shop.totalProducts || 0} sản phẩm</span>
                                            </div>
                                        </div>
                                    </div>

                                    {shop.description ? (
                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                                            {shop.description}
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic line-clamp-2 mb-4">
                                            Gian hàng uy tín cung cấp sản phẩm đa dạng trên sàn ShopTTS.
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-50 dark:border-gray-700/60 flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                                    <span>Ghé thăm gian hàng</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Seller Registration Banner */}
                <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                Bạn muốn trở thành nhà bán hàng trên ShopTTS?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
                                Mở gian hàng miễn phí ngay hôm nay để tiếp cận hàng triệu khách hàng tiềm năng trên toàn quốc.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/account/shop-registration"
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shrink-0 inline-flex items-center gap-2"
                    >
                        <span>Đăng ký mở shop ngay</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
