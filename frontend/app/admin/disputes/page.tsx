'use client';

import { useState, useEffect } from 'react';
import {
    ShieldAlert, Scale, CheckCircle2, XCircle, FileText, ExternalLink,
    AlertCircle, Search, RefreshCw, Lock, ArrowUpRight, User, Store
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/product-mapper';
import api, { ApiResponse } from '@/lib/services/admin/api';

interface DisputeItem {
    id: number;
    orderId: number;
    orderCode: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    shopId: number;
    shopName: string;
    amount: number;
    reason: string;
    evidenceUrls?: string;
    status: number; // DisputeStatus enum: 0 PendingShopReview, 1 ShopRejected, 2 AdminIntervened, 3 Refunded, 4 Closed
    statusText: string;
    createdAt: string;
    resolutionNote?: string;
}

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<DisputeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    const loadDisputes = async () => {
        try {
            setLoading(true);
            const res = await api.get<ApiResponse<DisputeItem[]> | DisputeItem[]>('/OrderDisputes');
            const data = (res.data as ApiResponse<DisputeItem[]>)?.data || (Array.isArray(res.data) ? res.data : []);
            setDisputes(data);
        } catch (error) {
            console.error('Error loading disputes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDisputes();
    }, []);

    const handleResolve = async (action: 'Refund' | 'ReleaseToSeller') => {
        if (!selectedDispute) return;

        try {
            setIsResolving(true);
            await api.post(`/OrderDisputes/${selectedDispute.id}/resolve`, {
                disputeId: selectedDispute.id,
                action,
                resolutionNote
            });

            const msg = action === 'Refund'
                ? `Đã phán quyết HOÀN TIỀN ${formatPrice(selectedDispute.amount)} cho Khách hàng ${selectedDispute.customerName}. Tiền đã hoàn về ví khách.`
                : `Đã phán quyết BÁC KHIẾU NẠI. Giải ngân ${formatPrice(selectedDispute.amount)} cho Shop ${selectedDispute.shopName}.`;

            setActionMessage(msg);
            setSelectedDispute(null);
            setResolutionNote('');
            await loadDisputes();
            setTimeout(() => setActionMessage(''), 6000);
        } catch (error) {
            console.error('Error resolving dispute:', error);
        } finally {
            setIsResolving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Scale className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                        Quản lý Tranh chấp & Trọng tài Escrow
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Trung tâm phân xử khiếu nại giữa Người mua và Shop người bán. Đảm bảo công bằng & bảo vệ dòng tiền.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDisputes}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Tải lại"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-semibold border border-violet-200 dark:border-violet-800">
                        <Lock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        Platform Escrow
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {actionMessage && (
                <div className="p-4 rounded-xl bg-violet-600 text-white font-medium text-sm flex items-center gap-3 shadow-lg animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{actionMessage}</span>
                </div>
            )}

            {/* ══════════════════ STATS ROW ══════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Khiếu nại Chờ Phán xử</span>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {disputes.filter(d => d.status <= 2).length} Đơn
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Tổng tiền Đang Tạm giữ</span>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {formatPrice(disputes.reduce((acc, curr) => acc + curr.amount, 0))}
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Đã Giải quyết Phán quyết</span>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {disputes.filter(d => d.status >= 3).length} Đơn
                    </p>
                </div>
            </div>

            {/* ══════════════════ DISPUTES LIST TABLE ══════════════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Danh sách Tranh chấp Đơn hàng thực tế</h3>
                    <span className="text-xs text-slate-400">{disputes.length} hồ sơ</span>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        Chưa có đơn hàng khiếu nại nào cần xử lý. Dòng tiền các Shop đang hoạt động bình thường!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4">Mã đơn hàng</th>
                                    <th className="p-4">Người mua</th>
                                    <th className="p-4">Shop người bán</th>
                                    <th className="p-4">Số tiền tạm giữ</th>
                                    <th className="p-4">Trạng thái</th>
                                    <th className="p-4 text-right">Thao tác phán quyết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {disputes.map((dispute) => (
                                    <tr key={dispute.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {dispute.orderCode}
                                            <p className="text-xs text-slate-400 font-normal">{formatDate(dispute.createdAt)}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{dispute.customerName}</p>
                                                    <p className="text-xs text-slate-400">{dispute.customerEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Store className="w-4 h-4 text-violet-500" />
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{dispute.shopName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-violet-600 dark:text-violet-400">
                                            {formatPrice(dispute.amount)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${dispute.status <= 2
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : dispute.status === 3
                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                }`}>
                                                {dispute.statusText}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {dispute.status <= 2 ? (
                                                <button
                                                    onClick={() => setSelectedDispute(dispute)}
                                                    className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    Xem & Phán quyết
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Đã giải quyết</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══════════════════ ARBITRATION DECISION MODAL ══════════════════ */}
            {selectedDispute && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hội đồng Trọng tài Escrow</h3>
                                <p className="text-xs text-slate-500">Phán quyết Đơn hàng: <strong>{selectedDispute.orderCode}</strong></p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-bold text-xs">
                                {formatPrice(selectedDispute.amount)}
                            </span>
                        </div>

                        {/* Customer Reason & Evidence */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-200">Lý do từ Người mua ({selectedDispute.customerName}):</p>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">&quot;{selectedDispute.reason}&quot;</p>

                            {selectedDispute.evidenceUrls && (
                                <div className="pt-2 flex items-center gap-3">
                                    <span className="text-slate-400">Bằng chứng gửi kèm:</span>
                                    <a href={selectedDispute.evidenceUrls} target="_blank" rel="noreferrer" className="text-violet-600 dark:text-violet-400 font-semibold underline flex items-center gap-1">
                                        Xem Video/Ảnh <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Admin Resolution Note */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Ghi chú Phán quyết của Sàn
                            </label>
                            <textarea
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                rows={3}
                                placeholder="Căn cứ vào bằng chứng video mở hàng của khách và đóng hàng của Shop..."
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-violet-500"
                            />
                        </div>

                        {/* Action Decision Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => handleResolve('Refund')}
                                disabled={isResolving}
                                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-200 dark:shadow-none disabled:opacity-50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>HOÀN TIỀN Khách</span>
                            </button>

                            <button
                                onClick={() => handleResolve('ReleaseToSeller')}
                                disabled={isResolving}
                                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>GIẢI NGÂN Shop</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedDispute(null)}
                            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 text-center"
                        >
                            Đóng cửa sổ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
