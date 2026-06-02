import api from "./admin/api";
import type {
  BusinessRegistrationDto,
  ShopDto,
  CreateBusinessRegistrationRequest,
  UpdateShopRequest,
} from "@/types/shop";

// ==================== API RESPONSE (BaseApiController envelope) ====================

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type ApiError = {
  response?: {
    status?: number;
  };
};

// ==================== BUSINESS REGISTRATION ====================

export const shopService = {
  // ---- User / Seller ----

  /** Lấy đăng ký kinh doanh của user hiện tại */
  async getMyRegistration(): Promise<BusinessRegistrationDto | null> {
    try {
      const res = await api.get<ApiResponse<BusinessRegistrationDto>>(
        "/BusinessRegistrations/me"
      );
      return res.data.data;
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.response?.status === 404) return null;
      throw err;
    }
  },

  /** Tạo đăng ký kinh doanh mới */
  async createRegistration(
    data: CreateBusinessRegistrationRequest
  ): Promise<BusinessRegistrationDto> {
    const res = await api.post<ApiResponse<BusinessRegistrationDto>>(
      "/BusinessRegistrations",
      data
    );
    return res.data.data;
  },

  // ---- Admin ----

  /** Admin: lấy danh sách đăng ký, filter by status */
  async getAdminRegistrations(
    status?: string
  ): Promise<BusinessRegistrationDto[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;

    const res = await api.get<ApiResponse<BusinessRegistrationDto[]>>(
      "/BusinessRegistrations",
      { params }
    );
    return res.data.data;
  },

  /** Admin: duyệt đăng ký */
  async approveRegistration(id: number): Promise<BusinessRegistrationDto> {
    const res = await api.patch<ApiResponse<BusinessRegistrationDto>>(
      `/BusinessRegistrations/${id}/approve`
    );
    return res.data.data;
  },

  /** Admin: từ chối đăng ký */
  async rejectRegistration(
    id: number,
    rejectReason: string
  ): Promise<BusinessRegistrationDto> {
    const res = await api.patch<ApiResponse<BusinessRegistrationDto>>(
      `/BusinessRegistrations/${id}/reject`,
      { rejectReason }
    );
    return res.data.data;
  },

  // ---- Shop ----

  /** Lấy shop của user hiện tại */
  async getMyShop(): Promise<ShopDto | null> {
    try {
      const res = await api.get<ApiResponse<ShopDto>>("/Shops/me");
      return res.data.data;
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.response?.status === 404) return null;
      throw err;
    }
  },

  /** Cập nhật thông tin shop */
  async updateShop(data: UpdateShopRequest): Promise<ShopDto> {
    const res = await api.patch<ApiResponse<ShopDto>>(
      `/Shops/${data.id}`,
      data
    );
    return res.data.data;
  },
};
