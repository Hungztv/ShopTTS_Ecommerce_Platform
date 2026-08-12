import api from '../admin/api';
import { sellerOrdersService, SellerOrder } from './seller-orders-service';
import { sellerProductsService } from './shop-products-service';
import { sellerShopService } from './shop-service';

export interface RevenueDataPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface StatusDistribution {
  status: number;
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface TopSellingProduct {
  id: number;
  name: string;
  image: string;
  price: number;
  unitsSold: number;
  totalRevenue: number;
  stock: number;
  rating: number;
}

export interface CategoryDistribution {
  name: string;
  revenue: number;
  percentage: number;
}

export interface SellerAnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalProductsSold: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  confirmedOrdersCount: number;
  shippingOrdersCount: number;
  completionRate: number;
  shopRating: number;
  totalReviews: number;
  availableBalance: number;
  pendingBalance: number;
  chartData: RevenueDataPoint[];
  statusDistribution: StatusDistribution[];
  topProducts: TopSellingProduct[];
}

export const sellerAnalyticsService = {
  async getAnalytics(period: '7days' | '30days' | 'month' | 'year' = '7days'): Promise<SellerAnalyticsSummary> {
    try {
      const [ordersRes, productsRes, shop, wallet] = await Promise.all([
        sellerOrdersService.getOrders({ pageSize: 500 }),
        sellerProductsService.getMyProducts(1, 100),
        sellerShopService.getMyShop(),
        sellerShopService.getWallet(),
      ]);

      const orders: SellerOrder[] = ordersRes?.items || [];
      const products = productsRes?.items || [];

      // Calculate exact metrics from real data
      let totalRevenue = 0;
      let totalProductsSold = 0;
      let pendingOrdersCount = 0;
      let completedOrdersCount = 0;
      let cancelledOrdersCount = 0;
      let confirmedOrdersCount = 0;
      let shippingOrdersCount = 0;

      orders.forEach((ord) => {
        if (ord.status === 3) {
          // Delivered / Completed
          totalRevenue += ord.shopSubtotal || 0;
          completedOrdersCount++;
        } else if (ord.status === 4) {
          cancelledOrdersCount++;
        } else if (ord.status === 0) {
          pendingOrdersCount++;
        } else if (ord.status === 1) {
          confirmedOrdersCount++;
        } else if (ord.status === 2) {
          shippingOrdersCount++;
        }

        ord.shopOrderDetails?.forEach((dt) => {
          totalProductsSold += dt.quantity || 0;
        });
      });

      const totalOrdersCount = orders.length;
      const averageOrderValue = completedOrdersCount > 0 ? Math.round(totalRevenue / completedOrdersCount) : 0;
      const completionRate = totalOrdersCount > 0 ? Math.round((completedOrdersCount / totalOrdersCount) * 100) : 0;

      // Status breakdown
      const statusDistribution: StatusDistribution[] = [
        {
          status: 0,
          label: 'Chờ xử lý',
          count: pendingOrdersCount,
          color: '#F59E0B', // Amber
          percentage: totalOrdersCount ? Math.round((pendingOrdersCount / totalOrdersCount) * 100) : 0,
        },
        {
          status: 1,
          label: 'Đã xác nhận',
          count: confirmedOrdersCount,
          color: '#3B82F6', // Blue
          percentage: totalOrdersCount ? Math.round((confirmedOrdersCount / totalOrdersCount) * 100) : 0,
        },
        {
          status: 2,
          label: 'Đang giao hàng',
          count: shippingOrdersCount,
          color: '#8B5CF6', // Purple
          percentage: totalOrdersCount ? Math.round((shippingOrdersCount / totalOrdersCount) * 100) : 0,
        },
        {
          status: 3,
          label: 'Đã hoàn thành',
          count: completedOrdersCount,
          color: '#10B981', // Emerald
          percentage: totalOrdersCount ? Math.round((completedOrdersCount / totalOrdersCount) * 100) : 0,
        },
        {
          status: 4,
          label: 'Đã hủy',
          count: cancelledOrdersCount,
          color: '#EF4444', // Red
          percentage: totalOrdersCount ? Math.round((cancelledOrdersCount / totalOrdersCount) * 100) : 0,
        },
      ];

      // Top products mapping from actual order details & products
      const productSalesMap: Record<number, { sold: number; revenue: number }> = {};
      orders.forEach((ord) => {
        if (ord.status === 3) {
          ord.shopOrderDetails?.forEach((dt) => {
            if (!productSalesMap[dt.id]) {
              productSalesMap[dt.id] = { sold: 0, revenue: 0 };
            }
            productSalesMap[dt.id].sold += dt.quantity || 0;
            productSalesMap[dt.id].revenue += dt.total || 0;
          });
        }
      });

      const topProducts: TopSellingProduct[] = products
        .map((p) => {
          const stats = productSalesMap[p.id] || { sold: p.soldOut || 0, revenue: (p.soldOut || 0) * p.price };
          return {
            id: p.id,
            name: p.name,
            image: p.image || '/images/placeholder.png',
            price: p.price,
            unitsSold: stats.sold,
            totalRevenue: stats.revenue,
            stock: p.quantity,
            rating: p.averageScore || 5.0,
          };
        })
        .sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      // Real chart data grouping by actual order dates
      const chartData = generateRealChartData(period, orders);

      // Wallet real balance
      const availableBalance = wallet ? wallet.availableBalance ?? 0 : 0;
      const pendingBalance = wallet ? wallet.pendingBalance ?? 0 : 0;

      return {
        totalRevenue,
        totalOrders: totalOrdersCount,
        totalProductsSold,
        averageOrderValue,
        pendingOrdersCount,
        completedOrdersCount,
        cancelledOrdersCount,
        confirmedOrdersCount,
        shippingOrdersCount,
        completionRate,
        shopRating: shop?.rating || 5.0,
        totalReviews: shop?.totalRatings || 0,
        availableBalance,
        pendingBalance,
        chartData,
        statusDistribution,
        topProducts,
      };
    } catch (error) {
      console.error('Error generating real analytics summary:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProductsSold: 0,
        averageOrderValue: 0,
        pendingOrdersCount: 0,
        completedOrdersCount: 0,
        cancelledOrdersCount: 0,
        confirmedOrdersCount: 0,
        shippingOrdersCount: 0,
        completionRate: 0,
        shopRating: 5.0,
        totalReviews: 0,
        availableBalance: 0,
        pendingBalance: 0,
        chartData: generateRealChartData(period, []),
        statusDistribution: [
          { status: 0, label: 'Chờ xử lý', count: 0, color: '#F59E0B', percentage: 0 },
          { status: 1, label: 'Đã xác nhận', count: 0, color: '#3B82F6', percentage: 0 },
          { status: 2, label: 'Đang giao hàng', count: 0, color: '#8B5CF6', percentage: 0 },
          { status: 3, label: 'Đã hoàn thành', count: 0, color: '#10B981', percentage: 0 },
          { status: 4, label: 'Đã hủy', count: 0, color: '#EF4444', percentage: 0 },
        ],
        topProducts: [],
      };
    }
  },
};

