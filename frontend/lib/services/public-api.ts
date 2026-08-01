import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
        try {
            const res = await axios.get<ApiResponse<Slider[]>>(`${API_URL}/Sliders/active`);
            return res.data.data || [];
        } catch (error) {
            console.error('Error fetching sliders:', error);
            return [];
        }
    }
};

// Categories Service
export const categoriesPublicService = {
    async getAll(): Promise<Category[]> {
        try {
            const res = await axios.get<ApiResponse<PaginatedResponse<Category>>>(`${API_URL}/Categories?pageSize=50`);
            return res.data.data?.items || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    async getById(id: number): Promise<Category | null> {
        try {
            const res = await axios.get<ApiResponse<Category>>(`${API_URL}/Categories/${id}`);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching category:', error);
            return null;
        }
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
        try {
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

            const res = await axios.get<ApiResponse<PaginatedResponse<Product>>>(`${API_URL}/Products?${queryParams.toString()}`);
            return res.data.data || { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
        } catch (error) {
            console.error('Error fetching products:', error);
            return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
        }
    },

    async getById(id: number): Promise<Product | null> {
        try {
            const res = await axios.get<ApiResponse<Product>>(`${API_URL}/Products/${id}`);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    },

    async getBySlug(slug: string): Promise<Product | null> {
        try {
            const res = await axios.get<ApiResponse<Product>>(`${API_URL}/Products/slug/${slug}`);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    }
};

// Brands Service
export const brandsPublicService = {
    async getAll(): Promise<Brand[]> {
        try {
            const res = await axios.get<ApiResponse<PaginatedResponse<Brand>>>(`${API_URL}/Brands?pageSize=100`);
            return res.data.data?.items || [];
        } catch (error) {
            console.error('Error fetching brands:', error);
            return [];
        }
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
    async getBySlug(slug: string): Promise<ShopPublic | null> {
        try {
            const res = await axios.get<ApiResponse<ShopPublic>>(`${API_URL}/Shops/slug/${slug}`);
            return res.data.data;
        } catch (error) {
            console.error('Error fetching shop:', error);
            return null;
        }
    },

    async getProducts(shopId: number, params: ProductsQuery = {}): Promise<PaginatedResponse<Product>> {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('pageNumber', params.page.toString());
            if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
            if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
            if (params.search) queryParams.append('search', params.search);
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            const res = await axios.get<ApiResponse<PaginatedResponse<Product>>>(`${API_URL}/Shops/${shopId}/products?${queryParams.toString()}`);
            return res.data.data || { items: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0 };
        } catch (error) {
            console.error('Error fetching shop products:', error);
            return { items: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0 };
        }
    }
};
