# Trackest - Logistics Management System

[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

Trackest is a web-based logistics management system for handling shipments, tracking events, delivery routes, and warehouses. It uses Vue 3 and TypeScript on the frontend, with Supabase for authentication and database operations.

The project was developed for an Advanced Database Systems course and includes role-based interfaces for administrators, staff, couriers, and customers.

## Features

- Dashboard with shipment and logistics data
- Shipment creation and status updates
- Shipment tracking and tracking event history
- Route assignment and warehouse management
- Audit logs and user profiles
- Role-based navigation and access controls
- Search, filtering, pagination, and CSV export
- Supabase authentication and database RPC integration

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Vue 3 | Frontend framework |
| TypeScript | Application logic and type safety |
| Vite | Development server and build tool |
| Supabase | Authentication, database access, and RPC |
| PostgreSQL | Relational database |
| SQL | Database functions and row-level security policies |

## Project Structure

```text
trackest-app/
├── database/    # Additional SQL scripts
├── public/      # Static assets
├── src/
│   ├── components/
│   ├── composables/
│   ├── domain/
│   ├── layouts/
│   ├── router/
│   ├── services/
│   ├── styles/
│   └── views/
├── .env.example
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js version supported by Vite 8 (22.12 or later recommended)
- npm
- A configured Supabase project

### Installation

```bash
git clone https://github.com/fikriandrrhm19/logistics-management-system.git
cd logistics-management-system
npm ci
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the Supabase project URL and publishable or anon key in `.env.local`:

```dotenv
VITE_BACKEND_PROVIDER=supabase
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Start the development server:

```bash
npm run dev
```

To build and preview the frontend:

```bash
npm run build
npm run preview
```

## Current Scope

- The Supabase adapter is the intended backend for the current application.
- The existing database schema, RPC functions, and RLS policies must be available for the related features to work.
- Firebase is planned as an alternative backend for the UAS implementation; its adapter is not yet a ready-to-use replacement.
- Access controls in the interface do not replace database-level authorization. Data access must still be enforced through RLS and backend functions.
- Build success checks compilation and bundling, not the full authentication, permissions, and role-specific workflows.

## Branches

- `main` - shared application baseline
- `supabase` - Supabase implementation
- `firebase` - planned Firebase implementation