'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, FolderTree } from 'lucide-react';
import { categoriesService, UpdateCategoryDto } from '@/lib/services/admin/categories-service';
import { Category } from '@/lib/services/admin/dashboard-service';

export default function EditCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [category, setCategory] = useState<Category | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        slug: '',
        status: 'Active',
    });

    useEffect(() => {
        loadCategory();
    }, [id]);

    const loadCategory = async () => {
        try {
            const data = await categoriesService.getById(id);
            if (data) {
                setCategory(data);
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    slug: data.slug || '',
                    status: data.status || 'Active',
                });
            } else {
                alert('Không tìm thấy danh mục!');
                router.push('/admin/categories');
            }
        } catch (error) {
            console.error('Error loading category:', error);
            alert('Có lỗi xảy ra khi tải danh mục!');
            router.push('/admin/categories');
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

    // Validation EXACT match với Backend UpdateCategoryCommand
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name: Required, MinLength(4), MaxLength(200)
        if (!formData.name || formData.name.trim().length < 4) {
            newErrors.name = 'Tên danh mục phải có ít nhất 4 ký tự';
        } else if (formData.name.length > 200) {
            newErrors.name = 'Tên danh mục không được vượt quá 200 ký tự';
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
            const updateData: UpdateCategoryDto = {
                name: formData.name,
                description: formData.description,
                slug: formData.slug,
                status: formData.status,
            };
            await categoriesService.update(id, updateData);
            router.push('/admin/categories');
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error updating category:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi cập nhật danh mục!');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
                        <Link href="/admin/categories">
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <FolderTree className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Chỉnh sửa danh mục</h1>
                                <p className="text-slate-500">Cập nhật thông tin: {category?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        {/* Tên danh mục */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên danh mục <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all`}
                                placeholder="Nhập tên danh mục (4-200 ký tự)"
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
                                className={`w-full px-4 py-3 rounded-xl border ${errors.slug ? 'border-red-500' : 'border-slate-200'} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all`}
                                placeholder="ten-danh-muc"
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
                                className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500' : 'border-slate-200'} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none`}
                                placeholder="Nhập mô tả danh mục (4-500 ký tự)"
                            />
                            <div className="flex justify-between mt-1">
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                <p className="text-sm text-slate-400 ml-auto">{formData.description.length}/500</p>
                            </div>
                        </div>

                        {/* Trạng thái */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.status ? 'border-red-500' : 'border-slate-200'} focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white`}
                            >
                                <option value="Active">Hoạt động</option>
                                <option value="Inactive">Không hoạt động</option>
                            </select>
                            {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <Link href="/admin/categories">
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
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
