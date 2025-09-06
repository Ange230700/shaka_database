# ShakaDB — Prisma/MySQL package for the Shaka ecosystem

**ShakaDB** is a self-contained Prisma + MySQL data layer you can consume as an NPM package. It ships with a production-ready Prisma client, a normalized schema for surf destinations, ergonomic cleanup/seed helpers, ESM-friendly Jest setup, Docker compose for local MySQL, and CI that validates migrations, build, lint, and tests.

## What’s inside

* **Prisma schema + generated client**

  * Entities: `SurfSpot`, `Photo` → `Thumbnail` (enum sizes), `Influencer`, `Traveller`, `SurfBreakType`
  * Pivots: `SurfSpot_Influencer`, `SurfSpot_Traveller`, `SurfSpot_SurfBreakType`
  * Indexed date fields for peak season queries; composite PKs for pivots
  * Multi-platform `binaryTargets` for CI/CD environments
* **Typed client export**
  Import once, reuse everywhere:

  ```ts
  import prisma from "shakadb/lib/client";
  ```
* **Seed & data tooling**

  * `seed()` with `SKIP_CLEANUP` switch for fast iterative runs
  * Safe deletion with retries/exponential backoff
  * “Quick or purge” utilities for small vs. large tables (batch deletes with paging)
* **Test harness (ESM)**

  * Jest + ts-jest (ESM preset), global setup pushes schema & seeds DB
  * Example CRUD tests for `SurfSpot`
* **DX & quality gates**

  * TypeScript strict mode, path aliases, incremental builds
  * ESLint (flat config) + Prettier + Husky + lint-staged
  * Commit hygiene (Commitlint, Commitizen)
* **Docker & CI**

  * `docker-compose` with MySQL 8.3 and a one-shot seed job
  * GitHub Actions pipeline: install → prisma generate → build → test → lint

## Quick start

1. **Install & configure**

```bash
npm i shakadb
# provide DATABASE_URL, e.g.
# mysql://user:pass@localhost:3306/shaka
```

2. **Generate (only if you’re developing ShakaDB itself)**

```bash
npm run prisma:generate
```

3. **Use the client**

```ts
import prisma from "shakadb/lib/client";

const spots = await prisma.surfSpot.findMany({
  include: { Photo: { include: { Thumbnail: true } } },
});
```

4. **Seed data (optional)**

```bash
# default: cleanup + seed
npm run prisma:db:seed
# skip cleanup for speed
SKIP_CLEANUP=true npm run prisma:db:seed
```

## Scripts you’ll actually use

* `npm run dev` – run the seed entry (`prisma/main.ts`) with env from `.env.local`
* `npm run build` – compile TypeScript + fix path aliases
* `npm run test` / `test:ci` – ESM-friendly Jest; globalSetup pushes schema & seeds
* `npm run prisma:db:push|seed|migrate:*|studio` – Prisma workflows
* `npm run db:cleanup` – invoke safe purge helpers

## Docker (local DB in one command)

```bash
docker compose up --build
# The shakadb service will push the schema and seed then exit ("Done")
```

`DATABASE_URL` is wired to the internal MySQL service (`mysql://root:shaka_root_pw@mysql:3306/shaka`).

## CI pipeline (GitHub Actions)

* Spins up MySQL 8.3
* Creates `.env` from secrets → `prisma generate` → build → `test:ci` → lint

## Schema snapshot (high level)

* **SurfSpot** ⟶ has many **Photo**
* **Photo** ⟶ has many **Thumbnail** (`small|large|full`)
* **SurfSpot** ⇄ **Influencer** (M\:N)
* **SurfSpot** ⇄ **Traveller** (M\:N)
* **SurfSpot** ⇄ **SurfBreakType** (M\:N)

## Utilities (purge/cleanup at scale)

```ts
import {
  quickOrPurgeById,
  quickOrPurgeByCompositeKey,
  asBasicDelegate,
  deleteSafely,
} from "shakadb/helpers";

// Example: purge a pivot table efficiently
await quickOrPurgeByCompositeKey(
  "surfspot_influencer",
  asBasicDelegate(prisma.surfSpot_Influencer),
  ["surf_spot_id", "influencer_id"],
  { smallThreshold: 20_000, deleteChunkSize: 800 }
);
```

## Package entry points

* `shakadb` or `shakadb/lib/client` → Prisma client (built)
* `shakadb/helpers` → purge + seed helpers
* `shakadb/seed` → `seed()` function
* `shakadb/generated/prisma-client` → raw generated client (types + JS)
* `shakadb/prisma/schema.prisma` → schema source
