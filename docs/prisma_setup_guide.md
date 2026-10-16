# Prisma and PostgreSQL Setup Guide

This guide is for someone setting up the GetShiftCore database package for the first time. Follow it from top to bottom. Each step ends with a check. Do not start the next step until that check passes.

You will end with:

* Postgres running in Docker
* `@getshiftcore/database` depending on Prisma 7
* `prisma.config.ts` pointing at the database
* `prisma/schema.prisma` with the enums and models
* a migration that created the tables

The finished schema in this repo is `packages/database/prisma/schema.prisma`. Use it as the answer key after you have tried each model yourself. The reasons for UUID, time zones, and decimal money are in `docs/getshiftcore_blueprint.md`, section 4.

Run every Prisma command from `packages/database`, not from the repo root. Prisma looks for `prisma.config.ts` in the folder where you run the command.

---

## Words used in this guide

| Word | Meaning |
| :--- | :--- |
| **Package** | One folder with its own `package.json`. Here that folder is `packages/database`. |
| **CLI** | The `prisma` command you type in the terminal. It is a dev dependency. |
| **Client** | The code your app imports to run queries. Prisma generates it from the schema. |
| **Schema** | `schema.prisma`. It describes tables. It is not TypeScript, and it is not SQL. |
| **Model** | One table. `model Tenant` becomes a table named `"Tenant"`. |
| **Enum** | A column that only allows a fixed list of words, such as `FREE_TRIAL`. |
| **Migration** | A SQL file Prisma writes and then runs against Postgres. |
| **Foreign key** | A column that stores the `id` of a row in another table. `tenantId` on `User` points at `Tenant.id`. |

---

## Step 1: Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

`docker-compose.yml` starts Postgres 17 with this login:

| Setting | Value |
| :--- | :--- |
| User | `postgres` |
| Password | `postgrespassword` |
| Database | `getshiftcore_dev` |
| Port | `5432` |

Check: `docker ps` shows a container named `getshiftcore_postgres`.

---

## Step 2: Install Prisma 7, not Prisma 8

Open `packages/database/package.json`.

`prisma` is the command-line tool. Put it in `devDependencies`. `@prisma/client` is the library the app runs. Put it in `dependencies`. Both numbers must be the same Prisma 7 release:

```json
"devDependencies": {
  "dotenv": "^18.0.8",
  "prisma": "7.10.1"
},
"dependencies": {
  "@prisma/adapter-pg": "7.10.1",
  "@prisma/client": "7.10.1",
  "pg": "^8.23.1"
}
```

Do not write `"prisma": "8"` or leave the version as `latest`. On npm, `latest` is currently Prisma 8. Prisma 8 does not read `schema.prisma` and does not have `prisma generate` or `prisma migrate dev`. Those commands belong to Prisma 7. `@prisma/client` 7 cannot be paired with the Prisma 8 CLI.

`dotenv` loads the `.env` file. `@prisma/adapter-pg` and `pg` are how the generated client talks to Postgres.

From `packages/database`:

```bash
pnpm add -D prisma@7.10.1 dotenv
pnpm add @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg
```

You do not delete `node_modules` first. `pnpm` removes the old version and installs the one named in `package.json`.

Also set `"private": true` as a boolean. The value `"true"` in quotes is a string, and package managers check for the boolean.

Check, from `packages/database`:

```bash
pnpm exec prisma version
```

The `prisma` line and the `@prisma/client` line must both say `7.10.1`.

---

## Step 3: Write the connection string

Create `packages/database/.env`:

```text
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/getshiftcore_dev
```

The pieces are `user:password@host:port/database`, copied from `docker-compose.yml`. The repo `.gitignore` already ignores `.env`. Do not commit this file.

Node does not read `.env` by itself. The next file loads it.

---

## Step 4: Write `prisma.config.ts`

Create `packages/database/prisma.config.ts`. This file is TypeScript. The schema file you write later is not.

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

What each part does:

* `import 'dotenv/config'` reads `.env` before anything else asks for `DATABASE_URL`.
* `schema` is the path to the schema, relative to `packages/database`.
* `migrations.path` is the folder where Prisma will put SQL files.
* `env('DATABASE_URL')` reads the connection string. If the variable is missing, Prisma stops with a clear error.

In Prisma 7 the connection string lives here. Do not put `url = env("DATABASE_URL")` inside `schema.prisma`.

