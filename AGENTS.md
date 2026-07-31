<!-- BEGIN:nextjs-agent-rules -->

# AGENTS.md - AniTime AI Operating Guidelines

## 1. Project Overview & Architecture

- **App:** AniTime (Anime Discovery Tool)
- **Architecture:** Hexagonal (Ports & Adapters).
  - `src/core/domain/`: Pure TypeScript models & services. Zero external framework dependencies.
  - `src/core/ports/`: TypeScript interfaces for external adapters.
  - `src/infrastructure/`: API integration (AniList GraphQL), DTOs, and mappers.
  - `src/app/`: Next.js 15 App Router, UI components, custom hooks.

## 2. Strict Coding Standards

- **TypeScript:** Strict mode enabled. Zero `any` policy.
- **Styling:** Tailwind CSS. Use `cn()` helper from `src/lib/utils.ts` for conditional classnames.
- **Dependencies:** Do not introduce heavy dependencies without explicit user request.
- **Node Environment:** Minimum Node.js version is `>=22.0.0` (refer to `.nvmrc`).

## 3. Validation Commands

Before confirming a task is finished, ensure these commands pass:

- `npm run lint` - Code formatting & syntax check.
- `npm run build` - Ensure static export compiles correctly.
<!-- END:nextjs-agent-rules -->
