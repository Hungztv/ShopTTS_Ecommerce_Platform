# Shop TTS - Báo Cáo Tiến Độ Dự Án

_Cập nhật: 2026-06-02_

## Mục tiêu báo cáo

Tài liệu này mô tả những phần **đang thực sự có trong codebase** sau khi quét toàn bộ repository, tập trung vào chức năng đã được triển khai, các module đang dùng được, các tích hợp ngoài, và các phần còn dang dở.

## Tóm tắt ngắn

- Đây là một hệ thống thương mại điện tử full-stack có 3 vai trò chính: khách hàng, người bán, quản trị viên.
- Backend theo kiến trúc Clean Architecture + CQRS, có nhiều handler/command/query đã được triển khai.
- Frontend Next.js App Router đã có đủ các trang public, account, seller, admin và các context/service để vận hành luồng nghiệp vụ chính.
- Dự án đã build được ở cả hai phía.

## Phạm vi đã có trong code

### 1) Backend - API, nghiệp vụ và tích hợp

#### Xác thực và người dùng

- Đăng ký, đăng nhập, refresh token và lấy thông tin user hiện tại qua [backend/ShopxBase.Api/Controllers/AuthController.cs](backend/ShopxBase.Api/Controllers/AuthController.cs).
- Tích hợp Supabase Auth qua [backend/ShopxBase.Api/Controllers/SupabaseAuthController.cs](backend/ShopxBase.Api/Controllers/SupabaseAuthController.cs) và [backend/ShopxBase.Infrastucture/Services/SupabaseAuthService.cs](backend/ShopxBase.Infrastucture/Services/SupabaseAuthService.cs).
- Sinh JWT qua [backend/ShopxBase.Infrastucture/Services/JwtTokenService.cs](backend/ShopxBase.Infrastucture/Services/JwtTokenService.cs).
- Lấy thông tin user hiện tại từ claims qua [backend/ShopxBase.Infrastucture/Services/CurrentUserService.cs](backend/ShopxBase.Infrastucture/Services/CurrentUserService.cs).

#### Khách hàng mua sắm

- Danh sách sản phẩm, lọc, tìm kiếm, xem chi tiết theo ID/slug qua [backend/ShopxBase.Api/Controllers/ProductsController.cs](backend/ShopxBase.Api/Controllers/ProductsController.cs).
- Giỏ hàng qua [backend/ShopxBase.Api/Controllers/CartController.cs](backend/ShopxBase.Api/Controllers/CartController.cs).
- Đơn hàng qua [backend/ShopxBase.Api/Controllers/OrdersController.cs](backend/ShopxBase.Api/Controllers/OrdersController.cs).
- Wishlist qua [backend/ShopxBase.Api/Controllers/WishlistController.cs](backend/ShopxBase.Api/Controllers/WishlistController.cs).
- So sánh sản phẩm qua [backend/ShopxBase.Api/Controllers/CompareController.cs](backend/ShopxBase.Api/Controllers/CompareController.cs).
- Đánh giá và rating sản phẩm qua [backend/ShopxBase.Api/Controllers/RatingsController.cs](backend/ShopxBase.Api/Controllers/RatingsController.cs).
- Kiểm tra coupon qua [backend/ShopxBase.Api/Controllers/CouponsController.cs](backend/ShopxBase.Api/Controllers/CouponsController.cs).

#### Người bán

- Quản lý sản phẩm của shop qua [backend/ShopxBase.Api/Controllers/ShopProductsController.cs](backend/ShopxBase.Api/Controllers/ShopProductsController.cs).
- Xử lý đơn hàng cho seller qua [backend/ShopxBase.Api/Controllers/SellerOrdersController.cs](backend/ShopxBase.Api/Controllers/SellerOrdersController.cs).
- Quản lý shop qua [backend/ShopxBase.Api/Controllers/ShopsController.cs](backend/ShopxBase.Api/Controllers/ShopsController.cs).

#### Quản trị viên

- Quản lý brand qua [backend/ShopxBase.Api/Controllers/BrandsController.cs](backend/ShopxBase.Api/Controllers/BrandsController.cs).
- Quản lý category qua [backend/ShopxBase.Api/Controllers/CategoriesController.cs](backend/ShopxBase.Api/Controllers/CategoriesController.cs).
- Quản lý slider/banner qua [backend/ShopxBase.Api/Controllers/SlidersController.cs](backend/ShopxBase.Api/Controllers/SlidersController.cs).
- Duyệt đăng ký kinh doanh qua [backend/ShopxBase.Api/Controllers/BusinessRegistrationsController.cs](backend/ShopxBase.Api/Controllers/BusinessRegistrationsController.cs).
- Quản lý user qua [backend/ShopxBase.Api/Controllers/UsersController.cs](backend/ShopxBase.Api/Controllers/UsersController.cs).

