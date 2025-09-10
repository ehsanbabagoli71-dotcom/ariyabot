# Overview

This is a modern Persian e-commerce and support web application built with a full-stack TypeScript architecture. The application provides user management, ticketing system, inventory management, and subscription services with role-based access control. All user-facing content is displayed in Persian (Farsi) while maintaining a modern, responsive design using shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- پروژه GitHub به محیط Replit منتقل شد و تنظیمات کامل انجام شد
- database schema با جدول userSubscriptions برای ردیابی اشتراک کاربران گسترش یافت
- صفحه مدیریت اشتراک ادمین با طراحی مدرن و قابلیت toggle بازطراحی شد (2025-09-10)
- سیستم کاهش روزانه اشتراک پیاده‌سازی شد با API endpoint مخصوص
- نمایش روزهای باقیمانده در پنل کاربری profile اضافه شد
- اشتراک رایگان 7 روزه برای کاربران جدید فعال شد
- User subscription API endpoints کامل شدند
- storage interface ها برای عملیات user subscription به‌روزرسانی شدند
- تغییرات database با موفقیت اعمال شد
- رابط کاربری صفحه اشتراک‌ها بهینه‌سازی شد - فرم و کارت‌ها کوچک‌تر و فشرده‌تر شدند (2025-09-10)
- مشکل راست‌چین بودن switch ها حل شد با استفاده از الگوی RTL مناسب
- اشتراک ۷ روزه رایگان پیش‌فرض اضافه شد با قابلیت غیرقابل حذف و غیرفعال‌سازی
- طراحی کارت‌های اشتراک از 2 ستون به 3 ستون تغییر کرد برای استفاده بهتر از فضا
- **اشتراک خودکار ۷ روزه برای کاربران ایجاد شده توسط مدیر پیاده‌سازی شد (2025-09-10)**
  - وقتی مدیر از بخش مدیریت کاربران کاربر جدید ایجاد می‌کند، خودکار اشتراک ۷ روزه رایگان فعال می‌شود
  - اشتراک شامل وضعیت فعال، ۷ روز باقیمانده، و flag دوره آزمایشی است
  - نمایش کامل اطلاعات اشتراک در پنل کاربری profile موجود است
- **اضافه شدن ستون‌های نوع اشتراک و روزهای باقیمانده به لیست مدیریت کاربران (2025-09-10)**
  - API endpoint /api/users بهبود یافت تا اطلاعات اشتراک کاربران را شامل شود
  - دو ستون جدید: "نوع اشتراک" و "روزهای باقیمانده" به جدول کاربران اضافه شد
  - نمایش نشان آزمایشی برای اشتراک‌های trial period
  - رنگ‌بندی هشدار برای کاربران با روزهای کم باقیمانده (قرمز ≤۳ روز، نارنجی ≤۷ روز)
  - Type safety کامل با UserWithSubscription interface در frontend

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with Persian font support (Vazirmatn) and RTL layout
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints with JSON responses
- **File Uploads**: Multer middleware for handling image uploads with validation
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Middleware**: Custom authentication middleware and request logging

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL connection
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: Connect-pg-simple for PostgreSQL session storage
- **File Storage**: Local file system storage for uploaded images

## Authentication and Authorization
- **Authentication Method**: JWT tokens with localStorage persistence
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access Control**: Three user roles (admin, user_level_1, user_level_2)
- **Protected Routes**: Custom route components for role-based access
- **Session Management**: Automatic token validation and renewal

## Database Schema Design
- **Users Table**: Stores user profiles with role-based permissions and OAuth support
- **Tickets Table**: Support ticket system with categories, priorities, and admin responses
- **Products Table**: Inventory management with pricing and quantity tracking
- **Subscriptions Table**: Service offerings categorized by user levels
- **WhatsApp Settings Table**: Integration configuration for messaging services

## Component Architecture
- **Layout System**: Reusable dashboard layout with sidebar navigation
- **Form Components**: Custom Persian input components with RTL support
- **UI Components**: Comprehensive shadcn/ui component library integration
- **Authentication Guards**: Higher-order components for route protection

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack Query
- **Build Tools**: Vite with TypeScript support and plugin ecosystem
- **Routing**: Wouter for lightweight client-side navigation

## UI and Styling
- **Component Library**: Radix UI primitives with shadcn/ui abstractions
- **Styling Framework**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Typography**: Google Fonts integration for Persian font support

## Backend Services
- **Web Framework**: Express.js with TypeScript support
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Processing**: Multer for multipart form data handling
- **Authentication**: JWT and bcrypt for security

## Database and Storage
- **Database Provider**: Neon Database serverless PostgreSQL
- **Connection Pooling**: Built-in Neon serverless connection management
- **Migration Tools**: Drizzle Kit for schema migrations

## Development Tools
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint configuration for consistent code style
- **Development Server**: Vite dev server with HMR support
- **Replit Integration**: Custom Replit plugins for development environment