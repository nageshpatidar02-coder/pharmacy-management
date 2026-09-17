# Architecture

This project is a modular monolith built with Next.js App Router, TypeScript, Prisma, and MongoDB.

## Layers

- `src/app`: routes, route groups, server actions, loading/error boundaries, and API endpoints when modules are added.
- `src/components`: reusable UI, layout, forms, tables, and module components.
- `src/server/auth`: authentication, sessions, and permission checks. This code is server-only.
- `src/server/services`: business use cases and audit operations.
- `src/server/repositories`: database access boundaries for future business modules.
- `src/server/db`: the centralized Prisma client.
- `src/lib/validations`: Zod schemas shared by client forms and server handlers.
- `src/lib/calculations`: server-side financial and inventory calculations as modules are added.
- `src/types`: shared TypeScript types.
- `prisma`: PostgreSQL schema, migrations, and environment-driven seed.

## Request flow

UI -> route or server action -> validation -> authentication -> authorization -> service -> repository/Prisma -> MongoDB.

Database queries must not be placed directly inside reusable UI components. Route handlers and server actions should remain thin.

## Authentication

Sessions use hashed opaque tokens in PostgreSQL and an HTTP-only same-site cookie. Passwords use bcrypt. Every protected server entrypoint checks authentication and permission; client-side navigation visibility is not a security boundary.
