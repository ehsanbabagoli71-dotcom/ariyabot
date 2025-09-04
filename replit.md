# Overview

This is a modern Persian e-commerce and support web application built with a full-stack TypeScript architecture. The application provides user management, ticketing system, inventory management, and subscription services with role-based access control. All user-facing content is displayed in Persian (Farsi) while maintaining a modern, responsive design using shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

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