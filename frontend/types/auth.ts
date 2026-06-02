// types/auth.ts
// User từ Supabase
export interface User {
    id: string;
    email: string;
    phone?: string;
    emailConfirmed?: boolean;
    lastSignInAt?: string;
    createdAt?: string;
    roles?: string[];
    metadata?: {
        full_name?: string;
        phone?: string;
        [key: string]: unknown;
    };
}
// Request đăng ký - ĐÚNG VỚI BACKEND
export interface SignUpRequest {
    email: string;
    password: string;
    fullName?: string;  // Backend gọi là fullName, KHÔNG phải userName
    phone?: string;
}
// Request đăng nhập - ĐÚNG VỚI BACKEND
export interface SignInRequest {
    email: string;      // Backend chỉ hỗ trợ email, KHÔNG có EmailOrUserName
    password: string;
}
// Response từ Backend
export interface AuthResponse {
    success: boolean;
    message?: string;
    accessToken?: string;
    appAccessToken?: string;
    supabaseAccessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
    appRoles?: string[];
    user?: User;
    error?: string;
}