'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X, Grid3X3, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import {
    productsPublicService,
    categoriesPublicService,
    brandsPublicService,
    Product,
    Category,
    Brand,
    PaginatedResponse
} from '@/lib/services/public-api';
import { mapProduct } from '@/lib/utils/product-mapper';
import { trackSearch } from '@/lib/services/behavior-service';

function ProductsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Filters from URL
    const categoryId = searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined;
    const brandId = searchParams.get('brand') ? parseInt(searchParams.get('brand')!) : undefined;
    const search = searchParams.get('search') || '';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;

    // State
    const [products, setProducts] = useState<PaginatedResponse<Product>>({ items: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0 });
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Local filter state for form
    const [searchInput, setSearchInput] = useState(search);
    const [priceRange, setPriceRange] = useState({ min: minPrice?.toString() || '', max: maxPrice?.toString() || '' });

    // Load filter options
    useEffect(() => {
        const loadFilters = async () => {
            const [cats, brs] = await Promise.all([
                categoriesPublicService.getAll(),
                brandsPublicService.getAll()
            ]);
            setCategories(cats);
            setBrands(brs);
        };
        loadFilters();
    }, []);

    // Load products
    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            const data = await productsPublicService.getAll({
                page,
                pageSize: 12,
                categoryId,
                brandId,
                search,
                minPrice,
                maxPrice,
                sortBy,
                sortOrder
            });
            setProducts(data);
            setLoading(false);

            if (search && search.trim()) {
                trackSearch(search.trim(), 'products_catalog');
            }
        };
        loadProducts();
    }, [page, categoryId, brandId, search, minPrice, maxPrice, sortBy, sortOrder]);

    // Update URL
    const updateFilters = useCallback((params: Record<string, string | undefined>) => {
        const newParams = new URLSearchParams(searchParams.toString());

        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                newParams.set(key, value);
            } else {
                newParams.delete(key);
            }
        });

        // Reset page when filters change
        if (!params.page) {
            newParams.delete('page');
        }

        router.push(`/products?${newParams.toString()}`);
    }, [searchParams, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search: searchInput || undefined });
    };

    const handlePriceFilter = () => {
        updateFilters({
            minPrice: priceRange.min || undefined,
            maxPrice: priceRange.max || undefined
        });
    };

    const clearAllFilters = () => {
        router.push('/products');
        setSearchInput('');
        setPriceRange({ min: '', max: '' });
    };

    const hasActiveFilters = categoryId || brandId || search || minPrice || maxPrice;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                                Tất cả sản phẩm
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {products.totalCount} sản phẩm
                            </p>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full md:w-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Tìm kiếm sản phẩm..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
                            >
                                Tìm
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-semibold text-lg text-slate-800">Bộ lọc</h2>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-sm text-violet-600 hover:text-violet-700"
                                    >
                                        Xóa tất cả
                                    </button>
                                )}
                            </div>

                            {/* Categories */}
                            <div className="mb-6">
                                <h3 className="font-medium text-slate-700 mb-3">Danh mục</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => updateFilters({ category: categoryId === cat.id ? undefined : cat.id.toString() })}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${categoryId === cat.id
                                                ? 'bg-violet-100 text-violet-700 font-medium'
                                                : 'hover:bg-slate-100 text-slate-600'
                                                }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Brands */}
                            <div className="mb-6">
                                <h3 className="font-medium text-slate-700 mb-3">Thương hiệu</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {brands.map((brand) => (
                                        <button
                                            key={brand.id}
                                            onClick={() => updateFilters({ brand: brandId === brand.id ? undefined : brand.id.toString() })}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${brandId === brand.id
                                                ? 'bg-violet-100 text-violet-700 font-medium'
                                                : 'hover:bg-slate-100 text-slate-600'
                                                }`}
                                        >
                                            {brand.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div>
                                <h3 className="font-medium text-slate-700 mb-3">Khoảng giá</h3>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Từ"
                                        value={priceRange.min}
                                        onChange={(e) => setPriceRange(p => ({ ...p, min: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="Đến"
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange(p => ({ ...p, max: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handlePriceFilter}
                                    className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <button
                                onClick={() => setShowMobileFilter(true)}
                                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Bộ lọc
                                {hasActiveFilters && (
                                    <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                                )}
                            </button>

                            <div className="flex items-center gap-4 ml-auto">
                                {/* Sort */}
                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [sb, so] = e.target.value.split('-');
                                        updateFilters({ sortBy: sb, sortOrder: so });
                                    }}
                                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:border-violet-500 outline-none"
                                >
                                    <option value="createdAt-desc">Mới nhất</option>
                                    <option value="price-asc">Giá tăng dần</option>
                                    <option value="price-desc">Giá giảm dần</option>
                                    <option value="name-asc">Tên A-Z</option>
                                </select>

                                {/* View Mode */}
                                <div className="hidden sm:flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <LayoutList className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {search && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
                                        Tìm: {search}
                                        <button onClick={() => { setSearchInput(''); updateFilters({ search: undefined }); }}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {categoryId && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
                                        {categories.find(c => c.id === categoryId)?.name}
                                        <button onClick={() => updateFilters({ category: undefined })}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {brandId && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
                                        {brands.find(b => b.id === brandId)?.name}
                                        <button onClick={() => updateFilters({ brand: undefined })}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Products Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="bg-slate-200 rounded-2xl aspect-square mb-3"></div>
                                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : products.items.length > 0 ? (
                            <div className={viewMode === 'grid'
                                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                                : 'space-y-4'
                            }>
                                {products.items.map((product) => (
                                    <ProductCard key={product.id} {...mapProduct(product)} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">Không tìm thấy sản phẩm</h3>
                                <p className="text-slate-500 mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                <button
                                    onClick={clearAllFilters}
                                    className="px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {products.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <button
                                    onClick={() => updateFilters({ page: (page - 1).toString() })}
                                    disabled={page <= 1}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                {[...Array(Math.min(5, products.totalPages))].map((_, i) => {
                                    let pageNum = i + 1;
                                    if (products.totalPages > 5) {
                                        if (page > 3) {
                                            pageNum = page - 2 + i;
                                        }
                                        if (page > products.totalPages - 2) {
                                            pageNum = products.totalPages - 4 + i;
                                        }
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => updateFilters({ page: pageNum.toString() })}
                                            className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === pageNum
                                                ? 'bg-violet-600 text-white'
                                                : 'border border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => updateFilters({ page: (page + 1).toString() })}
                                    disabled={page >= products.totalPages}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Mobile Filter Modal */}
            {showMobileFilter && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilter(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-lg">Bộ lọc</h2>
                            <button onClick={() => setShowMobileFilter(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Same filter content as desktop */}
                        <div className="mb-6">
                            <h3 className="font-medium text-slate-700 mb-3">Danh mục</h3>
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            updateFilters({ category: categoryId === cat.id ? undefined : cat.id.toString() });
                                            setShowMobileFilter(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${categoryId === cat.id ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-100'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-medium text-slate-700 mb-3">Thương hiệu</h3>
                            <div className="space-y-2">
                                {brands.map((brand) => (
                                    <button
                                        key={brand.id}
                                        onClick={() => {
                                            updateFilters({ brand: brandId === brand.id ? undefined : brand.id.toString() });
                                            setShowMobileFilter(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${brandId === brand.id ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-100'}`}
                                    >
                                        {brand.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        }>
            <ProductsContent />
        </Suspense>
    );
}
