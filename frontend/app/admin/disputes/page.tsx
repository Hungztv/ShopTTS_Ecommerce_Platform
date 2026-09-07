'use client';

import { useState, useEffect } from 'react';
import {
    ShieldAlert, Scale, CheckCircle2, XCircle, FileText, ExternalLink,
    AlertCircle, Search, RefreshCw, Lock, ArrowUpRight, User, Store,
    RotateCcw, Sparkles, Eye, ShieldCheck, DollarSign
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
    status: number; // 0 PendingShop, 1 ShopRejected, 2 AdminIntervened, 3 Refunded, 4 Closed (Released to Seller)
    statusText: string;
    createdAt: string;
    resolutionNote?: string;
}

// Sample static demo data for presentations & screenshots
const MOCK_DEMO_DISPUTES: DisputeItem[] = [
    {
        id: 101,
        orderId: 8829,
        orderCode: 'ORD-882910',
        userId: 'u-101',
        customerName: 'Nguyễn Văn Hải',
        customerEmail: 'hai.nguyen@gmail.com',
        shopId: 12,
        shopName: 'TechWorld Official Store',
        amount: 2490000,
        reason: 'Sản phẩm tai nghe Bluetooth bị móp hộp bao bì và thiếu cáp sạc USB-C đi kèm. Shop từ chối bảo hành đổi trả.',
        evidenceUrls: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80',
        status: 1,
        statusText: 'Cần Admin Trọng Tài',
        createdAt: '2026-08-11T14:30:00Z',
    },
    {
        id: 102,
        orderId: 7740,
        orderCode: 'ORD-774012',
        userId: 'u-102',
        customerName: 'Trần Thị Mai',
        customerEmail: 'mai.tran@yahoo.com',
        shopId: 8,
        shopName: 'Fashion Star Studio',
        amount: 850000,
        reason: 'Áo khoác bị giao nhầm màu (đặt màu Đen nhưng giao màu Trắng) và bị bung chỉ ở phần vai áo.',
        evidenceUrls: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
        status: 0,
        statusText: 'Chờ Shop xử lý',
        createdAt: '2026-08-12T09:15:00Z',
    },
    {
        id: 103,
        orderId: 6621,
        orderCode: 'ORD-662194',
        userId: 'u-103',
        customerName: 'Lê Hoàng Nam',
        customerEmail: 'nam.le@outlook.com',
        shopId: 15,
        shopName: 'Gia Dụng Thông Minh 247',
        amount: 1200000,
        reason: 'Nồi chiên không dầu bị nứt vỏ nhựa phía sau do vận chuyển. Đã đồng ý hoàn tiền 100%.',
        evidenceUrls: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
        status: 3,
        statusText: 'Đã Hoàn Tiền Khách',
        createdAt: '2026-08-10T16:45:00Z',
        resolutionNote: 'Đã xác minh video quay cảnh mở hàng. Sàn tiến hành hoàn 1.200.000đ về ví khách hàng.',
    },
    {
        id: 104,
        orderId: 5510,
        orderCode: 'ORD-551088',
        userId: 'u-104',
        customerName: 'Phạm Minh Đức',
        customerEmail: 'duc.pham@gmail.com',
        shopId: 3,
        shopName: 'Apple Authorized Reseller',
        amount: 15990000,
        reason: 'Người mua nghi ngờ hàng không chính hãng nhưng không cung cấp được video mở hộp. Shop có đầy đủ hóa đơn VAT nhập khẩu.',
        evidenceUrls: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
        status: 4,
        statusText: 'Bác Khiếu Nại (Giải ngân Shop)',
        createdAt: '2026-08-09T11:20:00Z',
        resolutionNote: 'Bằng chứng chứng minh nguồn gốc từ phía Shop đầy đủ. Bác khiếu nại của người mua và giải ngân 15.990.000đ cho Shop.',
    },
];

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<DisputeItem[]>(MOCK_DEMO_DISPUTES);
    const [loading, setLoading] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(true);

    const loadDisputes = async () => {
        try {
            setLoading(true);
            const res = await api.get<ApiResponse<DisputeItem[]> | DisputeItem[]>('/OrderDisputes');
            const data = (res.data as ApiResponse<DisputeItem[]>)?.data || (Array.isArray(res.data) ? res.data : []);
            if (data && data.length > 0) {
                setDisputes(data);
                setIsDemoMode(false);
            } else {
                setDisputes(MOCK_DEMO_DISPUTES);
                setIsDemoMode(true);
            }
        } catch {
            // Fallback to mock demo data if backend returns empty or error
            setDisputes(MOCK_DEMO_DISPUTES);
            setIsDemoMode(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (action: 'Refund' | 'ReleaseToSeller') => {
        if (!selectedDispute) return;

        setIsResolving(true);
        try {
            if (!isDemoMode) {
                await api.post(`/OrderDisputes/${selectedDispute.id}/resolve`, {
                    disputeId: selectedDispute.id,
                    action,
                    resolutionNote,
                });
            } else if (selectedDispute.shopId > 0) {
                try {
                    await api.get(`/shops/reconcile/${selectedDispute.shopId}`);
                } catch (e) {
                    console.warn('Reconciling wallet in demo mode:', e);
                }
            }

            // Update local state for interactive demo experience
            const newStatus = action === 'Refund' ? 3 : 4;
            const newStatusText = action === 'Refund' ? 'Đã Hoàn Tiền Khách' : 'Bác Khiếu Nại (Giải ngân Shop)';
            const noteText = resolutionNote || (action === 'Refund' ? 'Admin phán quyết chấp thuận hoàn tiền cho người mua.' : 'Admin phán quyết giải ngân tiền hàng cho Shop.');

            setDisputes((prev) =>
                prev.map((item) =>
                    item.id === selectedDispute.id
                        ? {
                              ...item,
                              status: newStatus,
                              statusText: newStatusText,
                              resolutionNote: noteText,
                          }
                        : item
                )
            );

            const msg =
                action === 'Refund'
                    ? `[DEMO Phán Quyết] Đã HOÀN TIỀN ${formatPrice(selectedDispute.amount)} cho Khách hàng ${selectedDispute.customerName}. Dòng tiền ví đã hoàn về tài khoản người mua.`
                    : `[DEMO Phán Quyết] Đã BÁC KHIẾU NẠI. Giải ngân thành công ${formatPrice(selectedDispute.amount)} cho Shop ${selectedDispute.shopName}.`;

            setActionMessage(msg);
            setSelectedDispute(null);
            setResolutionNote('');
            setTimeout(() => setActionMessage(''), 7000);
        } catch (error) {
            console.error('Error resolving dispute:', error);
        } finally {
            setIsResolving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const pendingDisputesCount = disputes.filter((d) => d.status <= 2).length;
    const totalEscrowAmount = disputes.reduce((acc, curr) => acc + curr.amount, 0);
    const resolvedCount = disputes.filter((d) => d.status >= 3).length;

    return (
        <div className="p-6 space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Scale className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                            Quản Lý Tranh Chấp & Trọng Tài Escrow (Demo Mode)
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Mẫu Tĩnh Chụp Ảnh Demo
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Trung tâm phân xử khiếu nại giữa Người mua và Cửa hàng. Đảm bảo công bằng & bảo vệ dòng tiền tạm giữ Escrow.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDisputes}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        <span>Tải lại</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800">
                        <Lock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        Platform Escrow Safe
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {actionMessage && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-3 shadow-xl animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-300" />
                    <span className="leading-relaxed">{actionMessage}</span>
                </div>
            )}

            {/* ══════════════════ STATS CARDS ROW ══════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Khiếu Nại Chờ Trọng Tài Phán Xử
                        </span>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                            {pendingDisputesCount} Hồ Sơ
                        </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                            Tổng Tiền Tạm Giữ Escrow
                        </span>
                        <p className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">
                            {formatPrice(totalEscrowAmount)}
                        </p>
                    </div>
                    <div className="p-3 bg-violet-50 dark:bg-violet-900/30 text-violet-600 rounded-2xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Hồ Sơ Đã Ra Phán Quyết
                        </span>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {resolvedCount} Hồ Sơ
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* ══════════════════ DISPUTES LIST TABLE ══════════════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                            Danh Sách Hồ Sơ Khiếu Nại Tranh Chấp Sàn
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Dữ liệu mẫu chụp hình demo tính năng phán quyết trọng tài</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-full">
                        {disputes.length} hồ sơ mẫu
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-extrabold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-4">Mã đơn hàng</th>
                                <th className="p-4">Người mua (Khách)</th>
                                <th className="p-4">Shop người bán</th>
                                <th className="p-4">Giá trị Escrow</th>
                                <th className="p-4">Trạng thái hồ sơ</th>
                                <th className="p-4 text-right">Hội đồng trọng tài</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {disputes.map((dispute) => (
                                <tr key={dispute.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-4">
                                        <span className="font-mono font-extrabold text-violet-600 dark:text-violet-400">
                                            #{dispute.orderCode}
                                        </span>
                                        <p className="text-[11px] text-slate-400 font-normal">{formatDate(dispute.createdAt)}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dispute.customerName}</p>
                                                <p className="text-[11px] text-slate-400">{dispute.customerEmail}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                                                <Store className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dispute.shopName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-black text-violet-600 dark:text-violet-400 text-sm">
                                        {formatPrice(dispute.amount)}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                                                dispute.status <= 2
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    : dispute.status === 3
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            }`}
                                        >
                                            {dispute.statusText}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedDispute(dispute);
                                                setResolutionNote(dispute.resolutionNote || '');
                                            }}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto ${
                                                dispute.status <= 2
                                                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {dispute.status <= 2 ? 'Xem & Phán quyết' : 'Chi tiết phán quyết'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════════ ARBITRATION DECISION MODAL ══════════════════ */}
            {selectedDispute && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 space-y-5">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                                    <Scale className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                        Hội Đồng Trọng Tài Sàn Escrow
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Hồ sơ tranh chấp mã đơn: <strong className="font-mono text-violet-600">#{selectedDispute.orderCode}</strong>
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-black text-sm border border-violet-200 dark:border-violet-800">
                                {formatPrice(selectedDispute.amount)}
                            </span>
                        </div>

                        {/* Customer & Shop Meta Summary */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                                <span className="text-blue-600 dark:text-blue-400 font-bold block mb-1">Người mua (Khách hàng):</span>
                                <p className="font-extrabold text-slate-900 dark:text-white">{selectedDispute.customerName}</p>
                                <p className="text-slate-500 text-[11px]">{selectedDispute.customerEmail}</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">Bên bị khiếu nại (Shop):</span>
                                <p className="font-extrabold text-slate-900 dark:text-white">{selectedDispute.shopName}</p>
                                <p className="text-slate-500 text-[11px]">ID Shop: #{selectedDispute.shopId}</p>
                            </div>
                        </div>

                        {/* Customer Reason & Video Evidence */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                            <div>
                                <span className="font-extrabold text-slate-900 dark:text-white block mb-1">
                                    Nội dung khiếu nại từ Người mua:
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    &quot;{selectedDispute.reason}&quot;
                                </p>
                            </div>

                            {selectedDispute.evidenceUrls && (
                                <div className="space-y-2 pt-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                        Bằng chứng ảnh/video quay mở hộp đính kèm:
                                    </span>
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-40 group">
                                        <img
                                            src={selectedDispute.evidenceUrls}
                                            alt="Bằng chứng mở hàng"
                                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <a
                                            href={selectedDispute.evidenceUrls}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Mở ảnh bằng chứng gốc
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Admin Resolution Note Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                                Căn cứ & Ghi chú Phán quyết của Sàn
                            </label>
                            <textarea
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                rows={3}
                                placeholder="Nhập căn cứ phán quyết (Ví dụ: Căn cứ video đồng kiểm mở hàng của khách và hóa đơn xuất kho của Shop...)"
                                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                            />
                        </div>

                        {/* Action Buttons */}
                        {selectedDispute.status <= 2 ? (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <button
                                    onClick={() => handleResolve('Refund')}
                                    disabled={isResolving}
                                    className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>HOÀN TIỀN Khách ({formatPrice(selectedDispute.amount)})</span>
                                </button>

                                <button
                                    onClick={() => handleResolve('ReleaseToSeller')}
                                    disabled={isResolving}
                                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>GIẢI NGÂN Shop ({formatPrice(selectedDispute.amount)})</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>Hồ sơ này đã có kết luận phán quyết chính thức: <b>{selectedDispute.statusText}</b></span>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedDispute(null)}
                            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors text-center"
                        >
                            Đóng cửa sổ phán quyết
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
