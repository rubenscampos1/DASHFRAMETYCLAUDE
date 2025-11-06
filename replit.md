# Overview

This project is a modern video project management web application offering a Kanban-style interface for managing video production workflows. It features a React frontend, Express backend, Drizzle ORM, and PostgreSQL database. Key capabilities include role-based authentication (Admin, Manager, Member), comprehensive project tracking, metrics visualization, and reporting. The application supports drag-and-drop project management, automated status logging, specialized role-based views, and a responsive mobile-first design. The business vision is to streamline video production, offering clear market potential for studios and agencies, with the ambition of becoming a leading platform in the media project management space.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
- **Design System**: shadcn/ui built on Radix UI primitives for accessible and customizable components.
- **Styling**: Tailwind CSS with CSS variables for flexible theming (dark/light mode).
- **Responsiveness**: Mobile-first design with custom sticky topbar and slide-out drawer for navigation on smaller screens.
- **Kanban Board**: Drag-and-drop interface for intuitive project status management.
- **Metrics Dashboard**: Visual analytics with charts and project statistics.
- **Project Views**: Dual view modes (Card/List) for "Finalized Projects" with advanced filtering.

## Technical Implementations
- **Frontend**: React with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state management, React Hook Form with Zod for forms.
- **Backend**: Express.js with TypeScript, RESTful API design, Passport.js for session-based authentication with secure password hashing (scrypt).
- **Database**: PostgreSQL (Neon for development, standard for production) managed by Drizzle ORM. Schema includes Users (with role-based permissions), Projects (with nine status stages), Types, Tags, and Audit Logs.
- **Authentication & Authorization**: Three-tier role-based system (Admin > Gestor > Membro) with session management stored in PostgreSQL, CSRF protection, and secure cookies.
- **Data Flow**: Optimistic UI updates, automatic query invalidation, client/server-side validation, centralized error handling, and transactional database operations.
- **File Storage**: Hybrid object storage system supporting Replit Object Storage for development and AWS S3 for production, handling file uploads, downloads, and secure note attachments.
- **Notes System**: Comprehensive personal notes feature with support for files, annotations, and secure password storage, including categorization and filtering.

## Feature Specifications
- **Core Project Workflow**: Nine distinct project status stages from Briefing to Aprovado.
- **Filtering & Reporting**: Multi-criteria filtering for projects and exportable reports with date range options, including approval date filters (dataInicioAprovacao and dataFimAprovacao).
- **PDF Export**: Professional PDF report generation using PDFKit, optimized for Render.com deployment. Reports include FRAMETY branding, filter summaries, project tables with pagination, and are available via GET /api/relatorios/pdf endpoint.
- **CSV Export**: Export filtered project data to CSV format for external analysis.
- **Integration**: YouTube link management for approved projects.
- **Safe Deletion**: Transactional deletion for projects and soft deletion for users to maintain data integrity.
- **Performance**: Memoization, cached computations, debounced search, optimized API payloads, and optimistic updates for a fluid user experience.
- **Metrics Logic**: Approved projects are excluded from general metrics to focus on active/in-progress work, counted separately in "Projetos Aprovados."
- **Cascading Filters**: Dynamic filtering of related entities (e.g., `empreendimentos` based on `cliente`) in forms.

# External Dependencies

## Core Runtime
- **@neondatabase/serverless**: PostgreSQL connection pooling.
- **drizzle-orm**: Type-safe ORM for PostgreSQL.
- **passport**: Authentication middleware.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
- **@aws-sdk/client-s3**: AWS S3 client for object storage.
- **@aws-sdk/s3-request-presigner**: For generating presigned S3 URLs.
- **pdfkit**: Lightweight PDF generation library for creating professional reports.

## Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Accessible UI primitives.
- **react-beautiful-dnd**: Drag and drop.
- **react-hook-form**: Form management.
- **wouter**: Lightweight routing.
- **date-fns**: Date utilities.
- **recharts**: Charting library.
- **lucide-react**: Icon library.

## Development Tools
- **vite**: Frontend build tool.
- **typescript**: Language.
- **tailwindcss**: CSS framework.
- **drizzle-kit**: Database schema management.
- **zod**: Runtime type validation.