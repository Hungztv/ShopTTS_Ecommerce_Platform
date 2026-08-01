import type { Product } from '@/lib/services/public-api';

const PLACEHOLDER_IMAGE = '/placeholder.jpg';

export interface ProductCardData {
    id: number;
    name: string;
    slug: string;
    image: string;
    price: number;
    originalPrice?: number;
    rating: number;
    reviews: number;
    category: string;
    shopName?: string;
    shopSlug?: string;
    badge?: 'sale' | 'new' | 'hot';
}

/**
 * Map a Product DTO to ProductCard component props.
 * Shared across all pages that render ProductCard.
 */
export function mapProduct(product: Product): ProductCardData {
    const hasDiscount = product.capitalPrice && product.capitalPrice > product.price;
    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image || PLACEHOLDER_IMAGE,
        price: product.price,
        originalPrice: hasDiscount ? product.capitalPrice : undefined,
        rating: product.averageRating || 0,
        reviews: product.totalReviews || 0,
        category: product.categoryName || '',
        shopName: product.shopName,
        shopSlug: product.shopSlug || (product.shopId ? product.shopId.toString() : undefined),
        badge: hasDiscount ? 'sale' : undefined,
    };
}

/**
 * Format a number as Vietnamese Dong
 */
export function formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(original: number, sale: number): number {
    if (original <= 0) return 0;
    return Math.round(((original - sale) / original) * 100);
}
