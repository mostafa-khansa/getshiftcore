# TypeScript Monorepo Setup Guide

This guide is for someone setting up the GetShiftCore workspace for the first time. Follow it from top to bottom. Each step ends with a check. Do not start the next step until that check passes.

You will end with:

* a pnpm workspace that looks for packages in `apps/*` and `packages/*`
* TypeScript 7 installed at the repo root
* a root `tsconfig.json` that every package extends
* `@getshiftcore/shared-types` building to `packages/shared-types/dist/`

The finished files in this repo are the answer key: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `.gitignore`, and everything under `packages/shared-types/`.

Run every command in this guide from the repo root.

This folder is already a git repository. Leave it as it is.

The database package is a later guide: `docs/prisma_setup_guide.md`. Finish this one first.

---

## Words used in this guide

| Word | Meaning |
| :--- | :--- |
| **Workspace** | The repo root plus every package `pnpm-workspace.yaml` lists. One `pnpm install`, one `pnpm-lock.yaml`. |
| **Package** | One folder with its own `package.json`. The package in this guide is `packages/shared-types`. In PHP that is one folder with its own `composer.json`. |
| **extends** | A `tsconfig.json` that loads another config, then overrides a few options. |
| **filter** | `pnpm --filter <name>` runs a script in one package. The name must match that package's `"name"` field. |
| **ESM** | ECMAScript modules: `import` and `export`. `"type": "module"` in `package.json` turns a package into ESM. |

---

## Step 1: Check Node and pnpm

From the repo root:

```bash
node -v
pnpm -v
```

`node -v` prints `v20` or newer. `pnpm -v` prints `10.18.3`.

If the shell says `pnpm` is not recognized, Node ships Corepack, which installs the pinned pnpm:

```bash
corepack enable
corepack prepare pnpm@10.18.3 --activate
pnpm -v
```

The last line must print `10.18.3`.

---

## Step 2: Ignore installed files and secrets

Create `.gitignore` at the repo root:

```text
node_modules/
dist/
.turbo/
.env
```

| Line | What it keeps out of git |
| :--- | :--- |
| `node_modules/` | Packages `pnpm install` downloads. |
| `dist/` | JavaScript and `.d.ts` files that `tsc` writes. You build them again; you do not commit them. |
| `.turbo/` | Cache folder for a task runner this repo does not use yet. |
| `.env` | Local secrets, including the database URL from the Prisma guide. |

Check: the file is those four lines.

---

## Step 3: Tell pnpm where the packages are

Create `pnpm-workspace.yaml` at the repo root:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Each line is a glob. `*` means one folder level.

* `packages/*` matches `packages/shared-types`. After the Prisma guide it also matches `packages/database`.
* `apps/*` is reserved for later apps. The `apps/` folder is not in this repo. pnpm accepts a glob that matches nothing.

In Composer you would add one path repository per package. pnpm takes the globs instead.

Check: the file sits next to where `package.json` will be, and both globs use double quotes, as in the file above.

---

## Step 4: Write the root `package.json`

The root package is the workspace itself. Create `package.json`:

```json
{
  "name": "getshiftcore-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "",
  "main": "index.js",
  "scripts": {
    "build:shared": "pnpm --filter @getshiftcore/shared-types build"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.18.3"
}
```

| Field | What it does |
| :--- | :--- |
| `"private": true` | The boolean `true`. Package managers refuse to publish a private package. The quoted text `"true"` is a string, and they do not treat a string as private. |
| `"scripts"."build:shared"` | From the root, run the `build` script of the package named `@getshiftcore/shared-types`. |
| `"packageManager"` | The pnpm version Corepack should use for this repo: `pnpm@10.18.3`. |
| `description`, `main`, `keywords`, `author`, `license` | Written by `pnpm init`. The root has no `index.js`, and nothing imports the root package. Leave the fields in place so your file matches the repo. |

`"devDependencies"` is missing on purpose. The next command adds it.

Check: `"private"` is `true` without quotes, and `"packageManager"` is `"pnpm@10.18.3"`.

---

## Step 5: Install TypeScript at the root

