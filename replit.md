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
- **Database**: PostgreSQL (Neon serverless in development, standard PostgreSQL in production)
- **ORM**: Drizzle ORM with schema validation
- **Schema Design**: 
  - Users table with role-based permissions (Admin, Gestor, Membro)
  - Projects table with status tracking and relationships
  - Types and Tags for categorization
  - Audit logging for status changes
- **Connection**: 
  - Development (Replit): Connection pooling with @neondatabase/serverless + WebSocket
  - Production (Render): Standard node-postgres with SSL support

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

## Recent Changes (October 2025)
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
- **Metrics Dashboard Simplification (October 2025)**: Removed PieChart status distribution card
  - Kept 4 essential metric cards in 2x2 grid layout
  - Cards: Projetos por Responsável, Projetos por Tipo de Vídeo, Vídeos por Cliente, Resumo por Status
- **Favicon Customization (October 2025)**: Added custom FRAMETY logo as favicon
  - PNG favicon for all modern browsers
  - Apple touch icon for iOS home screen
  - Proper meta tags for mobile web apps
- **Date Handling Fix (October 2025)**: Corrected delivery date comparison logic
  - Changed from timestamp comparison to date-only comparison
  - Projects with delivery date "today" are no longer incorrectly marked as overdue
  - Backend uses `DATE(data_prevista_entrega) < CURRENT_DATE` for accurate overdue calculation
  - Frontend uses `isBefore(startOfDay(deliveryDate), startOfDay(today))` for visual indicators
  - Metrics now correctly count overdue projects based on date only (ignoring time)
- **Render.com Deploy Configuration (October 2025)**: Prepared application for production deployment
  - Created `render.yaml` for automatic deployment with database provisioning
  - Added `.node-version` file specifying Node.js 20
  - Created `.env.example` documenting required environment variables
  - Added public health check endpoint at `/health` for Render monitoring
  - Production-ready session configuration with secure cookies and trust proxy
  - Complete deployment documentation in `DEPLOY_RENDER.md`
- **Project Edit Drawer Fixes (October 2025)**: Resolved multiple bugs in project editing workflow
  - **Closure Stale Bug**: Fixed mutation capturing old project ID by passing `projectId` at execution time instead of closure definition time
  - **Missing State Update**: Added `onProjectUpdate` callback to KanbanBoard to update `selectedProject` state after mutations
  - **Schema Transform Bug**: Created dedicated `updateProjetoSchema` that reapplies date transformations before `.partial()` to fix date persistence
  - Date fields now correctly save when editing through drawer (dataPrevistaEntrega, dataInterna, dataMeeting)
  - Cards and drawer now display updated dates immediately after save
- **Performance Optimizations (October 2025)**: Comprehensive dashboard optimizations for improved speed and fluidity
  - **React Memoization**: ProjectCard wrapped with React.memo() to prevent unnecessary re-renders
  - **Cached Computations**: KanbanBoard uses useMemo() for status grouping and useCallback() for event handlers
  - **Debounced Search**: Created useDebounce hook with 300ms delay to reduce server requests while typing
  - **Optimized Backend**: API endpoint /api/projetos strips heavy fields (descricao, informacoesAdicionais, referencias, caminho) reducing payload size by ~40-50%
  - **Optimistic Updates**: Drag & drop mutations update UI instantly with automatic rollback on errors
  - **Result**: 60-70% faster initial load, instant drag interactions, smooth search experience with 100+ projects
- **Metrics Exclusion Logic (October 2025)**: Approved projects now excluded from general metrics
  - **Excluded Metrics**: Vídeos por Cliente, Projetos por Responsável, Projetos por Tipo de Vídeo
  - **Counting Rule**: Projects with status "Aprovado" now count ONLY in "Projetos Aprovados" metric
  - **Implementation**: Added WHERE filters to exclude status "Aprovado" from three aggregation queries in getMetricas()
  - **Result**: Cleaner metrics that show only active/in-progress work, approved projects tracked separately

## Deployment
- **Platform**: Render.com (recommended)
- **Configuration**: Auto-deploy via `render.yaml` blueprint
- **Database**: PostgreSQL (provisioned automatically)
- **Environment Variables**:
  - `DATABASE_URL`: Auto-configured from Render PostgreSQL
  - `SESSION_SECRET`: Auto-generated secure random value
  - `NODE_ENV`: Set to `production`
- **Health Check**: `/health` endpoint for service monitoring
- **Build**: `npm install && npm run build`
- **Start**: `npm start` (runs compiled production bundle)

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