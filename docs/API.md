# API Strategy

REST endpoints belong under `src/app/api/<module>/route.ts` when a module is implemented.

Each handler should authenticate the request, check the required permission, validate input with a Zod schema, call a service, and return a consistent response. Raw Prisma/database errors must be logged server-side and converted to safe user-facing errors.

Phase 1 uses server actions for authentication and settings forms. No business API endpoints are implemented yet.
