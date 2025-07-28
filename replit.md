# Cloud-Based Invoicing Application for SMEs

## Overview

This is a modern, responsive web application designed for small and medium enterprises (SMEs) to manage their invoicing needs. The application provides a complete solution for creating, managing, and tracking invoices, along with client management and business insights through a comprehensive dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with custom design system using CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Firebase Authentication with custom middleware
- **Session Management**: Firebase UID-based authentication headers

### Data Storage
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle migrations in `/migrations` directory
- **Database Connection**: Connection pooling with `@neondatabase/serverless`

## Key Components

### Authentication System
- Firebase Authentication for user management
- Custom middleware for protecting API routes
- User registration with business profile creation
- JWT-like authentication using Firebase UID headers

### Database Schema
- **Users**: Business profiles with Firebase UID mapping
- **Clients**: Customer information management
- **Invoices**: Invoice records with status tracking
- **Invoice Items**: Line items for detailed invoicing

### UI Component System
- Comprehensive component library based on Radix UI
- Consistent design tokens using CSS custom properties
- Dark/light mode support
- Responsive design patterns

### API Layer
- RESTful API with Express.js
- Type-safe request/response handling
- Centralized error handling
- Authentication middleware for protected routes

## Data Flow

1. **Authentication Flow**:
   - User signs in through Firebase Auth
   - Frontend receives Firebase user object
   - Firebase UID sent in headers to backend
   - Backend validates and retrieves user profile

2. **Data Operations**:
   - Frontend makes API requests with authentication headers
   - Backend validates authentication and processes requests
   - Drizzle ORM handles database operations
   - TanStack Query manages caching and synchronization

3. **State Management**:
   - Server state managed by TanStack Query
   - Local component state with React hooks
   - Form state handled by React Hook Form

## External Dependencies

### Authentication
- Firebase Authentication for user management
- Firebase project configuration via environment variables

### Database
- Neon PostgreSQL serverless database
- Database URL configuration required

### UI Libraries
- Radix UI for accessible component primitives
- Lucide React for icons
- Tailwind CSS for styling

### Development Tools
- Vite for development server and builds
- ESBuild for server-side bundling
- TypeScript for type safety

## Deployment Strategy

### Development
- Vite dev server for frontend development
- tsx for running TypeScript server code
- Hot module replacement for fast development cycles

### Production Build
- Vite builds optimized client bundle to `dist/public`
- ESBuild compiles server code to `dist/index.js`
- Static file serving from Express in production

### Environment Configuration
- Firebase configuration via environment variables
- Database URL from Neon PostgreSQL
- Separate development and production configurations

### Architecture Decisions

1. **Monorepo Structure**: Single repository with shared types between frontend and backend for better type safety and code reuse.

2. **Firebase Authentication**: Chosen for its robust authentication features and easy integration, avoiding the complexity of implementing custom auth.

3. **Drizzle ORM**: Selected for its type-safety, performance, and excellent TypeScript integration compared to traditional ORMs.

4. **TanStack Query**: Provides excellent caching, synchronization, and loading states for server data management.

5. **Radix UI + shadcn/ui**: Ensures accessibility while providing a modern, customizable component system.

6. **Express.js**: Simple and flexible for the API layer with good middleware ecosystem support.