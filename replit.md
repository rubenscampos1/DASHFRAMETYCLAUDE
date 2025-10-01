# Overview

This is a modern video project management web application built with a React frontend, Express backend, Drizzle ORM, and PostgreSQL database. The system provides a complete Kanban-style interface for managing video production projects across different stages, from briefing to approval. It includes role-based authentication (Admin, Gestor/Manager, Membro/Member), comprehensive project tracking, metrics visualization, and reporting capabilities. The application supports drag-and-drop project management, automated status logging, specialized views for different user roles, and a fully responsive mobile-first design with custom navigation.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management with optimistic updates
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **Drag & Drop**: react-beautiful-dnd for Kanban board functionality

## Backend Architecture  
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy and express-session
- **Password Security**: Node.js crypto module with scrypt hashing
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints with role-based access control

## Database Layer
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with schema validation
- **Schema Design**: 
  - Users table with role-based permissions (Admin, Gestor, Membro)
  - Projects table with status tracking and relationships
  - Types and Tags for categorization
  - Audit logging for status changes
- **Connection**: Connection pooling with @neondatabase/serverless

## Authentication & Authorization
- **Strategy**: Session-based authentication with secure password hashing
- **Roles**: Three-tier permission system (Admin > Gestor > Membro)
- **Session Management**: PostgreSQL-stored sessions with configurable expiration
- **Security**: CSRF protection, secure cookies in production, role-based route protection

## Key Features
- **Kanban Board**: Drag-and-drop interface for project status management
- **Project Lifecycle**: Nine distinct status stages from Briefing to Aprovado
- **Metrics Dashboard**: Real-time analytics with charts and project statistics  
- **Filtering System**: Multi-criteria filtering by status, assignee, type, priority
- **Reporting**: Exportable reports with date range filtering
- **YouTube Integration**: Link management for approved projects
- **Responsive Design**: Mobile-friendly interface with dark/light theme support
- **Mobile Navigation**: Custom sticky topbar with hamburger menu and slide-out drawer for mobile devices
- **Safe Deletion**: Transactional deletion of projects with automatic cleanup of related comments and logs
- **User Management**: Soft delete for users to preserve historical data integrity

## Data Flow Patterns
- **Optimistic Updates**: Immediate UI updates with server reconciliation
- **Real-time Sync**: Automatic query invalidation and refetching
- **Form Validation**: Client and server-side validation with Zod schemas
- **Error Handling**: Centralized error management with toast notifications
- **Transactional Operations**: Database transactions for atomic multi-table operations (e.g., project deletion)

## Recent Changes (September-October 2025)
- **Simplified Authentication Page**: Removed promotional content and centered login/register forms
  - Removed all marketing icons and feature descriptions
  - Changed from two-column layout to single centered column
  - Cleaner, more focused user experience
  - Fully responsive with proper padding
- **Mobile Navigation System**: Implemented custom mobile navigation with:
  - Sticky topbar with blur effect and hamburger menu button
  - Slide-out drawer menu with smooth transitions and overlay
  - Profile display, theme toggle, and logout functionality
  - Keyboard accessibility (ESC key closes drawer)
  - Only visible on mobile/tablet (<768px), doesn't interfere with desktop sidebar
- **Project Deletion Fix**: Resolved foreign key constraint violation when deleting projects with comments
  - Added transactional deletion in correct order: comments → status logs → project
  - Ensures atomic all-or-nothing deletion to prevent partial state
  - Prevents orphaned data in the database
- **User Deletion Fix**: Resolved foreign key constraint violation when deleting users
  - Checks if user has projects before deletion
  - Uses soft delete (marks user as inactive) to preserve historical data
  - Prevents deletion if user is responsible for projects (clear error message)
  - Maintains data integrity for comments and status logs
- **Enhanced Finalizados Page (October 2025)**: Complete redesign with dual view modes and advanced filtering
  - **Toggle Card/Lista**: Switch between card grid and table views with localStorage persistence
  - **Table View**: Comprehensive list display with columns for Título, Cliente, Responsável, Tipo, Prioridade, Data de Aprovação, and YouTube link
  - **Advanced Filtering System**:
    - Date filters with presets (This Month, Last Month) and custom date range
    - Responsible person filter with unique project owners
    - Combinable filters (date + responsible)
    - Active filter chips with individual removal
    - "Clear all filters" button
  - **Dynamic Counter**: Project count badge updates based on active filters
  - **Smart Empty States**: Different messages for "no projects" vs "no results with filters"
  - **Accessibility**: Added DialogDescription to eliminate aria warnings
- **Metrics Page Transformation (October 2025)**: Complete redesign with executive-style horizontal bar charts and expansion feature
  - **Horizontal Bar Charts**: All charts converted from vertical/pie to horizontal bars for better readability
    - Distribuição por Status (formerly pie chart)
    - Projetos por Responsável
    - Projetos por Tipo de Vídeo
    - Vídeos por Cliente
  - **Visual Enhancements**:
    - Automatic descending sort (highest to lowest values)
    - Labels on left (Y-axis), values visible on bars
    - Name truncation for long labels with full name in tooltips
    - Single institutional color scheme compatible with light/dark themes
    - Internal scroll for charts with many items
  - **Chart Expansion Feature**:
    - "Expand" button on each chart for full-screen view
    - Modal dialog with larger chart rendering
    - Dynamic height based on data volume
    - Accessible dialog with proper ARIA attributes
  - **Reusable Components**: Created HorizontalBarChartCard and ExpandedChartDialog for consistency

# External Dependencies

## Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection and pooling
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **passport**: Authentication middleware with local strategy
- **express-session**: Session management with PostgreSQL storage
- **connect-pg-simple**: PostgreSQL session store adapter

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI primitive components
- **react-beautiful-dnd**: Drag and drop functionality for Kanban
- **react-hook-form**: Form state management and validation
- **wouter**: Lightweight routing library
- **date-fns**: Date manipulation and formatting
- **recharts**: Chart visualization library

## Development Tools
- **vite**: Frontend build tool and development server
- **typescript**: Type safety and development experience
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management and migrations
- **zod**: Runtime type validation and schema parsing

## UI Enhancement
- **class-variance-authority**: Component variant management
- **clsx/tailwind-merge**: Conditional className utilities
- **lucide-react**: Icon library for consistent iconography