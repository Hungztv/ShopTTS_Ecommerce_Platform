'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { productsService } from '@/lib/services/admin/products-service';
import { categoriesService } from '@/lib/services/admin/categories-service';
import { brandsService } from '@/lib/services/admin/brands-service';
import ImageUpload from '@/components/admin/ImageUpload';

interface Category {
    id: number;
    name: string;
}

interface Brand {
    id: number;
    name: string;
}

// DTO chính xác từ Backend: UpdateProductCommand
interface UpdateProductDto {
    id: number;             // Required (từ route)
    name: string;           // Required, MinLength(4), MaxLength(100)
    slug: string;           // Required, regex: ^[a-z0-9]+(?:-[a-z0-9]+)*$
    description: string;    // Required, MinLength(10), MaxLength(5000)
    price: number;          // Required, GreaterThan(0)
    capitalPrice: number;   // Required, GreaterThan(0), LessThan(price)
    quantity: number;       // GreaterThanOrEqualTo(0)
    image: string;          // Required, MaxLength(500)
    brandId: number;        // Required, GreaterThan(0)
    categoryId: number;     // Required, GreaterThan(0)
}

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<UpdateProductDto>({
        id: id,
        name: '',
        slug: '',
        description: '',
        price: 0,
        capitalPrice: 0,
        quantity: 0,
        image: '',
        brandId: 0,
        categoryId: 0,
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [product, categories, brands] = await Promise.all([
                productsService.getById(id),
                categoriesService.getAll(),
                brandsService.getAll()
            ]);

            setCategories(categories);
            setBrands(brands);

            if (product) {
                setFormData({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description || '',
                    price: product.price,
                    capitalPrice: product.capitalPrice || 0,
                    quantity: product.quantity,
                    image: product.image || '',
                    brandId: product.brandId,
                    categoryId: product.categoryId,
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    };

    const handleNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            name: value,
            slug: generateSlug(value)
        }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name: Required, MinLength(4), MaxLength(100)
        if (!formData.name || formData.name.trim().length < 4) {
            newErrors.name = 'Tên sản phẩm phải có ít nhất 4 ký tự';
        } else if (formData.name.length > 100) {
            newErrors.name = 'Tên sản phẩm không được vượt quá 100 ký tự';
        }

        // Slug: Required, regex pattern
        if (!formData.slug) {
            newErrors.slug = 'Slug không được để trống';
        } else {
            const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
            if (!slugPattern.test(formData.slug)) {
                newErrors.slug = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang';
            }
        }

        // Description: Required, MinLength(10), MaxLength(5000)
        if (!formData.description || formData.description.trim().length < 10) {
            newErrors.description = 'Mô tả phải có ít nhất 10 ký tự';
        } else if (formData.description.length > 5000) {
            newErrors.description = 'Mô tả không được vượt quá 5000 ký tự';
        }

        // Price: GreaterThan(0)
        if (formData.price <= 0) {
            newErrors.price = 'Giá bán phải lớn hơn 0';
        }

        // CapitalPrice: GreaterThan(0), LessThan(price)
        if (formData.capitalPrice <= 0) {
            newErrors.capitalPrice = 'Giá vốn phải lớn hơn 0';
        } else if (formData.capitalPrice >= formData.price) {
            newErrors.capitalPrice = 'Giá vốn phải nhỏ hơn giá bán';
        }

        // Quantity: GreaterThanOrEqualTo(0)
        if (formData.quantity < 0) {
            newErrors.quantity = 'Số lượng không được âm';
        }

        // Image: Required, MaxLength(500)
        if (!formData.image) {
            newErrors.image = 'Vui lòng upload ảnh sản phẩm';
        } else if (formData.image.length > 500) {
            newErrors.image = 'Đường dẫn ảnh không được vượt quá 500 ký tự';
        }

        // BrandId: GreaterThan(0)
        if (!formData.brandId || formData.brandId <= 0) {
            newErrors.brandId = 'Vui lòng chọn thương hiệu';
        }

        // CategoryId: GreaterThan(0)
        if (!formData.categoryId || formData.categoryId <= 0) {
            newErrors.categoryId = 'Vui lòng chọn danh mục';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setSaving(true);
        try {
            await productsService.update(id, formData);
            router.push(`/admin/products/${id}`);
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error updating product:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi cập nhật sản phẩm!');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/admin/products/${id}`}>
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Sửa sản phẩm</h1>
                            <p className="text-slate-500">Cập nhật thông tin sản phẩm</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        {/* Section: Thông tin cơ bản */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Thông tin cơ bản</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Tên sản phẩm <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`}
                                        placeholder="Nhập tên sản phẩm (4-100 ký tự)"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Slug <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.slug ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`}
                                        placeholder="ten-san-pham"
                                    />
                                    {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Số lượng tồn kho
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.quantity ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`}
                                        min="0"
                                    />
                                    {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Giá */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Thông tin giá</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Giá bán <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.price || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                            className={`w-full px-4 py-3 pr-16 rounded-xl border ${errors.price ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`}
                                            placeholder="0"
                                            min="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">VND</span>
                                    </div>
                                    {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
                                    {formData.price > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">{formatCurrency(formData.price)} ₫</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Giá vốn <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.capitalPrice || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, capitalPrice: parseFloat(e.target.value) || 0 }))}
                                            className={`w-full px-4 py-3 pr-16 rounded-xl border ${errors.capitalPrice ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all`}
                                            placeholder="0"
                                            min="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">VND</span>
                                    </div>
                                    {errors.capitalPrice && <p className="mt-1 text-sm text-red-500">{errors.capitalPrice}</p>}
                                    {formData.capitalPrice > 0 && formData.price > formData.capitalPrice && (
                                        <p className="mt-1 text-sm text-emerald-600">
                                            Lợi nhuận: {formatCurrency(formData.price - formData.capitalPrice)} ₫ ({Math.round((formData.price - formData.capitalPrice) / formData.price * 100)}%)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section: Phân loại */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Phân loại</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Danh mục <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.categoryId ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white`}
                                    >
                                        <option value={0}>-- Chọn danh mục --</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    {errors.categoryId && <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Thương hiệu <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.brandId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, brandId: parseInt(e.target.value) }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.brandId ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white`}
                                    >
                                        <option value={0}>-- Chọn thương hiệu --</option>
                                        {brands.map((brand) => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </select>
                                    {errors.brandId && <p className="mt-1 text-sm text-red-500">{errors.brandId}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Mô tả */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Mô tả sản phẩm</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Mô tả chi tiết <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={6}
                                    className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500' : 'border-slate-200'} focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all resize-none`}
                                    placeholder="Nhập mô tả sản phẩm (tối thiểu 10 ký tự)"
                                />
                                <div className="flex justify-between mt-1">
                                    {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                    <p className="text-sm text-slate-400 ml-auto">{formData.description.length}/5000</p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Hình ảnh */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Hình ảnh</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Ảnh sản phẩm <span className="text-red-500">*</span>
                                </label>
                                <ImageUpload
                                    value={formData.image}
                                    onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                                    type="product"
                                />
                                {errors.image && <p className="mt-2 text-sm text-red-500">{errors.image}</p>}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <Link href={`/admin/products/${id}`}>
                                <button
                                    type="button"
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Cập nhật
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
