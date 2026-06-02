'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/services/admin/api';

// ==================== TYPES ====================

export type NotificationType = 'order_placed' | 'order_confirmed' | 'order_shipping' | 'order_delivered' | 'order_cancelled' | 'info';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    orderId?: number;
    orderCode?: string;
    link?: string;
}

type OrderSummary = {
    id: number;
    orderCode: string;
    status: number;
};

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

// ==================== STATUS MAP ====================

const ORDER_STATUS_MAP: Record<number, { type: NotificationType; title: string; getMessage: (code: string) => string }> = {
    1: {
        type: 'order_confirmed',
        title: '✅ Đơn hàng đã xác nhận',
        getMessage: (code) => `Đơn hàng ${code} đã được xác nhận và đang chuẩn bị.`,
    },
    2: {
        type: 'order_shipping',
        title: '🚚 Đang giao hàng',
        getMessage: (code) => `Đơn hàng ${code} đang được vận chuyển đến bạn.`,
    },
    3: {
        type: 'order_delivered',
        title: '🎉 Giao hàng thành công',
        getMessage: (code) => `Đơn hàng ${code} đã được giao thành công! Cảm ơn bạn đã mua hàng.`,
    },
    4: {
        type: 'order_cancelled',
        title: '❌ Đơn hàng đã hủy',
        getMessage: (code) => `Đơn hàng ${code} đã bị hủy.`,
    },
};

// ==================== HELPERS ====================

const STORAGE_KEY = 'shopx_notifications';
const ORDER_STATUS_CACHE_KEY = 'shopx_order_status_cache';
const POLL_INTERVAL = 30000; // 30 seconds

function generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadFromStorage(): AppNotification[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveToStorage(notifications: AppNotification[]) {
    if (typeof window === 'undefined') return;
    // Keep max 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function loadStatusCache(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(ORDER_STATUS_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveStatusCache(cache: Record<string, number>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ORDER_STATUS_CACHE_KEY, JSON.stringify(cache));
}

// ==================== CONTEXT ====================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { isAuthenticated } = useAuth();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    // Load from localStorage on mount
    useEffect(() => {
        setNotifications(loadFromStorage());
    }, []);

    // Save to localStorage whenever notifications change
    useEffect(() => {
        if (notifications.length > 0) {
            saveToStorage(notifications);
        }
    }, [notifications]);

    // Add notification
    const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
        const newNotif: AppNotification = {
            ...notif,
            id: generateId(),
            read: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => {
            const updated = [newNotif, ...prev];
            saveToStorage(updated);
            return updated;
        });
    }, []);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) => {
            const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
            saveToStorage(updated);
            return updated;
        });
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, read: true }));
            saveToStorage(updated);
            return updated;
        });
    }, []);

    // Clear all
    const clearAll = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Poll for order status changes
    const checkOrderStatusChanges = useCallback(async () => {
        if (isPollingRef.current || !isAuthenticated) return;
        isPollingRef.current = true;

        try {
            const res = await api.get<{ data?: { items?: OrderSummary[] }; items?: OrderSummary[] }>('/Orders?pageSize=20&sortBy=createdAt&sortDesc=true');
            const orders: OrderSummary[] = res.data?.data?.items || res.data?.items || [];

            if (!orders.length) return;

            const statusCache = loadStatusCache();
            const newCache: Record<string, number> = {};
            const currentNotifications = loadFromStorage();

            for (const order of orders) {
                const orderCode = order.orderCode as string;
                const status = order.status as number;
                newCache[orderCode] = status;

                const previousStatus = statusCache[orderCode];

                // Only notify if status changed and we have a previous status (not first load)
                if (previousStatus !== undefined && previousStatus !== status) {
                    const statusInfo = ORDER_STATUS_MAP[status];
                    if (statusInfo) {
                        // Avoid duplicate notifications
                        const alreadyNotified = currentNotifications.some(
                            (n) => n.orderCode === orderCode && n.type === statusInfo.type
                        );
                        if (!alreadyNotified) {
                            addNotification({
                                type: statusInfo.type,
                                title: statusInfo.title,
                                message: statusInfo.getMessage(orderCode),
                                orderId: order.id,
                                orderCode,
                                link: '/account/orders',
                            });
                        }
                    }
                }
            }

            saveStatusCache(newCache);
        } catch (err) {
            // Silently fail polling
            console.debug('Notification polling error:', err);
        } finally {
            isPollingRef.current = false;
        }
    }, [isAuthenticated, addNotification]);

    // Start/stop polling based on auth
    useEffect(() => {
        if (!isAuthenticated) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        // Initial check after a short delay
        const initialTimeout = setTimeout(() => {
            checkOrderStatusChanges();
        }, 3000);

        // Start polling
        pollRef.current = setInterval(checkOrderStatusChanges, POLL_INTERVAL);

        return () => {
            clearTimeout(initialTimeout);
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [isAuthenticated, checkOrderStatusChanges]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
}
