# Shop TTS - E-Commerce Graduation Project

Full-stack e-commerce system built for a graduation thesis. The backend follows Clean Architecture + CQRS, and the frontend uses Next.js App Router.

## Overview

This project is a complete online shopping platform with three main roles:

- Customer: browse products, search, cart, checkout
- Seller: manage products, view orders, manage shop
- Admin: manage users, categories, brands, sliders, approvals

The system is designed for scalability, clear separation of concerns, and easy maintenance.

## Key Features

### Customer

- Product listing, filtering, and search
- Product detail page with ratings
- Cart and checkout flow
- Wishlist and compare list

### Seller

- Manage shop profile
- Add/update products
- View and process orders

### Admin

- Manage categories, brands, sliders, coupons
- Review business registration
- User management and order monitoring

### System

- JWT authentication (Supabase-based)
- Role-based authorization
- Background data seeding (roles, sample data)

## Architecture

Backend follows Clean Architecture:

- Domain: entities, enums, exceptions, interfaces
- Application: DTOs, CQRS commands/queries, handlers, validators
- Infrastructure: EF Core, repositories, integrations
- API: controllers, middleware, DI setup

## Tech Stack

- Backend: ASP.NET Core 10, EF Core 9, MediatR
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Database: PostgreSQL (Supabase)

## Project Structure

```
Shop_TTS_v1/
├── backend/
│   ├── ShopxBase.Api/
│   ├── ShopxBase.Application/
│   ├── ShopxBase.Domain/
│   ├── ShopxBase.Infrastucture/
│   ├── Database/
│   ├── ShopxBase.slnx
│   ├── global.json
│   └── .env
├── frontend/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── public/
│   └── .env
└── README.md
```

## Environment Configuration

### Backend (.env)

Create backend/.env from backend/.env.example and fill the values:

- SUPABASE_HOST
- SUPABASE_PORT
- SUPABASE_USER
- SUPABASE_DATABASE
- SUPABASE_PASSWORD
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_JWT_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- JWT_ISSUER
- JWT_AUDIENCE
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_MAIL
- EMAIL_PASSWORD
- EMAIL_DISPLAY_NAME
- MOMO_PARTNER_CODE
- MOMO_ACCESS_KEY
- MOMO_SECRET_KEY

### Frontend (.env)

Create frontend/.env with:

```
NEXT_PUBLIC_API_URL=http://localhost:5266/api
```

## Run Locally

### Backend

```bash
dotnet restore backend/ShopxBase.slnx
dotnet run --project backend/ShopxBase.Api/ShopxBase.Api.csproj
```

Backend endpoints:

- API base: http://localhost:5266
- Swagger: http://localhost:5266/swagger
- Health: http://localhost:5266/health

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev URL: http://localhost:3000

## Build

```bash
dotnet build backend/ShopxBase.slnx
cd frontend
npm run build
```

## Common Issues

- Supabase paused: resume the project in Supabase dashboard
- Port conflict: stop the process using port 3000/5266 and restart
- CORS error: ensure backend allows the frontend origin
- Next dev cache error: delete frontend/.next and restart dev server

## Notes for Thesis

- The architecture is structured to separate business logic from infrastructure and UI
- CQRS simplifies feature maintenance and testing
- The project can be demonstrated with Swagger and the frontend UI
