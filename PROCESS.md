# Process log

Key decisions, problems and how they were solved, phase by phase. Written as the project was built, for the final presentation.

## Phase 0: Planning (1 Nov 2026)

**Decisions**
- Plain HTML, CSS and vanilla JavaScript on the frontend, Vercel serverless functions on the backend, PostgreSQL on Neon. No framework and no build step, so every line can be explained.
- Login sessions live in a `sessions` table, not in server memory. Each serverless function call can run on a fresh instance, so anything kept in memory disappears between requests.
- The session cookie holds a random token, but the database only stores a SHA-256 hash of it. If the database leaked, the hashes couldn't be used to log in.
- Neon runs in Frankfurt (AWS eu-central-1), and the Vercel functions are pinned to Frankfurt (`fra1`) in `vercel.json`, so each database query stays inside one region. Neon has no Stockholm region.
- Deploy early: GitHub gets connected to Vercel right after phase 1, so every push deploys automatically and problems show up early instead of the night before the deadline.
- The admin username and password only live in my local `.env`. The seed script that creates the account runs on my computer, so they never need to be stored in Vercel.

**Problems**
- The plan was to publish with the GitHub command-line tool (`gh`). I downloaded the Intel zip instead of the macOS installer, so `gh` was never installed. Switched to GitHub Desktop, which I already use and am logged in to: commits are made in the project, and I publish and push from GitHub Desktop.

## Phase 1: Setup

- `.gitignore` was created before the first commit and ignores `node_modules`, `.env`, `.env.local`, `.vercel` and `.DS_Store`.
- `.env.example` lists every environment variable with placeholder values only.
- Files the browser loads live in `public/`, the serverless functions in `api/`. Scripts, docs and backend helpers stay out of the public folder.
- `npm start` runs `vercel dev`, which runs the site and the functions locally the same way Vercel does. The script is called `start`, not `dev`, because `vercel dev` runs a project's `dev` script itself, so a `dev` script that calls `vercel dev` would call itself in a loop.
- Local scripts load `.env` with Node's built-in `--env-file` flag, so the project doesn't need the `dotenv` package.
- Published to GitHub with GitHub Desktop and imported into Vercel straight away. The first deploy only showed a placeholder page, but it proved the pipeline works.

## Phase 2: Layout and seed content

**Design**
- The blog is called *Dailies*. In film, dailies are the raw footage you watch at the end of each shooting day, before anything is fixed in the edit. That fits a blog about process and unfinished work.
- It has its own identity, separate from my portfolio. The portfolio uses Familjen Grotesk, Newsreader and IBM Plex Mono. The blog uses Instrument Serif for big headlines, Source Serif 4 for reading text and Inter for small labels, on warm off-white paper with one red accent colour.
- Images are never cropped. My covers range from 2.39:1 film stills to tall portrait paintings, and cropping a painting changes the work. Each image keeps its own shape, and the stories alternate image left / image right on desktop. On a phone, everything stacks in one column.
- All colours and fonts are CSS variables from the start, so the dark theme later only has to change the values.

**Content**
- Eight seed posts, one per portfolio project plus one about my hand-made art, 327–434 words each. They're based only on the texts on eliasdykert.se. Where the site says little, the writing stays with the idea behind the work and what can be seen in the images, instead of making up anecdotes. Every film post ends with the full credits from the portfolio.
- The publish dates (September–October 2026) are dates for the blog posts, not for when the projects were made.
- Videos are linked from eliasdykert.se/media instead of being copied into the repo (they are 5–11 MB each). Images were downloaded from eliasdykert.se/img into `public/img`.
- Each post has a keyword for the Art Institute of Chicago API. I tested the keywords against the API first. "piano" returned an architecture sketch by Renzo Piano, so the Flora post uses "pianist" instead.

**Code**
- All page text is created with a small helper, `el()`, that only uses `textContent`. No `innerHTML` anywhere, so text from posts or comments can never be read as HTML.
- All data loading goes through `public/js/api.js`. For now it reads a static `public/data/posts.json`. When the database is connected, only that file has to change.
- Loading, error and "story not found" states on both pages.

**Problems**
- Python's built-in web server wasn't allowed to read a folder on the Desktop (a macOS privacy setting), so the local preview uses a tiny Node server instead. It's only for previewing and isn't part of the project.
- On desktop, every other story puts its image on the right. At first those images ended up in the narrow column. Fixed by flipping the column widths on even rows.

## Phase 3: Database

**Setup with the Neon CLI**
- Neon's onboarding gives you a prompt for a coding agent. It used the Neon CLI: `neon init` linked this folder to my Neon project and created `neon.ts`, and `neon deploy` wrote the connection strings straight into `.env`. The database password never had to be copied by hand or shown on screen.
- `neon.ts` is Neon's config file. It keeps the production branch as it is, and any extra development branch I create deletes itself after 7 days.
- The project runs PostgreSQL 18 in AWS Frankfurt (eu-central-1), the same region as the Vercel functions.
- `neon init` also installed Neon's plugin and skills for coding agents (Claude Code, Codex, VS Code) on my computer. That's outside this project and isn't committed.

**Decisions**
- Driver: `@neondatabase/serverless`, as the brief specifies. Neon's own agent skill suggests `pg` with Vercel's Fluid compute for Vercel, but the serverless driver's HTTP mode means there's no connection to open, reuse or close: each function call sends its query over HTTPS. That's easier to explain and plenty fast for a blog.
- Neon gives two connection strings. The pooled one (`DATABASE_URL`) is for the app. The direct one (`DATABASE_URL_UNPOOLED`) is for schema changes, as Neon recommends.
- The schema lives in code (`scripts/schema.sql`) and is applied with `npm run db:schema`, in one transaction. It's safe to run again.
- The database guards its own data: a post's category must be Film, AI or Art, and comment names and bodies have length limits. Even if the API had a bug, Postgres would refuse bad rows.
- `npm run db:seed` creates the admin account (bcrypt, cost 12) and loads the eight posts. Running it again updates rows instead of duplicating them, keeps any AI summaries, and logs out old sessions in case the password changed.
- Every query goes through `query(text, params)` in `lib/db.js`, with `$1, $2` placeholders.

**Verified**
- `npm run db:check`: connected to `neondb` on PostgreSQL 18.6. Rows: 1 user, 8 posts (AI 3, Art 1, Film 4), 0 comments, 0 sessions. Running the seed twice still gives 8 posts.
- The password in `.env` matches the stored bcrypt hash, and the stored value is a hash, not the password.
- An SQL injection string (`flora' OR '1'='1`) sent as a parameter matched 0 rows.
- Inserting a post with the category "Music" was rejected by the database's check constraint.
- There is no `npm run build`: the project has no build step on purpose.

**Problems**
- `npm i -g neon` failed with a permissions error (global npm installs need admin rights on this Mac). Running it with `npx neon@latest` instead worked.
- The first `neon init` ran before I had signed in, so it only wrote the link file. After `neon login` in the browser, `neon deploy` connected and pulled the variables.
- My admin password contains special characters. I checked that Node reads it from `.env` exactly as typed before hashing it.
