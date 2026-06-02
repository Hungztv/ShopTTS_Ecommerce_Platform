'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Copy, Phone, Mail, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { ordersService } from '@/lib/services/admin/orders-service';
import OrderTimeline from '@/components/admin/OrderTimeline';

import { Order } from '@/lib/services/admin/dashboard-service';

const statusColors: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-violet-100 text-violet-700',
    3: 'bg-emerald-100 text-emerald-700',
    4: 'bg-red-100 text-red-700',
};

const statusLabels: Record<number, string> = {
    0: 'Chờ xử lý',
    1: 'Đã xác nhận',
    2: 'Đang giao',
    3: 'Đã giao',
    4: 'Đã hủy',
};

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadOrder();
    }, [id]);

    const loadOrder = async () => {
        try {
            const data = await ordersService.getById(id);
            setOrder(data);
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: number) => {
        const statusName = statusLabels[newStatus];
        if (!confirm(`Xác nhận chuyển trạng thái đơn hàng sang "${statusName}"?`)) return;

        setUpdating(true);
        try {
            await ordersService.updateStatus(id, newStatus);
            loadOrder();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error updating status:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái!');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này? Hành động này không thể hoàn tác.')) return;

        setUpdating(true);
        try {
            await ordersService.updateStatus(id, 4);
            loadOrder();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            console.error('Error cancelling order:', error);
            alert(apiError.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn hàng!');
        } finally {
            setUpdating(false);
        }
    };

    const copyOrderCode = () => {
        if (order) {
            navigator.clipboard.writeText(order.orderCode);
            alert('Đã sao chép mã đơn hàng!');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Không tìm thấy đơn hàng</h2>
                    <p className="text-slate-500 mb-4">Đơn hàng có thể đã bị xóa hoặc không tồn tại</p>
                    <Link href="/admin/orders">
                        <button className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors">
                            Quay lại danh sách
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/orders">
                            <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-800">
                                    Đơn hàng #{order.orderCode}
                                </h1>
                                <button
                                    onClick={copyOrderCode}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Sao chép mã đơn"
                                >
                                    <Copy className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            <p className="text-slate-500">Ngày đặt: {formatDate(order.createdAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-xl text-sm font-medium ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`}>
                            {statusLabels[order.status]}
                        </span>
                        <button className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" title="In hóa đơn">
                            <Printer className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Order Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Info */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">Thông tin khách hàng</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Họ tên</p>
                                    <p className="font-medium text-slate-800">{order.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Số điện thoại</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <a href={`tel:${order.phoneNumber}`} className="font-medium text-violet-600 hover:underline">
                                            {order.phoneNumber}
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Email</p>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        {order.email ? (
                                            <a href={`mailto:${order.email}`} className="font-medium text-violet-600 hover:underline">
                                                {order.email}
                                            </a>
                                        ) : (
                                            <span className="text-slate-400">Không có</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Địa chỉ giao hàng</p>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <p className="font-medium text-slate-800">{order.address}</p>
                                    </div>
                                </div>
                            </div>
                            {order.note && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-sm text-slate-500 mb-1">Ghi chú</p>
                                    <p className="text-slate-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                                        {order.note}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Order Items */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">
                                Sản phẩm đã đặt ({order.orderDetails?.length || 0})
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Sản phẩm</th>
                                            <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Đơn giá</th>
                                            <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">SL</th>
                                            <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.orderDetails?.map((item) => (
                                            <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                                <td className="py-4 px-2">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={item.productImage || 'https://placehold.co/60x60?text=No+Image'}
                                                            alt={item.productName}
                                                            className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                                                        />
                                                        <span className="font-medium text-slate-800 line-clamp-2">
                                                            {item.productName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-right text-slate-600">
                                                    {formatCurrency(item.price)}
                                                </td>
                                                <td className="py-4 px-2 text-center text-slate-600">
                                                    {item.quantity}
                                                </td>
                                                <td className="py-4 px-2 text-right font-medium text-slate-800">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Order Summary */}
                            <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                                <div className="flex justify-between text-slate-600">
                                    <span>Tạm tính</span>
                                    <span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Phí vận chuyển</span>
                                    <span>{formatCurrency(order.shippingCost)}</span>
                                </div>
                                {order.discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>
                                            Giảm giá
                                            {order.couponCode && <span className="text-xs ml-1">({order.couponCode})</span>}
                                        </span>
                                        <span>-{formatCurrency(order.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200">
                                    <span className="text-slate-800">Tổng cộng</span>
                                    <span className="text-violet-600">{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">Thanh toán</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Phương thức</p>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                        <p className="font-medium text-slate-800">{order.paymentMethod}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Trạng thái</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${order.paymentStatus === 'Paid' || order.paymentStatus === 'Đã thanh toán'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {order.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Timeline & Actions */}
                    <div className="space-y-6">
                        {/* Order Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">Trạng thái đơn hàng</h3>
                            <OrderTimeline currentStatus={order.status} />
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-slate-800 mb-4">Thao tác</h3>
                            <div className="space-y-3">
                                {/* Update Status Buttons */}
                                {order.status === 0 && (
                                    <button
                                        onClick={() => updateStatus(1)}
                                        disabled={updating}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating ? 'Đang xử lý...' : 'Xác nhận đơn hàng'}
                                    </button>
                                )}
                                {order.status === 1 && (
                                    <button
                                        onClick={() => updateStatus(2)}
                                        disabled={updating}
                                        className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating ? 'Đang xử lý...' : 'Bắt đầu giao hàng'}
                                    </button>
                                )}
                                {order.status === 2 && (
                                    <button
                                        onClick={() => updateStatus(3)}
                                        disabled={updating}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating ? 'Đang xử lý...' : 'Xác nhận đã giao hàng'}
                                    </button>
                                )}

                                {/* Cancel Order */}
                                {order.status <= 1 && (
                                    <button
                                        onClick={handleCancelOrder}
                                        disabled={updating}
                                        className="w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating ? 'Đang xử lý...' : 'Hủy đơn hàng'}
                                    </button>
                                )}

                                {/* Completed Status Message */}
                                {order.status === 3 && (
                                    <div className="text-center py-4 bg-emerald-50 rounded-xl">
                                        <p className="text-emerald-700 font-medium">✅ Đơn hàng đã hoàn thành</p>
                                    </div>
                                )}

                                {/* Cancelled Status Message */}
                                {order.status === 4 && (
                                    <div className="text-center py-4 bg-red-50 rounded-xl">
                                        <p className="text-red-700 font-medium">❌ Đơn hàng đã bị hủy</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
