# Reset

A playful, local-first life-reset app for rebuilding a routine, clearing a BCA backlog, training, building a NestJS project, and keeping an honest record of the days.

- **Mobile:** Expo SDK 58, React Native, TypeScript, Expo Router, Zustand, TanStack Query, SQLite, Expo Notifications, Reanimated.
- **API:** Express + TypeScript + MongoDB (Atlas or local), JWT auth, optional sync and snapshot backup.
- **Default timezone:** `Asia/Kathmandu` (UTC+05:45). The seeded plan starts **1 November 2026**.

The app works fully offline. Cloud sync is optional and only points at the server you configure.

## What is inside

- **Home** — yellow-and-purple command center with an original animated mascot, current focus, up-next card, compact level/XP progress, full timeline, check-in, and rest/recovery.
- **Plan** — horizontal date carousel, phase chapter, continuous mission timeline, side quests, reschedule, and rest controls.
- **Progress** — level rank, streak, 7-day bars, 12-week heatmap, syllabus progress, milestones.
- **Journal** — light daily check-in plus a structured reflection.
- **Profile** — deep links into every area, sync and reminder status.
- **Routine** — editable blocks per phase plus a dedicated drag-and-drop editor: reorder with handles or accessible move buttons, adjust durations, pin fixed-time events, undo, resolve conflicts, and save/cancel with a dirty indicator.
- **Academic** — BCA subjects, syllabus topics, confidence, study sessions.
- **Fitness** — weekly plan, easy variants, workout logs, safety notes.
- **NestJS Project Time** — 10 applied project steps, notes, code checks, and project sessions.
- **Focus** — drift-safe timer, presets, subject/topic links, partial saves.
- **Streak** — month calendar, rest/recovery allowance, consistency.
- **Onboarding** — four short steps, no guilt copy.

Seeded phases: vacation (1–16 Nov), college (17–24 Nov), exam (25 Nov onward), post-exam (manual). Streak threshold defaults to 70%; skipped goals are removed from the denominator so intentional rest never reads as failure. Schedule recalculation preserves each block's duration, keeps fixed events pinned, and blocks saving until overlaps are resolved.

## Quick start

### 1. Mobile

```bash
cd mobile
npm install
npx expo start
```

Open in Expo Go / a development build, or press `a` / `i`. Notifications and SecureStore are best tested in a development build.

Optional: point the app at your API by default.

```bash
cd mobile
cp .env.example .env
# edit EXPO_PUBLIC_SYNC_URL=http://YOUR_LAN_IP:4000
```

You can also enter the server address inside **Profile → Sync & backup**.

### 2. API

```bash
cd server
npm install
cp .env.example .env
# fill MONGODB_URI and JWT_SECRET
npm run dev
```

- Create a free MongoDB Atlas cluster (or use a local MongoDB) and put the connection string in `MONGODB_URI`.
- `JWT_SECRET` must be at least 16 characters. Use a long random value.
- `npm run build && npm start` for production.

Health check: `GET http://localhost:4000/health`.

### Server URLs from a phone

| Where the app runs | URL |
| --- | --- |
| iOS simulator | `http://localhost:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| Physical phone | `http://<computer LAN IP>:4000` |

The phone and computer must be on the same network. Do not expose the development server to the public internet without HTTPS and real secrets.

## Sync model

- XP awards are immutable SQLite rows, included in sync and backups; re-opening a mission never removes XP already earned.
- Each local write also appends to a compact SQLite **outbox**.
- **Push** sends queued records to `POST /api/sync/push`. The server keeps the newest `clientUpdatedAt` per `(user, entity, recordId)`.
- **Pull** pages through `GET /api/sync/pull` using an opaque cursor and applies remote changes locally. Local edits newer than the incoming record are kept.
- **Backup** uploads a full snapshot (`POST /api/backup`); **restore** downloads the latest snapshot and replaces local tables after explicit confirmation.
- Tokens live in the device keychain via `expo-secure-store`; passwords are hashed with bcrypt on the server. No analytics or third-party tracking.

Automatic sync runs quietly after launch when online and signed in. Manual controls live in **Profile → Sync & backup**.

## Notifications

Reminders are **off by default**. On the notifications screen you can:

- enable a sparse set of reminders (wake anchor, movement, study, revision, reflection, wind-down),
- edit each time,
- set quiet hours (they can cross midnight; times inside them are skipped),
- request device permission, open system settings, or send a test reminder.

No streak-shaming notifications are sent.

## Data and privacy

- Local data is a private SQLite database named `reset.db` on the device.
- The server stores only what you choose to sync: your account email, a bcrypt password hash, synced records, and your latest backup snapshot.
- Signing out leaves local data untouched.
- Delete sync data from the device by deleting the app; delete a cloud account with `DELETE /api/auth/account` (authenticated).

## Checks

```bash
cd mobile
npm run typecheck
npm test

cd ../server
npm run typecheck
npm run build
```

Mobile tests cover date keys, streaks, completion, phases, sync conflict rules, timeline construction, routine reordering, duration preservation, fixed-event conflicts, dynamic current-focus selection, and XP/level math. The server is typechecked and built with TypeScript.

## Project layout

```text
reset/
├── mobile/
│   ├── app/                     Expo Router screens
│   │   ├── (tabs)/              Home, Plan, Progress, Journal, Profile
│   │   ├── academic/            Subjects and syllabus
│   │   ├── fitness/             Weekly plan and workout detail
│   │   ├── goal/[id].tsx        Goal actions
│   │   ├── notifications.tsx    Reminder settings
│   │   ├── preferences.tsx      Identity, theme, anchors, streak rules
│   │   ├── sync.tsx             Account, sync, backup and restore
│   │   └── ...                  Focus, project time, routine editor, schedule, streak
│   └── src/
│       ├── components/          Design system and shared visuals
│       ├── db/                  Schema, seeds, repositories, backup/apply
│       ├── features/            Goal, schedule and study sheets
│       ├── lib/                 Pure logic + tests
│       ├── services/            API client and sync orchestration
│       ├── store/               Zustand app state
│       └── theme/               Light/dark tokens
└── server/
    └── src/
        ├── models/              User, SyncRecord, Backup, RoutineConfig
        ├── routes/              auth, sync, backup, progress, routine
        ├── app.ts               Express middleware and routes
        └── server.ts            Mongo connection + graceful shutdown
```

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current account |
| `DELETE` | `/api/auth/account` | Delete account and cloud data |
| `POST` | `/api/sync/push` | Upload queued records (max 500) |
| `GET` | `/api/sync/pull` | Cursor-paged changes |
| `POST` | `/api/backup` | Replace latest snapshot |
| `GET` | `/api/backup/latest` | Download latest snapshot |
| `GET` | `/api/progress` | Server-side streak/consistency summary |
| `GET` | `/api/routine` | Latest routine snapshot |
| `PUT` | `/api/routine` | Save routine snapshot |

## Design principles

- Bright, cartoon-inspired yellow, purple, and turquoise identity with an original mascot and no copied game assets.
- Playful progression without punishment; light and dark themes still respect contrast and reduced-motion preferences.
- Missions earn configurable XP, daily completion adds a plan bonus, and levels are derived from real completed work.
- Clear and uncluttered: the current focus stays obvious while the full day remains available below.
- Local-first, offline-tolerant, no fake buttons.
- Every schedule and reminder is editable, including drag reordering, fixed-time events, and automatic time recalculation.
- Intentional skips and rest days are part of the plan.
- Small steps count; the app never uses shame as motivation.
