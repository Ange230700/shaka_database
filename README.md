<!-- shaka_database\README.md -->

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

## 📊 Entity-Relationship Diagram

The schema below represents the ShakaDB data layer: surf spots, their photos/thumbnails, and M:N relations with influencers, travellers, and break types.

```mermaid
erDiagram
    %% =========================
    %% Core entities
    %% =========================
    SurfSpot ||--o{ Photo : has
    Photo    ||--o{ Thumbnail : has

    %% M:N via pivots
    SurfSpot ||--o{ SurfSpot_Influencer : links
    Influencer ||--o{ SurfSpot_Influencer : links

    SurfSpot ||--o{ SurfSpot_Traveller : links
    Traveller ||--o{ SurfSpot_Traveller : links

    SurfSpot ||--o{ SurfSpot_SurfBreakType : links
    SurfBreakType ||--o{ SurfSpot_SurfBreakType : links

    %% =========================
    %% Tables (fields & types)
    %% =========================
    SurfSpot {
      int      surf_spot_id PK
      string   destination
      string   address
      string   state_country
      int      difficulty_level
      date     peak_season_begin
      date     peak_season_end
      string   magic_seaweed_link
      datetime created_time
      string   geocode_raw
    }

    Photo {
      int      photo_id PK
      int      surf_spot_id FK
      int      width
      int      height
      string   url
      string   filename
      int      size_bytes
      string   mime_type
    }

    Thumbnail {
      int      photo_id PK, FK
      string   kind PK
      string   url
      int      width
      int      height
    }

    Influencer {
      int     influencer_id PK
      string  influencer_name
    }

    Traveller {
      int     traveller_id PK
      string  traveller_name
    }

    SurfBreakType {
      int     surf_break_type_id PK
      string  surf_break_type_name
    }

    SurfSpot_Influencer {
      int   surf_spot_id  PK, FK
      int   influencer_id PK, FK
    }

    SurfSpot_Traveller {
      int   surf_spot_id  PK, FK
      int   traveller_id  PK, FK
    }

    SurfSpot_SurfBreakType {
      int   surf_spot_id       PK, FK
      int   surf_break_type_id PK, FK
    }

    %% (Optional) direct M:N visual helpers
    SurfSpot }o--o{ Influencer : "via SurfSpot_Influencer"
    SurfSpot }o--o{ Traveller : "via SurfSpot_Traveller"
    SurfSpot }o--o{ SurfBreakType : "via SurfSpot_SurfBreakType"
```
