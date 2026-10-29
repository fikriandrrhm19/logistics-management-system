# Trackest - Logistics Management System

[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)

Trackest is a web-based logistics management system for managing shipments, tracking history, delivery routes, and warehouses. The frontend is built with Vue 3 and TypeScript, with Firebase Authentication and Realtime Database used for authentication and application data.

## Features

- Shipment creation and status updates
- Shipment tracking and event history
- Route assignment and management
- Warehouse management
- Dashboard summaries and audit logs
- User profiles and role-based navigation
- Search, filtering, pagination, and CSV export
- Firebase Authentication and Realtime Database integration

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Vue 3 | Frontend framework |
| TypeScript | Application logic and type safety |
| Vite | Development server and build tooling |
| Firebase Authentication | User authentication |
| Firebase Realtime Database | JSON-based application data storage |

## Project Structure

```text
trackest-app/
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
- A Firebase project with Authentication and Realtime Database configured

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

Configure the Firebase web app values in `.env.local`:

```dotenv
VITE_BACKEND_PROVIDER=firebase
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
```

Use the values provided by your Firebase project. Enable the sign-in provider required by the application and configure Realtime Database rules before using the app.

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

- The Firebase adapter expects the required Realtime Database nodes and user profile/role data to be configured in the project.
- Review and test Realtime Database Security Rules before deployment. Do not allow users to assign or modify their own privileged roles.
- Client-side role-based navigation is not a substitute for database authorization. Enforce access through Firebase Security Rules and trusted server-side logic where required.
- A successful production build verifies compilation and bundling; it does not verify live authentication, database rules, data consistency, or end-to-end workflows.

## License

See [LICENSE](LICENSE) for license details.