`packages/shared-types` does not list TypeScript. Its build script is `tsc`. That command is available because TypeScript is installed on the workspace root, and `pnpm run build:shared` starts there.

From the repo root:

```bash
pnpm add -D typescript@7.0.2 -w
```

`-w` is the workspace root. `-D` saves a dev dependency. The same split in Composer is `composer require --dev` in the root package.

pnpm writes `pnpm-lock.yaml` and adds this block to the root `package.json`:

```json
"devDependencies": {
  "typescript": "^7.0.2"
}
```

The caret is what `pnpm add` writes. The lockfile resolves it to `7.0.2`.

The finished root `package.json` matches the repo:

```json
{
  "name": "getshiftcore-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "",
  "main": "index.js",
  "scripts": {
    "build:shared": "pnpm --filter @getshiftcore/shared-types build"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.18.3",
  "devDependencies": {
    "typescript": "^7.0.2"
  }
}
```

Check:

```bash
pnpm exec tsc --version
```

You want:

```text
Version 7.0.2
```

---

## Step 6: Write the root TypeScript baseline

Create `tsconfig.json` at the repo root. This file allows comments. Keep the two commented lines:

```json
{
  "compilerOptions": {
    // "rootDir": "./src",
    // "outDir": "./dist",
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  }
}
```

| Option | What it does |
| :--- | :--- |
| `// "rootDir"` and `// "outDir"` | Stay comments. This file is the baseline, and the root has no `src/` folder. Each package sets its own `rootDir` and `outDir`. A package that sets `rootDir` to the package folder emits `dist/src/index.js`, while its `package.json` points at `dist/index.js`. |
| `"module": "nodenext"` | Emit ESM using Node's rules. That setting also selects NodeNext module resolution, so this file leaves `moduleResolution` unset. |
| `"target": "esnext"` | Emit modern JavaScript. The runtime is Node 20 or newer. |
| `"types": []` | An empty list means "include no `@types` packages automatically." A package that needs Node types adds `@types/node` itself. |
| `"strict": true` | Turns on the strict type checks. |
| `"verbatimModuleSyntax": true` | A type-only import stays type-only and is erased. A value import stays a value import. |
| `"isolatedModules": true` | Each file must compile on its own, which is how a bundler compiles. |
| `"noUncheckedIndexedAccess": true` | `items[0]` has type `T` or `undefined`. |
| `"exactOptionalPropertyTypes": true` | An optional property may be omitted. Assigning `undefined` is a separate case. |
| `"noUncheckedSideEffectImports": true` | A side-effect import such as `import 'dotenv/config'` must resolve to a real module. |
| `"declaration"` and `"declarationMap"` | Write `.d.ts` files and a map so the editor can jump back to the `.ts` source. |
| `"sourceMap": true` | Write `.js.map` next to the JavaScript. |
| `"moduleDetection": "force"` | Treat every file as a module. |
| `"skipLibCheck": true` | Skip typechecking `.d.ts` files inside `node_modules`. |

There is no `"include"` here. Leave this file uncompiled on its own. Step 10 runs `tsc` with the package config from Step 8.

Check: `rootDir` and `outDir` are still comments, `"types"` is `[]`, and the file has no `moduleResolution` line.

---

## Step 7: Create the shared-types package

Create this tree:

