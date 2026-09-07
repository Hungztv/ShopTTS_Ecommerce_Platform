import Link from 'next/link';
import HeroBanner from "@/components/ui/HeroBanner";
import CategoryNav from "@/components/ui/CategoryNav";
import { ArrowRight } from "lucide-react";
import { productsPublicService } from "@/lib/services/public-api";
import DynamicHomeSections from './components/DynamicHomeSections';

export default async function Home() {
  const [flashRes, trendingRes, newRes] = await Promise.all([
    // Initial Flash Sale: sản phẩm giá tốt
    productsPublicService.getAll({ pageSize: 8, sortBy: 'price', sortOrder: 'asc' }),
    // Initial Xu hướng: trang 2
    productsPublicService.getAll({ pageSize: 8, page: 2 }),
    // Initial Hàng mới về: ngày tạo mới nhất
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

      {/* Dynamic Personalized Home Sections (AI Recommendation, Flash Sale, New Arrivals, Trending, Recently Viewed) */}
      <DynamicHomeSections
        initialFlashDeals={flashDeals}
        initialTrending={trendingProducts}
        initialNewArrivals={newArrivals}
      />

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