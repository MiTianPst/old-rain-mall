---
name: api-crud-generator
description: Use when implementing or revising administrative CRUD for products, categories, users, orders, or other entities in this Next.js and Drizzle e-commerce repository.
---

# API CRUD Generator

## Overview

Generate one complete, tested vertical slice that follows the repository's real schema and domain rules. Treat “CRUD” as a request to manage an entity, not permission to expose unrestricted create, update, or delete operations.

## Establish the Contract

Before proposing files or writing tests:

1. Read the nearest `AGENTS.md`, `CLAUDE.md`, the actual Drizzle schema and migrations, and an adjacent implementation if one exists.
2. Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/`; do not rely on older App Router conventions.
3. State the entity, allowed operations, roles, lifecycle states, unique fields, relationships, and irreversible actions.
4. Use exact database enum values, lengths, defaults, foreign keys, and indexes. Never invent fields, statuses, roles, or routes.
5. Treat status sections in documentation as potentially stale. Verify current environment files, migrations, containers, and runnable commands before claiming a prerequisite is missing or complete.
6. Ask for a decision when missing information would change permissions, data retention, money, inventory, payment, or another irreversible behavior. Otherwise choose the smallest reversible default and label it.

## Build the Vertical Slice

**REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development` before implementation.

1. Write a failing test for the next observable rule: validation, authorization, lifecycle, conflict handling, or persistence.
2. Add or change the Drizzle schema only when the approved behavior requires it; generate a migration instead of editing an applied migration.
3. Define strict Zod input schemas. Whitelist writable fields and normalize form values at the boundary.
4. Put reusable database operations in `src/server/repositories`.
5. Put authorization, transactions, lifecycle rules, and stable business errors in `src/server/services`.
6. Use Server Actions for first-party form mutations. Add Route Handlers only when an HTTP consumer is required; both must call the same service.
7. Keep Server Components responsible for reads and page assembly. Keep Client Components limited to interaction state.
8. Build accessible Chinese management UI with Tailwind CSS 4 and explicit loading, empty, validation, conflict, and confirmation states.
9. Run focused tests, integration tests when database behavior matters, then typecheck, lint, and build.

## Domain Boundaries

| Concern | Required behavior |
| --- | --- |
| Permissions | Enforce administrator access on the server; hidden buttons are not authorization. |
| Input | Treat IDs, roles, status, price, totals, discounts, stock, and versions from the browser as untrusted. |
| Money | Store and calculate integer cents; never use floating-point yuan. |
| Uniqueness | Rely on database unique indexes and map duplicate-key races to a stable conflict result. |
| Concurrency | Use the existing `version` field for optimistic updates when lost updates are possible. |
| Deletion | Respect foreign keys and retention rules. Prefer `ARCHIVED` or `HIDDEN` when history must remain. |
| Orders and payments | Model explicit commands and allowed state transitions inside transactions; never expose generic status or amount updates. |

## Output Contract

Present work in this order:

1. Confirmed behavior and clearly labeled assumptions.
2. Files and boundaries to add or change.
3. Failing tests and the expected failure reason.
4. Minimal implementation for those tests.
5. Verification evidence and any remaining scope.

## Example: Product Removal

For a request to “delete a product,” first inspect relationships and project retention rules. In this repository, a historically referenced product becomes `ARCHIVED`; do not generate an unconditional SQL `DELETE`. Test that archived products disappear from storefront queries while historical order snapshots remain readable.

## Common Mistakes

- Copying a Prisma or generic REST template into this Drizzle project.
- Generating Server Actions and Route Handlers that duplicate business logic.
- Guessing lowercase enum values when the schema uses uppercase values.
- Passing request objects directly to `.insert()` or `.set()`.
- Treating orders, payments, inventory, or membership totals as ordinary editable fields.
- Claiming success without running the database-dependent checks against MySQL.
