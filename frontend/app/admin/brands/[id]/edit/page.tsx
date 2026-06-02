'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Building2 } from 'lucide-react';
import { brandsService, UpdateBrandDto } from '@/lib/services/admin/brands-service';
import { Brand } from '@/lib/services/admin/dashboard-service';
import ImageUpload from '@/components/admin/ImageUpload';

export default function EditBrandPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [brand, setBrand] = useState<Brand | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        slug: '',
        status: 'Active',
        logo: '',
    });

    useEffect(() => {
        loadBrand();
    }, [id]);

    const loadBrand = async () => {
        try {
            const data = await brandsService.getById(id);
            if (data) {
                setBrand(data);
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    slug: data.slug || '',
                    status: data.status || 'Active',
                    logo: data.logo || '',
                });
            } else {
                alert('Không tìm thấy thương hiệu!');
                router.push('/admin/brands');
            }
        } catch (error) {
            console.error('Error loading brand:', error);
            alert('Có lỗi xảy ra khi tải thương hiệu!');
            router.push('/admin/brands');
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate slug từ name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const handleNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            name: value,
            slug: generateSlug(value)
        }));
    };

    // Validation EXACT match với Backend UpdateBrandCommand
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name: Required, MinLength(4), MaxLength(200)
        if (!formData.name || formData.name.trim().length < 4) {
            newErrors.name = 'Tên thương hiệu phải có ít nhất 4 ký tự';
        } else if (formData.name.length > 200) {
            newErrors.name = 'Tên thương hiệu không được vượt quá 200 ký tự';
        }

        // Description: Required, MinLength(4), MaxLength(500)
        if (!formData.description || formData.description.trim().length < 4) {
            newErrors.description = 'Mô tả phải có ít nhất 4 ký tự';
        } else if (formData.description.length > 500) {
            newErrors.description = 'Mô tả không được vượt quá 500 ký tự';
        }

        // Slug: Optional, MaxLength(250), pattern
        if (formData.slug) {
            if (formData.slug.length > 250) {
                newErrors.slug = 'Slug không được vượt quá 250 ký tự';
            } else {
                const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                if (!slugPattern.test(formData.slug)) {
                    newErrors.slug = 'Slug chỉ chứa chữ thường, số và dấu gạch ngang';
                }
            }
        }

        // Status: Optional, MaxLength(50), enum
        if (formData.status && !['Active', 'Inactive'].includes(formData.status)) {
            newErrors.status = 'Trạng thái không hợp lệ';
        }

        // Logo: Optional, MaxLength(500)
        if (formData.logo && formData.logo.length > 500) {
            newErrors.logo = 'Đường dẫn logo không được vượt quá 500 ký tự';
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
            const updateData: UpdateBrandDto = {
                name: formData.name,
                description: formData.description,
                slug: formData.slug,
                status: formData.status,
                logo: formData.logo || undefined,
            };
            await brandsService.update(id, updateData);
            router.push('/admin/brands');
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error updating brand:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thương hiệu!');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-slate-600">Đang tải...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/brands">
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Chỉnh sửa thương hiệu</h1>
                                <p className="text-slate-500">Cập nhật thông tin: {brand?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        {/* Tên thương hiệu */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên thương hiệu <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all`}
                                placeholder="Nhập tên thương hiệu (4-200 ký tự)"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            <p className="mt-1 text-sm text-slate-400">{formData.name.length}/200 ký tự</p>
                        </div>

                        {/* Slug */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Slug
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.slug ? 'border-red-500' : 'border-slate-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all`}
                                placeholder="ten-thuong-hieu"
                            />
                            {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug}</p>}
                        </div>

                        {/* Mô tả */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Mô tả <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500' : 'border-slate-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none`}
                                placeholder="Nhập mô tả thương hiệu (4-500 ký tự)"
                            />
                            <div className="flex justify-between mt-1">
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                <p className="text-sm text-slate-400 ml-auto">{formData.description.length}/500</p>
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Logo thương hiệu
                            </label>
                            <ImageUpload
                                value={formData.logo || ''}
                                onChange={(url) => setFormData(prev => ({ ...prev, logo: url }))}
                                type="brand"
                            />
                            {errors.logo && <p className="mt-2 text-sm text-red-500">{errors.logo}</p>}
                        </div>

                        {/* Trạng thái */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.status ? 'border-red-500' : 'border-slate-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white`}
                            >
                                <option value="Active">Hoạt động</option>
                                <option value="Inactive">Không hoạt động</option>
                            </select>
                            {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <Link href="/admin/brands">
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
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
