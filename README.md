# Medical Management System

A modular monolith foundation for a small, single-store medical or pharmacy shop. Business modules are intentionally deferred; the current code establishes routing, authentication, authorization, persistence, validation, and reusable UI architecture.

## Stack

- Next.js 16 App Router and TypeScript
- Tailwind CSS 4 with shadcn/ui-style local primitives
- MongoDB with Prisma ORM
- Zod, React Hook Form, TanStack Table, Lucide, and Recharts

## Getting started

1. Run `npm install`.
2. Start local MongoDB on `mongodb://127.0.0.1:27017`.
3. Copy `.env.example` to `.env`.
4. Run `npm run prisma:generate`.
5. Apply the Prisma schema with `npm run prisma:push`.
6. Seed development roles, permissions, and the admin account with `npm run prisma:seed`.
7. Start the app with `npm run dev`.

The development login hint uses `admin@example.com` and `Admin@12345678`. Change both values before using a shared or production environment.

Without MongoDB, the login form now shows a safe setup error instead of crashing. Start MongoDB locally before trying the development login.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:push` | Apply the Prisma schema to MongoDB |
| `npm run prisma:seed` | Seed roles, permissions, settings, and the env-defined admin |

## Architecture

```text
src/
├── app/
│   ├── (auth)/                 # Login and password recovery routes
│   ├── (dashboard)/            # Protected dashboard routes
│   ├── api/                    # Reserved for thin REST handlers
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
├── components/                 # UI, layout, forms, and shared components
├── server/
│   ├── auth/                   # Sessions and permissions
│   ├── db/                     # Central Prisma client
│   ├── repositories/           # Database boundaries for future modules
│   └── services/               # Server-side use cases
├── lib/
│   ├── validations/            # Zod schemas
│   ├── calculations/           # Future server-side calculations
│   ├── errors/                 # Structured application errors
│   └── constants/
├── config/
├── hooks/
└── types/

prisma/                         # Schema, migrations, and seed
public/                         # Static assets
tests/                          # Unit, integration, and e2e test areas
docs/                           # Architecture, database, and API docs
```

Request flow:

```text
UI -> route/server action -> validation -> authentication -> authorization -> service -> repository/Prisma -> PostgreSQL
```

No real secrets, localStorage persistence, or fake business records are committed. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md), and [docs/API.md](docs/API.md).
