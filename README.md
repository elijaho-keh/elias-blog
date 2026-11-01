# Dailies

**A behind-the-scenes blog by Elias Grünewald Dykert**: filmmaker, painter and AI content engineering student at Berghs School of Communication in Stockholm.

In film, *dailies* are the raw footage you watch at the end of each shooting day, before anything is fixed in the edit. This blog is the same idea for my projects: the process, the ideas and the parts that didn't work, for classmates, teachers, creative agencies and anyone who finds my portfolio.

- **Live site:** https://elias-blog-xi.vercel.app
- **Portfolio:** https://eliasdykert.se
- **Course:** Programming & Methods, Berghs School of Communication (individual project)

---

## Features

| # | Assignment task | How it's done |
|---|---|---|
| 1 | **Post listing and post pages** | The home page lists every post with cover image, title, date, category and AI summary. Clicking a post opens `post.html?slug=…` with a back link at the top and bottom. Posts come from Neon through `GET /api/posts` and `GET /api/post`. |
| 2 | **Login and logout** | One author account, created by `npm run db:seed` from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. No public sign-up. Passwords are hashed with bcrypt. Sessions live in the `sessions` table: a random token sits in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, and the database stores only its SHA-256 hash. |
| 3 | **Add posts** | A "New story" form (title, category, cover image, image description, keyword, text). **The server checks the session** in `POST /api/posts` and answers 401 without a valid login, whatever the browser shows. Every field is validated on the server. |
| 4 | **Comments** | Anyone can comment with a name and a comment, no login needed. Comments are stored in Neon and shown under the post. A hidden honeypot field stops simple bots. All visitor text is shown with `textContent`, never `innerHTML`. |
| 5 | **AI summary** | When a post is created, the server asks OpenRouter (model from `OPENROUTER_MODEL`) for a two-sentence summary and stores it in `posts.summary`. The post is saved first, so it's kept even if the AI fails. `npm run ai:summaries` fills in the seed posts. |
| 6 | **Search and filter** | A live search over titles, text and summaries, plus All / Film / AI / Art buttons with live counts. Written in vanilla JavaScript: a `state` object, a `CATEGORIES` array, and small functions and conditions (`matchesQuery`, `matchesCategory`, `countByCategory`). The filter is saved in the URL. |
| 7 | **External API** | A "Kindred work" box on every post page: an artwork from the **Cleveland Museum of Art Open Access API** that matches the post's keyword, with image, title, artist, date and a link. It has loading, not-found and error states. *The brief named the Art Institute of Chicago. Its firewall blocked visitors arriving from the blog, so I switched museums. See [PROCESS.md](PROCESS.md#phase-9-kindred-work-external-api).* |
| 8 | **Theme switcher** | Light and dark themes built on CSS variables. The site follows the system setting until you click ☾ / ☀, and the choice is saved in `localStorage` with no flash on page load. |

**Also:** responsive layout from phone to desktop, uncropped images, accessible forms (labels, field errors, `aria-live` status messages, a skip link), and a "story not found" page.

## Tech stack

| Part | Choice |
|---|---|
| Frontend | Plain HTML, CSS and vanilla JavaScript (ES modules). No framework, no build step. |
| Backend | Vercel serverless functions in `/api` (Node.js 24), running in Frankfurt (`fra1`) |
| Database | PostgreSQL on Neon (free plan, AWS Frankfurt) with `@neondatabase/serverless` over HTTP |
| Auth | `bcryptjs` for password hashing, sessions in the `sessions` table |
| AI | OpenRouter, default model `anthropic/claude-haiku-5.5` |
| External API | Cleveland Museum of Art Open Access API (no key) |
| Hosting | Vercel, deployed from this public GitHub repo on every push |
| Fonts | Instrument Serif, Source Serif 4, Inter (Google Fonts) |

## Project structure

