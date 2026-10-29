# Trackest - Logistics Management System

[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)

Trackest is a web-based logistics management system for handling shipments, tracking events, delivery routes, and warehouses. It uses Vue 3 and TypeScript on the frontend, with Supabase/PostgreSQL as the original backend and Firebase Realtime Database as the planned UAS comparison backend.

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
- Firebase Authentication and Realtime Database adapter for UAS experiments

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Vue 3 | Frontend framework |
| TypeScript | Application logic and type safety |
| Vite | Development server and build tool |
| Supabase | Original authentication, database access, and RPC |
| Firebase | Alternative authentication and NoSQL database for UAS |
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

- The Supabase adapter is the original UTS implementation.
- The existing database schema, RPC functions, and RLS policies must be available for Supabase features to work.
- The Firebase adapter is an experimental UAS implementation and must be configured, seeded, and tested against a Firebase project before it can be considered ready for demonstration.
- Access controls in the interface do not replace database-level authorization. Data access must still be enforced through RLS and backend functions.
- Build success checks compilation and bundling, not the full authentication, permissions, and role-specific workflows.

## Firebase UAS Setup

Select the Firebase backend with `VITE_BACKEND_PROVIDER=firebase` and set the Firebase web configuration in `.env.local`. Install the Firebase SDK with `npm install firebase`, enable Email/Password Authentication, create a Realtime Database, and review `database/firebase-rtdb.rules.json` before publishing rules. Create user profiles and role assignments through a controlled setup process; do not allow users to grant themselves roles.

The Firebase implementation is still subject to end-to-end testing. Client-side multi-path updates do not provide the same trust boundary as PostgreSQL triggers or server-side functions. See [`docs/uas/02-implementasi-firebase.md`](docs/uas/02-implementasi-firebase.md) for implementation notes and outstanding tests.

## Branches

- `main` - shared application baseline
- `supabase` - Supabase implementation
- `firebase` - planned Firebase implementation