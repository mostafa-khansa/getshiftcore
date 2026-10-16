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
  * `packages/shared-types` — Shared TypeScript DTOs and interfaces

### 2. Backend Framework (`apps/api`)
* **NestJS (TypeScript):** Enterprise-grade modular monolith architecture.
* **Prisma ORM:** Strict type-safe queries, migration control, and transactional guarantees.
* **Authentication:** JWT Access Tokens (In-Memory on Frontend) + Long-lived Refresh Tokens (HTTP-Only, Secure, SameSite Cookies).

### 3. Frontend Application (`apps/web`)
- **React 19 & Vite (TypeScript):** Modern, fast SPA compilation leveraging native React 19 Actions and `ref` as a prop.
- **State & Data Management:** **TanStack Query (React Query)** for server-state caching/refetching + **Zustand** for lightweight UI client state.
- **Styling, UI Components & Forms:** Tailwind CSS + **shadcn/ui** (accessible component primitives owned directly in code) + **React Hook Form** + **Zod** (for performant form state management and robust runtime validation) + **React Icons**.
- **HTTP Client:** Axios configured with `withCredentials: true` and an automatic silent 401 token refresh interceptor.

### 4. Database & Security
* **PostgreSQL 15+:** Strict transactional compliance, indexed foreign keys, UUID primary keys.
* **Row Level Security (RLS):** Kernel-level data isolation enforced via PostgreSQL RLS policies checking `app.current_tenant_id` session settings.

### 5. DevOps, Infrastructure & Hosting (Native GCP)
* **Local Development:** Docker Compose managing isolated PostgreSQL 15 instances.
* **Containerization:** Multi-stage production `Dockerfile` for NestJS backend.
* **GCP Infrastructure:**
  * **Cloud Run:** Serverless, auto-scaling backend API runtime.
  * **Cloud SQL (Postgres):** Fully managed, backed-up relational database.
  * **Google Cloud Storage (GCS) + Cloud CDN:** Stores compiled React static assets behind a global HTTP(S) load balancer with edge caching and custom 404 error routing for SPA client-side paths.
  * **Cloud DNS:** Direct custom domain mapping for `getshiftcore.com`.
* **CI/CD:** GitHub Actions building containers on push to `main`, syncing static assets to GCS, and executing automated deployments.

---

## Consolidated Data Architecture (`prisma/schema.prisma`)

```typescript
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
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

model Tenant {
  id               String             @id @default(uuid())
  name             String             @unique
  plan             SubscriptionPlan   @default(FREE_TRIAL)
  status           SubscriptionStatus @default(ACTIVE)
  trialEndsAt      DateTime
  stripeCustomerId String?
  stripeSubId      String?
  users            User[]
  invitations      Invitation[]
  departments      Department[]
  employees        Employee[]
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  role          Role           @default(EMPLOYEE)
  tenantId      String
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  refreshTokens RefreshToken[]
  employee      Employee?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([tenantId])
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}

model Invitation {
  id        String   @id @default(uuid())
  email     String
  role      Role     @default(EMPLOYEE)
  token     String   @unique
  expiresAt DateTime
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([tenantId])
}

model Department {
  id        String     @id @default(uuid())
  name      String
  tenantId  String
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[]
  createdAt DateTime   @default(now())

  @@index([tenantId])
}

model Employee {
  id           String             @id @default(uuid())
  firstName    String
  lastName     String
  email        String             @unique
  userId       String?            @unique
  user         User?              @relation(fields: [userId], references: [id], onDelete: SetNull)
  departmentId String
  department   Department         @relation(fields: [departmentId], references: [id])
  tenantId     String
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contracts    Contract[]
  attendances  AttendanceRecord[]
  vacations    VacationRequest[]
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([tenantId])
  @@index([departmentId])
}

model Contract {
  id         String   @id @default(uuid())
  employeeId String
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate  DateTime
  endDate    DateTime?
  baseSalary Float
  isActive   Boolean  @default(true)
  tenantId   String

  @@index([employeeId])
  @@index([tenantId])
}

model AttendanceRecord {
  id         String    @id @default(uuid())
  employeeId String
  employee   Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  checkIn    DateTime
  checkOut   DateTime?
  status     String    @default("PRESENT")
  tenantId   String

  @@index([employeeId])
  @@index([tenantId])
}

model VacationRequest {
  id          String        @id @default(uuid())
  employeeId  String
  employee    Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate   DateTime
  endDate     DateTime
  status      RequestStatus @default(PENDING)
  approverId  String?
  tenantId    String
  createdAt   DateTime      @default(now())

  @@index([employeeId])
  @@index([tenantId])
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

model TimePunch {
  id          String      @id @default(uuid())
  employeeId  String
  employee    Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  timestamp   DateTime    @default(now())
  type        PunchType
  source      PunchSource @default(BIOMETRIC_FACE)
  deviceId    String?     // Tracks which physical terminal device captured it
  tenantId    String

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

-- Create Restrictive Isolation Policies bound to current app tenant setting
CREATE POLICY tenant_isolation_user ON "User" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_invitation ON "Invitation" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_department ON "Department" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_employee ON "Employee" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_contract ON "Contract" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_attendance ON "AttendanceRecord" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_vacation ON "VacationRequest" AS RESTRICTIVE FOR ALL USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
```