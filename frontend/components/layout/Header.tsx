"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
  Package,
  LogOut,
  Settings,
  Store,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCompare } from "@/contexts/CompareContext";
import NotificationBell from "@/components/layout/NotificationBell";
import { categoriesService } from "@/lib/services/admin/categories-service";
import type { Category } from "@/lib/services/admin/dashboard-service";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(true);

  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { compareCount } = useCompare();

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setIsCategoriesLoading(true);
        const data = await categoriesService.getAll();
        if (isMounted) {
          setCategories(data.filter((item) => !item.isDeleted));
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        if (isMounted) setIsCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown='user']")) setIsUserMenuOpen(false);
      if (!target.closest("[data-dropdown='category']")) setIsCategoryOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
        ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm"
        : "bg-white dark:bg-slate-900"
        }`}
    >
      {/* Compact Main Header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
              <Image src="/logo.png" alt="ShopTTS Logo" width={36} height={36} className="w-full h-full object-cover" priority />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">ShopTTS</span>
          </Link>

          {/* Search Bar - Compact */}
          <div className="flex-1 max-w-xl hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-4 pl-10 pr-10 rounded-full border border-slate-200 dark:border-slate-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 outline-none transition-all bg-slate-50 dark:bg-slate-800 text-sm"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {searchQuery && (
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-violet-500" />
                </button>
              )}
            </form>
          </div>

          {/* Navigation Links - Inline */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
              Trang chủ
            </Link>
            <div className="relative" data-dropdown="category">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              >
                Danh mục
                <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>
              {isCategoryOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 animate-fade-in-down z-50">
                  {isCategoriesLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Đang tải...</div>
                  ) : categories.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Chưa có danh mục</div>
                  ) : (
                    categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/products?category=${cat.id}`}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all"
                        onClick={() => setIsCategoryOpen(false)}
                      >
                        <span>📦</span>
                        {cat.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            <Link href="/products" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
              Sản phẩm
            </Link>
            <Link href="/deals" className="px-3 py-2 text-sm font-medium text-rose-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
              🔥 Sale
            </Link>
            <Link href="/contact" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
              Liên hệ
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            {/* Dark Mode */}
            <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Toggle dark mode">
              {isDarkMode ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </button>

            {/* Notifications */}
            {isAuthenticated && <NotificationBell />}

            {/* Wishlist */}
            <Link href="/account/wishlist" className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Heart className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ShoppingCart className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-violet-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative" data-dropdown="user">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 animate-fade-in-down z-50">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{user?.metadata?.full_name || 'Xin chào!'}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                      {[
                        { icon: User, label: "Tài khoản", href: "/account" },
                        { icon: Package, label: "Đơn hàng", href: "/account/orders" },
                        { icon: Settings, label: "Cài đặt", href: "/account/settings" },
                      ].map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      {/* Seller Center link - only for Seller/Admin */}
                      {user?.roles?.some(r => r.toLowerCase() === 'seller' || r.toLowerCase() === 'admin') && (
                        <Link
                          href="/seller/analytics"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all font-medium"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Store className="w-4 h-4" />
                          Seller Center
                        </Link>
                      )}
                      {/* Admin Panel link - only for Admin */}
                      {user?.roles?.some(r => r.toLowerCase() === 'admin') && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all font-medium"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all mt-1 border-t border-slate-100 dark:border-slate-700 pt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2 p-1">
                      <Link
                        href="/login"
                        className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Đăng nhập
                      </Link>
                      <Link
                        href="/register"
                        className="block w-full text-center px-4 py-2.5 text-sm font-medium text-violet-600 border border-violet-300 hover:bg-violet-50 rounded-lg transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Đăng ký
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-4 pl-10 pr-10 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-violet-500" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 animate-fade-in-down">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {[
              { label: "🏠 Trang chủ", href: "/" },
              { label: "🛍️ Sản phẩm", href: "/products" },
              { label: "🔥 Khuyến mãi", href: "/deals" },
              { label: "📞 Liên hệ", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-all font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Danh mục</p>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="block px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  📦 {cat.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
