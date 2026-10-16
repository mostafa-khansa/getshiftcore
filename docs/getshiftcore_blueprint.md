# GetShiftCore (`getshiftcore.com`) — Master Blueprint & Execution Specification

## Executive Overview
**GetShiftCore** is a modern, multi-tenant B2B SaaS platform for workforce, contract, attendance, and vacation lifecycle management with automated approvals. Built from the ground up for high concurrency, absolute tenant isolation, clear data integrity, and cloud scalability, this system validates senior full-stack mastery using a **pnpm Monorepo**, **NestJS**, **React 19 + Vite**, **TypeScript**, **PostgreSQL (with Row Level Security)**, and **Google Cloud Platform (GCP)**.

---

## Technical Stack & Architectural Decisions

### 1. Monorepo & Workspace Management
* **pnpm Workspaces:** Fast, strict, disk-efficient package management with isolated symlinked `node_modules`.
* **Monorepo Structure:**
  * `apps/api` — NestJS backend
  * `apps/web` — React 19 frontend
  * `packages/database` — Prisma schema, migrations, and the generated client
  * `packages/shared-types` — Shared TypeScript DTOs and interfaces

### 2. Backend Framework (`apps/api`)
* **NestJS (TypeScript):** Enterprise-grade modular monolith architecture.
* **Prisma ORM:** Schema, migrations, and the generated client live in `packages/database`. The API imports that client.
* **Authentication:** JWT Access Tokens (In-Memory on Frontend) + Long-lived Refresh Tokens (HTTP-Only, Secure, SameSite Cookies).

### 3. Frontend Application (`apps/web`)
- **React 19 & Vite (TypeScript):** Modern, fast SPA compilation leveraging native React 19 Actions and `ref` as a prop.
- **State & Data Management:** **TanStack Query (React Query)** for server-state caching/refetching + **Zustand** for lightweight UI client state.
- **Styling, UI Components & Forms:** Tailwind CSS + **shadcn/ui** (accessible component primitives owned directly in code) + **React Hook Form** + **Zod** (for performant form state management and robust runtime validation) + **React Icons**.
- **HTTP Client:** Axios configured with `withCredentials: true` and an automatic silent 401 token refresh interceptor.

### 4. Database & Security
* **PostgreSQL 17:** Strict transactional compliance, indexed foreign keys, UUID primary keys. Local Docker runs `postgres:17-alpine`.
* **Row Level Security (RLS):** Kernel-level data isolation enforced via PostgreSQL RLS policies checking `app.current_tenant_id` session settings. The column is Prisma's `"tenantId"`, so every policy quotes that name and casts the session value to `uuid`. Migrations keep using the `postgres` superuser in `DATABASE_URL`. The running application connects as a separate role that is not a superuser and does not have `BYPASSRLS`. A superuser ignores these policies, so the Docker `postgres` user cannot be the app login.

#### UUID primary keys
Every primary key is a PostgreSQL `uuid`, generated in the database:

