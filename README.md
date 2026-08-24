# TripDesk

Travel Agency Operating System for modern Indian travel agents and small tour operators.

TripDesk provides a polished, premium SaaS workspace designed to help agents manage customer enquiries, construct itineraries, issue quotations, track follow-ups, and log payments.

---

## Phase 1 Scope

This phase establishes the foundational structure, responsive application shell, and global design system.

- **Branding & Design System**: Tailwind CSS v4 variables mapping indigo brand accents (`#4F46E5`), deep navy (`#0F172A`), and travel teal highlights (`#0D9488`).
- **Responsive Application Shell**: Sticky topbars, collapsible desktop sidebars (256px to 72px), mobile bottom navigation tabs, and a slide-over mobile menu drawer.
- **Global Search UI**: Modal command palette triggered by search buttons or `⌘ K` / `Ctrl K`.
- **Reusable UI Primitives**: Intercepting skeletons, error states, and empty states.
- **Mock Dashboard Data**: Realistically populated Indian destinations (Kerala, Goa, Dubai) and client scenarios (Rahul Patel, Priya Shah, Amit Shah).
- **Widgets**: KPI cards, pipeline stage visualizer, custom SVG revenue chart, upcoming bookings lists, and call follow-up items.

---

## Technology Stack

- **Framework**: Next.js (App Router, strict TypeScript)
- **Styling**: Tailwind CSS v4, Vanilla CSS
- **Primitives**: `@base-ui/react` (shadcn/ui v4 default)
- **Icons**: Lucide React
- **Notifications**: Sonner

---

## Getting Started

### Installation

Install package dependencies:

```bash
npm install
```

### Run Local Development Server

Launch the Next.js local server:

```bash
npm run dev
```

The application will run locally at [http://localhost:3000](http://localhost:3000).

### Build for Production

Compile and generate production bundles:

```bash
npm run build
```

### Code Quality Check (Linting)

Run ESLint rules to verify formatting guidelines:

```bash
npm run lint
```

---

## Future Roadmap

- **Phase 2 (Database & Integrations)**:
  - Connect database tables (Supabase Postgres)
  - Implement real authentication router guards
  - Setup WhatsApp Twilio/Meta integration APIs
- **Phase 3 (Core Workflows)**:
  - Quotation calculation builder with live pricing
  - Hotel & transport supplier availability checks
- **Phase 4 (Ledger Accounts & Analytics)**:
  - Log payment links, advances, and commissions
  - Advanced conversion reports and GST calculations
