'use client';

import { useEffect, useState } from 'react';
import { Package, Eye, ChevronDown, Truck, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react';
import type { ElementType } from 'react';
import api, { ApiResponse, PaginatedResponse } from '@/lib/services/admin/api';
import { Order } from '@/lib/services/admin/dashboard-service';
import { formatPrice } from '@/lib/utils/product-mapper';

const statusConfig: Record<number, { label: string; color: string; icon: ElementType }> = {
    0: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    1: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    2: { label: 'Đang giao', color: 'bg-purple-100 text-purple-700', icon: Truck },
    3: { label: 'Đã giao', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    4: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');

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

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Đơn hàng của tôi</h2>
                            <p className="text-sm text-slate-500">{orders.length} đơn hàng</p>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        {Object.entries(statusConfig).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600">Chưa có đơn hàng</h3>
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
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                            >
                                {/* Order Header */}
                                <div
                                    className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Package className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{order.orderCode}</p>
                                                <p className="text-sm text-slate-600 truncate max-w-[280px] sm:max-w-[360px]">
                                                    Sản phẩm: {getOrderProductsSummary(order)}
                                                </p>
                                                <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                {status.label}
                                            </span>
                                            <span className="font-bold text-lg text-violet-600">
                                                {formatPrice(order.total)}
                                            </span>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details (Expanded) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 bg-slate-50">
                                        {/* Products */}
                                        <div className="space-y-3 mb-6">
                                            {order.orderDetails?.map((detail, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-xl">
                                                    <img
                                                        src={detail.productImage || 'https://placehold.co/60x60?text=N/A'}
                                                        alt={detail.productName}
                                                        className="w-14 h-14 object-cover rounded-lg"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-800 truncate">{detail.productName}</p>
                                                        <p className="text-sm text-slate-500">Số lượng: {detail.quantity}</p>
                                                    </div>
                                                    <p className="font-semibold text-slate-700">
                                                        {formatPrice(detail.price * detail.quantity)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl">
                                                <h4 className="font-semibold text-slate-700 mb-2">Thông tin giao hàng</h4>
                                                <p className="text-sm text-slate-600">{order.name}</p>
                                                <p className="text-sm text-slate-500">{order.phoneNumber}</p>
                                                <p className="text-sm text-slate-500">{order.address}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl">
                                                <h4 className="font-semibold text-slate-700 mb-2">Chi tiết thanh toán</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Tạm tính:</span>
                                                        <span>{formatPrice(order.subtotal)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Phí vận chuyển:</span>
                                                        <span>{formatPrice(order.shippingCost)}</span>
                                                    </div>
                                                    {order.discountAmount > 0 && (
                                                        <div className="flex justify-between text-green-600">
                                                            <span>Giảm giá:</span>
                                                            <span>-{formatPrice(order.discountAmount)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100">
                                                        <span>Tổng cộng:</span>
                                                        <span className="text-violet-600">{formatPrice(order.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Method */}
                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                                            <CreditCard className="w-4 h-4" />
                                            <span>Phương thức: {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
