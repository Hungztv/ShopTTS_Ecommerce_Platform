import api, { ApiResponse, PaginatedResponse } from './api';

// ==================== DASHBOARD ====================
export interface DashboardStats {
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    totalProducts: number;
    newMessages: number;
    ordersToday: number;
    revenueToday: number;
    pendingOrdersCount: number;
    confirmedOrdersCount: number;
    shippingOrdersCount: number;
    completedOrdersCount: number;
    cancelledOrdersCount: number;
    statusDistribution: {
        status: number;
        label: string;
        count: number;
        color: string;
        percentage: number;
    }[];
    chartData: {
        label: string;
        revenue: number;
        orders: number;
    }[];
}

export interface RecentOrder {
    id: number;
    orderCode: string;
    name: string;
    total: number;
    status: number;
    createdAt: string;
}

export interface TopProduct {
    id: number;
    name: string;
    image: string;
    soldOut: number;
    price: number;
    stock?: number;
}

export const dashboardService = {
    async getStats(period: '7days' | '30days' | 'month' | 'year' = '7days'): Promise<DashboardStats> {
        try {
            // Query total counts per status directly from database for 100% accuracy
            const [
                allOrdersRes,
                pendingRes,
                confirmedRes,
                shippingRes,
                completedRes,
                cancelledRes,
                usersRes,
                productsRes,
                messagesRes,
            ] = await Promise.all([
                api.get('/Orders?PageNumber=1&PageSize=500').catch(() => ({ data: { data: { items: [], totalCount: 0 } } })),
                api.get('/Orders?Status=0&PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/Orders?Status=1&PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/Orders?Status=2&PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/Orders?Status=3&PageNumber=1&PageSize=500').catch(() => ({ data: { data: { items: [], totalCount: 0 } } })),
                api.get('/Orders?Status=4&PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/Users?PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/Products?PageNumber=1&PageSize=1').catch(() => ({ data: { data: { totalCount: 0 } } })),
                api.get('/contact-messages/unread-count').catch(() => ({ data: { data: { count: 0 } } })),
            ]);

            // Exact count extractions from backend PaginationResponse
            const extractTotal = (res: any) => res.data?.data?.totalCount ?? res.data?.totalCount ?? 0;
            const extractItems = (res: any) => res.data?.data?.items ?? res.data?.items ?? [];

            const totalOrders = extractTotal(allOrdersRes);
            const pendingOrdersCount = extractTotal(pendingRes);
            const confirmedOrdersCount = extractTotal(confirmedRes);
            const shippingOrdersCount = extractTotal(shippingRes);
            const completedOrdersCount = extractTotal(completedRes);
            const cancelledOrdersCount = extractTotal(cancelledRes);

            const totalUsers = extractTotal(usersRes);
            const totalProducts = extractTotal(productsRes);
            const messagesData = messagesRes.data?.data ?? messagesRes.data;
            const newMessages = messagesData?.count ?? 0;

            const allOrdersList = extractItems(allOrdersRes);
            const completedOrdersList = extractItems(completedRes);

            // Calculate total revenue from all delivered/completed orders
            let totalRevenue = 0;
            completedOrdersList.forEach((ord: any) => {
                totalRevenue += ord.total || 0;
            });

            // Calculate today's stats
            let ordersToday = 0;
            let revenueToday = 0;
            const todayStr = new Date().toISOString().split('T')[0];

            allOrdersList.forEach((ord: any) => {
                if (ord.createdAt) {
                    const ordDateStr = new Date(ord.createdAt).toISOString().split('T')[0];
                    if (ordDateStr === todayStr) {
                        ordersToday++;
                        if (ord.status === 3) {
                            revenueToday += ord.total || 0;
                        }
                    }
                }
            });

            // Sum of status counts or fall back to totalOrders
            const statusSum = pendingOrdersCount + confirmedOrdersCount + shippingOrdersCount + completedOrdersCount + cancelledOrdersCount;
            const divisor = statusSum > 0 ? statusSum : totalOrders || 1;

            const statusDistribution = [
                {
                    status: 0,
                    label: 'Chờ xử lý',
                    count: pendingOrdersCount,
                    color: '#F59E0B',
                    percentage: Math.round((pendingOrdersCount / divisor) * 100),
                },
                {
                    status: 1,
                    label: 'Đã xác nhận',
                    count: confirmedOrdersCount,
                    color: '#3B82F6',
                    percentage: Math.round((confirmedOrdersCount / divisor) * 100),
                },
                {
                    status: 2,
                    label: 'Đang giao hàng',
                    count: shippingOrdersCount,
                    color: '#8B5CF6',
                    percentage: Math.round((shippingOrdersCount / divisor) * 100),
                },
                {
                    status: 3,
                    label: 'Đã hoàn thành',
                    count: completedOrdersCount,
                    color: '#10B981',
                    percentage: Math.round((completedOrdersCount / divisor) * 100),
                },
                {
                    status: 4,
                    label: 'Đã hủy',
                    count: cancelledOrdersCount,
                    color: '#EF4444',
                    percentage: Math.round((cancelledOrdersCount / divisor) * 100),
                },
            ];

            // Chart data grouping by real dates
            const chartData = generateRealAdminChart(period, allOrdersList);

            return {
                totalOrders: totalOrders || statusSum,
                totalRevenue,
                totalUsers,
                totalProducts,
                newMessages,
                ordersToday,
                revenueToday,
                pendingOrdersCount,
                confirmedOrdersCount,
                shippingOrdersCount,
                completedOrdersCount,
                cancelledOrdersCount,
                statusDistribution,
                chartData,
            };
        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
            return {
                totalOrders: 0,
                totalRevenue: 0,
                totalUsers: 0,
                totalProducts: 0,
                newMessages: 0,
                ordersToday: 0,
                revenueToday: 0,
                pendingOrdersCount: 0,
                confirmedOrdersCount: 0,
                shippingOrdersCount: 0,
                completedOrdersCount: 0,
                cancelledOrdersCount: 0,
                statusDistribution: [
                    { status: 0, label: 'Chờ xử lý', count: 0, color: '#F59E0B', percentage: 0 },
                    { status: 1, label: 'Đã xác nhận', count: 0, color: '#3B82F6', percentage: 0 },
                    { status: 2, label: 'Đang giao hàng', count: 0, color: '#8B5CF6', percentage: 0 },
                    { status: 3, label: 'Đã hoàn thành', count: 0, color: '#10B981', percentage: 0 },
                    { status: 4, label: 'Đã hủy', count: 0, color: '#EF4444', percentage: 0 },
                ],
                chartData: generateRealAdminChart(period, []),
            };
        }
    },

    async getRecentOrders(limit: number = 6): Promise<RecentOrder[]> {
        try {
            const res = await api.get(`/Orders?PageNumber=1&PageSize=${limit}`);
            const data = res.data?.data ?? res.data;
            return data?.items || [];
        } catch {
            return [];
        }
    },

    async getTopProducts(limit: number = 6): Promise<TopProduct[]> {
        try {
            const res = await api.get(`/Products?PageNumber=1&PageSize=${limit}&SortBy=SoldOut&SortOrder=desc`);
            const data = res.data?.data ?? res.data;
            const items = data?.items || [];

            return items.map((p: any) => ({
                id: p.id,
                name: p.name,
                image: p.image || '/images/placeholder.png',
                soldOut: p.soldOut ?? p.sold ?? p.unitsSold ?? 0,
                price: p.price,
                stock: p.quantity ?? 0,
            }));
        } catch {
            return [];
        }
    },
};

function generateRealAdminChart(period: string, orders: any[]): { label: string; revenue: number; orders: number }[] {
    const result: { label: string; revenue: number; orders: number }[] = [];
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
                .reduce((sum, ord) => sum + (ord.total || 0), 0);

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
                .reduce((sum, ord) => sum + (ord.total || 0), 0);

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
                .reduce((sum, ord) => sum + (ord.total || 0), 0);

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
                .reduce((sum, ord) => sum + (ord.total || 0), 0);

            result.push({
                label: months[m],
                revenue: monthRevenue,
                orders: monthOrders.length,
            });
        }
    }

    return result;
}