The editor may warn that `prisma.config.ts` is not part of `tsconfig.json`. Leave `tsconfig.json` alone. That file only compiles `src/`. Prisma runs `prisma.config.ts` itself. Widening `rootDir` so the warning disappears makes `tsc` emit `dist/src/index.js`, and `package.json` points at `dist/index.js`.

Check: from `packages/database`, run `pnpm exec prisma validate`. Until the schema file exists, Prisma should complain that the schema is missing. That means it found `prisma.config.ts`.

---

## Step 5: Create the schema file

Create `packages/database/prisma/schema.prisma`.

The extension is `.prisma`. Renaming it to `.ts` makes Prisma ignore it.

Start with the header only:

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```

* `provider = "postgresql"` is the database. The URL is already in `prisma.config.ts`.
* `provider = "prisma-client"` is the Prisma 7 generator. The old name `prisma-client-js` is not what this project uses.
* `output` is where `prisma generate` writes the client. `../generated/prisma` sits next to `src`, not inside it. `tsconfig.json` compiles everything under `src`, and the generated client must stay out of that folder.

An empty schema can still be reported as valid. Valid means "no mistakes." It does not mean "tables exist."

---

## Step 6: Write the enums first

A model cannot use a type you have not declared. Write every enum above the models.

```prisma
enum Role {
  TENANT_ADMIN
  MANAGER
  EMPLOYEE
}
```

Repeat that shape for `SubscriptionPlan`, `SubscriptionStatus`, `RequestStatus`, `AttendanceStatus`, `PunchType`, and `PunchSource`. Copy the names from `docs/getshiftcore_blueprint.md`.

Prisma enums do not use TypeScript syntax. Write `TENANT_ADMIN`, not `TENANT_ADMIN = 'TENANT_ADMIN'`. When you migrate, Prisma turns that block into:

```sql
CREATE TYPE "Role" AS ENUM ('TENANT_ADMIN', 'MANAGER', 'EMPLOYEE');
```

Postgres then rejects any other value in that column.

`packages/shared-types` has its own TypeScript copy of the first five enums. Prisma cannot import that file. Keep the words identical in both places.

---

## Step 7: Write `Tenant`, one line at a time

`model Tenant` is one table. A line is a column, unless the type ends with `[]`. A `[]` line is a relation, not a column.

```prisma
model Tenant {
  id          String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String             @unique
  plan        SubscriptionPlan   @default(FREE_TRIAL)
  status      SubscriptionStatus @default(ACTIVE)
  trialEndsAt DateTime?          @db.Timestamptz(3)
  users       User[]
  invitations Invitation[]
  departments Department[]
  employees   Employee[]
  createdAt   DateTime           @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime           @updatedAt @db.Timestamptz(3)
}
```

Read each line like this:

| Line | What it becomes in Postgres |
| :--- | :--- |
| `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | `"id" UUID NOT NULL DEFAULT gen_random_uuid()`. `@id` is the primary key. `@db.Uuid` is the real Postgres `uuid` type. `gen_random_uuid()` fills the value in the database when an insert omits `id`. |
| `name String @unique` | `"name" TEXT NOT NULL` plus a unique constraint. Two tenants cannot share a name. |
| `plan SubscriptionPlan @default(FREE_TRIAL)` | A column of type `"SubscriptionPlan"`. If the insert omits `plan`, Postgres stores `FREE_TRIAL`. |
| `status SubscriptionStatus @default(ACTIVE)` | Same idea, default `ACTIVE`. |
| `trialEndsAt DateTime? @db.Timestamptz(3)` | `"trialEndsAt" TIMESTAMP(3) WITH TIME ZONE`. The `?` means the column may be null. A paid tenant does not need a trial end. |
| `users User[]` and the other `[]` lines | No column on `Tenant`. They say "one tenant has many users." The matching `tenantId` column lives on `User`. |
| `createdAt ... @default(now())` | `TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`. |
| `updatedAt ... @updatedAt` | A `timestamptz` column. Prisma writes the current time on insert and on update. Postgres does not do that by itself. |

Every attribute starts with `@`. `default(FREE_TRIAL)` is a syntax error. The correct text is `@default(FREE_TRIAL)`.

The attribute name is `@db.Timestamptz(3)`, with a `p`. `@db.Timestamtz` fails validation.

`timestamptz` stores an instant in UTC. `timestamp` without a time zone stores clock digits and forgets whether they meant Berlin or New York. Use `@db.Timestamptz(3)` on every `DateTime` in this schema.

