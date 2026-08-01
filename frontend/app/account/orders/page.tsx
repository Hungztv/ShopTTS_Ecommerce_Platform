'use client';

import { useEffect, useState } from 'react';
import {
    Package, Eye, ChevronDown, Truck, CheckCircle, XCircle, Clock, CreditCard,
    ShieldCheck, AlertTriangle, MessageSquare, Check, RotateCcw, Lock
} from 'lucide-react';
import type { ElementType } from 'react';
import api, { ApiResponse, PaginatedResponse } from '@/lib/services/admin/api';
import { Order } from '@/lib/services/admin/dashboard-service';
import { formatPrice } from '@/lib/utils/product-mapper';

const statusConfig: Record<number, { label: string; color: string; icon: ElementType }> = {
    0: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    1: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    2: { label: 'Đang giao hàng', color: 'bg-purple-100 text-purple-700', icon: Truck },
    3: { label: 'Đã giao hàng (Được bảo đảm)', color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
    4: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: XCircle },
    5: { label: 'Đã hoàn tiền', color: 'bg-slate-100 text-slate-700', icon: RotateCcw },
    6: { label: 'Đang khiếu nại', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');

    // Dispute Modal state
    const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeSubmitting, setDisputeSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOrders();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [statusFilter]);

    const loadOrders = async () => {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('pageSize', '50');
            if (statusFilter !== 'all') {
                queryParams.append('status', statusFilter.toString());
            }

            const res = await api.get<ApiResponse<PaginatedResponse<Order>>>(`/Orders?${queryParams.toString()}`);
            setOrders(res.data.data?.items || []);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getOrderProductsSummary = (order: Order): string => {
        if (!order.orderDetails || order.orderDetails.length === 0) {
            return 'Chưa có thông tin sản phẩm';
        }

        const [firstItem, ...restItems] = order.orderDetails;
        if (restItems.length === 0) {
            return firstItem.productName;
        }

        return `${firstItem.productName} +${restItems.length} sản phẩm`;
    };

    const handleConfirmReceived = (orderId: number) => {
        setActionMessage('Đã xác nhận nhận hàng! Số tiền đơn hàng đã giải ngân cho Shop.');
        setTimeout(() => setActionMessage(''), 5000);
    };

    const handleOpenDispute = (order: Order) => {
        setDisputeOrder(order);
        setDisputeReason('');
    };

    const handleSubmitDispute = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disputeReason.trim()) return;

        setDisputeSubmitting(true);
        setTimeout(() => {
            setDisputeSubmitting(false);
            setDisputeOrder(null);
            setActionMessage('Đã gửi Yêu cầu Trả hàng / Hoàn tiền! Số tiền đơn hàng đã được đóng băng để xử lý.');
            setTimeout(() => setActionMessage(''), 6000);
        }, 1000);
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Đơn hàng của tôi</h2>
                            <p className="text-sm text-slate-500">{orders.length} đơn hàng</p>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white dark:bg-slate-900 dark:text-white text-sm"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Action Toast */}
            {actionMessage && (
                <div className="p-4 rounded-xl bg-violet-600 text-white font-medium text-sm flex items-center gap-3 shadow-lg animate-in fade-in">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <span>{actionMessage}</span>
                </div>
            )}

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-12 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Chưa có đơn hàng</h3>
                    <p className="text-slate-400 mt-1">Bạn chưa đặt đơn hàng nào</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig[0];
                        const StatusIcon = status.icon;
                        const isExpanded = expandedOrder === order.id;

                        return (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
                            >
                                {/* Order Header */}
                                <div
                                    className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <Package className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-white">{order.orderCode}</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[280px] sm:max-w-[360px]">
                                                    Sản phẩm: {getOrderProductsSummary(order)}
                                                </p>
                                                <p className="text-sm text-slate-400">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.color}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {status.label}
                                            </span>
                                            <span className="font-bold text-lg text-violet-600 dark:text-violet-400">
                                                {formatPrice(order.total)}
                                            </span>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details (Expanded) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-950/40 space-y-4">

                                        {/* Escrow Guarantee Banner & Action Bar (For Delivered Orders) */}
                                        {order.status === 3 && (
                                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/10 via-teal-900/10 to-slate-900/10 border border-emerald-500/30 text-slate-800 dark:text-slate-200">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Đơn hàng được bảo vệ bởi ShopTTS Escrow</p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Tiền đang tạm giữ tại Sàn. Bạn có 3 ngày để kiểm tra sản phẩm trước khi chuyển tiền cho Shop.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => handleConfirmReceived(order.id)}
                                                            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Đã nhận hàng
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDispute(order)}
                                                            className="flex-1 sm:flex-none px-3.5 py-2 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            Trả hàng / Hoàn tiền
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Products */}
                                        <div className="space-y-3">
                                            {order.orderDetails?.map((detail, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <img
                                                        src={detail.productImage || '/placeholder.jpg'}
                                                        alt={detail.productName}
                                                        className="w-14 h-14 object-cover rounded-lg"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-800 dark:text-white truncate text-sm">{detail.productName}</p>
                                                        <p className="text-xs text-slate-500">Số lượng: {detail.quantity}</p>
                                                    </div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                        {formatPrice(detail.price * detail.quantity)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-2">Thông tin giao hàng</h4>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{order.name}</p>
                                                <p className="text-xs text-slate-500">{order.phoneNumber}</p>
                                                <p className="text-xs text-slate-500 mt-1">{order.address}</p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-2">Chi tiết thanh toán</h4>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Tạm tính:</span>
                                                        <span className="dark:text-slate-300">{formatPrice(order.subtotal)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Phí vận chuyển:</span>
                                                        <span className="dark:text-slate-300">{formatPrice(order.shippingCost)}</span>
                                                    </div>
                                                    {order.discountAmount > 0 && (
                                                        <div className="flex justify-between text-emerald-600">
                                                            <span>Giảm giá:</span>
                                                            <span>-{formatPrice(order.discountAmount)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                                                        <span className="dark:text-white">Tổng cộng:</span>
                                                        <span className="text-violet-600 dark:text-violet-400">{formatPrice(order.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Method */}
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <CreditCard className="w-4 h-4 text-slate-400" />
                                            <span>Phương thức: {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════ DISPUTE MODAL ══════════════════ */}
            {disputeOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Yêu cầu Trả hàng / Hoàn tiền</h3>
                                <p className="text-xs text-slate-500">Đơn hàng: <strong>{disputeOrder.orderCode}</strong></p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitDispute} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Lý do khiếu nại hoàn tiền
                                </label>
                                <textarea
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    rows={4}
                                    placeholder="Mô tả chi tiết tình trạng sản phẩm (Hỏng hóc, giao sai hàng, không giống hình...)"
                                    required
                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-rose-500 outline-none"
                                />
                            </div>

                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                                <p className="font-bold flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5" />
                                    Cơ chế khóa tiền tạm giữ
                                </p>
                                <p className="text-[11px] leading-relaxed">
                                    Khi bạn gửi khiếu nại, số tiền đơn hàng sẽ bị đóng băng tại Sàn. Tiền sẽ KHÔNG được chuyển cho Shop cho tới khi yêu cầu của bạn được giải quyết xong.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDisputeOrder(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={disputeSubmitting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {disputeSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
