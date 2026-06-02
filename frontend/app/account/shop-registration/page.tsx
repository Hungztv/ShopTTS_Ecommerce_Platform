'use client';

import { forwardRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors, type UseFormHandleSubmit, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import {
    Store, Clock, XCircle, CheckCircle, Loader2, Send, RefreshCw,
    Building2, FileText, User, Mail, Phone, MapPin, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { shopService } from '@/lib/services/shop-service';
import { useAuth } from '@/contexts/AuthContext';
import type { BusinessRegistrationDto } from '@/types/shop';
import { RegistrationStatus } from '@/types/shop';
import {
    createRegistrationSchema,
    type CreateRegistrationFormValues,
} from '@/schemas/shop';

export default function ShopRegistrationPage() {
    const router = useRouter();
    const { refreshUserRoles } = useAuth();
    const [registration, setRegistration] = useState<BusinessRegistrationDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateRegistrationFormValues>({
        resolver: zodResolver(createRegistrationSchema),
    });

    useEffect(() => {
        loadRegistration();
    }, []);

    const loadRegistration = async () => {
        setIsLoading(true);
        try {
            const data = await shopService.getMyRegistration();
            setRegistration(data);
            // Nếu đã approved -> refresh roles và redirect sang seller center
            if (data?.status === RegistrationStatus.Approved) {
                await refreshUserRoles();
                router.push('/seller/shop');
            }
        } catch {
            // Chưa có đăng ký -> null -> hiện form
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (values: CreateRegistrationFormValues) => {
        setIsSubmitting(true);
        try {
            const result = await shopService.createRegistration(values);
            setRegistration(result);
            toast.success('Gửi đăng ký thành công! Vui lòng chờ admin duyệt.');
            reset();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            const msg = apiError.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ====================== LOADING ======================
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
        );
    }

    // ====================== PENDING ======================
    if (registration?.status === RegistrationStatus.Pending) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-amber-50 border-b border-amber-100 p-6 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-amber-800">Đang chờ duyệt</h2>
                            <p className="text-amber-600 text-sm mt-1">
                                Đăng ký kinh doanh của bạn đang được admin xem xét. Chúng tôi sẽ thông báo khi có kết quả.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <InfoRow icon={Building2} label="Công ty" value={registration.companyName} />
                        <InfoRow icon={FileText} label="Mã số thuế" value={registration.taxCode} />
                        <InfoRow icon={User} label="Chủ sở hữu" value={registration.ownerName} />
                        <InfoRow icon={Mail} label="Email" value={registration.email} />
                        <InfoRow icon={Phone} label="Điện thoại" value={registration.phone} />
                        <InfoRow icon={MapPin} label="Địa chỉ" value={registration.address} />
                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
                            Ngày gửi: {new Date(registration.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ====================== REJECTED ======================
    if (registration?.status === RegistrationStatus.Rejected) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 p-6 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-red-800">Đăng ký bị từ chối</h2>
                            <p className="text-red-600 text-sm mt-1">
                                Rất tiếc, đăng ký của bạn đã bị từ chối. Bạn có thể gửi lại đăng ký mới.
                            </p>
                        </div>
                    </div>
                    <div className="p-6">
                        {registration.rejectReason && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl mb-4">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">Lý do từ chối:</p>
                                    <p className="text-sm text-red-600 mt-1">{registration.rejectReason}</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-3 text-sm">
                            <InfoRow icon={Building2} label="Công ty" value={registration.companyName} />
                            <InfoRow icon={FileText} label="Mã số thuế" value={registration.taxCode} />
                        </div>
                        {registration.reviewedAt && (
                            <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                                Ngày xem xét: {new Date(registration.reviewedAt).toLocaleDateString('vi-VN')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Show form again for resubmit */}
                <RegistrationForm
                    register={register}
                    errors={errors}
                    handleSubmit={handleSubmit}
                    onSubmit={onSubmit}
                    isSubmitting={isSubmitting}
                    isResubmit
                />
            </div>
        );
    }

    // ====================== NO REGISTRATION => FORM ======================
    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Store className="w-6 h-6 text-violet-600" />
                    Đăng ký bán hàng
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Điền đầy đủ thông tin kinh doanh để mở shop trên ShopTTS
                </p>
            </div>
            <RegistrationForm
                register={register}
                errors={errors}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

// ==================== SUB COMPONENTS ====================

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500 w-28 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-slate-800">{value}</span>
        </div>
    );
}

function RegistrationForm({
    register,
    errors,
    handleSubmit,
    onSubmit,
    isSubmitting,
    isResubmit = false,
}: {
    register: UseFormRegister<CreateRegistrationFormValues>;
    errors: FieldErrors<CreateRegistrationFormValues>;
    handleSubmit: UseFormHandleSubmit<CreateRegistrationFormValues>;
    onSubmit: (values: CreateRegistrationFormValues) => Promise<void>;
    isSubmitting: boolean;
    isResubmit?: boolean;
}) {
    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5"
        >
            {isResubmit && (
                <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl text-sm text-violet-700 font-medium">
                    <RefreshCw className="w-4 h-4" />
                    Gửi lại đăng ký kinh doanh
                </div>
            )}

            <FormField
                label="Tên công ty *"
                icon={Building2}
                error={errors.companyName?.message}
                {...register('companyName')}
                placeholder="VD: Công ty TNHH ABC"
            />
            <FormField
                label="Mã số thuế *"
                icon={FileText}
                error={errors.taxCode?.message}
                {...register('taxCode')}
                placeholder="VD: 0123456789"
            />
            <FormField
                label="Tên chủ sở hữu *"
                icon={User}
                error={errors.ownerName?.message}
                {...register('ownerName')}
                placeholder="VD: Nguyễn Văn A"
            />
            <FormField
                label="Email liên hệ *"
                icon={Mail}
                error={errors.email?.message}
                {...register('email')}
                placeholder="VD: contact@company.com"
                type="email"
            />
            <FormField
                label="Số điện thoại *"
                icon={Phone}
                error={errors.phone?.message}
                {...register('phone')}
                placeholder="VD: 0901234567"
            />
            <FormField
                label="Địa chỉ *"
                icon={MapPin}
                error={errors.address?.message}
                {...register('address')}
                placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
            />

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Send className="w-5 h-5" />
                )}
                {isResubmit ? 'Gửi lại đăng ký' : 'Gửi đăng ký'}
            </button>
        </form>
    );
}

type FormFieldProps = ComponentPropsWithoutRef<'input'> & {
    label: string;
    icon: ElementType;
    error?: string;
    type?: string;
    placeholder?: string;
};

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({ label, icon: Icon, error, type = 'text', placeholder, ...props }, ref) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                ref={ref}
                type={type}
                placeholder={placeholder}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${error
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                    } focus:ring-2 outline-none transition-all text-sm bg-slate-50 focus:bg-white`}
                {...props}
            />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
));
FormField.displayName = 'FormField';