There is no Stripe column. This product does not charge through Stripe.

---

## Step 8: Write the other models with three rules

Copy the remaining models from the blueprint, and apply these rules on every one of them.

**1. Every primary key uses the same `id` line as `Tenant`.**

```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

**2. Every timestamp uses `@db.Timestamptz(3)`.** That includes `expiresAt`, `startDate`, `endDate`, `checkIn`, `checkOut`, and `timestamp`.

**3. A column that points at another `id` is `@db.Uuid` and has no generator.**

```prisma
tenantId String @db.Uuid
tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
```

`tenantId` stores a tenant that already exists. `gen_random_uuid()` on that column would invent an id that matches no row, and the foreign key would reject the insert. The same rule applies to `userId`, `employeeId`, `departmentId`, and `approverId`.

`onDelete: Cascade` means deleting the tenant deletes its users. Use `SetNull` only where the blueprint does, on `Employee.user`, because an employee may exist before they have a login.

Salary is money, so it is a decimal:

```prisma
baseSalary Decimal @db.Decimal(12, 2)
```

`12, 2` means twelve digits in total and two after the decimal point. `Float` cannot store `10.10` exactly.

After `updatedAt` on a tenant-owned model, add:

```prisma
@@index([tenantId])
```

That index is for "all rows in this tenant."

---

## Step 9: Keep both ends of every relation

If `User` contains `refreshTokens RefreshToken[]`, a `model RefreshToken` must exist, and it must point back at `User`.

The word after the field name is the model name. Model names start with a capital letter.

```prisma
refreshTokens RefreshToken[]
```

`refreshTokens refreshToken[]` is wrong. Prisma looks for a model named `refreshToken` and does not find one.

`Employee` contains `timePunches TimePunch[]`, so `model TimePunch` must be in the file too.

`prisma validate` fails until both ends exist. That is expected while you are still adding models. Finish the pair, then validate again.

---

## Step 10: Do not paste SQL into the schema

`schema.prisma` accepts only `datasource`, `generator`, `enum`, and `model`. This is invalid and fails validation:

```sql
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
```

Row-level security is real SQL. It stays in `docs/getshiftcore_blueprint.md` until you add it to a migration file, after the tables exist. The policies quote `"tenantId"` because that is the column name Prisma creates. They also cast the session value to `uuid`.

---

## Step 11: Validate

From `packages/database`:

```bash
pnpm exec prisma validate
```

You want:

```text
The schema at prisma\schema.prisma is valid
```

If it fails, read the first error only. Fix that line. Run the command again. Common failures:

| Message | Fix |
| :--- | :--- |
| `does not start with any known Prisma schema keyword` | You pasted SQL. Delete it from this file. |
| `Type "TimePunch" is neither a built-in type...` | Add the missing model, or fix the capital letters in the type name. |
| `missing an opposite relation field` | Add the `[]` field on the other model. |
| The attribute `Timestamtz` is unknown | Spell it `Timestamptz`. |
| Prisma 8 says `generate` is not a command | Pin `prisma` and `@prisma/client` to `7.10.1` and run `pnpm install`. |

---

## Step 12: Create the tables

Postgres from Step 1 must be running. From `packages/database`:

```bash
pnpm exec prisma migrate dev --name init
```

Prisma writes SQL under `prisma/migrations/`, runs it, and generates the client in `generated/prisma`.

Open that migration SQL and confirm three things:

* `"id" UUID NOT NULL DEFAULT gen_random_uuid()`
* timestamp columns are `TIMESTAMP(3) WITH TIME ZONE`
* `baseSalary` is `DECIMAL(12,2)`
* foreign keys such as `"tenantId"` are `UUID NOT NULL` with no `DEFAULT`

Add `generated/` to the root `.gitignore`. The client is produced by `prisma generate`. You do not commit it.

Check the tables:

```bash
docker exec -it getshiftcore_postgres psql -U postgres -d getshiftcore_dev
```

Then type `\dt`. You should see `"Tenant"`, `"User"`, and the other models.

---

## What you do not change

* Do not put `prisma.config.ts` into the `include` list of `tsconfig.json`.
* Do not generate UUIDs on foreign keys.
* Do not use `String @default(uuid())` for primary keys. That creates `TEXT`, and Prisma invents the value in application code.
* Do not use `DateTime` without `@db.Timestamptz(3)`.
* Do not store salary as `Float`.
