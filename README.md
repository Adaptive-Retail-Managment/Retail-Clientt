# Retail Client

Frontend and desktop project for the **Adaptive Retail Intelligence Platform** — React 19 web app and Electron 45 desktop shell.

## Stack

| Area    | Choice                                       |
| ------- | -------------------------------------------- |
| Web     | React 19 + TypeScript + Vite 7               |
| Desktop | Electron 45 shell loading the shared web app |
| Tests   | Vitest, Testing Library                      |
| Tooling | pnpm 11 workspaces, ESLint 9, Prettier       |

## Prerequisites

- Node.js **>= 22.12**
- pnpm **11.28.13** — pinned via `packageManager`; enable with `corepack enable`

## Quick start

```bash
pnpm install
pnpm dev                      # Web dev server on :5173
```

For desktop development:

```bash
pnpm dev                      # Start web dev server first
pnpm dev:desktop              # Launch Electron (loads :5173)
```

## Commands

| Command            | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `pnpm dev`         | Start web dev server (Vite)                    |
| `pnpm dev:desktop` | Launch Electron shell (start `pnpm dev` first) |
| `pnpm build`       | Build web and desktop bundles                  |
| `pnpm lint`        | ESLint across all workspaces                   |
| `pnpm typecheck`   | tsc --noEmit across all workspaces             |
| `pnpm test:unit`   | Web and desktop unit tests                     |

## Layout

```
apps/web           React/Vite application (shared by browser and desktop)
apps/desktop       Electron shell with hardened preload + IPC allowlist
packages/config    Shared TypeScript, ESLint and Prettier configuration
docs/              Architecture, web, desktop, requirements, operations
```

## Documentation

- [System architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Frontend architecture](docs/web/FRONTEND_ARCHITECTURE.md)
- [Desktop architecture](docs/desktop/DESKTOP_ARCHITECTURE.md)
- [Architecture decision records](docs/architecture/ARCHITECTURE_DECISION_RECORDS.md)
- [Master Requirements & Decision Document](docs/requirements/MASTER_PROJECT_REQUIREMENTS_AND_DECISION_DOCUMENT.md)
