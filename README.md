# Trackest — Logistics Management System

[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

Trackest is a web-based logistics management system for managing shipments, tracking history, delivery routes, and warehouses. The frontend is built with Vue 3 and TypeScript, with Supabase providing authentication and access to a PostgreSQL database.

## Features

- Shipment creation and status updates
- Shipment tracking and event history
- Route assignment and management
- Warehouse management
- Dashboard summaries and audit logs
- User profiles and role-based navigation
- Search, filtering, pagination, and CSV export
- Supabase Auth and database RPC integration

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Vue 3 | Frontend framework |
| TypeScript | Application logic and type safety |
| Vite | Development server and build tooling |
| Supabase Auth | User authentication |
| PostgreSQL | Relational data storage |
| Supabase RPC | Calling database functions from the application |

## Project Structure

```text
trackest-app/
├── database/       # Database-related files
├── public/         # Static assets
├── src/
│   ├── components/ # Shared UI components
│   ├── composables/ 
│   ├── domain/     # Domain models and status mappings
│   ├── layouts/    # Application layouts
│   ├── router/     # Route definitions
│   ├── services/   # Backend clients and adapters
│   ├── styles/     # Global styles
│   └── views/      # Application pages
├── .env.example
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js compatible with Vite 8 (Node.js 22.12 or later recommended)
- npm
- A Supabase project with the required database schema, RPC functions, and access policies configured

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

Set the following variables in `.env.local`:

```dotenv
VITE_BACKEND_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use your project's Supabase URL and publishable/anon key. Do not put a Supabase service-role key or other privileged secret in frontend environment variables.

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Configuration Notes

- The application expects the Supabase schema and RPC functions used by the adapter to exist in the configured project.
- Configure PostgreSQL Row Level Security (RLS) and policies to enforce data access. Frontend navigation and role-based UI are not substitutes for database authorization.
- A successful production build verifies compilation and bundling; it does not verify live authentication, database policies, RPC behavior, or end-to-end workflows.

## License

See [LICENSE](LICENSE) for license details.