```text
packages/
└── shared-types/
    ├── src/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

`index.ts` and `tsconfig.json` are the next two steps. Write `packages/shared-types/package.json` now:

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

| Field | What it does |
| :--- | :--- |
| `"name": "@getshiftcore/shared-types"` | The package name. `@getshiftcore` is the scope, the same job as a Composer vendor name. The root script's `--filter` value is this whole string. |
| `"private": true` | Boolean `true`, same rule as the root. |
| `"type": "module"` | This package is ESM. |
| `"main"` | The JavaScript file `tsc` will write. Other packages load this at runtime. |
| `"types"` | The declaration file editors and `tsc` read. |
| `"build": "tsc"` | Compile using `packages/shared-types/tsconfig.json`. |

This package lists no dependencies. It does not import React, Nest, or Prisma.

From the repo root, register the new folder:

```bash
pnpm install
```

Check:

```bash
pnpm list -r --depth -1
```

The list includes a line like:

```text
@getshiftcore/shared-types@1.0.0 C:\Users\PC\Documents\getshiftcore\packages\shared-types (PRIVATE)
```

Your disk path will differ. The name `@getshiftcore/shared-types` and `(PRIVATE)` are the part that matters. If `packages/database` already exists, `@getshiftcore/database` is listed too.

---

## Step 8: Extend the baseline from the package

Create `packages/shared-types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
  },
  "include": ["src/**/*"]
}
```

`extends` loads every option from the root file. The three settings below replace only what this package needs.

* `"rootDir": "./src"` — `src/index.ts` is the top of the output tree, so it becomes `dist/index.js`.
* `"outDir": "./dist"` — the folder `tsc` writes into. `"main"` in the package manifest is `dist/index.js`.
* `"include": ["src/**/*"]` — compile files under `src/` only.

If `rootDir` is the package folder instead of `./src`, `tsc` writes `dist/src/index.js`. The manifest still points at `dist/index.js`, so the built file and the path disagree.

Check: `extends` is `../../tsconfig.json`, `rootDir` is `./src`, `outDir` is `./dist`, and `include` is `src/**/*`.

---

## Step 9: Write the domain enums

Create `packages/shared-types/src/index.ts`:

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

Each enum is a string enum. The value on the wire and in the database is the word `TENANT_ADMIN`. A number enum would store `0`, `1`, `2`.

In PHP the same idea is a backed enum:

```php
enum Role: string
{
    case TENANT_ADMIN = 'TENANT_ADMIN';
    case MANAGER = 'MANAGER';
    case EMPLOYEE = 'EMPLOYEE';
}
```

Prisma keeps a second copy of these words in `schema.prisma`. Prisma cannot import this TypeScript file. The words in both places stay identical. In the Prisma file you will write `TENANT_ADMIN` with no `= 'TENANT_ADMIN'`, because that file is not TypeScript. That is Step 6 of `docs/prisma_setup_guide.md`.

Check: the file exports `Role`, `SubscriptionPlan`, `SubscriptionStatus`, `RequestStatus`, and `AttendanceStatus`, and every member is assigned its own name as a string.

---

## Step 10: Build the package

From the repo root:

```bash
pnpm run build:shared
```

That runs the root script, which runs `tsc` inside `packages/shared-types`. You want `tsc` to finish with no error:

```text
> @getshiftcore/shared-types@1.0.0 build
> tsc
```

Then `packages/shared-types/dist/` contains four files:

| File | What it is |
| :--- | :--- |
| `index.js` | The JavaScript. Open it and find `Role["TENANT_ADMIN"] = "TENANT_ADMIN"`. |
| `index.js.map` | Maps that JavaScript back to `src/index.ts`. |
| `index.d.ts` | The types other packages import. |
| `index.d.ts.map` | Maps those declarations back to `src/index.ts`. |

`dist/` is listed in `.gitignore`. Leave it uncommitted.

If the build fails, read the first error only. Fix that line. Run the command again.

| What you see | Fix |
| :--- | :--- |
| `tsc` is not recognized, or `command not found` | From the repo root run `pnpm add -D typescript@7.0.2 -w`, then `pnpm run build:shared` again. |
| `No projects matched the filters` | The filter string must be `@getshiftcore/shared-types`, the same text as `"name"` in `packages/shared-types/package.json`. |
| `"private"` is the quoted string `"true"` | Change it to `"private": true` with no quotes around `true`, in the root and in `packages/shared-types`. |

---

## What you do not change

* Leave `rootDir` and `outDir` commented in the root `tsconfig.json`.
* Leave `moduleResolution` unset. `"module": "nodenext"` already selects it.
* Keep `"types": []` in the root config.
* Keep `apps/*` in `pnpm-workspace.yaml` while `apps/` does not exist yet.
* Keep React, Nest, and Prisma out of `packages/shared-types`.

---

## Next

The workspace is ready for the database package. Follow `docs/prisma_setup_guide.md` from the top. Run those commands from `packages/database`.
