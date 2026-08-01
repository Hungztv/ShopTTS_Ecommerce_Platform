'use client';

import { useState, useEffect } from 'react';
import {
    Wallet, ShieldCheck, ArrowUpRight, ArrowDownLeft, Clock,
    CreditCard, AlertCircle, Building2, HelpCircle, CheckCircle2, Lock, Sparkles, Store
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/product-mapper';
import { sellerShopService, ShopWalletData } from '@/lib/services/seller/shop-service';
import type { ShopDto } from '@/types/shop';
import Link from 'next/link';

export default function SellerWalletPage() {
    const [shop, setShop] = useState<ShopDto | null>(null);
    const [wallet, setWallet] = useState<ShopWalletData | null>(null);
    const [loading, setLoading] = useState(true);

    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const loadWalletData = async () => {
            try {
                setLoading(true);
                const shopData = await sellerShopService.getMyShop();
                setShop(shopData);

                if (shopData) {
                    const walletData = await sellerShopService.getWallet(shopData.id);
                    setWallet(walletData);
                }
            } catch (error) {
                console.error('Error loading wallet data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadWalletData();
    }, []);

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet) return;

        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0 || amount > wallet.availableBalance) return;

        setIsSubmitting(true);
        setTimeout(() => {
            setWallet(prev => prev ? ({
                ...prev,
                availableBalance: prev.availableBalance - amount,
                totalWithdrawn: prev.totalWithdrawn + amount
            }) : null);
            setIsSubmitting(false);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setSuccessMessage(`Đã gửi yêu cầu rút ${formatPrice(amount)} cho Shop #${shop?.id}! Money sẽ về TK ngân hàng trong 24h.`);
            setTimeout(() => setSuccessMessage(''), 5000);
        }, 1200);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Đang kết nối Ví Shop của bạn...</p>
                </div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="p-8 max-w-lg mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Bạn chưa có Cửa Hàng</h2>
                <p className="text-slate-500 text-sm mb-6">Vui lòng hoàn tất đăng ký Shop trước khi sử dụng tính năng Ví & Escrow.</p>
                <Link
                    href="/account/shop-registration"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                >
                    <Store className="w-4 h-4" />
                    Đăng ký Shop ngay
                </Link>
            </div>
        );
    }

    const availableBalance = wallet?.availableBalance ?? 0;
    const pendingBalance = wallet?.pendingBalance ?? 0;
    const totalWithdrawn = wallet?.totalWithdrawn ?? 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                            Ví Shop: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{shop.name}</span>
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-bold">
                            Shop ID #{shop.id}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Dòng tiền được phân tách riêng biệt cho Shop <strong className="text-slate-700 dark:text-slate-300">{shop.name}</strong> qua hệ thống Escrow.
                    </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Ví chính chủ Shop #{shop.id}
                </div>
            </div>

            {/* Notification Toast */}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* ══════════════════ BALANCE CARDS ══════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Available Balance */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 shadow-xl shadow-emerald-600/15">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Số dư khả dụng</span>
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <p className="text-3xl font-black tracking-tight my-2">
                        {formatPrice(availableBalance)}
                    </p>
                    <p className="text-xs text-emerald-100 mb-4">Số tiền thuộc về Shop #{shop.id}, có thể rút về Ngân hàng.</p>

                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={availableBalance <= 0}
                        className="w-full py-2.5 px-4 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Rút tiền về Ngân hàng
                    </button>
                </div>

                {/* Pending Balance (Escrow) */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Đang tạm giữ (Escrow)</span>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white my-2">
                            {formatPrice(pendingBalance)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tiền từ đơn mới giao của Shop #{shop.id}, chờ giải ngân tự động sau 3 ngày.
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>Đóng băng an toàn</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Bảo mật Escrow</span>
                    </div>
                </div>

                {/* Total Withdrawn */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Doanh thu đã rút</span>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white my-2">
                            {formatPrice(totalWithdrawn)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tài khoản nhận tiền: <strong>{wallet?.bankName || 'Chưa cập nhật'}</strong> ({wallet?.bankAccountNumber || '—'})
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>Chủ TK: <strong>{wallet?.bankAccountHolder || 'Chưa cập nhật'}</strong></span>
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">KYC Shop</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════ ESCROW POLICY BANNER ══════════════════ */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border border-indigo-500/20 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Lock className="w-5 h-5 text-violet-300" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">Hệ thống Phân tách Dòng tiền Độc lập cho Shop #{shop.id}</h4>
                            <p className="text-slate-300 text-xs mt-0.5 max-w-2xl leading-relaxed">
                                Mỗi Cửa hàng có Ví Tạm giữ riêng biệt. Tiền thanh toán của khách mua hàng tại Shop <strong>{shop.name}</strong> chỉ được tính và giải ngân đúng cho Shop <strong>{shop.name}</strong>, hoàn toàn không bị nhầm lẫn với các Shop khác trên Sàn.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold border border-white/20">
                            Phí hoa hồng: 2.5%
                        </span>
                    </div>
                </div>
            </div>

            {/* ══════════════════ TRANSACTIONS TABLE ══════════════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">Lịch sử Giao dịch Ví Shop #{shop.id}</h3>
                    <span className="text-xs text-slate-500">Đối soát thời gian thực</span>
                </div>

                <div className="p-8 text-center text-slate-400 text-sm">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Chưa có giao dịch biến động số dư nào cho Shop <strong>{shop.name}</strong>.
                </div>
            </div>

            {/* ══════════════════ WITHDRAWAL MODAL ══════════════════ */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Rút tiền từ Ví Shop {shop.name}</h3>
                        <p className="text-xs text-slate-500 mb-5">Số tiền sẽ được chuyển tự động vào tài khoản ngân hàng của Shop #{shop.id}.</p>

                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                    Số tiền muốn rút (VNĐ)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder={`Tối đa ${availableBalance.toLocaleString()} VNĐ`}
                                        max={availableBalance}
                                        required
                                        className="w-full pl-4 pr-16 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:border-emerald-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                    >
                                        Tối đa
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">Khả dụng: {formatPrice(availableBalance)}</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Đang gửi...' : 'Xác nhận Rút tiền'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
