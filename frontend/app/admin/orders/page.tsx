'use client';

import { useEffect, useState } from 'react';
import {
    Search,
    Eye,
    ShoppingCart,
    Clock,
    CheckCircle2,
    Truck,
    XCircle,
    Store,
    Shield,
    Info,
    RefreshCw,
    UserCheck,
    Phone,
    MapPin,
    CreditCard,
    DollarSign,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import { ordersService, orderStatusConfig } from '@/lib/services/admin/orders-service';
import { Order } from '@/lib/services/admin/dashboard-service';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<number | undefined>();

    // Modal states
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [newStatus, setNewStatus] = useState(0);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadOrders();
    }, [page, statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await ordersService.getAll({
                page,
                pageSize: 10,
                status: statusFilter,
                search: searchQuery || undefined,
            });
            setOrders(res.items);
            setTotalCount(res.totalCount);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadOrders();
    };

    const openDetailModal = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailOpen(true);
    };

    const openStatusModal = (order: Order) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setIsStatusOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        setFormLoading(true);

        try {
            await ordersService.updateStatus(selectedOrder.id, newStatus);
            setIsStatusOpen(false);
            loadOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng!');
        } finally {
            setFormLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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

    const columns = [
        {
            key: 'orderCode',
            header: 'Mã đơn',
            render: (item: Order) => (
                <div>
                    <span className="font-mono font-bold text-violet-600 dark:text-violet-400">#{item.orderCode}</span>
                    <p className="text-[11px] text-gray-400">ID #{item.id}</p>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng & SĐT',
            render: (item: Order) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {item.phoneNumber}
                    </p>
                </div>
            ),
        },
        {
            key: 'shops',
            header: 'Cửa hàng (Shops)',
            render: (item: Order) => {
                const details = item.orderDetails || [];
                const shopNames = Array.from(new Set(details.map((d) => d.shopName || `Shop #${d.shopId || '—'}`)));
                return (
                    <div className="space-y-1">
                        {shopNames.length > 0 ? (
                            shopNames.map((sn, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mr-1"
                                >
                                    <Store className="w-3 h-3" />
                                    {sn}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400">Toàn sàn</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'total',
            header: 'Tổng tiền',
            render: (item: Order) => (
                <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                    {formatCurrency(item.total)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item: Order) => {
                const config = orderStatusConfig[item.status as keyof typeof orderStatusConfig];
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openStatusModal(item);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-opacity hover:opacity-80 ${
                            config?.color || 'bg-gray-100 text-gray-700'
                        }`}
                        title="Nhấn để can thiệp trạng thái đơn"
                    >
                        <span>{config?.icon}</span>
                        {config?.label || 'Không xác định'}
                    </button>
                );
            },
        },
        {
            key: 'paymentMethod',
            header: 'Thanh toán',
            render: (item: Order) => (
                <div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                        {item.paymentMethod || 'COD'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {item.paymentStatus || 'Đã ghi nhận'}
                    </span>
                </div>
            ),
        },
        {
            key: 'createdAt',
            header: 'Thời gian đặt',
            render: (item: Order) => (
                <span className="text-gray-500 text-xs">{formatDate(item.createdAt)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Chi tiết',
            render: (item: Order) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        openDetailModal(item);
                    }}
                    className="p-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 transition-colors"
                    title="Xem chi tiết đơn hàng"
                >
                    <Eye className="w-4 h-4" />
                </button>
            ),
        },
    ];

    return (
        <div className="min-h-screen pb-12 space-y-6">
            <AdminHeader
                title="Quản Lý & Giám Sát Đơn Hàng Toàn Sàn"
                subtitle={`Thẩm quyền Admin: Kiểm tra & giám sát tất cả ${totalCount} đơn hàng từ các Shop/Seller`}
            />

            <div className="p-6 space-y-6">
                {/* Admin Authority Banner */}
                <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-violet-800 shadow-lg flex items-start gap-4">
                    <div className="p-3 bg-violet-500/20 text-violet-300 rounded-xl flex-shrink-0">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-sm text-white">Thẩm quyền Giám sát Quản trị viên (Admin Master Access)</h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Quản trị viên có đầy đủ quyền hạn xem chi tiết thông tin đơn hàng, thông tin giao hàng của khách, danh sách sản phẩm theo từng Shop và có thể điều chỉnh trạng thái đơn hàng trong các trường hợp tranh chấp hoặc kiểm duyệt đặc biệt.
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo Mã đơn, Tên KH, SĐT, Email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter ?? ''}
                            onChange={(e) => {
                                setStatusFilter(e.target.value ? Number(e.target.value) : undefined);
                                setPage(1);
                            }}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none font-medium"
                        >
                            <option value="">Tất cả trạng thái ({totalCount})</option>
                            {Object.entries(orderStatusConfig).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.icon} {config.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={loadOrders}
                            disabled={loading}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Tải lại danh sách"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={orders}
                    loading={loading}
                    page={page}
                    pageSize={10}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    keyExtractor={(item) => item.id}
                    emptyMessage="Chưa có đơn hàng nào phát sinh trên hệ thống"
                    onRowClick={(item) => openDetailModal(item)}
                />
            </div>

            {/* Order Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Chi tiết đơn hàng toàn sàn #${selectedOrder?.orderCode}`}
                size="lg"
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 p-4 rounded-2xl text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-violet-900 dark:text-violet-200">Trạng thái hiện tại:</span>
                                <span className={`px-3 py-1 rounded-full font-bold text-xs ${orderStatusConfig[selectedOrder.status as keyof typeof orderStatusConfig]?.color}`}>
                                    {orderStatusConfig[selectedOrder.status as keyof typeof orderStatusConfig]?.label}
                                </span>
                            </div>
                            <span className="text-gray-500">Ngày đặt: {formatDate(selectedOrder.createdAt)}</span>
                        </div>

                        {/* Customer Info Card */}
                        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-violet-600" />
                                Thông tin Khách hàng & Địa chỉ Giao hàng
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-400">Họ và tên:</span>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.name}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Số điện thoại:</span>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.phoneNumber}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Email:</span>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Phương thức thanh toán:</span>
                                    <p className="font-semibold text-emerald-600">{selectedOrder.paymentMethod || 'COD'} ({selectedOrder.paymentStatus || 'Đã ghi nhận'})</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-gray-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-red-500" /> Địa chỉ giao hàng:
                                    </span>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedOrder.address}</p>
                                </div>
                                {selectedOrder.note && (
                                    <div className="sm:col-span-2 bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-400">Ghi chú từ khách:</span>
                                        <p className="italic text-gray-700 dark:text-gray-300 mt-0.5">{selectedOrder.note}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Products Grouped by Shop */}
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                                Danh sách Sản phẩm (Phân loại theo Shop)
                            </h4>
                            {(() => {
                                const details = selectedOrder.orderDetails || [];
                                const grouped = details.reduce((acc, item) => {
                                    const shopName = item.shopName || `Shop #${item.shopId || 'Chưa xác định'}`;
                                    if (!acc[shopName]) acc[shopName] = [];
                                    acc[shopName].push(item);
                                    return acc;
                                }, {} as Record<string, typeof details>);
                                const shopNames = Object.keys(grouped);

                                return (
                                    <div className="space-y-4">
                                        {shopNames.map((shopName) => (
                                            <div key={shopName} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-900 space-y-3">
                                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                                                    <Store className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{shopName}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {grouped[shopName].map((item) => (
                                                        <div key={item.id} className="flex items-center gap-4 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                                            <img
                                                                src={item.productImage || '/images/placeholder.png'}
                                                                alt={item.productName}
                                                                className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src =
                                                                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60';
                                                                }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">{item.productName}</p>
                                                                <p className="text-[11px] text-gray-500">
                                                                    {formatCurrency(item.price)} x {item.quantity}
                                                                </p>
                                                            </div>
                                                            <p className="font-extrabold text-xs text-violet-600 dark:text-violet-400">
                                                                {formatCurrency(item.price * item.quantity)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Order Calculation Summary */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tạm tính hàng hóa:</span>
                                <span className="font-semibold">{formatCurrency(selectedOrder.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Phí vận chuyển:</span>
                                <span className="font-semibold">{formatCurrency(selectedOrder.shippingCost)}</span>
                            </div>
                            {selectedOrder.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Giảm giá Voucher:</span>
                                    <span className="font-semibold">-{formatCurrency(selectedOrder.discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-extrabold text-base pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                <span>Tổng tiền thanh toán:</span>
                                <span className="text-violet-600 dark:text-violet-400">{formatCurrency(selectedOrder.total)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Update Status Modal */}
            <Modal
                isOpen={isStatusOpen}
                onClose={() => setIsStatusOpen(false)}
                title="Admin Can Thiệp Trạng Thái Đơn Hàng"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsStatusOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium">
                            Hủy
                        </button>
                        <button
                            onClick={handleUpdateStatus}
                            disabled={formLoading || newStatus === selectedOrder?.status}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Cập nhật trạng thái
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p className="text-xs text-gray-500 mb-2">
                        Quản trị viên thực hiện cập nhật trạng thái đơn hàng trong trường hợp khiếu nại hoặc hỗ trợ xử lý đặc biệt:
                    </p>
                    {Object.entries(orderStatusConfig).map(([key, config]) => (
                        <label
                            key={key}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${newStatus === Number(key)
                                ? 'bg-violet-50 dark:bg-violet-950/40 border-2 border-violet-500'
                                : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300'
                                }`}
                        >
                            <input
                                type="radio"
                                name="status"
                                value={key}
                                checked={newStatus === Number(key)}
                                onChange={() => setNewStatus(Number(key))}
                                className="sr-only"
                            />
                            <span className="text-xl">{config.icon}</span>
                            <span className="font-semibold text-xs">{config.label}</span>
                        </label>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
