'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Ticket, Calendar, Percent, DollarSign } from 'lucide-react';
import { couponsService, CreateCouponDto } from '@/lib/services/admin/coupons-service';

export default function CreateCouponPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState<CreateCouponDto>({
        name: '',
        code: '',
        description: '',
        dateStart: today,
        dateExpired: '',
        discountValue: 0,
        isPercent: false,
        quantity: 1,
        minimumOrderValue: 0,
        status: 1,
    });

    // Auto uppercase code
    const handleCodeChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            code: value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
        }));
    };

    // Validation EXACT match với Backend CreateCouponCommand
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name: Required
        if (!formData.name || formData.name.trim().length === 0) {
            newErrors.name = 'Tên mã giảm giá không được để trống';
        }

        // Code: Required, Regex: ^[A-Z0-9_-]+$
        if (!formData.code || formData.code.trim().length === 0) {
            newErrors.code = 'Mã code không được để trống';
        } else {
            const codePattern = /^[A-Z0-9_-]+$/;
            if (!codePattern.test(formData.code)) {
                newErrors.code = 'Mã code chỉ chứa chữ in hoa, số, dấu gạch ngang (-) và gạch dưới (_)';
            }
        }

        // Description: Required
        if (!formData.description || formData.description.trim().length === 0) {
            newErrors.description = 'Mô tả không được để trống';
        }

        // DateStart: Required
        if (!formData.dateStart) {
            newErrors.dateStart = 'Ngày bắt đầu không được để trống';
        }

        // DateExpired: Required, Must > DateStart
        if (!formData.dateExpired) {
            newErrors.dateExpired = 'Ngày hết hạn không được để trống';
        } else if (formData.dateStart && new Date(formData.dateExpired) <= new Date(formData.dateStart)) {
            newErrors.dateExpired = 'Ngày hết hạn phải sau ngày bắt đầu';
        }

        // DiscountValue: Required, GreaterThan(0), If isPercent: <= 100
        if (formData.discountValue <= 0) {
            newErrors.discountValue = 'Giá trị giảm phải lớn hơn 0';
        } else if (formData.isPercent && formData.discountValue > 100) {
            newErrors.discountValue = 'Giảm theo phần trăm không được vượt quá 100%';
        }

        // Quantity: Required, GreaterThan(0)
        if (formData.quantity <= 0) {
            newErrors.quantity = 'Số lượng mã phải lớn hơn 0';
        }

        // MinimumOrderValue: Required, GreaterThanOrEqualTo(0)
        if (formData.minimumOrderValue < 0) {
            newErrors.minimumOrderValue = 'Giá trị đơn hàng tối thiểu không được âm';
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
            await couponsService.create(formData);
            router.push('/admin/coupons');
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error creating coupon:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi tạo mã giảm giá!');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/coupons">
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center">
                                <Ticket className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Tạo mã giảm giá mới</h1>
                                <p className="text-slate-500">Điền thông tin mã khuyến mãi</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-2xl shadow-sm p-8">
                        {/* Section: Thông tin cơ bản */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-orange-500" />
                                Thông tin cơ bản
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tên mã */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Tên mã giảm giá <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                        placeholder="VD: Giảm 50% Black Friday"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                                </div>

                                {/* Mã code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Mã code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => handleCodeChange(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.code ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-mono uppercase`}
                                        placeholder="VD: BLACKFRIDAY50"
                                    />
                                    {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
                                    <p className="mt-1 text-sm text-slate-400">Chỉ chữ in hoa, số, dấu - và _</p>
                                </div>

                                {/* Mô tả */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Mô tả <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none`}
                                        placeholder="Nhập mô tả mã giảm giá"
                                    />
                                    {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Thời gian */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Thời gian hiệu lực
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Ngày bắt đầu */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Ngày bắt đầu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateStart}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dateStart: e.target.value }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.dateStart ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                    />
                                    {errors.dateStart && <p className="mt-1 text-sm text-red-500">{errors.dateStart}</p>}
                                </div>

                                {/* Ngày hết hạn */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Ngày hết hạn <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateExpired}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dateExpired: e.target.value }))}
                                        min={formData.dateStart}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.dateExpired ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                    />
                                    {errors.dateExpired && <p className="mt-1 text-sm text-red-500">{errors.dateExpired}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Giá trị giảm */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                {formData.isPercent ? (
                                    <Percent className="w-5 h-5 text-green-500" />
                                ) : (
                                    <DollarSign className="w-5 h-5 text-green-500" />
                                )}
                                Giá trị giảm giá
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Loại giảm */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Loại giảm giá <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="isPercent"
                                                checked={!formData.isPercent}
                                                onChange={() => setFormData(prev => ({ ...prev, isPercent: false }))}
                                                className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                                            />
                                            <span className="text-slate-700">Số tiền cố định</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="isPercent"
                                                checked={formData.isPercent}
                                                onChange={() => setFormData(prev => ({ ...prev, isPercent: true }))}
                                                className="w-4 h-4 text-orange-500 border-slate-300 focus:ring-orange-500"
                                            />
                                            <span className="text-slate-700">Phần trăm (%)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Giá trị giảm */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Giá trị giảm <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.discountValue || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                                            className={`w-full px-4 py-3 pr-16 rounded-xl border ${errors.discountValue ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                            placeholder="0"
                                            min="0"
                                            max={formData.isPercent ? 100 : undefined}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            {formData.isPercent ? '%' : 'VND'}
                                        </span>
                                    </div>
                                    {errors.discountValue && <p className="mt-1 text-sm text-red-500">{errors.discountValue}</p>}
                                    {!formData.isPercent && formData.discountValue > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">{formatCurrency(formData.discountValue)} ₫</p>
                                    )}
                                </div>

                                {/* Số lượng mã */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Số lượng mã <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quantity || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.quantity ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                        placeholder="1"
                                        min="1"
                                    />
                                    {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Điều kiện */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Điều kiện áp dụng</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Giá trị đơn hàng tối thiểu */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Giá trị đơn hàng tối thiểu <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.minimumOrderValue || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderValue: parseFloat(e.target.value) || 0 }))}
                                            className={`w-full px-4 py-3 pr-16 rounded-xl border ${errors.minimumOrderValue ? 'border-red-500' : 'border-slate-200'} focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all`}
                                            placeholder="0"
                                            min="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">VND</span>
                                    </div>
                                    {errors.minimumOrderValue && <p className="mt-1 text-sm text-red-500">{errors.minimumOrderValue}</p>}
                                    {formData.minimumOrderValue > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">{formatCurrency(formData.minimumOrderValue)} ₫</p>
                                    )}
                                </div>

                                {/* Trạng thái */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: parseInt(e.target.value) }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all bg-white"
                                    >
                                        <option value={1}>Hoạt động</option>
                                        <option value={0}>Không hoạt động</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                            <Link href="/admin/coupons">
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
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 text-white font-medium hover:from-orange-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Tạo mã giảm giá
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
