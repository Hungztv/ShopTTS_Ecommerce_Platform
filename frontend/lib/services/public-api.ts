const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper for fetching JSON safely without Node http legacy url.parse
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(url, options);
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return null;
    }
}

// Types
export interface Slider {
    id: number;
    name: string;
    title: string;
    image: string;
    description: string;
    link: string;
    displayOrder: number;
    status: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Category {
    id: number;
    name: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: number;
    productCount?: number;
}

export interface Brand {
    id: number;
    name: string;
    logo?: string;
    description?: string;
}

export interface Product {
    id: number;
    name: string;
    slug: string;
    description?: string;
    price: number;
    capitalPrice?: number;
    quantity: number;
    image?: string;
    categoryId: number;
    categoryName?: string;
    brandId?: number;
    brandName?: string;
    shopId?: number;
    shopName?: string;
    shopSlug?: string;
    shopLogoUrl?: string;
    shopOwnerUserId?: string;
    averageRating?: number;
    totalReviews?: number;
    createdAt?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Slider Service
export const slidersPublicService = {
    async getActive(): Promise<Slider[]> {
        const data = await fetchJson<ApiResponse<Slider[]>>(`${API_URL}/Sliders/active`);
        return data?.data || [];
    }
};

// Categories Service
export const categoriesPublicService = {
    async getAll(): Promise<Category[]> {
        const data = await fetchJson<ApiResponse<PaginatedResponse<Category>>>(`${API_URL}/Categories?pageSize=50`);
        return data?.data?.items || [];
    },

    async getById(id: number): Promise<Category | null> {
        const data = await fetchJson<ApiResponse<Category>>(`${API_URL}/Categories/${id}`);
        return data?.data || null;
    }
};

// Products Service
export interface ProductsQuery {
    page?: number;
    pageSize?: number;
    categoryId?: number;
    brandId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const productsPublicService = {
    async getAll(params: ProductsQuery = {}): Promise<PaginatedResponse<Product>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('pageNumber', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
        if (params.brandId) queryParams.append('brandId', params.brandId.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.minPrice) queryParams.append('minPrice', params.minPrice.toString());
        if (params.maxPrice) queryParams.append('maxPrice', params.maxPrice.toString());
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const url = `${API_URL}/Products?${queryParams.toString()}`;
        const data = await fetchJson<ApiResponse<PaginatedResponse<Product>>>(url);
        return data?.data || { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    },

    async getById(id: number): Promise<Product | null> {
        const data = await fetchJson<ApiResponse<Product>>(`${API_URL}/Products/${id}`);
        return data?.data || null;
    },

    async getBySlug(slug: string): Promise<Product | null> {
        const data = await fetchJson<ApiResponse<Product>>(`${API_URL}/Products/slug/${slug}`);
        return data?.data || null;
    }
};

// Brands Service
export const brandsPublicService = {
    async getAll(): Promise<Brand[]> {
        const data = await fetchJson<ApiResponse<PaginatedResponse<Brand>>>(`${API_URL}/Brands?pageSize=100`);
        return data?.data?.items || [];
    }
};

// Shop Public Types
export interface ShopPublic {
    id: number;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    createdAt: string;
    totalProducts: number;
    averageRating: number;
}

// Shop Public Service
export const shopsPublicService = {
    async getAll(search?: string): Promise<ShopPublic[]> {
        const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
        const data = await fetchJson<ApiResponse<ShopPublic[]>>(`${API_URL}/Shops${queryParams}`);
        return data?.data || [];
    },

    async getBySlug(slug: string): Promise<ShopPublic | null> {
        const data = await fetchJson<ApiResponse<ShopPublic>>(`${API_URL}/Shops/slug/${slug}`);
        return data?.data || null;
    },

    async getProducts(shopId: number, params: ProductsQuery = {}): Promise<PaginatedResponse<Product>> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('pageNumber', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const url = `${API_URL}/Shops/${shopId}/products?${queryParams.toString()}`;
        const data = await fetchJson<ApiResponse<PaginatedResponse<Product>>>(url);
        return data?.data || { items: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0 };
    }
};
