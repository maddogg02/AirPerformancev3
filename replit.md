# Overview

The AF Performance Tracker is a full-stack web application designed to help Air Force personnel capture their daily achievements and transform them into professional performance statements suitable for evaluations and promotions. The app follows a workflow where users input raw performance data (Action-Impact-Result format), store it in a library, and then use AI-powered tools to generate and refine polished military narrative statements.

The system consists of four main screens: Wins (for capturing AIR entries), Statements (for AI-powered statement generation), Library (for managing saved content), and Account (for user management). The application emphasizes rapid data entry, intelligent categorization using Air Force performance areas, and iterative refinement of statements through AI feedback.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development and building
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent, accessible design
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management with custom hooks for data fetching
- **Form Handling**: React Hook Form with Zod validation for type-safe form processing
- **Navigation**: Client-side routing using Wouter for lightweight routing
- **Mobile-First**: Bottom navigation design optimized for mobile devices with responsive breakpoints

## Backend Architecture
- **Framework**: Express.js server with TypeScript for type safety
- **API Design**: RESTful endpoints organized by resource (wins, statements, refinement sessions)
- **Authentication**: Replit-based OIDC authentication with session management
- **Middleware**: Request logging, error handling, and authentication guards
- **Development**: Hot module replacement with Vite integration for seamless development experience

## Data Storage Solutions
- **Database**: PostgreSQL with connection pooling via Neon Database serverless driver
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Design**: Normalized tables for users, wins (AIR entries), statements, and refinement sessions
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Migrations**: Drizzle Kit for database schema migrations and management

## Authentication and Authorization
- **Provider**: Replit OIDC authentication integrated with Passport.js
- **Session Management**: Server-side sessions stored in PostgreSQL with configurable TTL
- **Authorization**: Route-level protection with authentication middleware
- **User Data**: Profile information stored and managed through the authentication system

## External Dependencies
- **AI Service**: OpenAI GPT-5 API for statement generation, refinement feedback, and content improvement
- **Database**: Neon Database (PostgreSQL) for scalable serverless database hosting
- **Authentication**: Replit authentication service for user management
- **Build Tools**: Vite for frontend bundling, esbuild for server-side compilation
- **Development**: Replit development environment with integrated debugging and deployment

The architecture follows a clean separation of concerns with shared types between frontend and backend, centralized error handling, and optimized build processes for both development and production environments.