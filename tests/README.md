Test directories are split by intent:

- `unit/`: pure calculations, validation, and permission tests.
- `integration/`: service/repository tests against a test MongoDB database.
- `e2e/`: login, protected routes, and critical workflows.

Phase 1 establishes the structure; executable test suites will be added with the business modules.
