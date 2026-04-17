# talk-to-book

Upload PDFs, build a personal library, and talk to your books. A Next.js 16 app with a MongoDB-backed book catalog and an AI chat workspace per book.

> **Status:** Upload, library, and edit flows are working end-to-end. The chat page currently returns a mocked response (see [src/app/(root)/books/[slug]/chat/page.tsx](src/app/(root)/books/[slug]/chat/page.tsx)) — the Vapi voice-assistant wiring is specced in [VAPI_INTEGRATION_GUIDE.md](VAPI_INTEGRATION_GUIDE.md) and not yet integrated.

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions) + **React 19**
- **TypeScript**, strict mode
- **Tailwind CSS v4** + **shadcn/ui** (`base-maia` style) + **Hugeicons**
- **MongoDB** via **Mongoose 9** (PDF bytes stored in 512 KB chunks, cover image stored inline as a Buffer)
- **Zod** + **react-hook-form** for the upload/edit form
- **Sonner** for toasts

## Prerequisites

- **Node.js 20+** and **npm** — for local dev
- A **replica-set–capable MongoDB** (MongoDB Atlas, or a local `mongod` started with `--replSet`). A plain standalone `mongod` will not work: the edit flow uses `session.withTransaction` in [src/app/(root)/books/actions/book.ts](src/app/(root)/books/actions/book.ts) to atomically replace the PDF chunks, and transactions require a replica set.
- Or just **Docker** (Docker Desktop / Docker Engine + Compose v2) — the provided `compose.yaml` runs Mongo as a self-initiating single-node replica set, no extra setup needed.

## Run locally

```bash
git clone git@github.com:QBERT18/talk-to-book.git
cd talk-to-book
npm install
cp .env.example .env.local
# open .env.local and fill in MONGODB_URI
npm run dev
```

Open <http://localhost:3000>.

**MONGODB_URI examples:**

| Setup | Connection string |
| --- | --- |
| Atlas | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/talk-to-book` |
| Local single-node RS | `mongodb://localhost:27017/talk-to-book?replicaSet=rs0&directConnection=true` |
| The bundled Docker Mongo (from the host) | `mongodb://localhost:27017/talk-to-book?replicaSet=rs0&directConnection=true` |

If you want a local RS without Docker, start `mongod --replSet rs0` and run `mongosh --eval "rs.initiate()"` once.

## Run with Docker

```bash
cp .env.example .env   # compose reads this file
docker compose up --build
```

What you get:

- **app** on <http://localhost:3000> — built via the multi-stage [Dockerfile](Dockerfile) using Next.js `output: "standalone"` for a small runtime image.
- **mongo** on `localhost:27017` — `mongo:7` started with `--replSet rs0`. A healthcheck self-initiates the replica set on first boot (idempotent on restarts), so there is no separate init container to wait for. Data persists in the `mongo-data` named volume.

The `MONGODB_URI` inside the `app` container defaults to `mongodb://mongo:27017/talk-to-book?replicaSet=rs0&directConnection=true` and can be overridden via `.env`.

Stop + wipe everything:

```bash
docker compose down -v
```

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | Mongo connection string. Must resolve to a replica set (see above). Read in [src/config/env.ts](src/config/env.ts), consumed in [src/lib/mongodb.ts](src/lib/mongodb.ts). |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` | Production build (emits `.next/standalone/server.js`) |
| `npm start` | Run the production server (local, non-Docker) |
| `npm run lint` | ESLint (`eslint-config-next` core-web-vitals + TypeScript) |

## Architecture at a glance

- Write path is **Server Actions**, not REST — see `uploadBookAction` / `updateBookAction` in [src/app/(root)/books/actions/book.ts](src/app/(root)/books/actions/book.ts).
- PDFs are split into **512 KB chunks** in a `BookChunk` collection; cover images are stored inline on the `Book` document as a `Buffer`.
- The **only HTTP API route** is [src/app/api/books/[id]/cover/route.ts](src/app/api/books/[id]/cover/route.ts), which streams the cover bytes with `Cache-Control: public, max-age=3600, immutable`.
- Home page uses an aggregation that projects out `coverContent`, so the list view never pulls binary blobs into memory.
- Upload size is capped at **10 MB** via `experimental.serverActions.bodySizeLimit` in [next.config.ts](next.config.ts).

For a deeper walk-through of gotchas (BSON `Binary` vs Node `Buffer` after `.lean()`, legacy books without cover bytes, transaction-based chunk replacement), see [CLAUDE.md](CLAUDE.md).
