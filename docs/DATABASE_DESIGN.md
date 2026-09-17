# Database Design

MongoDB is the source of truth and Prisma is the database access layer.

Phase 1 includes `User`, `Role`, `Permission`, `RolePermission`, `Session`, `PasswordResetToken`, `PharmacySettings`, and `AuditLog`.

The schema uses enum-backed role/status values, ObjectId identifiers, unique role-permission pairs, indexed expiry timestamps for cleanup, and Prisma relations. Business entities such as medicines, sales, and purchases are intentionally deferred to later phases.

Apply the schema with `npm run prisma:push`. MongoDB does not use Prisma SQL migrations; use a controlled `db push` workflow for this foundation. Create the initial admin explicitly with `npm run seed -- --email=admin@example.com --password=<strong-password>`; admin credentials are never stored in `.env` or source code.