function generateRealChartData(period: string, orders: SellerOrder[]): RevenueDataPoint[] {
  const result: RevenueDataPoint[] = [];
  const now = new Date();

  if (period === '7days') {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayLabel = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;

      const dayOrders = orders.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = new Date(ord.createdAt);
        return (
          ordDate.getFullYear() === d.getFullYear() &&
          ordDate.getMonth() === d.getMonth() &&
          ordDate.getDate() === d.getDate()
        );
      });

      const dayRevenue = dayOrders
        .filter((ord) => ord.status === 3)
        .reduce((sum, ord) => sum + (ord.shopSubtotal || 0), 0);

      result.push({
        label: dayLabel,
        revenue: dayRevenue,
        orders: dayOrders.length,
      });
    }
  } else if (period === '30days') {
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 5 + 4));
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 5);
      const label = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;

      const intervalOrders = orders.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = new Date(ord.createdAt);
        return ordDate >= startDate && ordDate <= new Date(endDate.getTime() + 86400000);
      });

      const intervalRevenue = intervalOrders
        .filter((ord) => ord.status === 3)
        .reduce((sum, ord) => sum + (ord.shopSubtotal || 0), 0);

      result.push({
        label,
        revenue: intervalRevenue,
        orders: intervalOrders.length,
      });
    }
  } else if (period === 'month') {
    for (let week = 1; week <= 4; week++) {
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(week * 7, 31);
      const label = `Tuần ${week} (${startDay}-${endDay}/${now.getMonth() + 1})`;

      const weekOrders = orders.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = new Date(ord.createdAt);
        return (
          ordDate.getFullYear() === now.getFullYear() &&
          ordDate.getMonth() === now.getMonth() &&
          ordDate.getDate() >= startDay &&
          ordDate.getDate() <= endDay
        );
      });

      const weekRevenue = weekOrders
        .filter((ord) => ord.status === 3)
        .reduce((sum, ord) => sum + (ord.shopSubtotal || 0), 0);

      result.push({
        label,
        revenue: weekRevenue,
        orders: weekOrders.length,
      });
    }
  } else {
    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    for (let m = 0; m < 12; m++) {
      const monthOrders = orders.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = new Date(ord.createdAt);
        return ordDate.getFullYear() === now.getFullYear() && ordDate.getMonth() === m;
      });

      const monthRevenue = monthOrders
        .filter((ord) => ord.status === 3)
        .reduce((sum, ord) => sum + (ord.shopSubtotal || 0), 0);

      result.push({
        label: months[m],
        revenue: monthRevenue,
        orders: monthOrders.length,
      });
    }
  }

  return result;
}
