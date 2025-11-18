# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collaborative date picker web application (similar to Doodle) built with Next.js 15, React 19, and SQLite. Users create scheduling events with multiple possible dates, share a link, and participants mark their availability. The app visualizes responses with a heatmap showing the best dates.

## Development Commands

```bash
# Development server (port 3000 by default)
npm run dev

# Production build
npm run build

# Production server (port 9835)
npm start

# Linting
npm run lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.0.3 (App Router) with React 19
- **Database**: SQLite via better-sqlite3 (file: `datepicker.db` in project root)
- **Internationalization**: next-intl with Chinese (default) and English
- **Styling**: Tailwind CSS
- **Authentication**: Password-based (bcrypt) without traditional sessions

### Database Schema

Located at `datepicker.db` in project root. Initialized in `lib/db.ts`:

**events table**:
- `id` (TEXT PRIMARY KEY) - UUID
- `name` (TEXT) - Event name
- `password_hash` (TEXT) - Creator's bcrypt hash
- `possible_dates` (TEXT) - JSON array of ISO date strings
- `created_at` (INTEGER) - Timestamp

**responses table**:
- `id` (INTEGER PRIMARY KEY)
- `event_id` (TEXT) - Foreign key to events
- `user_name` (TEXT) - Participant name
- `user_password_hash` (TEXT) - User's bcrypt hash
- `availability` (TEXT) - JSON object mapping dates to status: `"available" | "maybe" | "unavailable" | null`
- `created_at`, `updated_at` (INTEGER) - Timestamps

### Authentication Pattern

Two-level password system without sessions:

1. **Event Creator Password**: Generated server-side on event creation, required to edit event (PATCH `/api/events/{id}`)
2. **User Password**: Generated server-side when user first submits availability, required to update responses

Both passwords are:
- 12 characters (excluding confusing chars like 0, O, I, l, 1)
- Shown once in modal after generation
- Cached in localStorage (`lib/localStorage.ts`)
- Hashed with bcrypt (10 rounds) in database

### Internationalization (i18n)

- **Routing**: `/{locale}/*` where locale is `en` or `zh`
- **Middleware**: `middleware.ts` handles locale detection and routing
- **Config**: `i18n/request.ts` - returns `locale` and `messages` to next-intl
- **Messages**: `messages/en.json` and `messages/zh.json`
- **Important**: In Next.js 15, must use `requestLocale` parameter (not `locale`) and await it, then return `locale` in config object

### API Routes

All routes in `app/api/`:

- `POST /api/events` - Create event, returns `{ id, password }`
- `GET /api/events/{id}` - Fetch event with all responses (public)
- `PATCH /api/events/{id}` - Edit event (requires creator password in body)
- `POST /api/responses` - Submit/update availability (requires user password if updating)

### Key Components

**Calendar component** (`components/Calendar.tsx`):
- Multi-mode: `select` (event creation) or `availability` (user response)
- Props: `mode`, `showHeatmap`, `heatmapData`, `showAllMonths`, `possibleDates`
- Handles date selection, availability marking, and heatmap visualization
- Used in both event creation and event detail pages

**localStorage utilities** (`lib/localStorage.ts`):
- Client-side password caching for UX
- Keys: `datepicker_creator_passwords`, `datepicker_user_data`
- All functions check `typeof window !== 'undefined'` for SSR safety

### Data Flow

1. **Event Creation**: User → `EventCreationForm` → POST `/api/events` → SQLite → Returns password → Stored in localStorage
2. **Event Viewing**: Load page → GET `/api/events/{id}` → Server joins events + responses → Client calculates heatmap
3. **Submit Availability**: User marks dates → POST `/api/responses` → Server generates password (first time) → SQLite → Returns password
4. **Edit Event**: Creator → Enters password → PATCH `/api/events/{id}` → Server verifies via bcrypt → Updates SQLite

### Important Patterns

1. **Singleton DB Connection**: `lib/db.ts` maintains single connection via `getDb()` function
2. **Lazy Schema Init**: Tables created on first `getDb()` call with `CREATE TABLE IF NOT EXISTS`
3. **JSON Storage**: Complex fields (`possible_dates`, `availability`) stored as JSON strings
4. **Client-Side Heatmap**: Aggregation done in React component, not database query
5. **No Real-Time Updates**: Users refresh page to see latest responses

## Code Conventions

- ESM-style imports, no semicolons
- TypeScript strict mode
- Use `await params` and `await searchParams` in Next.js 15 pages
- Use `await headers()` before accessing header values in Next.js 15
- Component files use default exports
- Utility files use named exports

## Common Gotchas

1. **Next.js 15 Breaking Changes**: All dynamic APIs (`params`, `searchParams`, `headers`, `cookies`) must be awaited
2. **next-intl Config**: Must use `requestLocale` parameter and return `locale` in config object
3. **SQLite Path**: Database file is `datepicker.db` in project root via `process.cwd()`
4. **Password Display**: Passwords shown only once after generation - not retrievable later
5. **localStorage in SSR**: Always check `typeof window !== 'undefined'` before accessing localStorage
