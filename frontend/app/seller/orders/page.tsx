'use client';

import { useState, useEffect } from 'react';
import {
    Search, Eye, ShoppingCart, ChevronLeft, ChevronRight,
    X, RefreshCw, Package, Clock, Truck, CheckCircle, XCircle
} from 'lucide-react';
import { sellerOrdersService, SellerOrder, sellerOrderStatusConfig } from '@/lib/services/seller/seller-orders-service';

export default function SellerOrdersPage() {
    // State
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Modals
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [newStatus, setNewStatus] = useState(0);
    const [formLoading, setFormLoading] = useState(false);

    const pageSize = 10;

    // Load orders
    const loadOrders = async () => {
        setLoading(true);
        const data = await sellerOrdersService.getOrders({
            page,
            pageSize,
            status: statusFilter,
            search: searchQuery || undefined
        });
        setOrders(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setLoading(false);
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOrders();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [page, statusFilter, searchQuery]);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchQuery(searchInput);
    };

    const openDetailModal = (order: SellerOrder) => {
        setSelectedOrder(order);
        setIsDetailOpen(true);
    };

    const openStatusModal = (order: SellerOrder) => {
        setSelectedOrder(order);
        setNewStatus(order.status + 1);
        setIsStatusOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        setFormLoading(true);
        try {
            await sellerOrdersService.updateStatus(selectedOrder.orderId, newStatus);
            setIsStatusOpen(false);
            setSelectedOrder(null);
            loadOrders();
        } catch (error) {
            alert('Cập nhật trạng thái thất bại!');
        }
        setFormLoading(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const statusConfig = sellerOrderStatusConfig;

    // Status filter counts (simplified - uses current data only)
    const statusFilters = [
        { label: 'Tất cả', value: undefined, icon: Package },
        { label: 'Chờ xử lý', value: 0, icon: Clock },
        { label: 'Đã xác nhận', value: 1, icon: CheckCircle },
        { label: 'Đang giao', value: 2, icon: Truck },
        { label: 'Đã giao', value: 3, icon: CheckCircle },
        { label: 'Đã hủy', value: 4, icon: XCircle },
    ];

    // Allowed next status transitions for display
    const getNextStatuses = (currentStatus: number) => {
        switch (currentStatus) {
            case 0: return [{ value: 1, label: 'Xác nhận' }, { value: 4, label: 'Hủy đơn' }];
            case 1: return [{ value: 2, label: 'Giao hàng' }];
            case 2: return [{ value: 3, label: 'Đã giao' }];
            default: return [];
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Quản lý đơn hàng
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalCount} đơn hàng
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {statusFilters.map((sf) => (
                    <button
                        key={sf.label}
                        onClick={() => { setStatusFilter(sf.value); setPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === sf.value
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        <sf.icon className="w-4 h-4" />
                        {sf.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Tìm theo mã đơn hoặc tên khách..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white text-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                    Tìm
                </button>
            </form>

            {/* Orders Table / Cards */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="flex-1" />
                                <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Chưa có đơn hàng nào
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Đơn hàng sẽ xuất hiện khi khách hàng mua sản phẩm từ shop của bạn
                    </p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Mã đơn</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Khách hàng</th>
                                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Số SP</th>
                                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Tổng tiền</th>
                                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Trạng thái</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Ngày tạo</th>
                                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const config = statusConfig[order.status as keyof typeof statusConfig];
                                    const nextStatuses = getNextStatuses(order.status);
                                    return (
                                        <tr key={order.orderId} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                    {order.orderCode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-800 dark:text-white">{order.customerName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{order.customerPhone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                                                {order.itemCount}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                                    {formatCurrency(order.shopSubtotal)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config?.color || ''}`}>
                                                    {config?.icon} {config?.label || order.statusText}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openDetailModal(order)}
                                                        className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {nextStatuses.length > 0 && (
                                                        <button
                                                            onClick={() => openStatusModal(order)}
                                                            className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                                                            title="Cập nhật trạng thái"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {orders.map((order) => {
                            const config = statusConfig[order.status as keyof typeof statusConfig];
                            const nextStatuses = getNextStatuses(order.status);
                            return (
                                <div key={order.orderId} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            {order.orderCode}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config?.color || ''}`}>
                                            {config?.icon} {config?.label || order.statusText}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-800 dark:text-white font-medium">{order.customerName}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{order.customerPhone}</div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-white">
                                                {formatCurrency(order.shopSubtotal)}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">({order.itemCount} SP)</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openDetailModal(order)}
                                                className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {nextStatuses.length > 0 && (
                                                <button
                                                    onClick={() => openStatusModal(order)}
                                                    className="p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">{formatDate(order.createdAt)}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5) {
                                    if (page > 3) pageNum = page - 2 + i;
                                    if (page > totalPages - 2) pageNum = totalPages - 4 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === pageNum
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {isDetailOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsDetailOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                Chi tiết đơn hàng
                            </h2>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Mã đơn hàng</p>
                                    <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{selectedOrder.orderCode}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái</p>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || ''}`}>
                                        {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.icon}{' '}
                                        {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.statusText}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Khách hàng</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{selectedOrder.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Số điện thoại</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{selectedOrder.customerPhone}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Địa chỉ</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{selectedOrder.address}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Thanh toán</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{selectedOrder.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Ngày tạo</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{formatDate(selectedOrder.createdAt)}</p>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                                    Sản phẩm của shop bạn ({selectedOrder.itemCount} SP)
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.shopOrderDetails.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            {item.productImage && (
                                                <img
                                                    src={item.productImage}
                                                    alt={item.productName}
                                                    className="w-14 h-14 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                    {item.productName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatCurrency(item.price)} × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="text-sm font-semibold text-gray-800 dark:text-white">
                                                {formatCurrency(item.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tổng tiền (shop bạn)</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(selectedOrder.shopSubtotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {isStatusOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsStatusOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                Cập nhật trạng thái
                            </h2>
                            <button
                                onClick={() => setIsStatusOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Đơn hàng</p>
                                <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{selectedOrder.orderCode}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Trạng thái hiện tại</p>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || ''}`}>
                                    {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.icon}{' '}
                                    {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Chuyển sang
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 outline-none"
                                >
                                    {getNextStatuses(selectedOrder.status).map(ns => (
                                        <option key={ns.value} value={ns.value}>{ns.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsStatusOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {formLoading ? 'Đang xử lý...' : 'Cập nhật'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
