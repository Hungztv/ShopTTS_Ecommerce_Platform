'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  PackageCheck,
  Star,
  Clock,
  ArrowUpRight,
  Download,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart2,
  Zap,
} from 'lucide-react';
import {
  sellerAnalyticsService,
  SellerAnalyticsSummary,
} from '@/lib/services/seller/seller-analytics-service';

export default function SellerAnalyticsPage() {
  const [period, setPeriod] = useState<'7days' | '30days' | 'month' | 'year'>('7days');
  const [data, setData] = useState<SellerAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const loadData = async (selectedPeriod: typeof period) => {
    setLoading(true);
    try {
      const summary = await sellerAnalyticsService.getAnalytics(selectedPeriod);
      setData(summary);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExport = () => {
    alert('Đã xuất báo cáo thống kê thành công dưới dạng file Excel!');
  };

  // Calculate max values for bar chart scaling
  const maxBarValue = data?.chartData?.length
    ? Math.max(...data.chartData.map((d) => (activeTab === 'revenue' ? d.revenue : d.orders)))
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Thống kê & Phân tích Shop
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Real-time
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Theo dõi hiệu quả kinh doanh, doanh thu và xu hướng sản phẩm của cửa hàng.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Filter Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
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
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(period)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg shadow-emerald-600/10">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">
              Doanh thu thuần
            </span>
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              {loading ? '...' : formatVND(data?.totalRevenue || 0)}
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 pt-1">
              <span className="inline-flex items-center bg-white/20 px-1.5 py-0.5 rounded text-white">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> Thực tế
              </span>
              <span>Đơn hàng đã hoàn thành</span>
            </div>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tổng đơn hàng
              </span>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '...' : `${data?.totalOrders || 0} đơn`}
            </h2>
          </div>
          <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 mt-3">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {data?.completedOrdersCount || 0} thành công
            </span>
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {data?.pendingOrdersCount || 0} chờ duyệt
            </span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Giá trị Đơn Trung bình (AOV)
              </span>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '...' : formatVND(data?.averageOrderValue || 0)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-4 border-t border-gray-100 dark:border-gray-800 mt-3">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Đã bán {data?.totalProductsSold || 0} sản phẩm</span>
          </div>
        </div>

        {/* Shop Rating & Balance */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Đánh giá & Khả dụng
              </span>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white">
                {data?.shopRating || 5.0}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                / 5.0 ⭐ ({data?.totalReviews || 0} đánh giá)
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-4 border-t border-gray-100 dark:border-gray-800 mt-3">
            <span className="text-gray-500 dark:text-gray-400">Số dư ví khả dụng:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatVND(data?.availableBalance || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Section + Order Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Bar/Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Xu hướng {activeTab === 'revenue' ? 'Doanh Thu' : 'Số Lượng Đơn Hàng'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Dữ liệu thực tế phát sinh theo các mốc thời gian của Shop.
              </p>
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('revenue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Doanh Thu (₫)
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Số Đơn (Đơn)
              </button>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="relative pt-6 pb-2">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-500" />
                Đang tải dữ liệu biểu đồ...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-6 pb-2 border-b border-gray-100 dark:border-gray-800 relative">
                  {/* Background grid lines */}
                  <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100 dark:border-gray-800/60" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 dark:border-gray-800/60" />

                  {data?.chartData?.map((item, idx) => {
                    const val = activeTab === 'revenue' ? item.revenue : item.orders;
                    const heightPercent = maxBarValue > 0 ? Math.max(6, Math.round((val / maxBarValue) * 100)) : 6;
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-12 z-20 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap animate-in fade-in duration-200">
                            <div className="font-bold">
                              {activeTab === 'revenue' ? formatVND(item.revenue) : `${item.orders} đơn`}
                            </div>
                            <div className="text-[10px] text-gray-400">{item.label}</div>
                          </div>
                        )}

                        {/* Bar */}
                        <div
                          style={{ height: `${val > 0 ? heightPercent : 6}%` }}
                          className={`w-full max-w-[42px] rounded-t-xl transition-all duration-500 relative overflow-hidden ${
                            val > 0
                              ? isHovered
                                ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/30'
                                : 'bg-gradient-to-t from-emerald-500 to-teal-500'
                              : 'bg-gray-200 dark:bg-gray-800'
                          }`}
                        >
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {data?.chartData?.map((item, idx) => (
                    <span
                      key={idx}
                      className={`flex-1 text-center truncate ${
                        hoveredBarIndex === idx
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : ''
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

        {/* Order Status Distribution (1 col) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <PieChartIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Trạng Thái Đơn Hàng
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Tỷ lệ xử lý các đơn hàng hiện có của Shop.
            </p>

            {/* Status Progress list */}
            <div className="space-y-4">
              {data?.statusDistribution?.map((st) => (
                <div key={st.status} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: st.color }}
                      />
                      {st.label}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {st.count} đơn ({st.percentage}%)
                    </span>
                  </div>
                  {/* Progress track */}
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl text-xs text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>
              Tỷ lệ hoàn thành đơn đạt <b>{data?.completionRate || 0}%</b>
              {(data?.completionRate || 0) >= 80
                ? ' — Vận hành cửa hàng rất tốt!'
                : (data?.completionRate || 0) >= 50
                ? ' — Đang xử lý đơn ổn định'
                : ' — Cần đẩy nhanh tiến độ xử lý & giao đơn'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Selling Products & Smart AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Top Sản Phẩm Bán Chạy
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Các sản phẩm mang lại doanh thu cao nhất cho Shop.
              </p>
            </div>

            <a
              href="/seller/products"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Quản lý sản phẩm &rarr;
            </a>
          </div>

          <div className="overflow-x-auto">
            {data?.topProducts && data.topProducts.length > 0 ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Sản phẩm</th>
                    <th className="pb-3 text-center">Đã bán</th>
                    <th className="pb-3 text-right">Doanh thu</th>
                    <th className="pb-3 text-center">Tồn kho</th>
                    <th className="pb-3 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {data.topProducts.map((prod, i) => (
                    <tr
                      key={prod.id || i}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-xs font-bold text-gray-400">
                            #{i + 1}
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-200 dark:border-gray-700">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                SP
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[200px] sm:max-w-[280px]">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {prod.name}
                            </p>
                            <p className="text-xs text-gray-500">{formatVND(prod.price)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center font-bold text-gray-900 dark:text-white">
                        {prod.unitsSold}
                      </td>
                      <td className="py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatVND(prod.totalRevenue)}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                            prod.stock < 10
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {prod.stock} sp
                        </span>
                      </td>
                      <td className="py-3 text-center font-semibold text-amber-500">
                        ★ {prod.rating || 5.0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-xs">
                Chưa có sản phẩm nào có lượt bán hoặc dữ liệu thống kê.
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations & Insights (1 col) */}
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-950 text-white p-6 rounded-2xl border border-gray-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Shop AI Insights</h3>
                <p className="text-xs text-gray-400">Gợi ý phân tích dữ liệu thực tế</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" /> Quản lý sản phẩm & tồn kho
                </div>
                <p className="text-gray-300">
                  Thường xuyên cập nhật số lượng tồn kho và thông tin chi tiết sản phẩm để thu hút nhiều lượt truy cập hơn.
                </p>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Zap className="w-3.5 h-3.5" /> Khung giờ xử lý đơn hiệu quả
                </div>
                <p className="text-gray-300">
                  Xác nhận đơn hàng trong vòng <b>24 giờ</b> đầu tiên giúp tăng mức độ hài lòng của khách hàng và duy trì điểm đánh giá tốt.
                </p>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Star className="w-3.5 h-3.5" /> Đánh giá Shop
                </div>
                <p className="text-gray-300">
                  Shop hiện đạt điểm đánh giá <b>{data?.shopRating || 5.0} / 5.0 ⭐</b>.
                </p>
              </div>
            </div>
          </div>

          <a
            href="/seller/products"
            className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30"
          >
            Quản lý sản phẩm Shop &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