```
public/            what the browser loads
  index.html         home: story list, search and filter
  post.html          one post: text, video, Kindred work, comments
  login.html         author login
  new.html           "New story" form (logged in only)
  css/style.css      all styles; colours and fonts as CSS variables
  js/                one module per page + shared helpers
    api.js             every request to our own API goes through here
    lib.js             el() (safe element builder), dates, text helpers
  img/               images from eliasdykert.se
api/               Vercel serverless functions (one file = one URL)
  posts.js           GET list, POST create (login required)
  post.js            GET one post by slug
  comments.js        GET and POST comments
  login.js, logout.js, me.js
  kindred.js         GET a matching artwork from the museum
lib/               shared server code
  db.js              query() and transaction() with $1, $2 parameters
  auth.js            sessions, cookies, requireUser()
  posts.js, comments.js   queries and validation
  ai.js              OpenRouter summaries
  kindred.js         Cleveland Museum of Art search
  http.js            405, 415 and safe 500 responses
scripts/           run on your own computer
  schema.sql         the database tables
  db-schema.js, seed.js, db-check.js, summarize.js
data/posts.json    the eight seed posts
docs/architecture.md   data-flow diagrams
PROCESS.md         decisions, problems and solutions, phase by phase
```

## Run it locally

You need **Node.js 24**, a **Neon** database, a **Vercel** account and (for summaries) an **OpenRouter** key.

```bash
git clone https://github.com/elijaho-keh/elias-blog.git
cd elias-blog
npm install
cp .env.example .env
```

Fill in `.env` (see the setup steps below), then:

```bash
npm run db:schema      # create the tables
npm run db:seed        # admin account + the eight posts
npm run ai:summaries   # AI summaries for posts that have none
npx vercel login       # once
npx vercel link        # once, connects the folder to your Vercel project
npm start              # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm start` | Runs the site and the `/api` functions locally with `vercel dev` |
| `npm run db:schema` | Creates the tables from `scripts/schema.sql`. Safe to run again. |
| `npm run db:seed` | Creates or updates the admin account and the seed posts. Safe to run again, and keeps AI summaries. |
| `npm run db:check` | Connects to the database and shows what's in it |
| `npm run ai:summaries` | Adds summaries to posts without one. `-- --all` redoes all posts, `-- --dry-run` shows results without saving. |

### Environment variables

| Variable | Where it's used | Example |
|---|---|---|
| `DATABASE_URL` | app and scripts (pooled connection) | `postgresql://USER:PASSWORD@HOST-pooler/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | `db:schema` (direct connection, optional) | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require` |
| `OPENROUTER_API_KEY` | app and `ai:summaries` | `sk-or-v1-…` |
| `OPENROUTER_MODEL` | app and `ai:summaries` | `anthropic/claude-haiku-5.5` |
| `ADMIN_USERNAME` | `db:seed` only, never on Vercel | your username |
| `ADMIN_PASSWORD` | `db:seed` only, never on Vercel | 12+ characters |

`.env` is in `.gitignore` and is never committed. `.env.example` has placeholders only.

## Setting up the services

