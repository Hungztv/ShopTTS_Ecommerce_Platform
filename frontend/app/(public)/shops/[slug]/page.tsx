'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Search, Star, Package, CalendarDays, ChevronLeft, ChevronRight,
    Store, ArrowLeft, MessageCircle, Shield, Truck, Clock, Filter, X, SlidersHorizontal
} from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import ShopRatings from '@/components/shop/ShopRatings';
import {
    shopsPublicService,
    categoriesPublicService,
    ShopPublic,
    Product,
    Category,
    PaginatedResponse
} from '@/lib/services/public-api';
import { mapProduct, formatPrice } from '@/lib/utils/product-mapper';

function ShopContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    // State
    const [shop, setShop] = useState<ShopPublic | null>(null);
    const [products, setProducts] = useState<PaginatedResponse<Product>>({ items: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0 });
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Filters from URL
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const categoryId = searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Local state
    const [searchInput, setSearchInput] = useState(search);

    // Load shop info
    useEffect(() => {
        const loadShop = async () => {
            setLoading(true);
            const shopData = await shopsPublicService.getBySlug(slug);
            if (!shopData) {
                setLoading(false);
                return;
            }
            setShop(shopData);
            setLoading(false);
        };
        loadShop();
    }, [slug]);

    // Load categories
    useEffect(() => {
        categoriesPublicService.getAll().then(setCategories);
    }, []);

    // Load products when shop or filters change
    useEffect(() => {
        if (!shop) return;
        const loadProducts = async () => {
            setProductsLoading(true);
            const data = await shopsPublicService.getProducts(shop.id, {
                page,
                pageSize: 12,
                categoryId,
                search,
                sortBy,
                sortOrder
            });
            setProducts(data);
            setProductsLoading(false);
        };
        loadProducts();
    }, [shop, page, categoryId, search, sortBy, sortOrder]);

    // URL update helper
    const updateFilters = (params: Record<string, string | undefined>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            if (value) newParams.set(key, value);
            else newParams.delete(key);
        });
        if (!params.page) newParams.delete('page');
        router.push(`/shops/${slug}?${newParams.toString()}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search: searchInput || undefined });
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
                <div className="animate-pulse">
                    {/* Cover skeleton */}
                    <div className="h-56 md:h-72 bg-slate-200 dark:bg-slate-800" />

                    {/* Profile card skeleton */}
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-20">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                <div className="w-28 h-28 rounded-2xl bg-slate-200 dark:bg-slate-700 ring-4 ring-white dark:ring-slate-900 -mt-16 sm:-mt-20" />
                                <div className="flex-1 text-center sm:text-left space-y-3 pt-2">
                                    <div className="h-7 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto sm:mx-0" />
                                    <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800 rounded mx-auto sm:mx-0" />
                                    <div className="flex justify-center sm:justify-start gap-6 pt-2">
                                        <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                        <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                        <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Not found
    if (!shop) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                <div className="text-center px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Store className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không tìm thấy Cửa hàng</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                        Cửa hàng này không tồn tại hoặc đã ngừng hoạt động
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    const memberSince = new Date(shop.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    // Star rating display helper
    const renderStars = (rating: number) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= Math.round(rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 dark:text-slate-700'
                        }`}
                />
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">

            {/* ══════════════════ HERO / COVER ══════════════════ */}
            <div className="relative overflow-hidden">
                {shop.coverUrl ? (
                    <div className="h-56 md:h-72 lg:h-80 overflow-hidden">
                        <img
                            src={shop.coverUrl}
                            alt={`${shop.name} cover`}
                            className="w-full h-full object-cover scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>
                ) : (
                    <div className="h-56 md:h-72 lg:h-80 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700" />
                        <div className="absolute inset-0 opacity-[0.15]" style={{
                            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px),
                                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                            backgroundSize: '40px 40px'
                        }} />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
                    </div>
                )}
            </div>

            {/* ══════════════════ SHOP PROFILE CARD ══════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 border border-white/60 dark:border-slate-800/60 p-5 sm:p-7">
                    <div className="flex flex-col sm:flex-row gap-5">
                        {/* Logo */}
                        <div className="flex-shrink-0 self-center sm:self-start -mt-14 sm:-mt-16">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-lg bg-white dark:bg-slate-800">
                                {shop.logoUrl ? (
                                    <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600">
                                        <Store className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                                        {shop.name}
                                    </h1>
                                    {shop.description && (
                                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-xl">
                                            {shop.description}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0 pt-1">
                                    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-md shadow-violet-200 dark:shadow-none">
                                        <MessageCircle className="w-4 h-4" />
                                        Chat
                                    </button>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                                        <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Sản phẩm</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{shop.totalProducts}</p>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Đánh giá</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            {shop.averageRating > 0 ? shop.averageRating.toFixed(1) : '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Hoạt động</p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Đang mở</p>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Tham gia</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{memberSince}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════ TAB BAR ══════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-5">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 sm:flex-none sm:px-8 py-3.5 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'products'
                                ? 'text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Sản phẩm</span>
                            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === 'products'
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>{shop.totalProducts}</span>
                            {activeTab === 'products' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`flex-1 sm:flex-none sm:px-8 py-3.5 text-sm font-semibold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'reviews'
                                ? 'text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <Star className="w-4 h-4" />
                            <span>Đánh giá</span>
                            {shop.averageRating > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === 'reviews'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>{shop.averageRating.toFixed(1)} ★</span>
                            )}
                            {activeTab === 'reviews' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════ CONTENT AREA ══════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-16">

                {activeTab === 'reviews' ? (
                    <ShopRatings shopId={shop.id} shopName={shop.name} />
                ) : (
                    <>
                        {/* Filter / Search Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                            {/* Search */}
                            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-lg">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Tìm kiếm sản phẩm..."
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900 outline-none transition-all bg-white dark:bg-slate-900 dark:text-white text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity text-sm font-semibold"
                                >
                                    Tìm
                                </button>
                            </form>

                            {/* Desktop Filters */}
                            <div className="hidden sm:flex items-center gap-2">
                                <select
                                    value={categoryId || ''}
                                    onChange={(e) => updateFilters({ category: e.target.value || undefined })}
                                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm focus:border-violet-400 outline-none cursor-pointer"
                                >
                                    <option value="">Tất cả danh mục</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [sb, so] = e.target.value.split('-');
                                        updateFilters({ sortBy: sb, sortOrder: so });
                                    }}
                                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white text-sm focus:border-violet-400 outline-none cursor-pointer"
                                >
                                    <option value="createdAt-desc">Mới nhất</option>
                                    <option value="soldOut-desc">Bán chạy</option>
                                    <option value="price-asc">Giá thấp → cao</option>
                                    <option value="price-desc">Giá cao → thấp</option>
                                </select>
                            </div>

                            {/* Mobile filter toggle */}
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Bộ lọc
                            </button>
                        </div>

                        {/* Mobile Filters Drawer */}
                        {showMobileFilters && (
                            <div className="sm:hidden flex flex-col gap-2 mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                <select
                                    value={categoryId || ''}
                                    onChange={(e) => { updateFilters({ category: e.target.value || undefined }); setShowMobileFilters(false); }}
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                                >
                                    <option value="">Tất cả danh mục</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => { const [sb, so] = e.target.value.split('-'); updateFilters({ sortBy: sb, sortOrder: so }); setShowMobileFilters(false); }}
                                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm"
                                >
                                    <option value="createdAt-desc">Mới nhất</option>
                                    <option value="soldOut-desc">Bán chạy</option>
                                    <option value="price-asc">Giá thấp → cao</option>
                                    <option value="price-desc">Giá cao → thấp</option>
                                </select>
                            </div>
                        )}

                        {/* Active filters summary */}
                        {(search || categoryId) && (
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-xs text-slate-400">Đang lọc:</span>
                                {search && (
                                    <button
                                        onClick={() => { setSearchInput(''); updateFilters({ search: undefined }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                    >
                                        &quot;{search}&quot; <X className="w-3 h-3" />
                                    </button>
                                )}
                                {categoryId && (
                                    <button
                                        onClick={() => updateFilters({ category: undefined })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                    >
                                        {categories.find(c => c.id === categoryId)?.name || 'Danh mục'} <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Results header */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-800 dark:text-white">{products.totalCount}</span> sản phẩm
                                {search && <> cho &quot;{search}&quot;</>}
                            </p>
                        </div>

                        {/* Product Grid */}
                        {productsLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl aspect-square mb-3" />
                                        <div className="space-y-2 px-1">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.items.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {products.items.map((product) => (
                                    <ProductCard key={product.id} {...mapProduct(product)} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <Package className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Không tìm thấy sản phẩm
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchInput('');
                                        router.push(`/shops/${slug}`);
                                    }}
                                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity text-sm font-semibold"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {products.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5 mt-10">
                                <button
                                    onClick={() => updateFilters({ page: (page - 1).toString() })}
                                    disabled={page <= 1}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {[...Array(Math.min(5, products.totalPages))].map((_, i) => {
                                    let pageNum = i + 1;
                                    if (products.totalPages > 5) {
                                        if (page > 3) pageNum = page - 2 + i;
                                        if (page > products.totalPages - 2) pageNum = products.totalPages - 4 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => updateFilters({ page: pageNum.toString() })}
                                            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${page === pageNum
                                                ? 'bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-none'
                                                : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => updateFilters({ page: (page + 1).toString() })}
                                    disabled={page >= products.totalPages}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-600" />
                    <p className="text-sm text-slate-400">Đang tải...</p>
                </div>
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
