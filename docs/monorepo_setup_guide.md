# Production-Grade TypeScript Monorepo Setup Guide

This guide details the exact step-by-step process for initializing, configuring, and verifying a multi-package TypeScript monorepo architecture using `pnpm` workspaces.

---

## Architecture Overview

* **Workspace Manager:** `pnpm`
* **Language:** TypeScript (Strict ESM Output)
* **Directory Layout:**
  * `apps/*`: Application entrypoints (e.g., NestJS API, React Frontend)
  * `packages/*`: Shared modules, configuration, and types

---

## Phase 1: Root Project Initialization

### 1. Initialize Git and Core Environment
From your project root directory:

```bash
git init
```

Create a `.gitignore` file at the root:

```text
# Node dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/

# Tooling & Environment
.turbo/
.env
.env.local
*.log
```

### 2. Configure Monorepo Workspace
Create `pnpm-workspace.yaml` at the root to instruct `pnpm` where to locate workspace packages using glob patterns:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 3. Root `package.json` Initialization
Initialize the root `package.json` for workspace-level scripts:

```json
{
  "name": "getshiftcore-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build:shared": "pnpm --filter @getshiftcore/shared-types build"
  }
}
```

---

## Phase 2: Root TypeScript Baseline Configuration

### 1. Root `tsconfig.json` Setup
Create a root `tsconfig.json` to define enterprise-grade, strict type-checking defaults:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "esnext",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "moduleDetection": "force"
  }
}
```

> **Note:** App-specific flags (like `"jsx": "react-jsx"`) should be omitted at the root level and defined inside relevant application packages (e.g., `apps/web`).

---

## Phase 3: Building a Shared Types Package (`packages/shared-types`)

### 1. Folder Hierarchy Setup
Create the folder structure:

```text
packages/
└── shared-types/
    ├── src/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

### 2. Local Package Manifest (`packages/shared-types/package.json`)
Configure the package as an ES Module (`"type": "module"`):

```json
{
  "name": "@getshiftcore/shared-types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

### 3. Local TypeScript Config (`packages/shared-types/tsconfig.json`)
Extend the root baseline and define source/output paths:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### 4. Code Implementation (`packages/shared-types/src/index.ts`)
Write core business domain string enums:

```typescript
export enum Role {
    TENANT_ADMIN = 'TENANT_ADMIN',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE',
}

export enum SubscriptionPlan {
    FREE_TRIAL = 'FREE_TRIAL',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
    ACTIVE = 'ACTIVE',
    PAST_DUE = 'PAST_DUE',
    CANCELED = 'CANCELED',
}

export enum RequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELED = 'CANCELED',
}

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    LATE = 'LATE',
    HALF_DAY = 'HALF_DAY',
    REMOTE = 'REMOTE',
    ON_LEAVE = 'ON_LEAVE',
}
```

---

## Phase 4: Build Pipeline Verification

Execute the filtered workspace build script from the monorepo root:

```bash
pnpm run build:shared
```

### Expected Output
Upon successful compilation:
1. `tsc` processes `packages/shared-types/src/index.ts`.
2. A `dist/` directory is created inside `packages/shared-types/`.
3. Compiled JavaScript (`index.js`) and TypeScript declaration files (`index.d.ts`, `index.d.ts.map`) are generated without type-checking or syntax errors.