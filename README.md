# GetShiftCore 🚀

> **Enterprise-Grade, Multi-Tenant SaaS Engine for Automated Shift Scheduling, Attendance Tracking, and Workforce Operations.**

---

## 🎯 Overview

**GetShiftCore** is a high-performance B2B SaaS platform engineered for modern workforce management. Designed around strict multi-tenancy, real-time data integrity, and strict type safety, GetShiftCore powers shift generation, employee requests, time tracking, and multi-role authorization for enterprise organizations.

---

## 🏗 System Architecture

The project is structured as a single high-performance **pnpm Monorepo workspace**, enforcing strict boundary isolation between application runtimes and shared internal packages.

```text
getshiftcore/
├── apps/
│   ├── api/                   # NestJS Core API (Backend Runtime)
│   └── web/                   # React 19 + Vite Frontend (UI Runtime)
└── packages/
    └── shared-types/          # Shared Business Domain Enums, Interfaces & Types
```

### Key Architectural Layers

1. **Shared Type System (`packages/shared-types`):**
   * Acts as the single source of truth (SSOT) for domain logic across both frontend and backend.
   * Compiles strictly to modern ES Modules (`ESM`) output using TypeScript declaration maps.

2. **Backend API (`apps/api`):**
   * Built on **NestJS**, utilizing modular architecture (Controllers, Services, Guards, DTOs).
   * Interfaces with PostgreSQL using **Prisma ORM** with **Row-Level Security (RLS)** for strict tenant isolation.

3. **Frontend Client (`apps/web`):**
   * Built on **React 19** and **Vite** for optimized build speeds and rendering performance.
   * Strongly typed via shared contracts exported directly from `@getshiftcore/shared-types`.

---

## 🛠 Tech Stack

| Domain | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Monorepo Strategy** | `pnpm` Workspaces | Fast, deterministic package resolution & disk-efficient dependency deduplication |
| **Language Baseline** | TypeScript | Configured with `strict: true`, `verbatimModuleSyntax`, and `NodeNext` ESM resolution |
| **Backend Engine** | NestJS | Enterprise-grade dependency injection, modular API architecture, and guard-based security |
| **Database & ORM** | PostgreSQL + Prisma ORM | Strongly typed schema migrations coupled with native Row-Level Security (RLS) |
| **Frontend Framework** | React 19 + Vite | Component-driven UI with lightning-fast HMR and ESM bundling |

---

## 💡 Senior Engineering Decisions

### 1. Manual Monorepo Configuration over Boilerplate CLI Starters
Instead of relying on rigid generator CLI tools, the monorepo workspace (`pnpm-workspace.yaml`, root `tsconfig.json`, baseline rules) was manually crafted. This guarantees complete control over the compiler pipeline, dependency topology, and CI build execution paths.

### 2. Strict Root Inheritance for `tsconfig.json`
To prevent configuration drift across sub-projects:
* A root `tsconfig.json` provides strict baseline compiler rules (`strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`).
* Child packages (`packages/*`, `apps/*`) extend the root baseline while overriding only runtime-specific requirements (e.g., `jsx: react-jsx` inside frontend applications, `rootDir`/`outDir` inside libraries).

### 3. String Enums over Numeric Enums
Core domain definitions (Roles, Subscription Plans, Request/Attendance Statuses) are explicitly implemented as **String Enums**:
* **Database Inspection:** Storing `'TENANT_ADMIN'` inside PostgreSQL columns avoids unreadable numeric IDs (`0`, `1`, `2`) during direct database auditing.
* **API Payload Transparency:** JSON HTTP request/response bodies carry explicit string literals, eliminating ambiguity across frontend network inspectors.

### 4. Zero-Leak Shared Types Package
The `shared-types` workspace package exports pure type definitions and domain constants without dragging backend-specific (Prisma/NestJS) or frontend-specific (DOM/React) dependencies into the common package.

---

## 📊 Domain Core Data Types

The system relies on central domain enums defined in `@getshiftcore/shared-types`:

* **`Role`**: `TENANT_ADMIN` \| `MANAGER` \| `EMPLOYEE`
* **`SubscriptionPlan`**: `FREE_TRIAL` \| `MONTHLY` \| `YEARLY`
* **`RequestStatus`**: `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELED`
* **`AttendanceStatus`**: `PRESENT` \| `LATE` \| `HALF_DAY` \| `REMOTE` \| `ON_LEAVE`

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `>=20.0.0`
* **pnpm**: `>=9.0.0`

### Installation & Build

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/getshiftcore.git
   cd getshiftcore
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Build shared packages:**
   ```bash
   pnpm run build:shared
   ```

---

## 📜 License
This project is proprietary software. All rights reserved.