// ==================== ENUMS ====================

export enum RegistrationStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
}

export enum ShopStatus {
  Inactive = "Inactive",
  Active = "Active",
  Suspended = "Suspended",
}

// ==================== DTOs ====================

/** Khớp với BusinessRegistrationDto (BE) */
export interface BusinessRegistrationDto {
  id: number;
  userId: string;
  companyName: string;
  taxCode: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  status: string; // "Pending" | "Approved" | "Rejected"
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

/** Khớp với ShopDto (BE) */
export interface ShopDto {
  id: number;
  ownerUserId: string;
  businessRegistrationId: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: string; // "Inactive" | "Active" | "Suspended"
  rating?: number;
  totalRatings?: number;
  createdAt: string;
  updatedAt: string | null;
}

// ==================== REQUEST PAYLOADS ====================

/** Khớp với CreateBusinessRegistrationCommand (BE) */
export interface CreateBusinessRegistrationRequest {
  companyName: string;
  taxCode: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
}

/** Khớp với ReviewBusinessRegistrationDto (BE) */
export interface ReviewRegistrationRequest {
  rejectReason?: string;
}

/** Khớp với UpdateShopCommand (BE) */
export interface UpdateShopRequest {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
}
