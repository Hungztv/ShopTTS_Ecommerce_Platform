'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Send, CheckCircle2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { shopRatingsService, ShopRating, ShopRatingStats } from '@/lib/services/shop-service';

interface ShopRatingsProps {
    shopId: number;
    shopName?: string;
}

export default function ShopRatings({ shopId, shopName }: ShopRatingsProps) {
    const { user } = useAuth();
    const [ratings, setRatings] = useState<ShopRating[]>([]);
    const [stats, setStats] = useState<ShopRatingStats>({
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Form state
    const [star, setStar] = useState(5);
    const [hoverStar, setHoverStar] = useState(0);
    const [comment, setComment] = useState('');

    const loadRatings = useCallback(async () => {
        setLoading(true);
        const data = await shopRatingsService.getRatings(shopId, page, 5);
        setRatings(data.items);
        setStats(data.stats);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
    }, [shopId, page]);

    useEffect(() => {
        loadRatings();
    }, [loadRatings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setErrorMessage('Bạn cần đăng nhập để gửi đánh giá Cửa hàng');
            return;
        }

        if (comment.trim().length < 4) {
            setErrorMessage('Nội dung nhận xét tối thiểu 4 ký tự');
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            await shopRatingsService.createRating(shopId, { star, comment });
            setSuccessMessage('Đánh giá của bạn đã được gửi thành công!');
            setComment('');
            setStar(5);
            loadRatings();
        } catch (err: unknown) {
            const apiError = err as {
                response?: {
                    data?: {
                        message?: string;
                        error?: string;
                        errors?: string[];
                    } | string;
                };
                message?: string;
            };

            let msg = 'Đã xảy ra lỗi khi gửi đánh giá';
            if (apiError.response?.data) {
                if (typeof apiError.response.data === 'string') {
                    msg = apiError.response.data;
                } else if (apiError.response.data.message) {
                    msg = apiError.response.data.message;
                } else if (apiError.response.data.errors?.[0]) {
                    msg = apiError.response.data.errors[0];
                }
            } else if (apiError.message) {
                msg = apiError.message;
            }

            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const getStarPercentage = (count: number) => {
        if (!stats.totalRatings || stats.totalRatings === 0) return 0;
        return Math.round((count / stats.totalRatings) * 100);
    };

    return (
        <div className="space-y-8">
            {/* Thống kê đánh giá Shop */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span>Đánh giá Cửa hàng {shopName ? `"${shopName}"` : ''}</span>
                </h3>

                <div className="grid md:grid-cols-12 gap-8 items-center">
                    {/* Điểm tổng quan */}
                    <div className="md:col-span-4 text-center md:border-r border-slate-200 dark:border-slate-700 md:pr-8">
                        <div className="text-5xl font-black text-slate-800 dark:text-white mb-2">
                            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    className={`w-5 h-5 ${i <= Math.round(stats.averageRating)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-200 dark:text-slate-700'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Dựa trên {stats.totalRatings} lượt đánh giá từ khách hàng
                        </p>
                    </div>

                    {/* Phân bố 1-5 sao */}
                    <div className="md:col-span-8 space-y-2.5">
                        {[
                            { stars: 5, count: stats.fiveStarCount },
                            { stars: 4, count: stats.fourStarCount },
                            { stars: 3, count: stats.threeStarCount },
                            { stars: 2, count: stats.twoStarCount },
                            { stars: 1, count: stats.oneStarCount },
                        ].map((item) => {
                            const percent = getStarPercentage(item.count);
                            return (
                                <div key={item.stars} className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1 w-14 font-medium text-slate-600 dark:text-slate-300">
                                        <span>{item.stars}</span>
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    </div>
                                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-xs text-slate-400 font-mono">
                                        {item.count} ({percent}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Form viết đánh giá */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-600" />
                    <span>Gửi đánh giá của bạn cho Cửa hàng</span>
                </h4>

                {!user ? (
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50 rounded-2xl text-center text-sm text-violet-700 dark:text-violet-300">
                        Vui lòng đăng nhập để gửi đánh giá và nhận xét về Shop.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Chọn sao */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Chọn số sao đánh giá:
                            </label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                        type="button"
                                        key={num}
                                        onClick={() => setStar(num)}
                                        onMouseEnter={() => setHoverStar(num)}
                                        onMouseLeave={() => setHoverStar(0)}
                                        className="p-1 hover:scale-110 transition-transform"
                                    >
                                        <Star
                                            className={`w-8 h-8 cursor-pointer transition-colors ${num <= (hoverStar || star)
                                                ? 'text-amber-400 fill-amber-400'
                                                : 'text-slate-200 dark:text-slate-700'
                                                }`}
                                        />
                                    </button>
                                ))}
                                <span className="ml-2 font-bold text-amber-500 text-sm">
                                    {hoverStar || star} trên 5 sao
                                </span>
                            </div>
                        </div>

                        {/* Ô nhập bình luận */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Nhận xét chi tiết:
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Hãy chia sẻ trải nghiệm của bạn về thái độ phục vụ, chất lượng đóng gói hoặc thời gian giao hàng của Shop..."
                                rows={3}
                                required
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm"
                            />
                        </div>

                        {/* Thông báo */}
                        {successMessage && (
                            <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </div>
                        )}
                        {errorMessage && (
                            <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-xl text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md shadow-violet-200 dark:shadow-none"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Gửi đánh giá
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Danh sách nhận xét */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    Nhận xét từ khách hàng ({stats.totalRatings})
                </h4>

                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                        ))}
                    </div>
                ) : ratings.length > 0 ? (
                    <div className="space-y-4">
                        {ratings.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-violet-600 dark:text-white font-bold flex-shrink-0">
                                            {item.userAvatar ? (
                                                <img src={item.userAvatar} alt={item.userName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-slate-800 dark:text-white text-sm">
                                                {item.userName}
                                            </h5>
                                            <p className="text-xs text-slate-400">
                                                {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Số sao */}
                                    <div className="flex items-center gap-0.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-full">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`w-3.5 h-3.5 ${s <= item.star ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    {item.comment}
                                </p>
                            </div>
                        ))}

                        {/* Phân trang */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 px-3">
                                    Trang {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <div className="text-4xl mb-2">⭐</div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Chưa có nhận xét nào cho Cửa hàng này. Hãy là người đầu tiên đánh giá!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
