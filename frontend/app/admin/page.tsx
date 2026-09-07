'use client';

import { useEffect, useState } from 'react';
import {
    ShoppingCart,
    DollarSign,
    Users,
    Package,
    MessageSquare,
    TrendingUp,
    Clock,
    ArrowRight,
    RefreshCw,
    BarChart2,
    PieChart as PieChartIcon,
    Zap,
    CheckCircle2,
    Calendar,
    AlertCircle,
    Shield,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';
import { dashboardService, DashboardStats, RecentOrder, TopProduct } from '@/lib/services/admin/dashboard-service';

const orderStatusLabels: Record<number, { label: string; color: string }> = {
    0: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    1: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    2: { label: 'Đang giao', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    3: { label: 'Đã giao', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    4: { label: 'Đã hủy', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminDashboard() {
    const [period, setPeriod] = useState<'7days' | '30days' | 'month' | 'year'>('7days');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'orders'>('revenue');
    const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

    const loadDashboardData = async (selectedPeriod: typeof period) => {
        setLoading(true);
        try {
            const [statsData, ordersData, productsData] = await Promise.all([
                dashboardService.getStats(selectedPeriod),
                dashboardService.getRecentOrders(6),
                dashboardService.getTopProducts(6),
            ]);
            setStats(statsData);
            setRecentOrders(ordersData);
            setTopProducts(productsData);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData(period);
    }, [period]);

    // Real-time Auto-refresh Interval (every 15 seconds)
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            loadDashboardData(period);
        }, 15000);

        return () => clearInterval(interval);
    }, [autoRefresh, period]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const maxBarValue = stats?.chartData?.length
        ? Math.max(...stats.chartData.map((d) => (activeChartTab === 'revenue' ? d.revenue : d.orders)))
        : 0;

    return (
        <div className="min-h-screen pb-12 space-y-6">
            <AdminHeader title="Dashboard Quản Trị Hệ Thống" subtitle="Cập nhật dữ liệu thời gian thực toàn bộ nền tảng ShopTTS" />

            <div className="p-6 space-y-6">
                {/* Header Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            {autoRefresh && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${autoRefresh ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        </span>
                        <div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {autoRefresh ? 'Cập nhật tự động (15s)' : 'Tạm dừng cập nhật'}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Lần cập nhật cuối: {new Date().toLocaleTimeString('vi-VN')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Period Filter Buttons */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                            {(
                                [
                                    { id: '7days', label: '7 Ngày' },
                                    { id: '30days', label: '30 Ngày' },
                                    { id: 'month', label: 'Tháng này' },
                                    { id: 'year', label: 'Năm nay' },
                                ] as const
                            ).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setPeriod(item.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        period === item.id
                                            ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Toggle Auto Refresh */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                autoRefresh
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                            }`}
                        >
                            {autoRefresh ? 'Tắt Tự Động' : 'Bật Tự Động'}
                        </button>

                        <button
                            onClick={() => loadDashboardData(period)}
                            disabled={loading}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Tải lại dữ liệu"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Main Metric KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Revenue */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6 rounded-2xl shadow-lg shadow-violet-600/10">
                        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-medium text-violet-100 uppercase tracking-wider">
                                Doanh thu hệ thống
                            </span>
                            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                                {loading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                            </h2>
                            <p className="text-xs text-violet-200 pt-1">
                                Hôm nay: <b>{formatCurrency(stats?.revenueToday || 0)}</b>
                            </p>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <StatsCard
                        title="Tổng đơn toàn hệ thống"
                        value={`${stats?.totalOrders || 0} đơn`}
                        change={stats?.ordersToday ? `+${stats.ordersToday} hôm nay` : 'Thực tế'}
                        changeType="increase"
                        icon={ShoppingCart}
                        iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        loading={loading}
                    />

                    {/* Total Users */}
                    <StatsCard
                        title="Tài khoản người dùng"
                        value={stats?.totalUsers || 0}
                        change="Toàn hệ thống"
                        changeType="increase"
                        icon={Users}
                        iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        loading={loading}
                    />

                    {/* Products & Support Messages */}
                    <StatsCard
                        title="Sản phẩm / Tin chưa đọc"
                        value={`${stats?.totalProducts || 0} SP / ${stats?.newMessages || 0} tin`}
                        change="Real-time"
                        changeType="increase"
                        icon={MessageSquare}
                        iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        loading={loading}
                    />
                </div>

                {/* System Revenue Trend & Order Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SVG Bar Chart for System Revenue/Orders (2 cols) */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <BarChart2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    Biểu Đồ {activeChartTab === 'revenue' ? 'Doanh Thu' : 'Đơn Hàng'} Hệ Thống
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Dữ liệu thời gian thực theo khoảng thời gian được chọn.
                                </p>
                            </div>

                            <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl self-start sm:self-auto">
                                <button
                                    onClick={() => setActiveChartTab('revenue')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeChartTab === 'revenue'
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    Doanh Thu (₫)
                                </button>
                                <button
                                    onClick={() => setActiveChartTab('orders')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeChartTab === 'orders'
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    Số Đơn
                                </button>
                            </div>
                        </div>

                        {/* Chart Render */}
                        <div className="relative pt-6 pb-2">
                            {loading ? (
                                <div className="h-56 flex items-center justify-center text-sm text-gray-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mr-2 text-violet-500" />
                                    Đang tổng hợp dữ liệu...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-6 pb-2 border-b border-gray-100 dark:border-gray-700 relative">
                                        <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100 dark:border-gray-700/60" />
                                        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 dark:border-gray-700/60" />

                                        {stats?.chartData?.map((item, idx) => {
                                            const val = activeChartTab === 'revenue' ? item.revenue : item.orders;
                                            const heightPercent = maxBarValue > 0 ? Math.max(6, Math.round((val / maxBarValue) * 100)) : 6;
                                            const isHovered = hoveredBarIndex === idx;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                                                    onMouseEnter={() => setHoveredBarIndex(idx)}
                                                    onMouseLeave={() => setHoveredBarIndex(null)}
                                                >
                                                    {isHovered && (
                                                        <div className="absolute -top-12 z-20 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap">
                                                            <div className="font-bold">
                                                                {activeChartTab === 'revenue' ? formatCurrency(item.revenue) : `${item.orders} đơn`}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">{item.label}</div>
                                                        </div>
                                                    )}

                                                    <div
                                                        style={{ height: `${val > 0 ? heightPercent : 6}%` }}
                                                        className={`w-full max-w-[42px] rounded-t-xl transition-all duration-500 relative overflow-hidden ${
                                                            val > 0
                                                                ? isHovered
                                                                    ? 'bg-gradient-to-t from-violet-600 to-indigo-400 shadow-md shadow-violet-500/30'
                                                                    : 'bg-gradient-to-t from-violet-500 to-indigo-500'
                                                                : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {stats?.chartData?.map((item, idx) => (
                                            <span
                                                key={idx}
                                                className={`flex-1 text-center truncate ${
                                                    hoveredBarIndex === idx ? 'text-violet-600 dark:text-violet-400 font-bold' : ''
                                                }`}
                                            >
                                                {item.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Status Breakdown (1 col) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                                <PieChartIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                Phân Bổ Đơn Hàng Hệ Thống
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                                Trạng thái các đơn hàng hiện có trên toàn sàn.
                            </p>

                            <div className="space-y-4">
                                {stats?.statusDistribution?.map((st) => (
                                    <div key={st.status} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: st.color }} />
                                                {st.label}
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {st.count} đơn ({st.percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${st.percentage}%`,
                                                    backgroundColor: st.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl text-xs text-gray-600 dark:text-gray-400">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <span>
                                Hệ thống vận hành <b>ổn định</b> — {stats?.completedOrdersCount || 0} đơn hàng đã hoàn thành.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Recent Orders & Top Products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Orders Stream */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Đơn hàng mới nhất</h3>
                                    <p className="text-xs text-gray-500">Real-time order stream</p>
                                </div>
                            </div>
                            <Link
                                href="/admin/orders"
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
                            >
                                Tất cả đơn hàng <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse">
                                        <div className="flex justify-between">
                                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    Chưa có đơn hàng nào phát sinh
                                </div>
                            ) : (
                                recentOrders.map((order) => (
                                    <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    #{order.orderCode}
                                                </p>
                                                <p className="text-xs text-gray-500">{order.name || 'Khách hàng'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {formatCurrency(order.total)}
                                                </p>
                                                <span
                                                    className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                                        orderStatusLabels[order.status]?.color || 'bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {orderStatusLabels[order.status]?.label || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Top Products Leaderboard */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Sản phẩm bán chạy nhất sàn</h3>
                                    <p className="text-xs text-gray-500">Xếp hạng theo lượt bán</p>
                                </div>
                            </div>
                            <Link
                                href="/admin/products"
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
                            >
                                Tất cả sản phẩm <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                        <div className="flex-1">
                                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : topProducts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    Chưa có sản phẩm nào
                                </div>
                            ) : (
                                topProducts.map((product, index) => (
                                    <div
                                        key={product.id}
                                        className="p-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                                    >
                                        <span className="w-5 text-center font-bold text-xs text-gray-400">
                                            #{index + 1}
                                        </span>
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                                            <img
                                                src={product.image || '/images/placeholder.png'}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src =
                                                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                                                {product.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                                    Đã bán: {product.soldOut} sản phẩm
                                                </span>
                                                {product.stock !== undefined && (
                                                    <span className="text-[11px] text-gray-400">
                                                        (Kho: {product.stock})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="font-extrabold text-xs text-violet-600 dark:text-violet-400">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions Shortcuts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Thao tác nhanh Quản trị</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href="/admin/products?action=new"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                        >
                            <Package className="w-5 h-5 text-violet-500" />
                            <span className="font-medium text-xs sm:text-sm">Thêm sản phẩm mới</span>
                        </Link>
                        <Link
                            href="/admin/orders"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <ShoppingCart className="w-5 h-5 text-blue-500" />
                            <span className="font-medium text-xs sm:text-sm">Quản lý đơn hàng</span>
                        </Link>
                        <Link
                            href="/admin/messages"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                            <MessageSquare className="w-5 h-5 text-orange-500" />
                            <span className="font-medium text-xs sm:text-sm">Hỗ trợ & Tin nhắn</span>
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                            <Users className="w-5 h-5 text-purple-500" />
                            <span className="font-medium text-xs sm:text-sm">Quản lý người dùng</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
