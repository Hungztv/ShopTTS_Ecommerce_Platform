import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div
            className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12"
            suppressHydrationWarning
        >
            <div
                className="max-w-md w-full text-center space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
                suppressHydrationWarning
            >
                <div className="space-y-2">
                    <p className="text-6xl font-extrabold text-purple-600 dark:text-purple-400">404</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Không tìm thấy trang</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Địa chỉ trang web bạn truy cập không tồn tại hoặc đã được chuyển sang đường dẫn khác.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-colors shadow-sm"
                    >
                        <Home className="w-4 h-4" />
                        <span>Về trang chủ</span>
                    </Link>
                    <Link
                        href="/products"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        <span>Tìm sản phẩm</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
