'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    ShieldAlert, Scale, CheckCircle2, XCircle, FileText, ExternalLink,
    AlertCircle, Search, RefreshCw, Lock, ArrowUpRight, User, Store,
    RotateCcw, Sparkles, Eye, ShieldCheck, DollarSign, Plus, Phone,
    Package, Calendar, Clock, Check, Info, Filter, X
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/product-mapper';
import api, { ApiResponse } from '@/lib/services/admin/api';

interface DisputeItemProduct {
    productId: number;
    productName: string;
    productImage?: string;
    price: number;
    quantity: number;
}

interface DisputeItem {
    id: number;
    orderId: number;
    orderCode: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shopId: number;
    shopName: string;
    amount: number;
    reason: string;
    evidenceUrls?: string;
    status: number; // 0 PendingShop, 1 ShopRejected, 2 AdminIntervened, 3 Refunded, 4 Closed
    statusText: string;
    createdAt: string;
    resolvedAt?: string;
    resolutionNote?: string;
    items?: DisputeItemProduct[];
}

interface EscrowStats {
    totalPendingDisputes: number;
    totalEscrowLocked: number;
    totalResolvedDisputes: number;
    totalAdminIntervened: number;
    totalRefunded: number;
    totalReleasedToSeller: number;
}

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<DisputeItem[]>([]);
    const [stats, setStats] = useState<EscrowStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    // Filtering & Searching
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'refunded' | 'released'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal Create Dispute
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newOrderId, setNewOrderId] = useState('');
    const [newReason, setNewReason] = useState('');
    const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Load disputes & stats from Backend
    const loadDisputes = async () => {
        try {
            setLoading(true);
            const [disputesRes, statsRes] = await Promise.allSettled([
                api.get<ApiResponse<DisputeItem[]> | DisputeItem[]>('/OrderDisputes'),
                api.get<ApiResponse<EscrowStats> | EscrowStats>('/OrderDisputes/stats')
            ]);

            if (disputesRes.status === 'fulfilled') {
                const resData = disputesRes.value.data;
                const list = (resData as ApiResponse<DisputeItem[]>)?.data || (Array.isArray(resData) ? resData : []);
                setDisputes(list);
            }

            if (statsRes.status === 'fulfilled') {
                const resData = statsRes.value.data;
                const statsData = (resData as ApiResponse<EscrowStats>)?.data || (resData as EscrowStats);
                if (statsData) {
                    setStats(statsData);
                }
            }
        } catch (error) {
            console.error('Error fetching disputes:', error);
            showToast('error', 'Không thể kết nối máy chủ để tải danh sách khiếu nại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDisputes();
    }, []);

    const showToast = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 6000);
    };

    const handleResolve = async (action: 'Refund' | 'ReleaseToSeller') => {
        if (!selectedDispute) return;

        setIsResolving(true);
        try {
            await api.post(`/OrderDisputes/${selectedDispute.id}/resolve`, {
                disputeId: selectedDispute.id,
                action,
                resolutionNote: resolutionNote.trim(),
            });

            const actionLabel = action === 'Refund'
                ? `Đã CHẤP THUẬN HOÀN TIỀN ${formatPrice(selectedDispute.amount)} cho khách hàng ${selectedDispute.customerName}`
                : `Đã BÁC KHIẾU NẠI & GIẢI NGÂN ${formatPrice(selectedDispute.amount)} vào ví Shop ${selectedDispute.shopName}`;

            showToast('success', actionLabel);
            setSelectedDispute(null);
            setResolutionNote('');
            await loadDisputes();
        } catch (error: any) {
            console.error('Error resolving dispute:', error);
            const msg = error.response?.data?.message || 'Có lỗi xảy ra khi xử lý phán quyết khiếu nại';
            showToast('error', msg);
        } finally {
            setIsResolving(false);
        }
    };

    const handleCreateDispute = async (e: React.FormEvent) => {
        e.preventDefault();
        const orderIdNum = parseInt(newOrderId.trim());
        if (isNaN(orderIdNum) || orderIdNum <= 0) {
            showToast('error', 'Vui lòng nhập ID đơn hàng hợp lệ');
            return;
        }
        if (!newReason.trim()) {
            showToast('error', 'Vui lòng nhập lý do khiếu nại');
            return;
        }

        setIsCreating(true);
        try {
            await api.post('/OrderDisputes', {
                orderId: orderIdNum,
                reason: newReason.trim(),
                evidenceUrls: newEvidenceUrl.trim() || undefined
            });

            showToast('success', `Đã tạo hồ sơ tranh chấp cho đơn hàng #${orderIdNum} thành công`);
            setIsCreateModalOpen(false);
            setNewOrderId('');
            setNewReason('');
            setNewEvidenceUrl('');
            await loadDisputes();
        } catch (error: any) {
            console.error('Error creating dispute:', error);
            const msg = error.response?.data?.message || 'Không thể tạo khiếu nại (Đơn hàng không tồn tại hoặc đã có khiếu nại)';
            showToast('error', msg);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredDisputes = useMemo(() => {
        return disputes.filter((item) => {
            // Tab filter
            if (activeTab === 'pending' && item.status > 2) return false;
            if (activeTab === 'refunded' && item.status !== 3) return false;
            if (activeTab === 'released' && item.status !== 4) return false;

            // Search query
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const orderMatch = item.orderCode?.toLowerCase().includes(q) || String(item.orderId).includes(q);
            const customerMatch = item.customerName?.toLowerCase().includes(q) || item.customerEmail?.toLowerCase().includes(q) || item.customerPhone?.includes(q);
            const shopMatch = item.shopName?.toLowerCase().includes(q) || String(item.shopId).includes(q);
            const reasonMatch = item.reason?.toLowerCase().includes(q);
            return orderMatch || customerMatch || shopMatch || reasonMatch;
        });
    }, [disputes, activeTab, searchQuery]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const pendingCount = stats?.totalPendingDisputes ?? disputes.filter((d) => d.status <= 2).length;
    const escrowLocked = stats?.totalEscrowLocked ?? disputes.filter((d) => d.status <= 2).reduce((acc, curr) => acc + curr.amount, 0);
    const resolvedCount = stats?.totalResolvedDisputes ?? disputes.filter((d) => d.status >= 3).length;
    const refundedCount = stats?.totalRefunded ?? disputes.filter((d) => d.status === 3).length;
    const releasedCount = stats?.totalReleasedToSeller ?? disputes.filter((d) => d.status === 4).length;

    return (
        <div className="p-6 space-y-6 pb-16">
            {/* ══════════════════ HEADER ══════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                            <Scale className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Quản Lý Tranh Chấp & Trọng Tài Sàn (Escrow)
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Hệ Thống Trực Tuyến
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Cơ chế bảo hộ tài chính Escrow & Phán quyết trọng tài giữa Người mua và Cửa hàng.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-violet-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Mở hồ sơ khiếu nại</span>
                    </button>
                    <button
                        onClick={loadDisputes}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800">
                        <Lock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        Escrow Protected
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {actionMessage && (
                <div
                    className={`p-4 rounded-2xl text-white font-semibold text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xl animate-in fade-in ${
                        actionMessage.type === 'success'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                            : 'bg-gradient-to-r from-rose-600 to-red-600'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {actionMessage.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-200" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-200" />
                        )}
                        <span className="leading-relaxed">{actionMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setActionMessage(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ══════════════════ STATS CARDS ROW ══════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Chờ Trọng Tài Phán Xử
                        </span>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                            {pendingCount}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Cần hội đồng Sàn xem xét</p>
                    </div>
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                            Tiền Đang Khóa Escrow
                        </span>
                        <p className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">
                            {formatPrice(escrowLocked)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Đảm bảo thanh khoản hoàn trả</p>
                    </div>
                    <div className="p-3.5 bg-violet-50 dark:bg-violet-900/30 text-violet-600 rounded-2xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            Đã Hoàn Tiền Khách
                        </span>
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                            {refundedCount}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Phán quyết bảo vệ người mua</p>
                    </div>
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
                        <RotateCcw className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Đã Giải Ngân Cho Shop
                        </span>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {releasedCount}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Cộng số dư khả dụng ví Shop</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* ══════════════════ FILTER & SEARCH BAR ══════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'all'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Tất cả ({disputes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'pending'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                        }`}
                    >
                        <span>Chờ phán quyết</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                            {pendingCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('refunded')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'refunded'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                        }`}
                    >
                        Đã hoàn tiền ({refundedCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('released')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'released'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                        }`}
                    >
                        Đã giải ngân Shop ({releasedCount})
                    </button>
                </div>

                {/* Search input */}
                <div className="relative min-w-[260px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm mã đơn, tên khách, số điện thoại, Shop..."
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                </div>
            </div>

            {/* ══════════════════ DISPUTES LIST TABLE ══════════════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                            Danh Sách Hồ Sơ Tranh Chấp Sàn
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Hồ sơ tranh chấp bảo lưu tiền hàng Escrow và yêu cầu can thiệp trọng tài
                        </p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-full">
                        {filteredDisputes.length} hồ sơ hiển thị
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
                                <th className="p-4 text-right">Thao tác phán quyết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-500" />
                                        <span>Đang tải dữ liệu hồ sơ khiếu nại...</span>
                                    </td>
                                </tr>
                            ) : filteredDisputes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                        <p className="font-semibold text-slate-600 dark:text-slate-400">Không tìm thấy hồ sơ khiếu nại nào</p>
                                        <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc tạo hồ sơ khiếu nại mới</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDisputes.map((dispute) => (
                                    <tr key={dispute.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono font-black text-violet-600 dark:text-violet-400">
                                                #{dispute.orderCode}
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-normal mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(dispute.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dispute.customerName}</p>
                                                    <p className="text-[11px] text-slate-400">{dispute.customerEmail}</p>
                                                    {dispute.customerPhone && (
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-2.5 h-2.5" />
                                                            <span>{dispute.customerPhone}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                    <Store className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{dispute.shopName}</p>
                                                    <p className="text-[10px] text-slate-400">Shop #{dispute.shopId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-violet-600 dark:text-violet-400 text-sm">
                                                {formatPrice(dispute.amount)}
                                            </div>
                                            <span className="text-[10px] text-slate-400 block font-medium">Tạm giữ Escrow</span>
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
                                                {dispute.status <= 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                                                {dispute.statusText}
                                            </span>
                                            {dispute.resolvedAt && (
                                                <span className="text-[10px] text-slate-400 block mt-1">
                                                    Phán quyết: {formatDate(dispute.resolvedAt)}
                                                </span>
                                            )}
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
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {dispute.status <= 2 ? 'Xem & Phán quyết' : 'Chi tiết phán quyết'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════════ ARBITRATION DECISION MODAL ══════════════════ */}
            {selectedDispute && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
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
                            <div className="flex items-center gap-3">
                                <span className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-black text-sm border border-violet-200 dark:border-violet-800">
                                    {formatPrice(selectedDispute.amount)}
                                </span>
                                <button
                                    onClick={() => setSelectedDispute(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Customer & Shop Meta Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                                <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400 font-bold">
                                    <User className="w-3.5 h-3.5" />
                                    <span>Bên khiếu nại (Người mua):</span>
                                </div>
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedDispute.customerName}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">{selectedDispute.customerEmail}</p>
                                {selectedDispute.customerPhone && (
                                    <p className="text-slate-500 text-[11px] mt-0.5">SĐT: {selectedDispute.customerPhone}</p>
                                )}
                            </div>

                            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                                <div className="flex items-center gap-2 mb-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <Store className="w-3.5 h-3.5" />
                                    <span>Bên bị khiếu nại (Shop):</span>
                                </div>
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedDispute.shopName}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">Shop ID: #{selectedDispute.shopId}</p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Ví Shop liên kết: Khả dụng</p>
                            </div>
                        </div>

                        {/* Order Items Breakdown */}
                        {selectedDispute.items && selectedDispute.items.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
                                    <Package className="w-4 h-4 text-violet-600" />
                                    <span>Danh mục sản phẩm trong đơn hàng:</span>
                                </div>
                                <div className="space-y-2">
                                    {selectedDispute.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                {item.productImage ? (
                                                    <img
                                                        src={item.productImage}
                                                        alt={item.productName}
                                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs">{item.productName}</p>
                                                    <p className="text-[11px] text-slate-400">Số lượng: x{item.quantity}</p>
                                                </div>
                                            </div>
                                            <div className="font-black text-slate-900 dark:text-white text-xs">
                                                {formatPrice(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Customer Reason & Evidence */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                            <div>
                                <span className="font-extrabold text-slate-900 dark:text-white block mb-1">
                                    Lý do khiếu nại từ Người mua:
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                    &quot;{selectedDispute.reason}&quot;
                                </p>
                            </div>

                            {selectedDispute.evidenceUrls && (
                                <div className="space-y-2 pt-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                        Bằng chứng ảnh/video đồng kiểm mở hộp:
                                    </span>
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-52 group">
                                        <img
                                            src={selectedDispute.evidenceUrls}
                                            alt="Bằng chứng mở hàng"
                                            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                // Fallback if image link fails
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                        <a
                                            href={selectedDispute.evidenceUrls}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Mở ảnh / video bằng chứng gốc
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Admin Resolution Note Input & Quick Fill */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                                Căn cứ & Nhận định Phán quyết của Sàn
                            </label>

                            {selectedDispute.status <= 2 && (
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                    <span className="text-slate-400 font-medium">Mẫu nhanh:</span>
                                    <button
                                        type="button"
                                        onClick={() => setResolutionNote('Căn cứ video mở hộp của khách hàng ghi nhận sản phẩm bị vỡ hỏng do vận chuyển. Chấp thuận hoàn tiền 100%.')}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                    >
                                        Hàng hỏng do ship
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResolutionNote('Shop có đầy đủ hóa đơn xuất kho và video đóng hàng niêm phong hợp lệ. Bác khiếu nại của người mua và giải ngân cho Shop.')}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                                    >
                                        Shop đóng gói đúng chuẩn
                                    </button>
                                </div>
                            )}

                            <textarea
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                disabled={selectedDispute.status > 2}
                                rows={3}
                                placeholder="Nhập căn cứ phán quyết trọng tài..."
                                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:opacity-60"
                            />
                        </div>

                        {/* Action Buttons */}
                        {selectedDispute.status <= 2 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                                    <span>GIẢI NGÂN Vào Ví Shop ({formatPrice(selectedDispute.amount)})</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <span>Hồ sơ này đã có kết luận phán quyết chính thức: <b>{selectedDispute.statusText}</b></span>
                                    {selectedDispute.resolvedAt && (
                                        <p className="text-[11px] text-slate-500 mt-0.5">Thời gian thực thi: {formatDate(selectedDispute.resolvedAt)}</p>
                                    )}
                                </div>
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

            {/* ══════════════════ CREATE DISPUTE MODAL ══════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                    Mở Hồ Sơ Khiếu Nại Mới
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDispute} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                                    ID Đơn hàng (Order ID) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={newOrderId}
                                    onChange={(e) => setNewOrderId(e.target.value)}
                                    placeholder="Nhập ID đơn hàng (Ví dụ: 1, 2, 3...)"
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                                    Lý do khiếu nại tranh chấp <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newReason}
                                    onChange={(e) => setNewReason(e.target.value)}
                                    placeholder="Mô tả chi tiết vấn đề phát sinh (giao thiếu, lỗi sản phẩm, từ chối đổi trả...)"
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                                    Link ảnh / video bằng chứng (Tùy chọn)
                                </label>
                                <input
                                    type="url"
                                    value={newEvidenceUrl}
                                    onChange={(e) => setNewEvidenceUrl(e.target.value)}
                                    placeholder="https://... ảnh hoặc video đồng kiểm"
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Tạo hồ sơ</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
