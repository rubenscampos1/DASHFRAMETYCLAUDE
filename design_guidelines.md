# FRAMETY Notes Section - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Productivity-Focused) inspired by Notion, Linear, and Asana

**Rationale:** As a utility section within a video project management system, the Notes interface prioritizes efficiency, scanability, and data organization. Drawing from industry-leading productivity tools ensures familiar patterns while maintaining FRAMETY's professional aesthetic.

---

## Core Design Elements

### A. Typography System

**Primary Font:** Inter or SF Pro (Google Fonts CDN)
- Section Headers: 24px/600 weight
- Note Titles: 16px/600 weight  
- Body Text: 14px/400 weight
- Metadata/Timestamps: 12px/400 weight, reduced opacity
- Password Fields: 14px/500 monospace (for masked characters)

**Secondary Font:** JetBrains Mono (for password/code snippets)

### B. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 to p-6
- Section gaps: gap-4 to gap-6
- Card spacing: space-y-4
- Button padding: px-4 py-2

**Container Structure:**
- Main wrapper: max-w-7xl with px-6
- Two-column layout: Sidebar (300px fixed) + Main content (flex-1)
- Note cards: Full-width in main area with max-w-4xl for optimal readability

---

## Component Library

### 1. Navigation & Header

**Top Bar:**
- Full-width with backdrop blur effect (dark/light variants)
- Left: "Notas" section title (24px/600)
- Right: Search bar (w-80) + New Note button (primary action) + View toggle (Grid/List) + Theme toggle
- Height: h-16 with border-bottom
- Search: Rounded-lg with icon prefix, px-4 py-2

### 2. Sidebar (Categories & Organization)

**Structure:**
- Fixed width 300px on desktop, collapsible drawer on mobile
- Sections with spacing py-4:
  - "Todas as Notas" counter badge
  - "Categorias" expandable list
  - "Senhas Salvas" with lock icon + counter
  - "Favoritos" with star icon
  - "Lixeira" at bottom

**Category Items:**
- px-3 py-2 rounded-lg hover states
- Icon (left) + Label + Count badge (right)
- Active state: subtle background fill

### 3. Main Content Area - Note Cards

**Grid View (Default):**
- grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Cards: rounded-xl, border, p-6, hover elevation
- Card Header: Title (16px/600) + Pin/Delete icons (top-right)
- Card Body: Text preview (3 lines max, truncate)
- Card Footer: Type badge (Nota/Senha) + Timestamp + Category tag

**List View:**
- Table-style rows with alternating subtle backgrounds
- Columns: Icon | Title | Category | Type | Last Modified | Actions
- Row height: h-14 with px-4

### 4. Note Creation/Edit Modal

**Modal Structure:**
- Centered overlay (max-w-2xl)
- Backdrop: backdrop-blur-sm with dark overlay
- Modal: rounded-2xl with shadow-2xl
- Header: Title input (borderless, 20px/600) + Close button
- Body: Rich text area (min-h-48) with formatting toolbar
- Footer: Category selector + Save/Cancel buttons

**Formatting Toolbar:**
- Horizontal bar with icon buttons (gap-1)
- Tools: Bold, Italic, Bullet List, Numbered List, Link
- Each button: p-2 rounded-md hover states

### 5. Password Note Component

**Specialized Layout:**
- Password badge/indicator at top
- Password field with:
  - Monospace font display
  - Eye icon toggle (right-aligned) for visibility
  - Copy button (clipboard icon)
  - Masked state: •••••••• dots
  - Revealed state: actual password text
- Additional fields: Username, URL, Notes
- Each field: Label (12px/600 uppercase tracking-wide) + Input with border-b focus underline

**Password Toggle Interaction:**
- Default: Masked with eye-slash icon
- Clicked: Reveals password, icon changes to eye
- Auto-mask after 30 seconds (visual countdown option)

### 6. Action Buttons

**Primary (New Note):**
- px-6 py-2.5 rounded-lg
- Icon (plus) + "Nova Nota" label
- Prominent in header

**Secondary (Category, Search):**
- px-4 py-2 rounded-lg
- Border with transparent fill
- Icon + optional label

**Icon Buttons (Actions):**
- p-2 rounded-md
- Hover: background fill
- Icons: Pin, Star, Delete, Edit, Share

**Buttons on Backgrounds:**
- Use backdrop-blur-md with semi-transparent background
- No hover/active specifications (handled by component)

### 7. Empty States

**No Notes Created:**
- Centered content with icon (document outline, 64px)
- Heading: "Nenhuma nota ainda"
- Subtext: "Crie sua primeira nota para começar"
- Primary CTA button below

**Search No Results:**
- Search icon + "Nenhum resultado encontrado"
- Suggestion text with clear search button

### 8. Quick Actions Panel

**Floating Action Menu (Bottom-Right):**
- Fixed position: bottom-8 right-8
- Primary FAB: New note (56px circle)
- Secondary actions expand on hover:
  - Nova Senha
  - Nova Categoria
  - Importar
- Each: 48px circle with icon + tooltip

---

## Theme Specifications

**Dark Theme Foundation:**
- Background levels: Pure black → Dark gray hierarchy
- Surface cards: Subtle elevation with gray-800/900 tones
- Text: White (primary) → Gray-400 (secondary) → Gray-600 (tertiary)
- Borders: Gray-800 with subtle transparency

**Light Theme Foundation:**
- Background: Off-white → Pure white hierarchy  
- Surface cards: White with subtle shadows
- Text: Gray-900 (primary) → Gray-600 (secondary) → Gray-400 (tertiary)
- Borders: Gray-200 with subtle transparency

**Brand Integration:**
- Use FRAMETY existing accent color for:
  - Primary buttons
  - Active states
  - Selection highlights
  - Password strength indicators
  - Category badges
  - Link colors

---

## Interactions & Micro-animations

**Card Interactions:**
- Hover: Subtle scale (1.01) + shadow elevation increase
- Click: Brief scale-down (0.99) feedback

**Modal Appearance:**
- Fade in backdrop + slide-up modal (150ms ease-out)
- Exit: Reverse animation

**Toggle States:**
- Password visibility: Crossfade between mask/reveal (200ms)
- Theme switch: Smooth color transitions (300ms)

**Loading States:**
- Skeleton cards with shimmer effect for initial load
- Spinner for search/filter operations

---

## Accessibility

- All interactive elements: Minimum 44px touch target
- Keyboard navigation: Full tab order with visible focus rings
- ARIA labels: All icon buttons and toggles
- Color contrast: WCAG AA minimum for all text
- Screen reader announcements for password reveal/hide
- Form validation with clear error states

---

## Icon Library

**Use:** Heroicons (via CDN) for all interface icons
- Plus, Document, Lock, Eye/EyeSlash, Star, Pin, Trash, Search, Grid, List, etc.

---

## Images Section

**No Hero Images Required** - This is an internal application section focused purely on functionality. All visual impact comes from layout, typography, and component design. No decorative imagery needed.