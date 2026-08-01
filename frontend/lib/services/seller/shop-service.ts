import api, { ApiResponse } from '../admin/api';
import type { ShopDto, UpdateShopRequest } from '@/types/shop';

export interface ShopWalletData {
  id: number;
  shopId: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
}

export const sellerShopService = {
  /** Lấy shop của seller hiện tại */
  async getMyShop(): Promise<ShopDto | null> {
    try {
      const res = await api.get<ApiResponse<ShopDto>>('/Shops/me');
      return res.data.data;
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) return null;
      throw err;
    }
  },

  /** Lấy ví của shop (tự động theo shop hiện tại hoặc id) */
  async getWallet(shopId?: number): Promise<ShopWalletData | null> {
    try {
      const url = shopId ? `/shops/${shopId}/wallet` : '/shops/me/wallet';
      const res = await api.get<ShopWalletData>(url);
      return res.data;
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) return null;
      throw err;
    }
  },

  /** Cập nhật thông tin shop */
  async updateShop(
    id: number,
    data: Omit<UpdateShopRequest, 'id'>
  ): Promise<ShopDto> {
    const res = await api.patch<ApiResponse<ShopDto>>(`/Shops/${id}`, {
      id,
      ...data,
    });
    return res.data.data;
  },
};
