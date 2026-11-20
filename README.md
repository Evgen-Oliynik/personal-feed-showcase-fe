# Personal Feed Web

The web client of **Personal Feed**, a showcase of a limited, per-visitor daily media feed.
A visitor picks a few tech topics, gets today's feed of articles, videos and podcast
episodes (at most 10 of each), reaches a clear "That's all for today", and can ask an AI
chat about what is in the feed.

Built with Next.js 16 (App Router), React 19 and Tailwind CSS 4. The API lives in
[`personal-feed-showcase-be`](https://github.com/Evgen-Oliynik/personal-feed-showcase-be).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER                                       │
│                                                                             │
│  localStorage "pfs.topics"  ──►  the visitor's topics (no account, no       │
│                                  cookie: the feed is per browser)           │
│                                                                             │
│  ┌──────────────────┐  ┌───────────────────────────┐  ┌───────────────────┐ │
│  │  /topics         │  │  /  (feed)                │  │  Chat drawer      │ │
│  │  TopicsEditor    │  │  FeedView                 │  │  ChatPanel        │ │
│  │  pick ≤ 10, Save │  │  tabs All/Read/Watch/     │  │  streamed answer, │ │
│  │                  │  │  Listen, cards, "That's   │  │  [n] citations,   │ │
│  │                  │  │  all for today"           │  │  history          │ │
│  └──────────────────┘  └───────────────────────────┘  └───────────────────┘ │
│           │                       │                            │            │
│      lib/topics-store.ts      lib/api.ts                   lib/chat.ts      │
└───────────│───────────────────────│────────────────────────────│────────────┘
            │                       │                            │
            ▼                       ▼                            ▼
   GET /topics/suggestions   GET /feed/today?topics=…   POST /chat (SSE)
            └───────────────────────┴────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │   Personal Feed API  :4000   │
                    └──────────────────────────────┘
```

The two repos share no code: `lib/api.ts` keeps its own copy of the API's types, and
`lib/topics-store.ts` mirrors the API's topic-name rule.

## User Flow

```
┌──────────────┐  no topics  ┌──────────────────────────┐  Save   ┌──────────────────┐
│  Open  /     │────────────►│  /topics                 │────────►│  /  feed         │
└──────────────┘             │  "Pick a few topics to   │         │  for the saved   │
       │                     │   start your feed"       │◄────────│  topics          │
       │ topics stored       │  suggestions + own names │ Change  └──────────────────┘
       └────────────────────►│  ≤ 10, Save → storage    │ topics          │
                             └──────────────────────────┘                 │ Ask
                                                                          ▼
                                                          ┌──────────────────────────┐
                                                          │  Chat drawer             │
                                                          │  question + last 6 pairs │
                                                          │  → streamed answer       │
                                                          └──────────────────────────┘