```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

`@db.Uuid` is the native `uuid` column. Postgres stores 16 bytes and rejects values that are not valid UUIDs. `gen_random_uuid()` runs on insert, so Prisma, a script, and raw SQL all receive a real UUID. A `String @default(uuid())` field would instead be `text`, with the value created only inside Prisma Client.

A foreign key such as `tenantId` is `String @db.Uuid` with no default. It stores the id of a row that already exists. Generating a new UUID there would fail the foreign key.

#### Timezone-aware timestamps
Every `DateTime` is `timestamp(3) with time zone`:

```prisma
createdAt DateTime @default(now()) @db.Timestamptz(3)
```

`timestamptz` stores the instant in UTC. A trial ending at 18:00 in Berlin and 12:00 in New York is one value. `timestamp` without time zone stores the clock digits only, so those two offices would disagree about the moment. Shift start, shift end, attendance, and vacation dates use the same attribute.

#### Exact money
Salary is a decimal, not a float:

```prisma
baseSalary Decimal @db.Decimal(12, 2)
```

`12, 2` means twelve digits in total and two after the decimal point. `Float` cannot store `10.10` exactly. Payroll and contract amounts use `Decimal`.

### 5. DevOps, Infrastructure & Hosting (Native GCP)
* **Local Development:** Docker Compose managing an isolated PostgreSQL 17 instance.
* **Containerization:** Multi-stage production `Dockerfile` for NestJS backend.
* **GCP Infrastructure:**
  * **Cloud Run:** Serverless, auto-scaling backend API runtime.
  * **Cloud SQL (Postgres):** Fully managed, backed-up relational database.
  * **Google Cloud Storage (GCS) + Cloud CDN:** Stores compiled React static assets behind a global HTTP(S) load balancer with edge caching and custom 404 error routing for SPA client-side paths.
  * **Cloud DNS:** Direct custom domain mapping for `getshiftcore.com`.
* **CI/CD:** GitHub Actions building containers on push to `main`, syncing static assets to GCS, and executing automated deployments.

---

## Consolidated Data Architecture (`prisma/schema.prisma`)

The connection string lives in `prisma.config.ts`, not in this file. Primary keys, timestamps, and salary follow the UUID, `timestamptz`, and `Decimal` decisions in section 4. Prisma keeps the field name `tenantId` as the column name.

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

enum Role {
  TENANT_ADMIN
  MANAGER
  EMPLOYEE
}

enum SubscriptionPlan {
  FREE_TRIAL
  MONTHLY
  YEARLY
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELED
}

enum AttendanceStatus {
  PRESENT
  LATE
  HALF_DAY
  REMOTE
  ON_LEAVE
}

enum PunchType {
  IN
  OUT
  BREAK_START
  BREAK_END
}

enum PunchSource {
  BIOMETRIC_FACE
  BIOMETRIC_FINGERPRINT
  WEB_DASHBOARD
  MOBILE_APP
}

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

model User {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String         @unique
  passwordHash  String
  role          Role           @default(EMPLOYEE)
  tenantId      String         @db.Uuid
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  refreshTokens RefreshToken[]
  employee      Employee?
  createdAt     DateTime       @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime       @updatedAt @db.Timestamptz(3)

  @@index([tenantId])
}

model RefreshToken {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tokenHash String
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime @db.Timestamptz(3)
  createdAt DateTime @default(now()) @db.Timestamptz(3)

  @@index([userId])
}

model Invitation {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email     String
  role      Role     @default(EMPLOYEE)
  token     String   @unique
  expiresAt DateTime @db.Timestamptz(3)
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @db.Timestamptz(3)

  @@index([tenantId])
}

model Department {
  id        String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  tenantId  String     @db.Uuid
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[]
  createdAt DateTime   @default(now()) @db.Timestamptz(3)

  @@index([tenantId])
}

model Employee {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  firstName    String
  lastName     String
  email        String             @unique
  userId       String?            @unique @db.Uuid
  user         User?              @relation(fields: [userId], references: [id], onDelete: SetNull)
  departmentId String             @db.Uuid
  department   Department         @relation(fields: [departmentId], references: [id])
  tenantId     String             @db.Uuid
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contracts    Contract[]
  attendances  AttendanceRecord[]
  vacations    VacationRequest[]
  timePunches  TimePunch[]
  createdAt    DateTime           @default(now()) @db.Timestamptz(3)
  updatedAt    DateTime           @updatedAt @db.Timestamptz(3)

  @@index([tenantId])
  @@index([departmentId])
}

model Contract {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  employeeId String    @db.Uuid
  employee   Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate  DateTime  @db.Timestamptz(3)
  endDate    DateTime? @db.Timestamptz(3)
  baseSalary Decimal   @db.Decimal(12, 2)
  isActive   Boolean   @default(true)
  tenantId   String    @db.Uuid

  @@index([employeeId])
  @@index([tenantId])
}

model AttendanceRecord {
  id         String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  employeeId String           @db.Uuid
  employee   Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  checkIn    DateTime         @db.Timestamptz(3)
  checkOut   DateTime?        @db.Timestamptz(3)
  status     AttendanceStatus @default(PRESENT)
  tenantId   String           @db.Uuid

  @@index([employeeId])
  @@index([tenantId])
}

model VacationRequest {
  id         String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  employeeId String        @db.Uuid
  employee   Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate  DateTime      @db.Timestamptz(3)
  endDate    DateTime      @db.Timestamptz(3)
  status     RequestStatus @default(PENDING)
  approverId String?       @db.Uuid
  tenantId   String        @db.Uuid
  createdAt  DateTime      @default(now()) @db.Timestamptz(3)

  @@index([employeeId])
  @@index([tenantId])
}

model TimePunch {
  id         String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  employeeId String      @db.Uuid
  employee   Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  timestamp  DateTime    @default(now()) @db.Timestamptz(3)
  type       PunchType
  source     PunchSource @default(BIOMETRIC_FACE)
  deviceId   String?
  tenantId   String      @db.Uuid

  @@index([employeeId])
  @@index([tenantId])
  @@index([deviceId])
}

```

## Database RLS Enforcement Script
```sql
-- Enable Row Level Security on tenant-isolated domain tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VacationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimePunch" ENABLE ROW LEVEL SECURITY;

-- "tenantId" must stay quoted. Prisma creates that camelCase column name.
-- current_setting returns text, so the value is cast to uuid.
CREATE POLICY tenant_isolation_user ON "User" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_invitation ON "Invitation" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_department ON "Department" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_employee ON "Employee" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_contract ON "Contract" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_attendance ON "AttendanceRecord" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_vacation ON "VacationRequest" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_time_punch ON "TimePunch" AS RESTRICTIVE FOR ALL USING ("tenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
```