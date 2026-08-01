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

const POLL_INTERVAL = 30000; // 30 seconds

function generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getStorageKey(userKey?: string): string {
    return userKey ? `shopx_notifications_${userKey}` : 'shopx_notifications_guest';
}

function getCacheKey(userKey?: string): string {
    return userKey ? `shopx_order_cache_${userKey}` : 'shopx_order_cache_guest';
}

function loadFromStorage(userKey?: string): AppNotification[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(getStorageKey(userKey));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveToStorage(notifications: AppNotification[], userKey?: string) {
    if (typeof window === 'undefined') return;
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(getStorageKey(userKey), JSON.stringify(trimmed));
}

function loadStatusCache(userKey?: string): Record<string, number> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(getCacheKey(userKey));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveStatusCache(cache: Record<string, number>, userKey?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getCacheKey(userKey), JSON.stringify(cache));
}

// ==================== CONTEXT ====================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const { user, isAuthenticated } = useAuth();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    const userKey = user?.id || user?.email || undefined;

    // Load user-specific notifications on mount or when user changes
    useEffect(() => {
        setNotifications(loadFromStorage(userKey));
    }, [userKey]);

    // Save to user-specific localStorage whenever notifications change
    useEffect(() => {
        if (notifications.length > 0) {
            saveToStorage(notifications, userKey);
        }
    }, [notifications, userKey]);

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
            saveToStorage(updated, userKey);
            return updated;
        });
    }, [userKey]);

    // Mark as read
    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) => {
            const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
            saveToStorage(updated, userKey);
            return updated;
        });
    }, [userKey]);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, read: true }));
            saveToStorage(updated, userKey);
            return updated;
        });
    }, [userKey]);

    // Clear all
    const clearAll = useCallback(() => {
        setNotifications([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(getStorageKey(userKey));
        }
    }, [userKey]);

    // Poll for order status changes
    const checkOrderStatusChanges = useCallback(async () => {
        if (isPollingRef.current || !isAuthenticated) return;
        isPollingRef.current = true;

        try {
            const res = await api.get<{ data?: { items?: OrderSummary[] }; items?: OrderSummary[] }>('/Orders?pageSize=20&sortBy=createdAt&sortDesc=true');
            const orders: OrderSummary[] = res.data?.data?.items || res.data?.items || [];

            if (!orders.length) return;

            const statusCache = loadStatusCache(userKey);
            const newCache: Record<string, number> = {};
            const currentNotifications = loadFromStorage(userKey);

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

            saveStatusCache(newCache, userKey);
        } catch (err) {
            console.debug('Notification polling error:', err);
        } finally {
            isPollingRef.current = false;
        }
    }, [isAuthenticated, addNotification, userKey]);

    // Start/stop polling based on auth
    useEffect(() => {
        if (!isAuthenticated) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        const initialTimeout = setTimeout(() => {
            checkOrderStatusChanges();
        }, 3000);

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
