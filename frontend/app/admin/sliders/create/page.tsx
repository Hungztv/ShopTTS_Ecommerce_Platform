'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { slidersService, CreateSliderDto } from '@/lib/services/admin/sliders-service';
import ImageUpload from '@/components/admin/ImageUpload';

export default function CreateSliderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<CreateSliderDto>({
        name: '',
        title: '',
        image: '',
        description: '',
        link: '',
        displayOrder: 0,
        status: 1,
    });

    // Validation EXACT match với Backend CreateSliderCommand
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name: Required, MaxLength(100)
        if (!formData.name || formData.name.trim().length === 0) {
            newErrors.name = 'Tên slider không được để trống';
        } else if (formData.name.length > 100) {
            newErrors.name = 'Tên slider không được vượt quá 100 ký tự';
        }

        // Title: Required, MaxLength(200)
        if (!formData.title || formData.title.trim().length === 0) {
            newErrors.title = 'Tiêu đề không được để trống';
        } else if (formData.title.length > 200) {
            newErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
        }

        // Image: Required
        if (!formData.image || formData.image.trim().length === 0) {
            newErrors.image = 'Vui lòng upload hình ảnh slider';
        }

        // Description: Optional, MaxLength(500)
        if (formData.description && formData.description.length > 500) {
            newErrors.description = 'Mô tả không được vượt quá 500 ký tự';
        }

        // Link: Optional, URL pattern if provided
        if (formData.link && formData.link.trim().length > 0) {
            const urlPattern = /^https?:\/\/.+/;
            if (!urlPattern.test(formData.link)) {
                newErrors.link = 'Link phải bắt đầu bằng http:// hoặc https://';
            }
        }

        // DisplayOrder: Required, >= 0
        if (formData.displayOrder === undefined || formData.displayOrder < 0) {
            newErrors.displayOrder = 'Thứ tự hiển thị không được âm';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            await slidersService.create(formData);
            router.push('/admin/sliders');
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error creating slider:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi tạo slider!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/sliders">
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Tạo slider mới</h1>
                                <p className="text-slate-500">Thêm banner quảng cáo</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        {/* Tên slider */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên slider <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all`}
                                placeholder="VD: Banner khuyến mãi tháng 2"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            <p className="mt-1 text-sm text-slate-400">{formData.name.length}/100 ký tự</p>
                        </div>

                        {/* Tiêu đề */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tiêu đề <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.title ? 'border-red-500' : 'border-slate-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all`}
                                placeholder="VD: Giảm giá 50% tất cả sản phẩm"
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                            <p className="mt-1 text-sm text-slate-400">{formData.title.length}/200 ký tự</p>
                        </div>

                        {/* Hình ảnh */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Hình ảnh slider <span className="text-red-500">*</span>
                            </label>
                            <ImageUpload
                                value={formData.image}
                                onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                                type="slider"
                            />
                            {errors.image && <p className="mt-2 text-sm text-red-500">{errors.image}</p>}
                            <p className="mt-1 text-sm text-slate-400">Kích thước khuyến nghị: 1920x600px</p>
                        </div>

                        {/* Mô tả */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Mô tả
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500' : 'border-slate-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none`}
                                placeholder="Nhập mô tả slider (tùy chọn)"
                            />
                            <div className="flex justify-between mt-1">
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                <p className="text-sm text-slate-400 ml-auto">{(formData.description || '').length}/500</p>
                            </div>
                        </div>

                        {/* Link */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Link liên kết
                            </label>
                            <input
                                type="url"
                                value={formData.link || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.link ? 'border-red-500' : 'border-slate-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all`}
                                placeholder="https://example.com/promo"
                            />
                            {errors.link && <p className="mt-1 text-sm text-red-500">{errors.link}</p>}
                        </div>

                        {/* Display Order & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Thứ tự hiển thị
                                </label>
                                <input
                                    type="number"
                                    value={formData.displayOrder}
                                    onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                                    className={`w-full px-4 py-3 rounded-xl border ${errors.displayOrder ? 'border-red-500' : 'border-slate-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all`}
                                    min="0"
                                />
                                {errors.displayOrder && <p className="mt-1 text-sm text-red-500">{errors.displayOrder}</p>}
                                <p className="mt-1 text-sm text-slate-400">Số nhỏ hơn hiển thị trước</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Trạng thái
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: parseInt(e.target.value) }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all bg-white"
                                >
                                    <option value={1}>Hoạt động</option>
                                    <option value={0}>Không hoạt động</option>
                                </select>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <Link href="/admin/sliders">
                                <button
                                    type="button"
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Tạo slider
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