#### Tính năng đặc biệt

- Chatbot AI và gợi ý sản phẩm qua [backend/ShopxBase.Api/Controllers/ChatBotController.cs](backend/ShopxBase.Api/Controllers/ChatBotController.cs).
- Thanh toán MoMo qua [backend/ShopxBase.Api/Controllers/MomoPaymentController.cs](backend/ShopxBase.Api/Controllers/MomoPaymentController.cs) và [backend/ShopxBase.Infrastucture/Services/MomoPaymentService.cs](backend/ShopxBase.Infrastucture/Services/MomoPaymentService.cs).
- Upload file qua Supabase Storage bằng [backend/ShopxBase.Api/Controllers/UploadController.cs](backend/ShopxBase.Api/Controllers/UploadController.cs) và [backend/ShopxBase.Infrastucture/Services/SupabaseStorageService.cs](backend/ShopxBase.Infrastucture/Services/SupabaseStorageService.cs).
- Theo dõi hành vi người dùng qua [backend/ShopxBase.Api/Controllers/BehaviorController.cs](backend/ShopxBase.Api/Controllers/BehaviorController.cs) và [backend/ShopxBase.Infrastucture/Services/UserBehaviorService.cs](backend/ShopxBase.Infrastucture/Services/UserBehaviorService.cs).
- Form liên hệ và quản lý message qua [backend/ShopxBase.Api/Controllers/ContactMessagesController.cs](backend/ShopxBase.Api/Controllers/ContactMessagesController.cs).

### 2) Backend - Application layer và CQRS

Phần Application đã có số lượng lớn command/query/validator/mapping, thể hiện nhiều luồng nghiệp vụ đã được tách rõ:

- Auth: register, login, refresh token, get current user.
- Cart: add, remove, update quantity, clear cart, lấy cart summary/count.
- Orders: create, get list, get detail, update status, cancel, seller order queries.
- Products: create/update/delete/get, lấy sản phẩm theo slug/id, lọc danh sách.
- Brands/Categories/Sliders/Coupons: CRUD và validator đầy đủ.
- ShopProducts/Shops: quản lý sản phẩm và thông tin shop.
- Wishlist/Compare: thêm, xóa, clear, query theo user.
- ContactMessages: tạo, đọc, trả lời, đánh dấu trạng thái.
- BusinessRegistrations: tạo và duyệt/khước từ đăng ký kinh doanh.

Các file tiêu biểu nằm dưới [backend/ShopxBase.Application/Features/](backend/ShopxBase.Application/Features/).

### 3) Backend - Infrastructure, dữ liệu và tích hợp

#### Dữ liệu và database

- PostgreSQL qua EF Core 9.
- Migration hiện có trong [backend/ShopxBase.Infrastucture/Migrations/](backend/ShopxBase.Infrastucture/Migrations/).
- DbContext nằm ở [backend/ShopxBase.Infrastucture/Data/DbContext/ShoppingDbContext.cs](backend/ShopxBase.Infrastucture/Data/DbContext/ShoppingDbContext.cs).
- Seed dữ liệu có ở [backend/ShopxBase.Infrastucture/Data/DataSeeder.cs](backend/ShopxBase.Infrastucture/Data/DataSeeder.cs), [backend/ShopxBase.Infrastucture/Data/ShopDataSeeder.cs](backend/ShopxBase.Infrastucture/Data/ShopDataSeeder.cs), [backend/ShopxBase.Infrastucture/Data/SeedData.cs](backend/ShopxBase.Infrastucture/Data/SeedData.cs).

#### Repository và domain

- Có generic repository và các repository riêng cho user, product, order, coupon.
- Domain đã có đủ entity cho product, order, cart, wishlist, compare, rating, shop, coupon, contact message, business registration, slider, user behavior và chat document.

#### Dịch vụ ngoài

- Supabase Auth, Supabase Storage, JWT, email SMTP, Gemini embeddings, vector search, và MoMo payment đều đã được đặt sẵn trong hạ tầng.

### 4) Frontend - Các trang đã có

#### Public pages