### Neon (database)
1. Create a project at [neon.com](https://neon.com). Region: **AWS Europe Central 1 (Frankfurt)**, to match the Vercel functions.
2. Get the connection strings. Either:
   - copy them from **Connect** in the Neon console, or
   - run `npx neon@latest init` and `npx neon@latest deploy`, which writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into `.env`.

   If they end up wrapped in quotes, remove the quotes before pasting the value into Vercel.
3. Run `npm run db:schema` and `npm run db:seed`.

### OpenRouter (AI summaries)
1. Create an account at [openrouter.ai](https://openrouter.ai) and add a small amount of credit.
2. **Settings → API Keys → Create Key.** Set a credit limit as a safety net.
3. Put the key in `.env` as `OPENROUTER_API_KEY`. Keep `OPENROUTER_MODEL=anthropic/claude-haiku-5.5`, or choose another model from OpenRouter's list.

### Vercel (hosting)
1. **Add New → Project → Import** the GitHub repo. Framework preset: **Other**. `vercel.json` already sets `public/` as the output folder and Frankfurt as the region.
2. Go to **Settings → Environments → Production → Add** and add:
   - `DATABASE_URL` as Secret
   - `OPENROUTER_API_KEY` as Secret
   - `OPENROUTER_MODEL` as Config

   The admin username and password are **not** needed on Vercel.
3. Every push to `main` deploys automatically.

## Database schema

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                       -- bcrypt, cost 12
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256 of the cookie token
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,                   -- 7 days
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,                 -- used in the URL
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('Film', 'AI', 'Art')),
  body         TEXT NOT NULL,                        -- plain text, empty line between paragraphs
  cover_url    TEXT NOT NULL,
  cover_alt    TEXT,
  keyword      TEXT NOT NULL,                        -- for the Kindred work search
  video_url    TEXT,
  summary      TEXT,                                 -- AI summary, NULL if it failed
  author_id    INTEGER REFERENCES users(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The full file, with indexes, is [`scripts/schema.sql`](scripts/schema.sql).

## API

| Method and URL | Login | What it does |
|---|---|---|
| `GET /api/posts` | – | All posts, newest first |
| `POST /api/posts` | **yes** | Create a post (+ AI summary). 401 without login, 400 with per-field errors. |
| `GET /api/post?slug=` | – | One post, 404 if unknown |
| `GET /api/comments?post=` | – | Comments on a post, oldest first |
| `POST /api/comments` | – | Add a comment (name, comment) |
| `POST /api/login` | – | Check the password, set the session cookie |
| `POST /api/logout` | – | Delete the session, clear the cookie |
| `GET /api/me` | – | The logged-in user, or `null` |
| `GET /api/kindred?q=` | – | A matching artwork from the Cleveland Museum of Art, cached for a day |

Request bodies must be JSON (415 otherwise). A wrong method answers 405.

How the parts talk to each other is drawn in [docs/architecture.md](docs/architecture.md).

## Security

- **SQL:** every query uses parameters (`$1, $2`) through `query()` in `lib/db.js`. No string concatenation.
- **XSS:** all text from posts and visitors is put on the page with `textContent` (through `el()` in `public/js/lib.js`). There's no `innerHTML` anywhere. I tested this with `<script>` and `<img onerror>` in titles and comments.
- **Login:**
  - bcrypt password hashes
  - the same message and the same response time for a wrong username and a wrong password
  - session tokens stored only as SHA-256 hashes
  - `HttpOnly`, `Secure`, `SameSite=Strict` cookies
  - logout is a POST
  - after login, the redirect only goes to pages on this site
- **Server-side checks:** creating posts requires a valid session in the API itself. All input is validated on the server, and the database has its own `CHECK` constraints.
- **Secrets:** they live only in `.env` (ignored by Git) and in Vercel's environment variables. Error messages to visitors never include database details.

## Intentionally left out

- **Editing and deleting posts.** Posts can only be created through the site. Mistakes are fixed in the database.
- **Sign-up, several authors and password reset.** There's one author, created by the seed script. To change the password, edit `.env` and run `npm run db:seed` again, which also logs out all sessions.
- **Comment moderation.** There's no deleting, approving or reporting of comments in the site. There's only a honeypot against simple bots, with no CAPTCHA and no rate limiting.
- **Rate limiting on login.** bcrypt makes each guess slow, but repeated attempts aren't blocked.
- **Image uploads.** The cover is a link to an image (the site's own `/img/…` or any `https://` image).
- **Rich text.** Posts are plain text with paragraphs. There's no Markdown, links or images inside posts.
- **Pagination, RSS and pretty URLs.** The URLs are `post.html?slug=…`.
- **An automated test suite.** Each phase was tested by hand and with small scripts against the real API and database. The results are logged in [PROCESS.md](PROCESS.md).

## How this was made

Built step by step over two days, with one commit per phase, together with Claude Code (an AI coding assistant), which is credited as co-author in the commits. Every decision, problem and test result is logged in [PROCESS.md](PROCESS.md).

Images and texts © Elias Grünewald Dykert. Artworks in the Kindred work box come from the Cleveland Museum of Art's open-access collection (CC0).
