'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SellerSidebar from '@/components/seller/SellerSidebar';

export default function SellerLayout({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading, refreshUserRoles } = useAuth();
    const router = useRouter();
    const hasRefreshedRoles = useRef(false);
    const [isRefreshingRoles, setIsRefreshingRoles] = useState(false);

    const isSeller = user?.roles?.some(
        (role) => role.toLowerCase() === 'seller' || role.toLowerCase() === 'admin'
    ) ?? false;

    useEffect(() => {
        // Đang loading hoặc đang refresh roles → chờ
        if (isLoading || isRefreshingRoles) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Chưa có role Seller → thử refresh 1 lần từ DB
        if (!isSeller && !hasRefreshedRoles.current) {
            hasRefreshedRoles.current = true;
            const timer = window.setTimeout(() => setIsRefreshingRoles(true), 0);
            refreshUserRoles().finally(() => {
                window.clearTimeout(timer);
                setIsRefreshingRoles(false);
            });
            return;
        }

        // Sau khi refresh mà vẫn không có Seller → redirect
        if (!isSeller) {
            router.push('/account');
        }
    }, [isLoading, isAuthenticated, isSeller, router, refreshUserRoles, isRefreshingRoles]);

    if (isLoading || isRefreshingRoles) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !isSeller) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <SellerSidebar />
            <main className="lg:ml-64 transition-all duration-300 relative z-10">
                {children}
            </main>
        </div>
    );
}