- Homepage tại [frontend/app/(public)/page.tsx](frontend/app/(public)/page.tsx) với các khối Flash Sale, Trending, New Arrivals, banner và footer.
- Danh sách sản phẩm tại [frontend/app/(public)/products/page.tsx](frontend/app/(public)/products/page.tsx).
- Chi tiết sản phẩm tại [frontend/app/(public)/products/[slug]/page.tsx](frontend/app/(public)/products/[slug]/page.tsx).
- Trang shop theo slug tại [frontend/app/(public)/shops/[slug]/page.tsx](frontend/app/(public)/shops/[slug]/page.tsx).
- Cart, checkout, compare, deals, contact, order success, và MoMo callback đều đã có page riêng.

#### Auth và account

- Login, register và auth callback đã có tại [frontend/app/(auth)/login/page.tsx](frontend/app/(auth)/login/page.tsx), [frontend/app/(auth)/register/page.tsx](frontend/app/(auth)/register/page.tsx), [frontend/app/auth/callback/page.tsx](frontend/app/auth/callback/page.tsx).
- Khu vực account có dashboard, wishlist, orders, settings, và shop registration.

#### Seller dashboard

- Có layout riêng tại [frontend/app/seller/layout.tsx](frontend/app/seller/layout.tsx).
- Seller có trang quản lý products, orders, shop.

#### Admin dashboard

- Có dashboard tổng quan tại [frontend/app/admin/page.tsx](frontend/app/admin/page.tsx).
- Đầy đủ trang quản trị cho users, orders, products, brands, categories, sliders, coupons, messages, shop requests.

### 5) Frontend - Contexts, components và services

#### Contexts

- AuthContext, CartContext, WishlistContext, CompareContext, NotificationContext đều đã có.
- NotificationContext đã có polling trạng thái đơn hàng và lưu localStorage.

#### UI và layout

- Có header, footer, notification bell, hero banner, category nav, product card, compare bar, wishlist/add-to-cart button, rating components.
- Có các component admin/seller riêng như DataTable, ImageUpload, Sidebar, StatsCard, OrderTimeline, Modal, ReviewDialog.
- Có chatbot widget floating ở [frontend/components/ChatBotWidget.tsx](frontend/components/ChatBotWidget.tsx).

#### Services

- Tầng service frontend đã tách theo nghiệp vụ: auth, cart, wishlist, compare, order, ratings, contact, chatbot, behavior, shop.
- Phần admin/seller cũng có service riêng cho CRUD, upload, orders, users, messages.

### 6) Tích hợp ngoài đang có

- Supabase Auth.
- Supabase Storage.
- Groq API cho chatbot.
- Google Gemini cho embeddings.
- MoMo cho thanh toán.
- Gmail SMTP cho email.
- pgvector cho tìm kiếm vector / RAG.

## Phần đã được xác định là chưa hoàn chỉnh hoặc còn để ngỏ

1. [backend/ShopxBase.Infrastucture/Services/PaymentService.cs](backend/ShopxBase.Infrastucture/Services/PaymentService.cs) còn là service chung với TODO, chưa phải luồng payment hoàn chỉnh.
2. Hệ thống notification hiện chủ yếu nằm ở frontend polling, chưa thấy controller riêng cho push notification.
3. [backend/ShopxBase.Infrastucture/Extensions/ServiceCollectionExtensions.cs](backend/ShopxBase.Infrastucture/Extensions/ServiceCollectionExtensions.cs) còn comment TODO về đăng ký external services.
4. Một số warning backend vẫn còn liên quan đến package vulnerability và package pruning.
5. Frontend còn warning lint, dù build đã pass.

## Trạng thái kiểm tra gần nhất

- Frontend build: pass
- Backend build: pass
- Frontend lint: không còn error blocking, chỉ còn warning

## Cách chạy hiện tại

### Backend

```powershell
cd C:\Users\duong\Shop_TTS_v1\backend
dotnet run --project .\ShopxBase.Api\ShopxBase.Api.csproj
```

### Frontend

```powershell
cd C:\Users\duong\Shop_TTS_v1\frontend
npm install
npm run dev
```

## Kết luận

Dự án không phải chỉ mới có khung, mà đã có khá nhiều module nghiệp vụ thực tế: xác thực, catalog, cart, order, wishlist, compare, rating, seller workflow, admin workflow, upload, chatbot AI, MoMo payment, và tracking hành vi người dùng. Phần còn thiếu chủ yếu nằm ở việc hoàn thiện vài integration chi tiết, dọn warning, và củng cố các luồng chưa đầy đủ.