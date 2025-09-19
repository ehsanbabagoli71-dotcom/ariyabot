# Overview

This is a modern Persian e-commerce and support web application built with a full-stack TypeScript architecture. The application provides user management, ticketing system, inventory management, and subscription services with role-based access control. All user-facing content is displayed in Persian (Farsi) while maintaining a modern, responsive design using shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- **Project successfully imported to Replit environment and fully configured (2025-09-17)**
  - PostgreSQL database created and schema successfully applied with drizzle-kit push
  - Workflow configured for frontend on port 5000 with webview output type
  - Frontend properly configured with allowedHosts: true for Replit proxy compatibility
  - Production deployment configuration set up for autoscale deployment
  - Application fully operational with Express server running on port 5000
  - Vite development server integrated with Express backend for seamless development
  - Admin user automatically created (username: ehsan, password: admin123)
  - All dependencies installed and working correctly
  - Security warnings noted: JWT_SECRET and ADMIN_PASSWORD should be set via environment variables before production deployment
- **حذف منطق ایمیل اجباری برای کاربران سطح 2 کاملاً پیاده‌سازی شد (2025-09-17)**
  - فیلد ایمیل از فرم ایجاد کاربر سطح 2 در frontend حذف شد
  - ستون ایمیل از جدول نمایش زیرکاربران حذف شد
  - schema جدید `insertSubUserSchema` برای کاربران سطح 2 با ایمیل اختیاری ایجاد شد
  - schema پایگاه داده بروزرسانی شد تا ایمیل nullable باشد (حذف .notNull())
  - API routes backend برای sub-users بروزرسانی شد تا از schema جدید استفاده کند
  - WhatsApp service بروزرسانی شد تا دیگر ایمیل موقت تولید نکند برای کاربران واتس‌اپ
  - تمام validation های email در backend برای احتمال undefined بودن email تنظیم شدند
  - Architect review موفقیت‌آمیز با نتیجه PASS انجام شد
- **پیاده‌سازی فیلتر کاربران سطح‌بندی شده و مخفی کردن کاربران سطح 2 از پنل ادمین (2025-09-15)**
  - کاربران سطح 2 دیگر در پنل ادمین قابل مشاهده نیستند
  - کاربران سطح 2 فقط برای کاربر سطح 1 والد خود قابل مشاهده‌اند در صفحه مدیریت زیرکاربران
  - endpoint /api/users اصلاح شد تا از روش getUsersVisibleToUser() برای فیلتر کردن استفاده کند
  - endpoint /api/sub-users قبلاً به درستی پیاده‌سازی شده بود و فقط زیرکاربران مربوط به همان کاربر سطح 1 را نمایش می‌دهد
  - امنیت سیستم حفظ شده و هیچ نشتی در دسترسی کاربران وجود ندارد
  - Frontend از endpoint های مناسب استفاده می‌کند بر اساس نقش کاربر (ادمین یا سطح 1)
  - هوش مصنوعی واتس‌اپ در طول فرآیند ثبت نام کاربران جدید پاسخ نمی‌دهد
- **Project successfully migrated to Replit environment and fully configured (2025-09-15)**
  - PostgreSQL database created and schema successfully applied
  - All dependencies installed and working correctly
  - Development server configured on port 5000 with webview output
  - Frontend properly configured with host allowance for Replit proxy environment
  - Production deployment configuration set up for autoscale deployment
  - Application fully operational with admin login (username: ehsan, password: admin123)
  - All existing features preserved and functional
- **مشکل drag & drop دسته‌بندی‌ها کاملاً حل شد (2025-09-11)**
  - Route conflicts بین dynamic routes و literal endpoints حل شد
  - UUID regex constraints اضافه شد: `:id([0-9a-fA-F-]{36})` 
  - منطق frontend reordering کاملاً بازنویسی شد
  - همه categories متأثر هنگام drag & drop بروزرسانی می‌شوند
  - Order conflicts و duplicate order values حل شدند
  - UI و database حالا کاملاً sync هستند
- **مشکل login ادمین کاملاً حل شد و برنامه عملیاتی است (2025-09-11)**
  - مشکل رمز عبور تصادفی ادمین حل شد و رمز عبور ثابت "admin123" تعریف شد
  - کاربر ادمین با اطلاعات زیر قابل دسترسی است:
    - نام کاربری: ehsan
    - رمز عبور: admin123  
    - ایمیل: ehsan@admin.com
  - تست ورود موفقیت‌آمیز بوده و JWT token صادر می‌شود
  - server بر روی port 5000 با موفقیت در حال اجرا است
- **پروژه GitHub به محیط Replit منتقل شد و تنظیمات کامل انجام شد (2025-09-10)**
  - کلیه dependencies نصب شدند (tsx اضافه شد)
  - PostgreSQL database ایجاد و schema اعمال شد
  - workflow بر روی port 5000 تنظیم شد
  - برنامه آماده استفاده است
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
- **پیاده‌سازی سیستم جامع تیکت‌ها با submenu و conversation threads (2025-09-10)**
  - انتقال بخش "ارسال تیکت" به submenu در sidebar با دو گزینه: "ارسال تیکت جدید" و "تیکت‌ها"
  - ایجاد صفحه "تیکت‌های من" برای نمایش لیست تیکت‌های کاربر
  - پیاده‌سازی conversation threads با حفظ تاریخچه کامل پاسخ‌ها
  - تشخیص صحیح admin/user در نمایش conversation
  - API endpoint /api/my-tickets برای دریافت تیکت‌های کاربر
  - API endpoint /api/tickets/:id/reply برای پاسخ‌دهی با Zod validation
  - حفظ backward compatibility با tickets موجود

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