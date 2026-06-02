'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ElementType } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    X, CheckCircle, XCircle, Loader2, Building2, FileText,
    User, Mail, Phone, MapPin, Calendar, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { shopService } from '@/lib/services/shop-service';
import type { BusinessRegistrationDto } from '@/types/shop';
import { rejectReasonSchema, type RejectReasonFormValues } from '@/schemas/shop';

interface ReviewDialogProps {
    registration: BusinessRegistrationDto;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReviewDialog({
    registration,
    isOpen,
    onClose,
    onSuccess,
}: ReviewDialogProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RejectReasonFormValues>({
        resolver: zodResolver(rejectReasonSchema),
    });

    if (!isOpen) return null;

    const handleApprove = async () => {
        if (!confirm('Xác nhận duyệt đăng ký này?')) return;
        setIsApproving(true);
        try {
            await shopService.approveRegistration(registration.id);
            toast.success('Đã duyệt đăng ký thành công!');
            onSuccess();
            handleClose();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            toast.error(apiError.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsApproving(false);
        }
    };

    const onReject = async (values: RejectReasonFormValues) => {
        setIsRejecting(true);
        try {
            await shopService.rejectRegistration(registration.id, values.rejectReason);
            toast.success('Đã từ chối đăng ký');
            onSuccess();
            handleClose();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            toast.error(apiError.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleClose = () => {
        setShowRejectForm(false);
        reset();
        onClose();
    };

    const isPending = registration.status === 'Pending';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            {/* Dialog */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Chi tiết đăng ký kinh doanh
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Trạng thái:</span>
                        <StatusBadge status={registration.status} />
                    </div>

                    {/* Info rows */}
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                        <InfoRow icon={Building2} label="Công ty" value={registration.companyName} />
                        <InfoRow icon={FileText} label="Mã số thuế" value={registration.taxCode} />
                        <InfoRow icon={User} label="Chủ sở hữu" value={registration.ownerName} />
                        <InfoRow icon={Mail} label="Email" value={registration.email} />
                        <InfoRow icon={Phone} label="Điện thoại" value={registration.phone} />
                        <InfoRow icon={MapPin} label="Địa chỉ" value={registration.address} />
                        <InfoRow
                            icon={Calendar}
                            label="Ngày gửi"
                            value={new Date(registration.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}
                        />
                        {registration.reviewedAt && (
                            <InfoRow
                                icon={Clock}
                                label="Ngày xem xét"
                                value={new Date(registration.reviewedAt).toLocaleDateString('vi-VN', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            />
                        )}
                    </div>

                    {/* Reject reason (if rejected) */}
                    {registration.rejectReason && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">Lý do từ chối:</p>
                            <p className="text-sm text-red-600 dark:text-red-300">{registration.rejectReason}</p>
                        </div>
                    )}

                    {/* Reject form */}
                    {showRejectForm && (
                        <form onSubmit={handleSubmit(onReject)} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Lý do từ chối *
                                </label>
                                <textarea
                                    {...register('rejectReason')}
                                    rows={3}
                                    className={`w-full px-4 py-3 rounded-xl border ${
                                        errors.rejectReason ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                                    } focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm bg-white dark:bg-gray-800 resize-none`}
                                    placeholder="Nhập lý do từ chối..."
                                />
                                {errors.rejectReason && (
                                    <p className="text-xs text-red-500 mt-1">{errors.rejectReason.message}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isRejecting}
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Xác nhận từ chối
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowRejectForm(false); reset(); }}
                                    className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer actions (only for Pending) */}
                {isPending && !showRejectForm && (
                    <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Duyệt
                        </button>
                        <button
                            onClick={() => setShowRejectForm(true)}
                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <XCircle className="w-5 h-5" />
                            Từ chối
                        </button>
                    </div>
                )}

                {/* Close button for non-pending */}
                {!isPending && (
                    <div className="p-5 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={handleClose}
                            className="w-full py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ========== HELPERS ==========

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; styles: string }> = {
        Pending: { label: 'Chờ duyệt', styles: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        Approved: { label: 'Đã duyệt', styles: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        Rejected: { label: 'Từ chối', styles: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    const c = config[status] || config.Pending;
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${c.styles}`}>
            {c.label}
        </span>
    );
}
