'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Sparkles, TrendingUp, Clock, Compass } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { SectionHeader } from './SectionHeader';
import { Product } from '@/lib/services/public-api';
import { mapProduct, mapRecommendedProduct } from '@/lib/utils/product-mapper';
import { getHomeFeed, RecommendedProduct, PersonalizedHomeFeed } from '@/lib/services/behavior-service';

interface DynamicHomeSectionsProps {
  initialFlashDeals: Product[];
  initialTrending: Product[];
  initialNewArrivals: Product[];
}

export default function DynamicHomeSections({
  initialFlashDeals,
  initialTrending,
  initialNewArrivals,
}: DynamicHomeSectionsProps) {
  const [flashDeals, setFlashDeals] = useState<any[]>(initialFlashDeals);
  const [trending, setTrending] = useState<any[]>(initialTrending);
  const [newArrivals, setNewArrivals] = useState<any[]>(initialNewArrivals);
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecommendedProduct[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [hasPersonalizedData, setHasPersonalizedData] = useState(false);
  const [loadedPersonalized, setLoadedPersonalized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadFeed = async () => {
      try {
        const feed: PersonalizedHomeFeed | null = await getHomeFeed(10);
        if (!isMounted || !feed) return;

        if (feed.recommendedForYou && feed.recommendedForYou.length > 0) {
          setRecommended(feed.recommendedForYou);
        }

        if (feed.hasPersonalizedData) {
          setHasPersonalizedData(true);
          if (feed.preferredCategories && feed.preferredCategories.length > 0) {
            setPreferredCategories(feed.preferredCategories);
          }
          if (feed.flashSale && feed.flashSale.length > 0) {
            setFlashDeals(feed.flashSale);
          }
          if (feed.newArrivals && feed.newArrivals.length > 0) {
            setNewArrivals(feed.newArrivals);
          }
          if (feed.trending && feed.trending.length > 0) {
            setTrending(feed.trending);
          }
        }

        if (feed.recentlyViewed && feed.recentlyViewed.length > 0) {
          setRecentlyViewed(feed.recentlyViewed);
        }

        setLoadedPersonalized(true);
      } catch (err) {
        console.warn('[DynamicHomeSections] Error loading personalized feed:', err);
      }
    };

    loadFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderCard = (item: any) => {
    if ('highlightBadge' in item || 'averageScore' in item) {
      return <ProductCard key={item.id} {...mapRecommendedProduct(item)} />;
    }
    return <ProductCard key={item.id} {...mapProduct(item)} />;
  };

  return (
    <>
      {/* ══════════════════ 1. GỢI Ý DÀNH CHO BẠN (AI RECOMMENDATION) ══════════════════ */}
      {recommended.length > 0 && (
        <section className="py-8 md:py-10 bg-gradient-to-b from-violet-50/40 to-transparent dark:from-violet-950/10 dark:to-transparent">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-none">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                      Gợi ý dành riêng cho bạn
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                      AI Personalized
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {hasPersonalizedData && preferredCategories.length > 0
                      ? `Được cá nhân hóa theo sở thích: ${preferredCategories.join(', ')}`
                      : 'Tuyển chọn sản phẩm chất lượng cao phù hợp nhất với bạn'}
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="hidden sm:inline-flex items-center text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
              >
                Khám phá thêm →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {recommended.slice(0, 5).map((p) => renderCard(p))}
            </div>

            <div className="mt-4 sm:hidden text-center">
              <Link href="/products" className="text-violet-600 font-medium text-sm">
                Khám phá thêm →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4"><hr className="border-slate-200 dark:border-slate-700" /></div>

      {/* ══════════════════ 2. FLASH SALE ══════════════════ */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={Zap}
            iconColor="bg-gradient-to-br from-rose-500 to-orange-500"
            title="Flash Sale"
            subtitle={
              hasPersonalizedData
                ? 'Ưu đãi sốc được ưu tiên theo sở thích của bạn'
                : 'Giá tốt - Số lượng có hạn'
            }
            href="/products?sortBy=price&sortOrder=asc"
          />
          {flashDeals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {flashDeals.slice(0, 5).map((product) => renderCard(product))}
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

      {/* ══════════════════ 3. HÀNG MỚI VỀ ══════════════════ */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={Sparkles}
            iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Hàng mới về"
            subtitle={
              hasPersonalizedData
                ? 'Sản phẩm mới nhất phù hợp với nhu cầu bạn quan tâm'
                : 'Cập nhật mới nhất mỗi ngày'
            }
            href="/products?sortBy=createdAt&sortOrder=desc"
          />
          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {newArrivals.slice(0, 5).map((product) => renderCard(product))}
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

      {/* ══════════════════ 4. XU HƯỚNG HÔM NAY ══════════════════ */}
      <section className="py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={TrendingUp}
            iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
            title="Xu hướng hôm nay"
            subtitle={
              hasPersonalizedData
                ? 'Sản phẩm thịnh hành được cộng đồng quan tâm nhất theo gu của bạn'
                : 'Sản phẩm được quan tâm nhiều nhất'
            }
            href="/products"
          />
          {trending.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {trending.slice(0, 5).map((product) => renderCard(product))}
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

      {/* ══════════════════ 5. ĐÃ XEM GẦN ĐÂY ══════════════════ */}
      {recentlyViewed.length > 0 && (
        <>
          <div className="max-w-7xl mx-auto px-4"><hr className="border-slate-200 dark:border-slate-700" /></div>
          <section className="py-8 md:py-10 bg-slate-100/50 dark:bg-slate-800/30">
            <div className="max-w-7xl mx-auto px-4">
              <SectionHeader
                icon={Clock}
                iconColor="bg-gradient-to-br from-sky-500 to-blue-600"
                title="Sản phẩm đã xem gần đây"
                subtitle="Dễ dàng xem lại các sản phẩm bạn vừa tham khảo"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentlyViewed.slice(0, 5).map((product) => renderCard(product))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
