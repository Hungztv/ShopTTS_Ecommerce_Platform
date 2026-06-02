'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    FolderTree,
    Building2,
    ShoppingCart,
    Ticket,
    Image,
    MessageSquare,
    Users,
    ChevronLeft,
    Menu,
    LogOut,
    Settings,
    Bell,
    Moon,
    Sun,
    Store,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Sản phẩm', href: '/admin/products', icon: Package },
    { name: 'Danh mục', href: '/admin/categories', icon: FolderTree },
    { name: 'Thương hiệu', href: '/admin/brands', icon: Building2 },
    { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Mã giảm giá', href: '/admin/coupons', icon: Ticket },
    { name: 'Sliders', href: '/admin/sliders', icon: Image },
    { name: 'Tin nhắn', href: '/admin/messages', icon: MessageSquare },
    { name: 'Yêu cầu mở shop', href: '/admin/shop-requests', icon: Store },
    { name: 'Người dùng', href: '/admin/users', icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check dark mode
        const timer = window.setTimeout(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    return (
        <aside
            className={`fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
                {!collapsed && (
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">S</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                            Admin
                        </span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/admin' && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                } ${collapsed ? 'justify-center' : ''}`}
                            title={collapsed ? item.name : ''}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2 ${collapsed ? 'justify-center' : ''
                        }`}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!collapsed && <span>{isDark ? 'Sáng' : 'Tối'}</span>}
                </button>

                {/* User Info */}
                {!collapsed && user && (
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {user.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.metadata?.full_name || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={signOut}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''
                        }`}
                >
                    <LogOut className="w-5 h-5" />
                    {!collapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </aside>
    );
}
