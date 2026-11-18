# Skill Swap

A small full-stack MVP where University of Hyderabad students trade skills: *"I'll teach you Python if you teach me guitar."*

Students create a profile listing what they can teach and what they want to learn, discover each other, and send skill-exchange requests that the other student can accept or reject.

**Stack:** React + Vite + TypeScript + Tailwind CSS (client) · Node.js + Express (API) · MongoDB + Mongoose · JWT + bcrypt · Lucide icons

## Features

- **Auth**: register / log in with name, email, password, university, department. Passwords are hashed with bcrypt, sessions use JWT.
- **University-only registration**: only an email on an allowed university domain (`uohyd.ac.in` / `uohyd.ernet.in` by default) can register — see [Environment variables](#environment-variables) to change the list.
- **Email verification**: a new account must verify its email (a link, emailed or logged to the server console — see below) before it can **log in again**. The very first session after registering is still granted, so onboarding isn't blocked on an email arriving.
- **Skill swaps**: profiles with skills you can teach and want to learn, discovery and search, matching, and exchange requests that the other student accepts or rejects. A student with no skills yet can still send a request — it's just a one-directional "teach me" ask instead of a swap.
- **Verified instructors**: any student can apply to become an instructor. **Nobody is an instructor until an admin approves the application.** Admins can also reject (with a reason the applicant sees) or revoke later.
- **Student / Instructor switch**: a verified instructor can flip between the two views at any time from the top bar. Instructor mode adds the Teaching page; the choice is remembered.
- **Live classes**: verified instructors schedule classes (skill, date and time, duration, seats, optional price). The skill is picked from a dropdown of the instructor's own skills, not typed freely. Students browse, join and leave them. Overlapping classes and overbooking are prevented.
- **Payments (mock)**: a class can have a price; joining a paid class requires a clearly-labelled demo payment first. See [Payments](#payments-mock) below — no real gateway is involved.
- **Video**: each class has a live video room (Jitsi, via JaaS). Only the host and students who joined can enter, only from 15 minutes before the start, and only the host is a moderator.
- **Chat and on-demand video for accepted requests**: once a request is accepted, both students get a real-time chat (Socket.IO) and a video-call button, reusing the same Jitsi/JaaS signing as scheduled classes — but with no "host": both sides are equal moderators in an on-demand room, open any time.
- **Admin**: a review queue for instructor applications (pending, verified, rejected).
- **App shell**: sidebar on desktop, bottom tab bar on phones, a top bar with page title, quick search and an account menu. The navigation adapts to who you are (student, instructor, admin).
- **UX details**: toast notifications, confirmation dialogs for destructive actions, loading skeletons, empty and error states, inline validation with focus management, keyboard-accessible dialogs and menus, and a skip-to-content link.

Deliberately **not** included: class recordings, reviews, notification emails (besides verification), analytics. Classes can be cancelled but not edited.

## Project structure

```
server/                      Express API + Socket.IO (same HTTP server/port)
  src/
    config/                  env loading + MongoDB connection
    models/                  User (skills, role, instructor status, verification),
                             ExchangeRequest (skill swap/request), Session (a class),
                             Payment (a mock receipt), Message (chat)
    controllers/             auth, users, requests (+ chat/video), instructor, admin, sessions (+ payment)
    routes/                  route table
    middleware/              JWT auth, error handling
    utils/                   validation, matching, serializers, class timing,
                             JaaS token signing, outgoing email (mailer.js)
    realtime.js              Socket.IO server: real-time chat for accepted requests
    seed.js                  sample data
    make-admin.js            promote an account to admin
  test/                      node:test suites (unit + API integration, incl. real Socket.IO clients)
client/                      React app
  src/
    api/                     fetch wrapper + typed endpoints
    components/
      ui/                    design-system primitives: Button, Field (Input/Select/Textarea),
                             Badge, Avatar, Dialog, Toast, Skeleton, EmptyState, Alert, PageHeader
      layout/                AppShell (sidebar, top bar, bottom nav), PublicLayout, AuthLayout
      ...                    StudentCard, RequestCard, RequestForm, SkillBadge, SkillList,
                             SkillEditor, ScheduleClassDialog, PaymentDialog, VideoMeeting (shared Jitsi embed)
    context/                 auth state
    hooks/                   useFetch, usePageTitle
    pages/                   Landing, Login, Register, VerifyEmail, Dashboard, Discover,
                             StudentProfile, MySkills, MyProfile, Requests, RequestChat, RequestRoom,
                             Classes, Teaching, ClassRoom, InstructorApply, Admin
```

**Design system.** Colours, radii and fonts are defined once in `client/src/index.css` (`@theme`): pink is the brand colour, violet marks skills people *want* to learn, cards are white with a subtle border, and Inter is self-hosted via `@fontsource-variable/inter`.

## Setup

**Prerequisites:** Node.js 22+ and a MongoDB instance (local install or a MongoDB Atlas connection string).

### 1. Start MongoDB

Local, for example with Homebrew on macOS:

```bash
brew services start mongodb-community
```

or point `MONGODB_URI` at an Atlas cluster in the next step.

### 2. Configure and start the API

```bash
cd server
npm install
cp .env.example .env      # then edit .env, at minimum set JWT_SECRET
npm run seed              # optional: load sample students (see below)
npm run dev               # API on http://localhost:5000  (npm start for no auto-reload)
```

Generate a good secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start the client

In a second terminal:

```bash
cd client
npm install
cp .env.example .env      # optional, defaults work for local development
npm run dev               # http://localhost:5173
```

The Vite dev server proxies both `/api` and `/socket.io` (real-time chat) to the API, so no CORS setup is needed locally.

### 4. Registering a real (non-seeded) account

Registration only accepts an email on an allowed university domain (`uohyd.ac.in` / `uohyd.ernet.in` by default — see [Environment variables](#environment-variables) to change this for local testing). A new account must also verify its email before it can **log back in** later. Without SMTP configured, the verification link is printed to the **server's console** — copy it into your browser to verify. To set up real email delivery, add `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` to `server/.env`.

### 5. Turn on video (optional but needed for live calls)

The app works without this, but opening a class's video room will say video isn't set up. The public `meet.jit.si` server no longer allows embedding, so video runs on **JaaS** (Jitsi as a Service, by 8x8). Setup takes a few minutes:

1. Create an app at <https://jaas.8x8.vc> and copy its **App ID**.
2. Under *API keys*, generate a key pair. Download the private key and note the **key ID**.
3. Put these in `server/.env` (see `.env.example`):

```
JAAS_APP_ID=vpaas-magic-cookie-...
JAAS_KEY_ID=4f4910
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
```

The private key goes on one line with literal `\n` between lines. Restart the API. The server signs a short-lived token per person and per room, so JaaS only admits the host and students who joined that class. Check JaaS's current pricing and free-tier limits for your expected usage.

### 6. Create an admin

Admins are never created through the app. If you ran the seed, `admin@example.com` already exists. For a real database, register normally and then promote the account:

```bash
cd server
npm run make-admin -- you@example.com
```

### 7. Try it out

Open http://localhost:5173. If you ran the seed script, log in with:

| Email | Password |
| --- | --- |
| `aarav.sharma@example.com` | `password123` |

The seed script loads **34 fictional students** from across the university (CS, Physics, Economics, Linguistics, Dance, Theatre, History and more, from all over India) with Indian-campus skills like Carnatic vocals, Kuchipudi, Telugu, Urdu calligraphy, UPSC preparation and Hyderabadi cooking alongside Python and Figma. It also adds **15 exchange requests** in every state (pending, accepted, rejected).

Aarav (CS) is also a **verified instructor** (use the Student / Instructor switch at the top), and teaches Python/Data Structures/React and wants Telugu/Guitar/UI Design/Public Speaking, so his dashboard shows recommendations, three pending incoming requests, and sent requests in each status. Other accounts to try (all `password123`):

| Email | Role |
| --- | --- |
| `admin@example.com` | Admin: review applications at **Admin** |
| `zoya.khan@example.com`, `rhea.fernandes@example.com`, `kavya.jha@example.com`, `imran.ali@example.com` | Verified instructors with scheduled classes |
| `tanmay.bhattacharya@example.com`, `fathima.rahman@example.com` | Applied to teach, waiting for review |
| `rohan.deshmukh@example.com` | Application rejected (with feedback) |
| `lakshmi.prasanna@example.com` | A plain student |

The seed also creates 8 classes (one whose room is open right away, one full, one already finished, one cancelled, and two **paid** — ₹299 and ₹199, demoing the mock payment flow with receipts already recorded for their existing attendees). Class times are relative to when you run the seed, so re-run it to refresh them. Every seeded student uses the same password and an email of the form `firstname.lastname@example.com` (e.g. `lakshmi.prasanna@example.com`), which is handy for logging in as the other side of a request. All names are made up, and `example.com` addresses cannot reach a real inbox.

Seeded accounts are inserted directly into the database, so they skip both the email-domain check and the email-verification step that a real registration goes through — they just log in. Aarav's accepted requests (with Zoya Khan and Rhea Fernandes) are a good place to try the chat and video-call buttons on **My Requests**.

> **`npm run seed` deletes all existing users, exchange requests, classes and payments** before inserting the samples. It refuses to run when `NODE_ENV=production`.

## Environment variables

**`server/.env`**

| Variable | Default | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | *(required)* | Secret for signing tokens. In production it must be 32+ characters and not the example value. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/skillswap` | MongoDB connection string |
| `PORT` | `5000` | API port |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Origin allowed by CORS |
| `NODE_ENV` | `development` | Set to `production` when deploying |
| `JAAS_APP_ID`, `JAAS_KEY_ID`, `JAAS_PRIVATE_KEY` | *(optional)* | JaaS credentials for live video (see above) |
| `ALLOWED_EMAIL_DOMAINS` | `uohyd.ac.in,uohyd.ernet.in` | Comma-separated domains allowed to register. Set to an empty string to allow any domain (e.g. for local testing with `@example.com` seed data) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | *(optional)* | Outgoing email for verification links. Without these, the link is printed to the server's console instead — fine for local development |

**`client/.env`**

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Where the dev server proxies `/api` and `/socket.io` (match the API `PORT`) |
| `VITE_API_URL` | `/api` | Full API base URL, only needed when the API is on a different origin than the client. The chat server is derived from this (same origin, minus `/api`) |

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| `server` | `npm run dev` | API with auto-reload |
| `server` | `npm start` | API |
| `server` | `npm run seed` | Reset and load sample data |
| `server` | `npm run make-admin -- <email>` | Promote an account to admin |
| `server` | `npm test` | Run backend tests |
| `client` | `npm run dev` | Dev server |
| `client` | `npm run build` | Type-check and build to `client/dist` |

## Tests

```bash
cd server
npm test
```

Runs the matching-algorithm unit tests and API integration tests — auth (including email-domain restriction and the verify/resend flow), validation, authorization, search, requests (including skill-less one-directional ones), the instructor-verification workflow, class scheduling and joining (skill-restricted, capacity races), the mock payment flow, and real-time chat and video (a genuine Socket.IO client connects, joins a conversation, sends and receives messages, and the signed video tokens — both scheduled-class and on-demand — are verified against a generated RSA key) — against a **separate** database, `skillswap_test`, on your local MongoDB. Set `MONGODB_URI_TEST` to use another one; the name must end in `_test` because the suite wipes it. Your development data is never touched.

## API

All routes are under `/api`. Everything except register, login and health requires `Authorization: Bearer <token>`. Errors look like `{ "message": "...", "errors": { "field": "..." } }`.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create account (must be on an allowed email domain), returns `{ token, user }`. `user.emailVerified` starts `false` |
| `POST` | `/auth/login` | Returns `{ token, user }`. 403 with `{ emailNotVerified: true }` if the email hasn't been verified yet |
| `GET` | `/auth/me` | Current user |
| `POST` | `/auth/verify-email` | `{ token }` from the emailed link → verifies and returns `{ token, user }` (logs you in) |
| `POST` | `/auth/resend-verification` | `{ email }` → always the same generic response, whether or not that email exists or is already verified |
| `PUT` | `/users/me` | Update name, university, department, bio, `skillsOffered`, `skillsWanted` |
| `GET` | `/users?search=&limit=&sort=` | Other students. `search` matches name or skill, `limit` 1–100 (default 24), `sort` is `match` (default, best match first) or `name` (A–Z). Returns `{ students, total }` |
| `GET` | `/users/recommended?limit=` | Students who teach something you want to learn |
| `GET` | `/users/:id` | A student's public profile |
| `POST` | `/requests` | Send a request: `{ recipientId, skillWanted, skillOffered?, message? }` — `skillOffered` is optional (a plain "teach me" ask if omitted) |
| `GET` | `/requests` | `{ incoming, outgoing }` for the current user |
| `PATCH` | `/requests/:id` | Recipient only: `{ status: "accepted" \| "rejected" }`. Accepting opens that request's chat and video room |
| `GET` | `/requests/:id/messages` | Chat history for an accepted request, participants only: `{ other, messages }` |
| `GET` | `/requests/:id/room` | On-demand video room for an accepted request, participants only — both sides get moderator rights |
| `POST` | `/instructor/apply` | Apply to become an instructor: `{ headline, experience }` (needs at least one teachable skill) |
| `PUT` | `/users/me/mode` | Verified instructors only: `{ mode: "student" \| "instructor" }` |
| `GET` | `/admin/instructors?status=` | Admin only: applications (`pending`, `verified`, `rejected`) with counts |
| `PATCH` | `/admin/instructors/:id` | Admin only: `{ decision: "approve" \| "reject" \| "revoke", note }` (not on yourself) |
| `GET` | `/sessions?view=&q=&instructor=` | Classes: `browse` (default), `joined`, or `hosting` (verified instructors) |
| `POST` | `/sessions` | Verified instructors only: `{ title, skill, description, startsAt, durationMinutes, capacity, price? }`. `skill` must be one of the instructor's own skills |
| `GET` | `/sessions/:id` | One class (the host also gets the attendee list) |
| `POST` | `/sessions/:id/pay` | Mock payment for a paid class — records a receipt, does **not** join by itself (see [Payments](#payments-mock)) |
| `POST` / `DELETE` | `/sessions/:id/join` | Join or leave a class. 402 if the class is paid and not yet paid for |
| `POST` | `/sessions/:id/cancel` | Host only |
| `GET` | `/sessions/:id/room` | Host and joined students only, while the room is open: returns the signed video token |

**Socket.IO** (same server/port, default path `/socket.io`): connect with `auth: { token }` (the same JWT). Events: `request:join` (ack) — join an accepted request's room; `message:send` `{ requestId, text }` (ack with the saved message) — the server re-checks you're still a participant before saving or broadcasting; `message:new` (server → room) — a new message, including your own sends.

Rules enforced on the server:

- Only an email on an allowed domain can register (see [Environment variables](#environment-variables)).
- A new account must verify its email before it can log in again (not before the very first, post-registration session).
- You cannot send a request to yourself.
- `skillWanted` must be on the recipient's teaching list; `skillOffered`, if given, must be on yours — but it's optional.
- Only one pending request per student and skill pair.
- Only the recipient can respond, and only once; answered requests are final. Accepting creates that request's chat/video room.
- Only a request's two participants can read its messages, join its Socket.IO room, or open its video room — checked on every send, not just once.
- Only an admin can make someone an instructor, and no public endpoint can set roles. Admins cannot review themselves.
- Only verified instructors can schedule or host classes, and only for a skill they've listed on their own profile. Revoking verification cancels their upcoming classes.
- A class can't be overbooked (the seat check and the join are one atomic update), and an instructor can't schedule two overlapping classes.
- A paid class can't be joined without a (mock) payment first; paying twice doesn't double-charge, and leaving doesn't refund — so rejoining later needs no second payment.
- The scheduled-class video room opens 15 minutes before the start and closes 30 minutes after the scheduled end; the on-demand request room has no such window. Tokens name one room, expire quickly, and never include an email.
- Emails are private. They are revealed to **both** students only after a request is accepted.

## How matching works

For the current user (**me**) and another student, the server computes:

- `theyCanTeachMe`: skills they teach that I want to learn
- `iCanTeachThem`: skills I teach that they want to learn
- `mutual`: both lists are non-empty (a true swap)

```
score = 3 × |theyCanTeachMe| + 2 × |iCanTeachThem| + (mutual ? 5 : 0)
```

Skill names are compared case-insensitively. **Recommendations** include only students with at least one skill I want, sorted by score (ties alphabetical), so complementary swaps come first. **Discover** lists everyone, using the same ordering. The logic lives in [`server/src/utils/matching.js`](server/src/utils/matching.js).

## Design notes and limitations

This is an MVP; some trade-offs are intentional:

- **Skills are embedded** in each user document rather than a separate collection. Skill names are free text, so "Python" and "python" match but "Py" does not.
- **Matching and search load all users into memory** per request. Fine for a campus-scale MVP (thousands of students); at larger scale, move scoring into the database and paginate properly.
- **The JWT is stored in `localStorage`**, which is simple but readable by any script on the page. An `httpOnly` cookie would be safer for a production deployment.
- **No rate limiting or password reset.**
- **Requests cannot be cancelled** by the sender.
- **Classes cannot be edited** after scheduling (cancel and recreate), and there is no reminder email or notification before a class.
- **Payments are a mock**, not a real gateway — see [Payments](#payments-mock) below.
- **Live video was verified up to the integration point**: token signing is tested against a generated RSA key, and the browser integration is tested with a stand-in for the JaaS script. A real call needs your JaaS keys.
- **Chat history has no pagination** (capped at the most recent 500 messages per conversation) and no delivery/read receipts.

## Payments (mock)

There's no real payment gateway wired up — no Razorpay, Stripe, or card details collected anywhere. An instructor can optionally set a **price** when scheduling a class; if it's above ₹0, a student sees a "Pay ₹X & join" button that opens a dialog **clearly labelled as a demo payment**. Confirming it calls `POST /sessions/:id/pay`, which just writes a `Payment` receipt (`provider: "mock"`) to the database — no money moves, no external request is made. That receipt is what lets the student join, and it's checked again (not re-charged) if they leave and rejoin later.

This exists so the paid-class flow described in a project's documents or diagrams has something real to point at and demo, while being honest that it isn't processing real transactions. A real gateway would plug in alongside `sessions.controller.js: payForSession` and `models/Payment.js`, using the same `Session.price` field and the same join-gate — that integration point is deliberately isolated so it can be swapped in later.

## Deploying

Build the client with `npm run build` in `client/` and serve `client/dist` from any static host. If the API is on another origin, set `VITE_API_URL` at build time and `CLIENT_URL` on the server to the client's origin. Run the API with `NODE_ENV=production`. The real-time chat server (Socket.IO) shares the API's HTTP server and port — there's nothing extra to deploy or configure for it beyond `CLIENT_URL` (used for its CORS check too).
