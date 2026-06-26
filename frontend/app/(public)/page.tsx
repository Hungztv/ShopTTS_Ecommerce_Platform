import Link from 'next/link';
import HeroBanner from "@/components/ui/HeroBanner";
import CategoryNav from "@/components/ui/CategoryNav";
import ProductCard from "@/components/ui/ProductCard";
import { ArrowRight, Sparkles, TrendingUp, Zap } from "lucide-react";
import { productsPublicService } from "@/lib/services/public-api";
import { mapProduct } from "@/lib/utils/product-mapper";
import { SectionHeader } from './components/SectionHeader';

export default async function Home() {
  const [flashRes, trendingRes, newRes] = await Promise.all([
    // Flash Sale: giá thấp nhất
    productsPublicService.getAll({ pageSize: 8, sortBy: 'price', sortOrder: 'asc' }),
    // Xu hướng: trang 2 để đa dạng sản phẩm
    productsPublicService.getAll({ pageSize: 8, page: 2 }),
    // Hàng mới về: sắp xếp theo ngày tạo mới nhất (ngày shop đẩy lên)
    productsPublicService.getAll({ pageSize: 8, sortBy: 'createdAt', sortOrder: 'desc' }),
  ]);

  const flashDeals = flashRes.items || [];
  const trendingProducts = trendingRes.items || [];
  const newArrivals = newRes.items || [];

  return (
    <div className="bg-slate-50 dark:bg-slate-900">
      {/* Hero Banner Slider */}
      <HeroBanner />

      {/* Category Navigation */}
      <CategoryNav />

      {/* Flash Sale */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={Zap}
            iconColor="bg-gradient-to-br from-rose-500 to-orange-500"
            title="Flash Sale"
            subtitle="Giá tốt - Số lượng có hạn"
            href="/products?sortBy=price&sortOrder=asc"
          />
          {flashDeals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {flashDeals.slice(0, 5).map((product) => (
                <ProductCard key={product.id} {...mapProduct(product)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Chưa có sản phẩm nào</p>
          )}
          {/* Mobile "Xem tất cả" */}
          <div className="mt-4 sm:hidden text-center">
            <Link href="/products" className="text-violet-600 font-medium text-sm">
              Xem tất cả sản phẩm →
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4"><hr className="border-slate-200 dark:border-slate-700" /></div>

      {/* Sản phẩm mới */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={Sparkles}
            iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Hàng mới về"
            subtitle="Cập nhật mới nhất mỗi ngày"
            href="/products?sortBy=createdAt&sortOrder=desc"
          />
          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {newArrivals.slice(0, 5).map((product) => (
                <ProductCard key={product.id} {...mapProduct(product)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Chưa có sản phẩm nào</p>
          )}
          <div className="mt-4 sm:hidden text-center">
            <Link href="/products" className="text-violet-600 font-medium text-sm">
              Xem tất cả sản phẩm →
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4"><hr className="border-slate-200 dark:border-slate-700" /></div>

      {/* Xu hướng */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={TrendingUp}
            iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
            title="Xu hướng hôm nay"
            subtitle="Sản phẩm được quan tâm nhiều nhất"
            href="/products"
          />
          {trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {trendingProducts.slice(0, 5).map((product) => (
                <ProductCard key={product.id} {...mapProduct(product)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Chưa có sản phẩm nào</p>
          )}
          <div className="mt-4 sm:hidden text-center">
            <Link href="/products" className="text-violet-600 font-medium text-sm">
              Xem tất cả sản phẩm →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-10 bg-gradient-to-r from-violet-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Khám phá hàng ngàn sản phẩm chính hãng
          </h2>
          <p className="text-violet-200 mb-6 max-w-xl mx-auto">
            Miễn phí vận chuyển cho đơn hàng từ 500.000đ. Đổi trả dễ dàng trong 30 ngày.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-violet-600 rounded-xl font-semibold hover:bg-violet-50 transition-colors shadow-lg"
          >
            Xem tất cả sản phẩm
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}