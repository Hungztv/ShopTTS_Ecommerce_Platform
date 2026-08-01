'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Star, Minus, Plus, ChevronLeft, ChevronRight,
    Truck, Shield, RotateCcw, Package, MessageCircle, Store, ExternalLink
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Image Skeleton */}
                        <div className="animate-pulse">
                            <div className="bg-slate-200 aspect-square rounded-3xl mb-4"></div>
                            <div className="flex gap-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-20 h-20 bg-slate-200 rounded-xl"></div>
                                ))}
                            </div>
                        </div>
                        {/* Info Skeleton */}
                        <div className="animate-pulse space-y-4">
                            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-12 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-32 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Không tìm thấy sản phẩm</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Sản phẩm này có thể đã bị xóa hoặc không tồn tại</p>
                    <button
                        onClick={() => router.push('/products')}
                        className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
                    >
                        Xem sản phẩm khác
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Breadcrumb */}
            <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <Link href="/" className="hover:text-violet-600">Trang chủ</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-violet-600">Sản phẩm</Link>
                        <span>/</span>
                        {product.categoryName && (
                            <>
                                <Link href={`/products?category=${product.categoryId}`} className="hover:text-violet-600">
                                    {product.categoryName}
                                </Link>
                                <span>/</span>
                            </>
                        )}
                        <span className="text-slate-800 dark:text-white font-medium truncate max-w-[200px]">{product.name}</span>
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Product Gallery */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        <div className="relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <img
                                src={images[selectedImage]}
                                alt={product.name}
                                className="w-full aspect-square object-cover"
                            />

                            {/* Discount Badge */}
                            {discount > 0 && (
                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold rounded-full">
                                    -{discount}%
                                </div>
                            )}

                            {/* Navigation Arrows - only show when multiple images */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImage(i => i > 0 ? i - 1 : images.length - 1)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setSelectedImage(i => i < images.length - 1 ? i + 1 : 0)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails - only show when multiple images */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i
                                            ? 'border-violet-500 ring-2 ring-violet-200'
                                            : 'border-transparent hover:border-slate-300'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        {/* Category & Brand */}
                        <div className="flex items-center gap-3">
                            {product.categoryName && (
                                <span className="px-3 py-1 bg-violet-100 text-violet-600 text-sm font-medium rounded-full">
                                    {product.categoryName}
                                </span>
                            )}
                            {product.brandName && (
                                <span className="text-slate-500 text-sm">{product.brandName}</span>
                            )}
                        </div>

                        {/* Name */}
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">
                            {product.name}
                        </h1>

                        {/* Rating */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-5 h-5 ${i < Math.floor(product.averageRating || 0)
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="font-medium text-slate-700">{product.averageRating || 0}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500">{product.totalReviews || 0} đánh giá</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-emerald-600 font-medium">
                                <Package className="w-4 h-4 inline-block mr-1" />
                                Còn {product.quantity} sản phẩm
                            </span>
                        </div>

                        {/* Price */}
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-6">
                            <div className="flex items-baseline gap-4">
                                <span className="text-3xl lg:text-4xl font-bold text-violet-600">
                                    {formatPrice(product.price)}
                                </span>
                                {product.capitalPrice && product.capitalPrice > product.price && (
                                    <span className="text-xl text-slate-400 line-through">
                                        {formatPrice(product.capitalPrice)}
                                    </span>
                                )}
                            </div>
                            {discount > 0 && (
                                <p className="text-sm text-emerald-600 mt-2 font-medium">
                                    🔥 Tiết kiệm {formatPrice(product.capitalPrice! - product.price)}
                                </p>
                            )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-6">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Số lượng:</span>
                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-semibold text-lg dark:text-white">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))}
                                    className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <AddToCartButton productId={product.id} quantity={quantity} variant="button" className="!py-4 !text-lg" />
                            </div>
                            <WishlistButton productId={product.id} variant="button" />
                            <CompareButton productId={product.id} variant="button" />
                        </div>

                        {/* Khối thông tin Cửa Hàng (Shop) */}
                        {(product.shopName || product.shopId) && (
                            <div className="p-4 sm:p-5 rounded-2xl border border-violet-100 dark:border-slate-700 bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30 dark:from-slate-800 dark:to-slate-800/80 shadow-sm space-y-4">
                                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                                    <div className="flex items-center gap-3">
                                        {/* Logo Shop */}
                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-violet-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                                            {product.shopLogoUrl ? (
                                                <img src={product.shopLogoUrl} alt={product.shopName || 'Shop'} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/shops/${product.shopSlug || product.shopId}`}
                                                    className="font-bold text-slate-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-base"
                                                >
                                                    {product.shopName || `Shop #${product.shopId}`}
                                                </Link>
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                                                    Đã xác thực
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Cửa hàng đăng bán sản phẩm này
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {/* Nút Xem Shop */}
                                    <Link
                                        href={`/shops/${product.shopSlug || product.shopId}`}
                                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-violet-200 dark:shadow-none"
                                    >
                                        <Store className="w-4 h-4" />
                                        <span>Xem Shop sản phẩm</span>
                                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                    </Link>

                                    {/* Nút Chat với Shop */}
                                    {product.shopOwnerUserId && (
                                        user?.id === product.shopOwnerUserId ? (
                                            <button
                                                disabled
                                                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 text-slate-400 rounded-xl bg-slate-50 font-medium text-sm cursor-not-allowed"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                Shop của bạn
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => router.push(`/chat?userId=${product.shopOwnerUserId}`)}
                                                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-xl font-medium text-sm transition-all"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                Chat ngay
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Trust Badges */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t dark:border-slate-700">
                            <div className="text-center">
                                <Truck className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Giao hàng nhanh</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">1-3 ngày</p>
                            </div>
                            <div className="text-center">
                                <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Chính hãng 100%</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Bảo hành 12 tháng</p>
                            </div>
                            <div className="text-center">
                                <RotateCcw className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Đổi trả dễ dàng</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Trong 30 ngày</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Details Tabs */}
                <div className="mt-12 bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden">
                    {/* Tab Headers */}
                    <div className="flex border-b dark:border-slate-700">
                        {[
                            { key: 'description', label: 'Mô tả sản phẩm' },
                            { key: 'specs', label: 'Thông số kỹ thuật' },
                            { key: 'reviews', label: `Đánh giá (${product.totalReviews || 0})` },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as 'description' | 'specs' | 'reviews')}
                                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 lg:p-8">
                        {activeTab === 'description' && (
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                                </p>
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="space-y-3">
                                <div className="flex py-3 border-b border-slate-100">
                                    <span className="w-40 text-slate-500">Thương hiệu</span>
                                    <span className="text-slate-800 font-medium">{product.brandName || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="flex py-3 border-b border-slate-100">
                                    <span className="w-40 text-slate-500">Danh mục</span>
                                    <span className="text-slate-800 font-medium">{product.categoryName || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="flex py-3 border-b border-slate-100">
                                    <span className="w-40 text-slate-500">Tình trạng</span>
                                    <span className={`font-medium ${product.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {product.quantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                    </span>
                                </div>
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
