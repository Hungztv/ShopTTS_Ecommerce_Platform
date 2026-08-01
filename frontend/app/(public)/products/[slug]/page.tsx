'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Star, Minus, Plus, ChevronLeft, ChevronRight,
    Truck, Shield, RotateCcw, Package, MessageCircle, Store, ExternalLink,
    Heart, Share2, Eye, ShoppingBag, Check, AlertCircle
} from 'lucide-react';
import { productsPublicService, Product } from '@/lib/services/public-api';
import { formatPrice } from '@/lib/utils/product-mapper';
import Image from 'next/image';
import AddToCartButton from '@/components/ui/AddToCartButton';
import WishlistButton from '@/components/ui/WishlistButton';
import CompareButton from '@/components/ui/CompareButton';
import ProductRatings from '@/components/product/ProductRatings';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const { user } = useAuth();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');

    useEffect(() => {
        const loadProduct = async () => {
            setLoading(true);
            const data = await productsPublicService.getBySlug(slug);
            if (data) {
                setProduct(data);
            }
            setLoading(false);
        };
        loadProduct();
    }, [slug]);

    // Only use real product image(s)
    const images = product ? [
        product.image || '/placeholder.jpg',
    ] : [];

    const discount = product?.capitalPrice && product.capitalPrice > product.price
        ? Math.round(((product.capitalPrice - product.price) / product.capitalPrice) * 100)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                    {/* Breadcrumb skeleton */}
                    <div className="animate-pulse flex gap-2 mb-8">
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" />
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        <div className="animate-pulse">
                            <div className="bg-slate-200 dark:bg-slate-800 aspect-square rounded-2xl" />
                        </div>
                        <div className="animate-pulse space-y-5">
                            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-24" />
                            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
                            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
                            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                            <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                <div className="text-center px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không tìm thấy sản phẩm</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                        Sản phẩm này có thể đã bị xóa hoặc không tồn tại
                    </p>
                    <button
                        onClick={() => router.push('/products')}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                        Xem sản phẩm khác
                    </button>
                </div>
            </div>
        );
    }

    const stockStatus = product.quantity > 10
        ? { label: 'Còn hàng', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: Check }
        : product.quantity > 0
            ? { label: `Còn ${product.quantity} sản phẩm`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: AlertCircle }
            : { label: 'Hết hàng', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', icon: AlertCircle };

    const StockIcon = stockStatus.icon;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">

            {/* ══════════════════ BREADCRUMB ══════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2">
                <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 overflow-x-auto">
                    <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap">Trang chủ</Link>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <Link href="/products" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap">Sản phẩm</Link>
                    {product.categoryName && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <Link href={`/products?category=${product.categoryId}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors whitespace-nowrap">
                                {product.categoryName}
                            </Link>
                        </>
                    )}
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{product.name}</span>
                </nav>
            </div>

            {/* ══════════════════ MAIN PRODUCT SECTION ══════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

                    {/* ──── LEFT: GALLERY ──── */}
                    <div className="space-y-4">
                        <div className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                            <img
                                src={images[selectedImage]}
                                alt={product.name}
                                className="w-full aspect-square object-cover"
                            />

                            {/* Discount Badge */}
                            {discount > 0 && (
                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-200 dark:shadow-none">
                                    -{discount}%
                                </div>
                            )}

                            {/* Wishlist */}
                            <WishlistButton productId={product.id} variant="icon" className="absolute top-4 right-4 z-10" />

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImage(i => i > 0 ? i - 1 : images.length - 1)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-white" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedImage(i => i < images.length - 1 ? i + 1 : 0)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-slate-700 dark:text-white" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2.5 overflow-x-auto pb-1">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={`flex-shrink-0 w-18 h-18 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i
                                            ? 'border-violet-500 ring-2 ring-violet-200 dark:ring-violet-800'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ──── RIGHT: PRODUCT INFO ──── */}
                    <div className="space-y-5">

                        {/* Category & Brand Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {product.categoryName && (
                                <Link
                                    href={`/products?category=${product.categoryId}`}
                                    className="px-2.5 py-1 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 text-xs font-semibold rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                >
                                    {product.categoryName}
                                </Link>
                            )}
                            {product.brandName && (
                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg">
                                    {product.brandName}
                                </span>
                            )}
                        </div>

                        {/* Product Name */}
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {product.name}
                        </h1>

                        {/* Rating & Stock Row */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < Math.floor(product.averageRating || 0)
                                                ? 'text-amber-400 fill-amber-400'
                                                : 'text-slate-200 dark:text-slate-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{product.averageRating || 0}</span>
                                <span className="text-sm text-slate-400">({product.totalReviews || 0} đánh giá)</span>
                            </div>

                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

                            <div className={`flex items-center gap-1.5 text-sm font-medium ${stockStatus.color}`}>
                                <StockIcon className="w-3.5 h-3.5" />
                                {stockStatus.label}
                            </div>
                        </div>

                        {/* ──── Price Card ──── */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                            <div className="flex items-end gap-3 flex-wrap">
                                <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {formatPrice(product.price)}
                                </span>
                                {product.capitalPrice && product.capitalPrice > product.price && (
                                    <span className="text-lg text-slate-400 line-through mb-0.5">
                                        {formatPrice(product.capitalPrice)}
                                    </span>
                                )}
                                {discount > 0 && (
                                    <span className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 rounded-lg mb-0.5">
                                        Tiết kiệm {formatPrice(product.capitalPrice! - product.price)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ──── Quantity & Actions ──── */}
                        <div className="space-y-4">
                            {/* Quantity */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Số lượng</span>
                                <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-xl transition-colors"
                                    >
                                        <Minus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    </button>
                                    <span className="w-14 text-center font-bold text-slate-900 dark:text-white text-base tabular-nums">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-xl transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2.5">
                                <div className="flex-1">
                                    <AddToCartButton productId={product.id} quantity={quantity} variant="button" className="!py-3.5 !text-base !font-bold !rounded-xl" />
                                </div>
                                <CompareButton productId={product.id} variant="button" />
                            </div>
                        </div>

                        {/* ──── Shop Info Card ──── */}
                        {(product.shopName || product.shopId) && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
                                <div className="flex items-center gap-3.5">
                                    {/* Shop Logo */}
                                    <Link href={`/shops/${product.shopSlug || product.shopId}`} className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900">
                                            {product.shopLogoUrl ? (
                                                <img src={product.shopLogoUrl} alt={product.shopName || 'Shop'} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                    </Link>

                                    {/* Shop Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/shops/${product.shopSlug || product.shopId}`}
                                                className="font-bold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate"
                                            >
                                                {product.shopName || `Shop #${product.shopId}`}
                                            </Link>
                                            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-md">
                                                <Check className="w-2.5 h-2.5" />
                                                Xác thực
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                            Cửa hàng đăng bán sản phẩm này
                                        </p>
                                    </div>

                                    {/* Shop Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Link
                                            href={`/shops/${product.shopSlug || product.shopId}`}
                                            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm shadow-violet-200 dark:shadow-none flex items-center gap-1.5"
                                        >
                                            <Store className="w-3.5 h-3.5" />
                                            Xem Shop
                                        </Link>
                                        {product.shopOwnerUserId && (
                                            user?.id === product.shopOwnerUserId ? (
                                                <button
                                                    disabled
                                                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-xl text-xs cursor-not-allowed"
                                                >
                                                    Shop của bạn
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => router.push(`/chat?userId=${product.shopOwnerUserId}`)}
                                                    className="px-3 py-2 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    Chat
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ──── Trust Badges ──── */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Truck, label: 'Giao hàng nhanh', desc: '1-3 ngày', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
                                { icon: Shield, label: 'Chính hãng 100%', desc: 'Bảo hành 12 tháng', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                                { icon: RotateCcw, label: 'Đổi trả dễ dàng', desc: 'Trong 30 ngày', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                            ].map((badge, i) => (
                                <div key={i} className="text-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${badge.bg} flex items-center justify-center`}>
                                        <badge.icon className={`w-5 h-5 ${badge.color}`} />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{badge.label}</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{badge.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ══════════════════ DETAIL TABS ══════════════════ */}
                <div className="mt-10">
                    {/* Tab Headers */}
                    <div className="bg-white dark:bg-slate-900 rounded-t-2xl border border-b-0 border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex">
                            {[
                                { key: 'description', label: 'Mô tả sản phẩm' },
                                { key: 'specs', label: 'Thông số' },
                                { key: 'reviews', label: `Đánh giá (${product.totalReviews || 0})` },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as 'description' | 'specs' | 'reviews')}
                                    className={`flex-1 py-4 px-4 text-center text-sm font-semibold transition-all relative ${activeTab === tab.key
                                        ? 'text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-100 dark:border-slate-800 p-6 lg:p-8 shadow-sm">
                        {activeTab === 'description' && (
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
                                    {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                                </p>
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="space-y-0">
                                {[
                                    { label: 'Thương hiệu', value: product.brandName || 'Chưa cập nhật' },
                                    { label: 'Danh mục', value: product.categoryName || 'Chưa cập nhật' },
                                    {
                                        label: 'Tình trạng',
                                        value: product.quantity > 0 ? 'Còn hàng' : 'Hết hàng',
                                        color: product.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                    },
                                    { label: 'Kho hàng', value: `${product.quantity} sản phẩm` },
                                ].map((spec, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center py-3.5 ${i < 3 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                    >
                                        <span className="w-36 text-sm text-slate-400 dark:text-slate-500 flex-shrink-0">{spec.label}</span>
                                        <span className={`text-sm font-medium ${spec.color || 'text-slate-800 dark:text-white'}`}>
                                            {spec.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <ProductRatings productId={product.id} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
