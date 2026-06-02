'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ElementType } from 'react';
import {
    Store, Loader2, Save, Image, FileText, Link2,
    CheckCircle, AlertCircle, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { shopService } from '@/lib/services/shop-service';
import type { ShopDto } from '@/types/shop';
import { ShopStatus } from '@/types/shop';
import { updateShopSchema, type UpdateShopFormValues } from '@/schemas/shop';

const statusConfig: Record<string, { label: string; icon: ElementType; color: string; bg: string }> = {
    Active: { label: 'Đang hoạt động', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    Inactive: { label: 'Chưa kích hoạt', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    Suspended: { label: 'Bị tạm ngưng', icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function MyShopPage() {
    const router = useRouter();
    const [shop, setShop] = useState<ShopDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isDirty },
    } = useForm<UpdateShopFormValues>({
        resolver: zodResolver(updateShopSchema),
    });

    const nameValue = watch('name', '');

    useEffect(() => {
        loadShop();
    }, []);

    const loadShop = async () => {
        setIsLoading(true);
        try {
            const data = await shopService.getMyShop();
            if (!data) {
                // Chưa có shop -> quay về đăng ký
                router.push('/account/shop-registration');
                return;
            }
            setShop(data);
            reset({
                id: data.id,
                name: data.name,
                slug: data.slug,
                description: data.description || '',
                logoUrl: data.logoUrl || '',
                coverUrl: data.coverUrl || '',
            });
        } catch {
            toast.error('Không thể tải thông tin shop');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (values: UpdateShopFormValues) => {
        setIsSaving(true);
        try {
            const updated = await shopService.updateShop(values);
            setShop(updated);
            reset({
                id: updated.id,
                name: updated.name,
                slug: updated.slug,
                description: updated.description || '',
                logoUrl: updated.logoUrl || '',
                coverUrl: updated.coverUrl || '',
            });
            toast.success('Cập nhật shop thành công!');
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            const msg = apiError.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const generateSlug = () => {
        if (!nameValue) return;
        const slug = nameValue
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        reset((prev) => ({ ...prev, slug }), { keepDirty: true });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
        );
    }

    if (!shop) return null;

    const status = statusConfig[shop.status] || statusConfig.Inactive;
    const StatusIcon = status.icon;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Store className="w-6 h-6 text-violet-600" />
                        Quản lý Shop
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Cập nhật thông tin shop của bạn</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                </div>
            </div>

            {/* Shop Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Cover */}
                <div className="h-32 bg-gradient-to-r from-violet-500 to-purple-600 relative">
                    {shop.coverUrl && (
                        <img src={shop.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    )}
                </div>
                {/* Logo + Info */}
                <div className="px-6 pb-4 -mt-8 flex items-end gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white border-2 border-white shadow-lg overflow-hidden flex-shrink-0">
                        {shop.logoUrl ? (
                            <img src={shop.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-violet-100 flex items-center justify-center">
                                <Store className="w-6 h-6 text-violet-600" />
                            </div>
                        )}
                    </div>
                    <div className="pb-1">
                        <h3 className="font-bold text-slate-800">{shop.name}</h3>
                        <p className="text-xs text-slate-400">/{shop.slug}</p>
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5"
            >
                <input type="hidden" {...register('id', { valueAsNumber: true })} />

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên shop *</label>
                    <div className="relative">
                        <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            {...register('name')}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.name ? 'border-red-300' : 'border-slate-200'} focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                            placeholder="Tên shop của bạn"
                        />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                {/* Slug */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                {...register('slug')}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.slug ? 'border-red-300' : 'border-slate-200'} focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                                placeholder="ten-shop"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={generateSlug}
                            className="px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors"
                        >
                            Tự tạo
                        </button>
                    </div>
                    {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                    <div className="relative">
                        <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <textarea
                            {...register('description')}
                            rows={4}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.description ? 'border-red-300' : 'border-slate-200'} focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm bg-slate-50 focus:bg-white resize-none`}
                            placeholder="Giới thiệu về shop của bạn..."
                        />
                    </div>
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label>
                    <div className="relative">
                        <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            {...register('logoUrl')}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.logoUrl ? 'border-red-300' : 'border-slate-200'} focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                            placeholder="https://example.com/logo.png"
                        />
                    </div>
                    {errors.logoUrl && <p className="text-xs text-red-500 mt-1">{errors.logoUrl.message}</p>}
                </div>

                {/* Cover URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cover URL</label>
                    <div className="relative">
                        <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            {...register('coverUrl')}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.coverUrl ? 'border-red-300' : 'border-slate-200'} focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                            placeholder="https://example.com/cover.jpg"
                        />
                    </div>
                    {errors.coverUrl && <p className="text-xs text-red-500 mt-1">{errors.coverUrl.message}</p>}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSaving || !isDirty}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    Lưu thay đổi
                </button>
            </form>
        </div>
    );
}
