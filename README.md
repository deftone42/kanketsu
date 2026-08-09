# 🐾 Kanketsu

[![CI Checks](https://github.com/deftone42/kanketsu/actions/workflows/ci.yml/badge.svg)](https://github.com/deftone42/kanketsu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](.nvmrc)

**Kanketsu** is an anime discovery tool designed to help users determine the ideal time to start watching a series. Driven by a custom **Timing Score**, it evaluates the suitability of starting an anime based on its airing status, upcoming sequels, and overall franchise continuity.

**[Try it live](https://kanketsu-anime.vercel.app/)** · [Report a bug or request a feature](https://github.com/deftone42/kanketsu/issues)

---

## 🚀 Tech Stack & Tools

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Data Source:** [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/)
- **Deployment:** Static Export deployed to **Vercel** — push to `main` ships production, every PR gets a preview URL

---

## 📐 Hexagonal Architecture

The project strictly adheres to **Hexagonal Architecture (Ports & Adapters)** principles to decouple core domain logic from the UI framework and external API providers

---

## 🛠️ Prerequisites

- **Node.js:** `>=22.0.0`
- **NVM** (recommended for Node version management)

---

## ⚡ Quick Start

1. **Clone the repository:**
   git clone https://github.com/deftone42/kanketsu.git
   cd kanketsu

2. **Ensure correct Node.js version:**
   nvm use

3. **Install dependencies:**
   npm install

4. **Run the local development server:**
   npm run dev

   Open http://localhost:3000 in your browser.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command         | Script       | Description                                                      |
| :-------------- | :----------- | :--------------------------------------------------------------- |
| `npm run dev`   | `next dev`   | Starts the Next.js development server with hot-reloading         |
| `npm run build` | `next build` | Compiles the app and generates static HTML export for production |
| `npm run start` | `next start` | Starts a Node.js production server to serve the build            |
| `npm run lint`  | `eslint`     | Runs ESLint to identify code style and syntax issues             |
| `npm run test`  | `vitest run` | Runs the test suite once (watch mode: `npm run test:watch`)      |

> `npm run lint` does not type check. CI runs `lint` → `npx tsc --noEmit` → `test` → `build`; match that before calling work done.

---

## 📚 Documentation

| Guide                                      | Description                                                 |
| :----------------------------------------- | :---------------------------------------------------------- |
| [Architecture](./docs/ARCHITECTURE.md)     | Hexagonal layers, data flow, and dependency rules           |
| [Scoring System](./docs/SCORING-SYSTEM.md) | How the Timing Score is calculated, all cases and constants |
| [Testing](./docs/TESTING.md)               | Test stack, fixtures, MSW mocking, and best practices       |
| [Development](./docs/DEVELOPMENT.md)       | Setup, commands, project structure, and CI/CD               |

---

## 🐞 Found a bug or have an idea?

Open an [issue](https://github.com/deftone42/kanketsu/issues). Bug reports travel best with the anime you searched — the Timing Score is almost always specific to one franchise.

Anime data itself comes from AniList: if the episode count, airing dates or relations are wrong there, they will be wrong here, so report those [upstream](https://anilist.co/).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
