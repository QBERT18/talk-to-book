# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server on :3000
- `npm run build` — production build
- `npm start` — run built app
- `npm run lint` — ESLint (extends `eslint-config-next/core-web-vitals` + `.../typescript`)

No test framework is wired up yet.

## Required environment

`.env.local` must define `MONGODB_URI`. It is read via `src/config/env.ts` and consumed in `src/lib/mongodb.ts`; both dev pages and server actions will throw at import time if it is missing.

## Architecture

Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui (`base-maia` style, Hugeicons). TypeScript path alias: `@/* → src/*`. MongoDB via Mongoose.

### Route layout

- `src/app/layout.tsx` — root layout (fonts, global `<Navbar/>` + `<Footer/>`).
- `src/app/(root)/` — route group that inherits the layout. Contains the book-facing pages.
  - `page.tsx` — home grid of books.
  - `books/new/page.tsx` — upload form (renders `BookForm` with no `initialData`).
  - `books/[slug]/page.tsx` — detail view.
  - `books/[slug]/edit/page.tsx` — edit form (renders `BookForm` with `initialData`).
  - `books/[slug]/chat/page.tsx` — chat UI. **Currently mocked** (fake `setTimeout` assistant reply). `VAPI_INTEGRATION_GUIDE.md` at repo root is the spec for wiring `@vapi-ai/web` into this page; that SDK is not yet installed.
- `src/app/(root)/books/actions/book.ts` — `"use server"` actions (`uploadBookAction`, `updateBookAction`) are the write path. There are no REST mutation endpoints.
- `src/app/api/books/[id]/cover/route.ts` — only HTTP API route: streams cover bytes by book id.

### Data model (`src/models/Book.ts`)

Two collections:

- **Book** — metadata plus the **cover image stored inline** as a `Schema.Types.Buffer` (`coverContent`). Unique `slug`, indexed.
- **BookChunk** — PDF content split into **512 KB chunks** (`CHUNK_SIZE` in `actions/book.ts`). Compound unique index on `{bookId, chunkNumber}`. The PDF itself is never stored as one blob.

In development the `Book` model is force-deleted from `mongoose.models` on import so schema edits take effect without restart.

### Connection caching (`src/lib/mongodb.ts`)

`dbConnect()` memoizes the mongoose connection on `global.mongoose` so hot reload does not leak sockets. Every server action / server component that touches the DB must `await dbConnect()` first.

### Write path conventions

- Server actions accept `FormData` (files go through as `File`). `next.config.ts` raises `serverActions.bodySizeLimit` to `10mb` — respect this ceiling when changing upload flows.
- Slug uniqueness is enforced by appending `-1`, `-2`, ... until a free slug is found (`slugify` is in `src/lib/utils.ts`).
- `updateBookAction` **replaces chunks inside a mongoose transaction** (`deleteMany` + `insertMany` in one `session.withTransaction`) so a partial failure cannot leave a book with zero chunks. Requires a replica-set-capable MongoDB (e.g. Atlas or local RS).
- Both actions call `revalidatePath("/")` and `revalidatePath("/books/<slug>")` after success.

### Read path gotchas

- `Book.findOne(...).lean()` returns **BSON `Binary`, not Node `Buffer`**, for `coverContent`. Unwrap via `.buffer` before use — see the cover API route and the book detail page for the pattern. Do not assume `Buffer.isBuffer(...)` is true after `.lean()`.
- Legacy docs may carry `coverName`/`coverSize` without `coverContent`. The home page uses an aggregation with `$addFields: { hasCover: ... }` that checks `coverContent` actually exists; the edit page gates `existingCoverUrl` on `book.coverContent != null`. Mirror this check in any new cover-consuming surface.
- The home page aggregation **projects out `coverContent`** (`$project: { coverContent: 0 }`) so the list view never pulls binary data. Covers are fetched lazily via `/api/books/:id/cover` (cached `max-age=3600, immutable`).

### Form layer (`src/components/book-form.tsx` + `src/schemas/zod.ts`)

One component handles both create and edit; `initialData?.id` toggles between `uploadBookAction` and `updateBookAction`. The Zod `formSchema` is shared client/server, and every `File`/`FileList` check is guarded by an `isClient` (`typeof window !== "undefined"`) fallback so the schema does not throw on the server where `FileList` is undefined. On edit, `file` and `cover` are optional (only replaced if the user picks a new one); on create, the component asserts both before calling the action.

## Notes

- `docker-compose.yml` and `mongo-data/` are git-ignored, suggesting a local Mongo setup is expected but not committed.
- `.claude` is git-ignored, so session files won't be committed.