```

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | Today's feed for the stored topics: the date, the active topics with a "Change topics" link, tabs **All · Read n/10 · Watch n/10 · Listen n/10** (selected tab in `?tab=`), item cards, and "That's all for today" at the end of every tab. Redirects to `/topics` when no topics are stored |
| `/topics` | The topic picker: stored topics pre-selected, toggleable suggestions, a field for your own topic, the "n/10 selected" counter and **Save**, which writes the selection to `localStorage` and opens the feed |

Each card shows a type badge (Read / Watch / Listen), title, source, topic, relative date,
summary, thumbnail and, for videos and episodes, the duration; the whole card links to the
original in a new tab.

## Chat

- **Grounded.** The answer comes only from the visitor's feed and cites items as `[n]`; when
  the feed does not cover the question, it shows the muted notice
  "This is not in the collected materials".
- **Streamed.** `lib/chat.ts` reads the API's Server-Sent Events (`sources`, `delta`, `done`,
  `error`) from the `fetch` body, so the answer grows as it is written.
- **Conversational.** Each request carries the last 6 question/answer pairs of the page
  session, so follow-ups work. The conversation is not persisted.
- **Cited sources only.** Under an answer, the "Sources" list shows only the items the
  answer cited, in citation order; `[n]` markers link to them.
- **Errors** show "The assistant is unavailable right now".

## Responsive Layout

The UI is tested at six screens:

| Screen | Viewport | Feed card | Chat |
|--------|----------|-----------|------|
| Smartphone portrait | 390×844 | summary 2 lines, 72px thumbnail | closed; opens full-screen |
| Smartphone landscape | 844×390 | 3 lines, 120px | closed; opens full-screen; header not sticky |
| Tablet portrait | 820×1180 | 3 lines, 120px | closed; opens as a 400px overlay |
| Tablet landscape | 1180×820 | 4 lines, 160px | closed; opens as a 400px overlay |
| Laptop | 1440×900 | full summary, 200px | open and docked on the right (400px) |
| Desktop | 1920×1080 | full summary, 200px | open and docked on the right (400px) |

The feed is always **one column** (at most 960px wide from 1280px up); wider screens show
more of each card. The chat is always a drawer behind the **Ask** button: closed on load
below 1280px (full-screen on screens under 640px wide or under 500px tall, otherwise a 400px
panel from the right), open and docked from 1280px; Esc closes the overlay. There is no horizontal
page scroll at any size, and tap targets are at least 44×44px below 1024px.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, client components) |
| UI | React 19 |
| Styling | Tailwind CSS 4, light and dark mode via `prefers-color-scheme` |
| Language | TypeScript 5 |
| Unit / component tests | Vitest + Testing Library + jsdom |
| End-to-end tests | Playwright (Chromium) |
| Lint | ESLint 9 + `eslint-config-next` |

## Project Structure

```
personal-feed-showcase-fe/
├── app/
│   ├── layout.tsx              # Shell: header "Personal Feed", nav Feed / Topics
│   ├── page.tsx                # "/" — reads stored topics, redirects or renders the feed
│   ├── globals.css
│   ├── feed/
│   │   ├── feed-view.tsx       # Tabs, cards, end-of-feed block
│   │   ├── format.ts           # Relative dates, durations
│   │   ├── chat-drawer.tsx     # Ask button, overlay vs docked drawer (1280px)
│   │   └── chat-panel.tsx      # Conversation, streamed answers, cited sources
│   └── topics/
│       ├── page.tsx            # "/topics"
│       └── topics-editor.tsx   # Selection, suggestions, validation, Save
│
├── lib/
│   ├── api.ts                  # Typed API client (NEXT_PUBLIC_API_URL)
│   ├── chat.ts                 # POST /chat, SSE parsing, history payload
│   └── topics-store.ts         # localStorage "pfs.topics", isValidTopicName
│
├── e2e/                        # Playwright specs
│   ├── viewports.ts            # The six test viewports
│   ├── shell.spec.ts · topics.spec.ts · feed.spec.ts · chat.spec.ts
│   ├── responsive.spec.ts      # Every page at all six viewports
│   └── isolation.spec.ts       # Two browsers never affect each other's feed
│
├── playwright.config.ts        # Starts the API (fixtures) and this app
├── vitest.config.ts · vitest.setup.ts
└── .env.example
```

`*.test.ts(x)` files sit next to the code they test.

## Getting Started

Requires **Node.js 24** and npm, and the API running (see its README).

```bash
npm ci
cp .env.example .env.local   # only if the API is not on http://localhost:4000
npm run dev                  # http://localhost:3000
```

## Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |

### Quality

| Command | Description |
|---------|-------------|
| `npm run typecheck` | `next typegen` (route types), then `tsc --noEmit` |
| `npm run lint` | ESLint |

### Tests

| Command | Description |
|---------|-------------|
| `npm test` | Unit and component tests (Vitest, jsdom, `fetch` mocked) |
| `npm run test:e2e` | All Playwright specs |
| `npx playwright test e2e/<spec>.ts` | One Playwright spec |

Before the first e2e run: `npx playwright install chromium`.

Playwright starts both apps itself: the API from `../personal-feed-showcase-be`
(`npm ci && npm run start`, port 4000, `FAKE_EXTERNALS=1`, in-memory database) and this app
(`npm run dev`, port 3000). Ports 3000 and 4000 must be free, and only one Playwright run
can go at a time. The API checkout must sit next to this one.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL of the API; inlined at build time |

## Notes

- **Next.js 16** differs from older versions; `AGENTS.md` points to the docs bundled in
  `node_modules/next/dist/docs/`.
- **Topic names** follow the API's rule: lowercase `a-z`, `0-9`, spaces and `. + # -`, 1–40
  characters, starting with a letter or digit; stored names that break it are dropped on read.
- **Clearing site data** clears the topics; there is no cross-device sync.
- **Not included:** accounts, chat persistence, in-app playback (cards link out).
